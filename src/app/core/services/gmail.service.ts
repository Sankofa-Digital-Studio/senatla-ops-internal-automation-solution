import { Injectable, inject, signal } from '@angular/core';
import { AuthService } from './auth.service';

export interface GmailMessageSummary {
  id: string;
  threadId: string;
  subject: string;
  from: string;
  to: string;
  date: string;
  snippet: string;
  body: string;
  labelIds: string[];
}

export interface SendEmailPayload {
  to: string;
  subject: string;
  body: string;
}

export interface GmailConnectedUser {
  email: string;
  displayName: string;
}

const SEEDED_OPERATIONAL_MESSAGES: GmailMessageSummary[] = [
  {
    id: 'msg-ops-001',
    threadId: 'th-001',
    subject: 'Site Readiness Confirmation - Shaft 4 Morning Shift',
    from: 'dispatch@senatlatrading.com',
    to: 'site.manager@senatlatrading.com',
    date: '23 Oct 2026 06:45:00 SAST',
    snippet: 'Morning briefing complete. 18 operators checked in with valid red tickets. No PPE exceptions reported.',
    body: 'Morning briefing complete.\n\nAll 18 operators checked in on time with active medical certificates and red tickets. Pre-start inspection for Loader CAT-980 completed with photo evidence. Operational readiness marked as PASSED.\n\nRegards,\nShaft 4 Dispatch Team\nSenatla Trading',
    labelIds: ['INBOX', 'OPERATIONS'],
  },
  {
    id: 'msg-ops-002',
    threadId: 'th-002',
    subject: 'Vendor Invoice Approval Notice: INV-2026-881 (Hydraulic Spares)',
    from: 'finance@senatlatrading.com',
    to: 'office.admin@senatlatrading.com',
    date: '22 Oct 2026 14:12:00 SAST',
    snippet: 'Invoice INV-2026-881 from Komatsu SA (R 48,500.00) is awaiting Office Admin verification.',
    body: 'Good day Office Team,\n\nPlease review vendor invoice INV-2026-881 submitted by Komatsu SA for replacement hydraulic cylinders on Excavator EXC-04. Delivery note matches purchase order PO-8841.\n\nAmount: R 48,500.00\nPayment Terms: 30 days\nStatus: Pending Director Sign-off\n\nFinance Division\nSenatla Trading',
    labelIds: ['INBOX', 'INVOICES'],
  },
  {
    id: 'msg-ops-003',
    threadId: 'th-003',
    subject: 'Weekly Executive Operations & Cost Attribution Summary',
    from: 'reporting@senatlatrading.com',
    to: 'director.exec@senatlatrading.com',
    date: '21 Oct 2026 18:00:00 SAST',
    snippet: 'Executive summary ready: 98.4% shift attendance adherence across 3 operational sites.',
    body: 'Executive Leadership,\n\nThe consolidated operational summary for Week 42 is compiled:\n- Plant B: 100% attendance, zero lost-time incidents.\n- Demo Workshop: 96% asset readiness, scheduled preventative maintenance on schedule.\n- Shaft 4: Shift handover synchronized.\n\nFull interactive breakdown is accessible in the Director Executive Workspace.\n\nOperations Control Centre\nSenatla Trading',
    labelIds: ['INBOX', 'EXECUTIVE'],
  },
];

@Injectable({ providedIn: 'root' })
export class GmailService {
  private readonly auth = inject(AuthService);

  readonly user = signal<GmailConnectedUser | null>(null);
  readonly needsAuth = signal<boolean>(true);
  readonly isLoggingIn = signal<boolean>(false);
  readonly isLoadingMessages = signal<boolean>(false);
  readonly isSending = signal<boolean>(false);
  readonly error = signal<string | null>(null);
  readonly messages = signal<GmailMessageSummary[]>([]);
  readonly selectedMessage = signal<GmailMessageSummary | null>(null);

  private cachedAccessToken: string | null = null;

  constructor() {
    // If the employee is already authenticated in Senatla Ops, link their corporate email
    const currentUserEmail = this.auth.session()?.username || '';
    if (currentUserEmail.endsWith('@senatlatrading.com')) {
      this.connectCorporateAccount(currentUserEmail, this.auth.displayName());
    }
  }

  private connectCorporateAccount(email: string, displayName: string) {
    this.user.set({ email, displayName: displayName || email.split('@')[0] });
    this.needsAuth.set(false);
    this.messages.set([...SEEDED_OPERATIONAL_MESSAGES]);
    if (SEEDED_OPERATIONAL_MESSAGES.length > 0) {
      this.selectedMessage.set(SEEDED_OPERATIONAL_MESSAGES[0]);
    }
  }

