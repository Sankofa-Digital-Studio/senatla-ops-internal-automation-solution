import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { GmailMessageSummary, GmailService } from '../../core/services/gmail.service';

interface FilterPreset {
  id: string;
  label: string;
  query: string;
}

interface OperationalTemplate {
  label: string;
  subject: string;
  body: string;
}

@Component({
  selector: 'app-gmail-communications',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <section class="min-h-full bg-slate-950 text-white p-4 md:p-8">
      <div class="mx-auto max-w-6xl space-y-6">
        <!-- Top Header -->
        <header class="flex flex-col gap-4 rounded-3xl border border-white/10 bg-slate-900/90 p-6 shadow-2xl md:flex-row md:items-center md:justify-between">
          <div>
            <div class="flex items-center gap-3">
              <span class="grid h-10 w-10 place-items-center rounded-2xl bg-lime-300 text-base font-black text-slate-950">G</span>
              <div>
                <p class="text-xs font-bold uppercase tracking-[0.24em] text-lime-200">Workspace Integration</p>
                <h1 class="text-2xl font-black tracking-tight md:text-3xl">Gmail Operational Communications</h1>
              </div>
            </div>
            <p class="mt-2 max-w-2xl text-sm text-slate-400">
              Read vendor invoices, site readiness dispatches, and operational threads, or send status notifications directly through your connected Gmail account.
            </p>
          </div>

          <div class="flex flex-wrap items-center gap-3">
            <a routerLink="/landing" class="rounded-full border border-white/15 px-4 py-2.5 text-xs font-bold uppercase tracking-[0.16em] text-slate-300 transition hover:border-white/40 hover:text-white">
              Landing
            </a>
            <ng-container *ngIf="!gmail.needsAuth() && gmail.user() as currentUser">
              <div class="flex items-center gap-3 rounded-full border border-lime-300/25 bg-lime-300/10 px-4 py-2 text-xs text-lime-100">
                <span class="h-2 w-2 rounded-full bg-lime-300"></span>
                <span class="font-semibold">{{ currentUser.email }}</span>
              </div>
              <button
                type="button"
                (click)="openCompose()"
                class="rounded-full bg-lime-300 px-5 py-2.5 text-xs font-black uppercase tracking-[0.16em] text-slate-950 transition hover:bg-lime-200"
              >
                + Compose Email
              </button>
              <button
                type="button"
                (click)="gmail.logout()"
                class="rounded-full border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-xs font-bold uppercase tracking-[0.16em] text-red-200 transition hover:bg-red-500/20"
              >
                Disconnect Gmail
              </button>
            </ng-container>
          </div>
        </header>

        <!-- Error Banner -->
        <div *ngIf="gmail.error()" class="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200 flex items-center justify-between gap-4">
          <span>{{ gmail.error() }}</span>
          <button type="button" (click)="gmail.error.set(null)" class="text-xs font-bold uppercase tracking-wider text-red-300 hover:text-white">Dismiss</button>
        </div>

        <!-- Success Banner -->
        <div *ngIf="sendSuccessMessage()" class="rounded-2xl border border-lime-300/30 bg-lime-300/10 p-4 text-sm text-lime-100 flex items-center justify-between gap-4">
          <span>{{ sendSuccessMessage() }}</span>
          <button type="button" (click)="sendSuccessMessage.set('')" class="text-xs font-bold uppercase tracking-wider text-lime-200 hover:text-white">Dismiss</button>
        </div>

        <!-- Unauthenticated State: Official Sign in with Google Button -->
        <div *ngIf="gmail.needsAuth()" class="rounded-3xl border border-white/10 bg-slate-900/80 p-8 md:p-12 text-center shadow-2xl">
          <div class="mx-auto max-w-lg space-y-5">
            <div class="mx-auto grid h-16 w-16 place-items-center rounded-3xl border border-lime-300/30 bg-lime-300/10 text-lime-200">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
                <path stroke-linecap="round" stroke-linejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h2 class="text-2xl font-black tracking-tight">Connect your Google Workspace Gmail</h2>
            <p class="text-sm leading-6 text-slate-400">
              Sign in with Google to view operational inbox threads, search vendor invoices and site dispatches, and send email notifications on behalf of your account with explicit confirmation.
            </p>

            <div class="pt-2 flex justify-center">
              <button
                type="button"
                class="gsi-material-button"
                [disabled]="gmail.isLoggingIn()"
                (click)="handleGoogleLogin()"
              >
                <div class="gsi-material-button-state"></div>
                <div class="gsi-material-button-content-wrapper">
                  <div class="gsi-material-button-icon">
                    <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" xmlns:xlink="http://www.w3.org/1999/xlink" style="display: block;">
                      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                      <path fill="none" d="M0 0h48v48H0z"></path>
                    </svg>
                  </div>
                  <span class="gsi-material-button-contents">
                    {{ gmail.isLoggingIn() ? 'Connecting to Google...' : 'Sign in with Google' }}
                  </span>
                  <span style="display: none;">Sign in with Google</span>
                </div>
              </button>
            </div>
          </div>
        </div>

        <!-- Authenticated Workspace -->
        <ng-container *ngIf="!gmail.needsAuth()">
          <!-- Filter Presets & Search Bar -->
          <div class="flex flex-col gap-4 rounded-3xl border border-white/10 bg-slate-900/90 p-5 md:flex-row md:items-center md:justify-between">
            <div class="flex flex-wrap gap-2">
              <button
                *ngFor="let preset of filterPresets"
                type="button"
                (click)="applyPreset(preset)"
                class="rounded-full px-4 py-2 text-xs font-bold uppercase tracking-[0.14em] transition"
                [class.bg-lime-300]="activePresetId() === preset.id"
                [class.text-slate-950]="activePresetId() === preset.id"
                [class.bg-slate-950]="activePresetId() !== preset.id"
                [class.text-slate-300]="activePresetId() !== preset.id"
                [class.border]="activePresetId() !== preset.id"
                [class.border-white\/10]="activePresetId() !== preset.id"
              >
                {{ preset.label }}
              </button>
            </div>

            <form (ngSubmit)="runCustomSearch()" class="flex w-full gap-2 md:w-auto">
              <input
                type="text"
                [(ngModel)]="searchQuery"
                name="searchQuery"
                placeholder="Search Gmail (e.g. from:vendor subject:invoice)"
                class="w-full md:w-72 rounded-full border border-slate-700 bg-slate-950 px-4 py-2 text-xs text-white placeholder-slate-500 focus:border-lime-300 focus:outline-none"
              />
              <button
                type="submit"
                [disabled]="gmail.isLoadingMessages()"
                class="rounded-full border border-lime-300/40 bg-lime-300/10 px-4 py-2 text-xs font-bold uppercase tracking-wider text-lime-200 hover:bg-lime-300/20 disabled:opacity-50"
              >
                Search
              </button>
              <button
                type="button"
                (click)="refreshMessages()"
                [disabled]="gmail.isLoadingMessages()"
                class="rounded-full border border-white/15 px-4 py-2 text-xs font-bold uppercase tracking-wider text-slate-300 hover:border-white/40 disabled:opacity-50"
              >
                {{ gmail.isLoadingMessages() ? 'Loading...' : 'Refresh' }}
              </button>
            </form>
          </div>

          <!-- Composer Panel -->
          <section *ngIf="showComposer()" class="rounded-3xl border border-lime-300/30 bg-slate-900 p-6 shadow-2xl space-y-4">
            <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-white/10 pb-4">
              <div>
                <p class="text-xs font-bold uppercase tracking-[0.2em] text-lime-200">Dispatch Operational Email</p>
                <h2 class="text-xl font-black">Compose Message</h2>
              </div>
              <div class="flex flex-wrap items-center gap-2">
                <span class="text-xs text-slate-400">Quick Template:</span>
                <button
                  *ngFor="let tpl of operationalTemplates"
                  type="button"
                  (click)="applyTemplate(tpl)"
                  class="rounded-full border border-white/15 bg-slate-950 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:border-lime-300/50 hover:text-lime-200"
                >
                  {{ tpl.label }}
                </button>
                <button
                  type="button"
                  (click)="closeCompose()"
                  class="rounded-full border border-white/10 px-3 py-1.5 text-xs text-slate-400 hover:text-white"
                >
                  Close
                </button>
              </div>
            </div>

            <div class="grid gap-4 md:grid-cols-2">
              <div>
                <label class="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-400">Recipient (To)</label>
                <input
                  type="email"
                  [(ngModel)]="composeTo"
                  name="composeTo"
                  placeholder="recipient@company.co.za"
                  class="w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-sm text-white focus:border-lime-300 focus:outline-none"
                />
              </div>
              <div>
                <label class="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-400">Subject</label>
                <input
                  type="text"
                  [(ngModel)]="composeSubject"
                  name="composeSubject"
                  placeholder="Senatla Ops — Operational Update"
                  class="w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-sm text-white focus:border-lime-300 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label class="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-400">Message Body</label>
              <textarea
                rows="6"
                [(ngModel)]="composeBody"
                name="composeBody"
                placeholder="Write operational summary, approval details, or site report..."
                class="w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-sm text-white focus:border-lime-300 focus:outline-none"
              ></textarea>
            </div>

            <div *ngIf="composeValidationError()" class="text-xs text-red-300">
              {{ composeValidationError() }}
            </div>

            <div class="flex justify-end gap-3">
              <button
                type="button"
                (click)="closeCompose()"
                class="rounded-full border border-white/15 px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-slate-300 hover:border-white/40"
              >
                Cancel
              </button>
              <button
                type="button"
                (click)="requestSendConfirmation()"
                [disabled]="gmail.isSending()"
                class="rounded-full bg-lime-300 px-6 py-2.5 text-xs font-black uppercase tracking-wider text-slate-950 transition hover:bg-lime-200 disabled:opacity-50"
              >
                Review &amp; Send Email
              </button>
            </div>
          </section>

          <!-- Split View: Message List & Message Detail -->
          <div class="grid gap-6 lg:grid-cols-[0.95fr_1.35fr]">
            <!-- Message List -->
            <div class="rounded-3xl border border-white/10 bg-slate-900/90 p-4 shadow-xl flex flex-col max-h-[640px]">
              <div class="flex items-center justify-between px-2 pb-3 border-b border-white/10">
                <h2 class="text-xs font-bold uppercase tracking-[0.2em] text-lime-200">
                  Messages ({{ gmail.messages().length }})
                </h2>
                <span class="text-[11px] text-slate-400">{{ searchQuery }}</span>
              </div>

              <div *ngIf="gmail.isLoadingMessages()" class="py-12 text-center text-sm text-slate-400">
                <div class="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-white/10 border-t-lime-300"></div>
                Loading messages from Gmail...
              </div>

              <div *ngIf="!gmail.isLoadingMessages() && gmail.messages().length === 0" class="py-12 text-center text-sm text-slate-400">
                No Gmail messages matched the current filter.
              </div>

              <div class="mt-3 space-y-2 overflow-y-auto pr-1">
                <button
                  *ngFor="let msg of gmail.messages()"
                  type="button"
                  (click)="selectMessage(msg)"
                  class="w-full rounded-2xl border p-4 text-left transition"
                  [class.border-lime-300]="gmail.selectedMessage()?.id === msg.id"
                  [class.bg-slate-950]="gmail.selectedMessage()?.id === msg.id"
                  [class.border-white\/10]="gmail.selectedMessage()?.id !== msg.id"
                  [class.bg-slate-950\/40]="gmail.selectedMessage()?.id !== msg.id"
                >
                  <div class="flex items-start justify-between gap-2">
                    <p class="text-xs font-bold text-lime-200 truncate">{{ msg.from }}</p>
                    <span class="text-[10px] text-slate-400 shrink-0">{{ msg.date | slice:0:16 }}</span>
                  </div>
                  <p class="mt-1 text-sm font-black text-white truncate">{{ msg.subject }}</p>
                  <p class="mt-1 text-xs text-slate-400 line-clamp-2">{{ msg.snippet }}</p>
                </button>
              </div>
            </div>

            <!-- Message Detail -->
            <div class="rounded-3xl border border-white/10 bg-slate-900/90 p-6 shadow-xl min-h-[420px] flex flex-col">
              <ng-container *ngIf="gmail.selectedMessage() as selected; else noSelection">
                <div class="border-b border-white/10 pb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div class="space-y-1">
                    <span class="inline-block rounded-full border border-lime-300/30 bg-lime-300/10 px-3 py-0.5 text-[10px] font-bold uppercase tracking-widest text-lime-200">
                      Thread {{ selected.threadId }}
                    </span>
                    <h2 class="text-xl font-black text-white">{{ selected.subject }}</h2>
                    <p class="text-xs text-slate-300"><strong>From:</strong> {{ selected.from }}</p>
                    <p *ngIf="selected.to" class="text-xs text-slate-400"><strong>To:</strong> {{ selected.to }}</p>
                    <p class="text-[11px] text-slate-500">{{ selected.date }}</p>
                  </div>
                  <button
                    type="button"
                    (click)="replyToMessage(selected)"
                    class="shrink-0 rounded-full border border-lime-300/40 bg-lime-300/10 px-4 py-2 text-xs font-bold uppercase tracking-wider text-lime-200 hover:bg-lime-300/20"
                  >
                    Reply
                  </button>
                </div>

                <div class="mt-4 flex-1 rounded-2xl border border-white/5 bg-slate-950/70 p-4 text-sm leading-relaxed text-slate-200 whitespace-pre-wrap overflow-y-auto max-h-[440px]">{{ selected.body }}</div>
              </ng-container>

              <ng-template #noSelection>
                <div class="flex-1 grid place-items-center text-center text-slate-500 p-8">
                  <div>
                    <p class="text-sm font-bold text-slate-400">Select an email from the list</p>
                    <p class="mt-1 text-xs">Message contents, headers, and quick-reply actions will appear here.</p>
                  </div>
                </div>
              </ng-template>
            </div>
          </div>
        </ng-container>
      </div>

      <!-- Mandatory Explicit Confirmation Modal Before Sending Email -->
      <div
        *ngIf="confirmSendModalOpen()"
        class="fixed inset-0 z-[100] grid place-items-center bg-slate-950/85 p-4 backdrop-blur"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-send-title"
      >
        <div class="w-full max-w-lg rounded-3xl border border-lime-300/30 bg-slate-900 p-6 shadow-2xl space-y-4 text-white">
          <div>
            <p class="text-xs font-bold uppercase tracking-[0.2em] text-lime-200">Action Confirmation Required</p>
            <h3 id="confirm-send-title" class="mt-1 text-xl font-black">Confirm sending email via Gmail?</h3>
            <p class="mt-2 text-xs leading-5 text-slate-300">
              This action will send an email on behalf of your connected Google Workspace account ({{ gmail.user()?.email }}). Please verify the details below before proceeding:
            </p>
          </div>

          <div class="rounded-2xl border border-white/10 bg-slate-950 p-4 space-y-2 text-xs">
            <p><strong class="text-slate-400 uppercase">To:</strong> <span class="text-lime-200 font-semibold">{{ composeTo }}</span></p>
            <p><strong class="text-slate-400 uppercase">Subject:</strong> <span class="text-white font-semibold">{{ composeSubject }}</span></p>
            <div class="pt-2 border-t border-white/10">
              <strong class="text-slate-400 uppercase block mb-1">Body Preview:</strong>
              <div class="max-h-36 overflow-y-auto whitespace-pre-wrap text-slate-300 bg-slate-900/70 p-2.5 rounded-xl border border-white/5">{{ composeBody }}</div>
            </div>
          </div>

          <div class="flex justify-end gap-3 pt-2">
            <button
              type="button"
              (click)="cancelSendConfirmation()"
              [disabled]="gmail.isSending()"
              class="rounded-full border border-white/15 px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-slate-300 hover:border-white/40"
            >
              Cancel
            </button>
            <button
              type="button"
              (click)="confirmAndSendEmail()"
              [disabled]="gmail.isSending()"
              class="rounded-full bg-lime-300 px-6 py-2.5 text-xs font-black uppercase tracking-wider text-slate-950 transition hover:bg-lime-200 disabled:opacity-50"
            >
              {{ gmail.isSending() ? 'Sending...' : 'Confirm & Send Email' }}
            </button>
          </div>
        </div>
      </div>
    </section>
  `,
  styles: [`
    .gsi-material-button {
      -moz-user-select: none;
      -webkit-user-select: none;
      -ms-user-select: none;
      -webkit-appearance: none;
      background-color: #ffffff;
      background-image: none;
      border: 1px solid #747775;
      -webkit-border-radius: 20px;
      border-radius: 20px;
      -webkit-box-sizing: border-box;
      box-sizing: border-box;
      color: #1f1f1f;
      cursor: pointer;
      font-family: 'Roboto', arial, sans-serif;
      font-size: 14px;
      height: 44px;
      letter-spacing: 0.25px;
      outline: none;
      overflow: hidden;
      padding: 0 16px;
      position: relative;
      text-align: center;
      -webkit-transition: background-color .218s, border-color .218s, box-shadow .218s;
      transition: background-color .218s, border-color .218s, box-shadow .218s;
      vertical-align: middle;
      white-space: nowrap;
      width: auto;
      max-width: 400px;
      min-width: min-content;
    }

    .gsi-material-button .gsi-material-button-icon {
      height: 20px;
      margin-right: 12px;
      min-width: 20px;
      width: 20px;
    }

    .gsi-material-button .gsi-material-button-content-wrapper {
      -webkit-align-items: center;
      align-items: center;
      display: flex;
      -webkit-flex-direction: row;
      flex-direction: row;
      -webkit-flex-wrap: nowrap;
      flex-wrap: nowrap;
      height: 100%;
      justify-content: space-between;
      position: relative;
      width: 100%;
    }

    .gsi-material-button .gsi-material-button-contents {
      -webkit-flex-grow: 1;
      flex-grow: 1;
      font-family: 'Roboto', arial, sans-serif;
      font-weight: 500;
      overflow: hidden;
      text-overflow: ellipsis;
      vertical-align: top;
    }

    .gsi-material-button .gsi-material-button-state {
      -webkit-transition: opacity .218s;
      transition: opacity .218s;
      bottom: 0;
      left: 0;
      opacity: 0;
      position: absolute;
      right: 0;
      top: 0;
    }

    .gsi-material-button:disabled {
      cursor: default;
      background-color: #ffffff61;
      border-color: #1f1f1f1f;
    }

    .gsi-material-button:hover:not(:disabled) {
      -webkit-box-shadow: 0 1px 2px 0 rgba(60, 64, 67, .30), 0 1px 3px 1px rgba(60, 64, 67, .15);
      box-shadow: 0 1px 2px 0 rgba(60, 64, 67, .30), 0 1px 3px 1px rgba(60, 64, 67, .15);
    }
  `],
})
export class GmailCommunicationsComponent {
  readonly gmail = inject(GmailService);

  readonly filterPresets: FilterPreset[] = [
    { id: 'inbox', label: 'All Inbox', query: 'in:inbox' },
    { id: 'invoices', label: 'Vendor & Invoices', query: 'invoice OR vendor OR payment OR quote' },
    { id: 'sites', label: 'Site & Attendance', query: 'site OR attendance OR timesheet OR readiness' },
    { id: 'assets', label: 'Asset & Compliance', query: 'asset OR maintenance OR license OR compliance' },
    { id: 'sent', label: 'Sent', query: 'in:sent' },
  ];

  readonly operationalTemplates: OperationalTemplate[] = [
    {
      label: 'Site Readiness Summary',
      subject: 'Senatla Ops — Daily Site Readiness & Attendance Confirmation',
      body: 'Good day,\n\nPlease find the daily site readiness confirmation and attendance verification summary for today.\n\n- Site Status: Ready\n- Workforce Roll Call: Verified\n- Safety Briefing: Completed\n\nRegards,\nSenatla Operations Team',
    },
    {
      label: 'Vendor Invoice Escalation',
      subject: 'Senatla Ops — Vendor Invoice Review & Approval Request',
      body: 'Good day,\n\nA vendor invoice requires executive review and cost-attribution sign-off in the Senatla Ops workspace.\n\nPlease review the supporting documentation and confirm approval status.\n\nRegards,\nSenatla Office Administration',
    },
    {
      label: 'Asset Compliance Alert',
      subject: 'Senatla Ops — Asset Maintenance & License Compliance Notice',
      body: 'Good day,\n\nAn operational asset requires scheduled inspection or license renewal attention before deployment.\n\nPlease update the evidence record in the Asset Register.\n\nRegards,\nSenatla Asset Control',
    },
  ];

  readonly activePresetId = signal<string>('inbox');
  readonly showComposer = signal<boolean>(false);
  readonly confirmSendModalOpen = signal<boolean>(false);
  readonly composeValidationError = signal<string>('');
  readonly sendSuccessMessage = signal<string>('');

  searchQuery = 'in:inbox';
  composeTo = '';
  composeSubject = '';
  composeBody = '';

  async handleGoogleLogin() {
    try {
      await this.gmail.googleSignIn();
    } catch {
      // Error state is handled by GmailService
    }
  }

  applyPreset(preset: FilterPreset) {
    this.activePresetId.set(preset.id);
    this.searchQuery = preset.query;
    void this.gmail.loadMessages(this.searchQuery);
  }

  runCustomSearch() {
    this.activePresetId.set('custom');
    void this.gmail.loadMessages(this.searchQuery);
  }

  refreshMessages() {
    void this.gmail.loadMessages(this.searchQuery);
  }

  selectMessage(msg: GmailMessageSummary) {
    this.gmail.selectedMessage.set(msg);
  }

  openCompose() {
    this.composeValidationError.set('');
    this.showComposer.set(true);
  }

  closeCompose() {
    this.showComposer.set(false);
    this.composeValidationError.set('');
  }

  applyTemplate(tpl: OperationalTemplate) {
    this.composeSubject = tpl.subject;
    this.composeBody = tpl.body;
  }

  replyToMessage(msg: GmailMessageSummary) {
    const emailMatch = msg.from.match(/<([^>]+)>/);
    this.composeTo = emailMatch ? emailMatch[1] : msg.from;
    this.composeSubject = msg.subject.toLowerCase().startsWith('re:') ? msg.subject : `Re: ${msg.subject}`;
    this.composeBody = `\n\n--- On ${msg.date}, ${msg.from} wrote: ---\n${msg.snippet}`;
    this.showComposer.set(true);
  }

  requestSendConfirmation() {
    if (!this.composeTo.trim() || !this.composeTo.includes('@')) {
      this.composeValidationError.set('Please enter a valid recipient email address.');
      return;
    }
    if (!this.composeSubject.trim()) {
      this.composeValidationError.set('Please enter an email subject.');
      return;
    }
    if (!this.composeBody.trim()) {
      this.composeValidationError.set('Please enter a message body before sending.');
      return;
    }
    this.composeValidationError.set('');
    this.confirmSendModalOpen.set(true);
  }

  cancelSendConfirmation() {
    this.confirmSendModalOpen.set(false);
  }

  async confirmAndSendEmail() {
    try {
      await this.gmail.sendEmail({
        to: this.composeTo,
        subject: this.composeSubject,
        body: this.composeBody,
      });
      this.confirmSendModalOpen.set(false);
      this.showComposer.set(false);
      this.sendSuccessMessage.set(`Email sent to ${this.composeTo}.`);
      this.composeTo = '';
      this.composeSubject = '';
      this.composeBody = '';
      void this.gmail.loadMessages(this.searchQuery);
    } catch {
      this.confirmSendModalOpen.set(false);
    }
  }
}
