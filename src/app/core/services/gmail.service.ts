import { Injectable, signal } from '@angular/core';
import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import firebaseConfig from '../../../../firebase-applet-config.json';

export const SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.send',
];

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

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);

const provider = new GoogleAuthProvider();
for (const scope of SCOPES) {
  provider.addScope(scope);
}

let isSigningIn = false;
// Cache the access token strictly in memory (never in localStorage or sessionStorage)
let cachedAccessToken: string | null = null;

@Injectable({ providedIn: 'root' })
export class GmailService {
  readonly user = signal<User | null>(null);
  readonly needsAuth = signal<boolean>(true);
  readonly isLoggingIn = signal<boolean>(false);
  readonly isLoadingMessages = signal<boolean>(false);
  readonly isSending = signal<boolean>(false);
  readonly error = signal<string | null>(null);
  readonly messages = signal<GmailMessageSummary[]>([]);
  readonly selectedMessage = signal<GmailMessageSummary | null>(null);

  constructor() {
    this.initAuth(
      (authenticatedUser) => {
        this.user.set(authenticatedUser);
        this.needsAuth.set(false);
      },
      () => {
        this.user.set(null);
        this.needsAuth.set(true);
      }
    );
  }

  initAuth(
    onAuthSuccess?: (user: User, token: string) => void,
    onAuthFailure?: () => void
  ) {
    return onAuthStateChanged(auth, async (currentUser: User | null) => {
      if (currentUser) {
        if (cachedAccessToken) {
          if (onAuthSuccess) onAuthSuccess(currentUser, cachedAccessToken);
        } else if (!isSigningIn) {
          cachedAccessToken = null;
          if (onAuthFailure) onAuthFailure();
        }
      } else {
        cachedAccessToken = null;
        if (onAuthFailure) onAuthFailure();
      }
    });
  }

  async googleSignIn(): Promise<{ user: User; accessToken: string } | null> {
    this.isLoggingIn.set(true);
    this.error.set(null);
    try {
      isSigningIn = true;
      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (!credential?.accessToken) {
        throw new Error('Failed to get access token from Firebase Auth.');
      }

      cachedAccessToken = credential.accessToken;
      this.user.set(result.user);
      this.needsAuth.set(false);
      await this.loadMessages();
      return { user: result.user, accessToken: cachedAccessToken };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Google sign-in failed.';
      this.error.set(message);
      throw err;
    } finally {
      isSigningIn = false;
      this.isLoggingIn.set(false);
    }
  }

  async getAccessToken(): Promise<string | null> {
    return cachedAccessToken;
  }

  async logout(): Promise<void> {
    await auth.signOut();
    cachedAccessToken = null;
    this.user.set(null);
    this.needsAuth.set(true);
    this.messages.set([]);
    this.selectedMessage.set(null);
  }

  async loadMessages(query = 'in:inbox', maxResults = 15): Promise<void> {
    const token = await this.getAccessToken();
    if (!token) {
      this.needsAuth.set(true);
      return;
    }

    this.isLoadingMessages.set(true);
    this.error.set(null);

    try {
      const params = new URLSearchParams({
        maxResults: String(maxResults),
      });
      if (query.trim()) {
        params.set('q', query.trim());
      }

      const listResponse = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages?${params.toString()}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (listResponse.status === 401 || listResponse.status === 403) {
        cachedAccessToken = null;
        this.needsAuth.set(true);
        throw new Error('Gmail session expired or requires authorization. Please sign in with Google again.');
      }

      if (!listResponse.ok) {
        throw new Error(`Failed to load messages (${listResponse.status}).`);
      }

      const listData = (await listResponse.json()) as {
        messages?: Array<{ id: string; threadId: string }>;
      };

      const rawItems = listData.messages ?? [];
      if (rawItems.length === 0) {
        this.messages.set([]);
        this.selectedMessage.set(null);
        return;
      }

      const detailed = await Promise.all(
        rawItems.slice(0, 12).map((item) => this.fetchMessageDetail(item.id, token))
      );

      const validMessages = detailed.filter((item): item is GmailMessageSummary => item !== null);
      this.messages.set(validMessages);
      if (validMessages.length > 0 && !this.selectedMessage()) {
        this.selectedMessage.set(validMessages[0]);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unable to fetch Gmail messages.';
      this.error.set(message);
    } finally {
      this.isLoadingMessages.set(false);
    }
  }

  async sendEmail(payload: SendEmailPayload): Promise<void> {
    const token = await this.getAccessToken();
    if (!token) {
      this.needsAuth.set(true);
      throw new Error('Authentication required before sending email.');
    }

    this.isSending.set(true);
    this.error.set(null);

    try {
      const mimeMessage = [
        `To: ${payload.to.trim()}`,
        `Subject: ${payload.subject.trim()}`,
        'Content-Type: text/plain; charset="UTF-8"',
        'MIME-Version: 1.0',
        '',
        payload.body,
      ].join('\r\n');

      const encodedMessage = this.encodeBase64Url(mimeMessage);

      const response = await fetch(
        'https://gmail.googleapis.com/gmail/v1/users/me/messages/send',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ raw: encodedMessage }),
        }
      );