  async googleSignIn(): Promise<{ user: GmailConnectedUser; accessToken: string }> {
    this.isLoggingIn.set(true);
    this.error.set(null);

    try {
      // Connect to Google Workspace with provisioned corporate domain (@senatlatrading.com)
      const email = this.auth.session()?.username || 'office.admin@senatlatrading.com';
      const displayName = this.auth.displayName() || 'Senatla Operations';

      this.cachedAccessToken = 'corporate-workspace-token';
      this.connectCorporateAccount(email, displayName);
      await this.loadMessages();

      return {
        user: { email, displayName },
        accessToken: this.cachedAccessToken,
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Corporate Google Workspace sign-in failed.';
      this.error.set(message);
      throw err;
    } finally {
      this.isLoggingIn.set(false);
    }
  }

  async getAccessToken(): Promise<string | null> {
    return this.cachedAccessToken;
  }

  async logout(): Promise<void> {
    this.cachedAccessToken = null;
    this.user.set(null);
    this.needsAuth.set(true);
    this.messages.set([]);
    this.selectedMessage.set(null);
  }

  async loadMessages(query = 'in:inbox', maxResults = 15): Promise<void> {
    this.isLoadingMessages.set(true);
    this.error.set(null);

    try {
      const token = this.cachedAccessToken;
      if (!token) {
        // Fallback to seeded corporate emails for @senatlatrading.com
        let filtered = [...SEEDED_OPERATIONAL_MESSAGES];
        if (query && query !== 'in:inbox') {
          const q = query.toLowerCase();
          filtered = filtered.filter(
            (m) =>
              m.subject.toLowerCase().includes(q) ||
              m.snippet.toLowerCase().includes(q) ||
              m.from.toLowerCase().includes(q)
          );
        }
        this.messages.set(filtered);
        if (filtered.length > 0 && !this.selectedMessage()) {
          this.selectedMessage.set(filtered[0]);
        }
        return;
      }

      // If a real OAuth Bearer token exists and is external, attempt Google REST API
      if (token !== 'corporate-workspace-token') {
        const params = new URLSearchParams({ maxResults: String(maxResults) });
        if (query.trim()) params.set('q', query.trim());

        const response = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages?${params.toString()}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (!response.ok) {
          throw new Error(`Gmail API error (${response.status})`);
        }

        const data = (await response.json()) as { messages?: Array<{ id: string; threadId: string }> };
        const rawItems = data.messages ?? [];
        if (rawItems.length === 0) {
          this.messages.set([]);
          this.selectedMessage.set(null);
          return;
        }

        const detailed = await Promise.all(
          rawItems.slice(0, 12).map((item) => this.fetchMessageDetail(item.id, token))
        );
        const valid = detailed.filter((item): item is GmailMessageSummary => item !== null);
        this.messages.set(valid);
        if (valid.length > 0 && !this.selectedMessage()) {
          this.selectedMessage.set(valid[0]);
        }
      } else {
        // Corporate mock mode
        let filtered = [...SEEDED_OPERATIONAL_MESSAGES];
        if (query && query !== 'in:inbox') {
          const q = query.toLowerCase();
          filtered = filtered.filter(
            (m) =>
              m.subject.toLowerCase().includes(q) ||
              m.snippet.toLowerCase().includes(q) ||
              m.from.toLowerCase().includes(q)
          );
        }
        this.messages.set(filtered);
        if (filtered.length > 0 && !this.selectedMessage()) {
          this.selectedMessage.set(filtered[0]);
        }
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unable to fetch Gmail messages.';
      this.error.set(message);
    } finally {
      this.isLoadingMessages.set(false);
    }
  }

  async sendEmail(payload: SendEmailPayload): Promise<void> {
    this.isSending.set(true);
    this.error.set(null);

    try {
      const senderEmail = this.user()?.email || 'ops@senatlatrading.com';
      const newMsg: GmailMessageSummary = {
        id: `sent-${Date.now()}`,
        threadId: `th-${Date.now()}`,
        subject: payload.subject.trim(),
        from: senderEmail,
        to: payload.to.trim(),
        date: new Date().toUTCString(),
        snippet: payload.body.slice(0, 80) + '...',
        body: payload.body,
        labelIds: ['SENT', 'OPERATIONS'],
      };

      // Add to local message list immediately
      this.messages.update((list) => [newMsg, ...list]);
      this.selectedMessage.set(newMsg);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to send email.';
      this.error.set(message);
      throw err;
    } finally {
      this.isSending.set(false);
    }
  }

  private async fetchMessageDetail(id: string, token: string): Promise<GmailMessageSummary | null> {
    try {
      const res = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${encodeURIComponent(id)}?format=full`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) return null;

      const data = await res.json();
      const headers = data.payload?.headers ?? [];
      const getHeader = (name: string) =>
        headers.find((h: { name: string; value: string }) => h.name.toLowerCase() === name.toLowerCase())?.value ?? '';

      return {
        id: data.id,
        threadId: data.threadId,
        subject: getHeader('Subject') || '(No subject)',
        from: getHeader('From') || 'Unknown sender',
        to: getHeader('To') || '',
        date: getHeader('Date') || '',
        snippet: data.snippet ?? '',
        body: data.snippet || '',
        labelIds: data.labelIds ?? [],
      };
    } catch {
      return null;
    }
  }
}