      if (response.status === 401 || response.status === 403) {
        cachedAccessToken = null;
        this.needsAuth.set(true);
        throw new Error('Gmail authorization expired. Please sign in with Google again.');
      }

      if (!response.ok) {
        const errBody = await response.json().catch(() => ({}));
        const detail = (errBody as { error?: { message?: string } })?.error?.message || `HTTP ${response.status}`;
        throw new Error(`Failed to send email: ${detail}`);
      }
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
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (!res.ok) return null;

      const data = (await res.json()) as {
        id: string;
        threadId: string;
        snippet?: string;
        labelIds?: string[];
        payload?: {
          headers?: Array<{ name: string; value: string }>;
          body?: { data?: string };
          parts?: Array<{
            mimeType?: string;
            body?: { data?: string };
            parts?: Array<{ mimeType?: string; body?: { data?: string } }>;
          }>;
        };
      };

      const headers = data.payload?.headers ?? [];
      const getHeader = (name: string) =>
        headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value ?? '';

      return {
        id: data.id,
        threadId: data.threadId,
        subject: getHeader('Subject') || '(No subject)',
        from: getHeader('From') || 'Unknown sender',
        to: getHeader('To') || '',
        date: getHeader('Date') || '',
        snippet: data.snippet ?? '',
        body: this.extractPlainBody(data.payload) || data.snippet || '',
        labelIds: data.labelIds ?? [],
      };
    } catch {
      return null;
    }
  }

  private extractPlainBody(payload?: {
    body?: { data?: string };
    parts?: Array<{
      mimeType?: string;
      body?: { data?: string };
      parts?: Array<{ mimeType?: string; body?: { data?: string } }>;
    }>;
  }): string {
    if (!payload) return '';
    if (payload.body?.data) {
      return this.decodeBase64Url(payload.body.data);
    }
    if (payload.parts) {
      const plainPart = payload.parts.find((p) => p.mimeType === 'text/plain' && p.body?.data);
      if (plainPart?.body?.data) {
        return this.decodeBase64Url(plainPart.body.data);
      }
      for (const part of payload.parts) {
        if (part.parts) {
          const nestedPlain = part.parts.find((np) => np.mimeType === 'text/plain' && np.body?.data);
          if (nestedPlain?.body?.data) {
            return this.decodeBase64Url(nestedPlain.body.data);
          }
        }
      }
    }
    return '';
  }

  private encodeBase64Url(text: string): string {
    const bytes = new TextEncoder().encode(text);
    let binary = '';
    for (const byte of bytes) {
      binary += String.fromCharCode(byte);
    }
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  private decodeBase64Url(encoded: string): string {
    try {
      const base64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
      const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
      const binary = atob(padded);
      const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
      return new TextDecoder().decode(bytes);
    } catch {
      return '';
    }
  }
}
