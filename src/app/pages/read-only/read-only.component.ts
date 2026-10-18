import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { OfficeAdminService } from '../../core/services/office-admin.service';

@Component({
  selector: 'app-read-only',
  standalone: true,
  imports: [CommonModule],
  template: `
    <main class="min-h-screen bg-slate-950 p-6 text-white">
      <header class="mx-auto flex max-w-6xl items-center justify-between gap-4">
        <div>
          <p class="text-xs font-bold uppercase tracking-[0.2em] text-lime-200">Read-only access</p>
          <h1 class="mt-2 text-3xl font-black">Operations overview</h1>
        </div>
        <button type="button" (click)="logout()" class="rounded-lg border border-slate-700 px-4 py-2 text-sm">Sign out</button>
      </header>
      <section class="mx-auto mt-8 grid max-w-6xl gap-4 sm:grid-cols-3">
        <article class="rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <p class="text-sm text-slate-400">Sites</p><p class="mt-2 text-3xl font-bold">{{ service.sites().length }}</p>
        </article>
        <article class="rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <p class="text-sm text-slate-400">Assets</p><p class="mt-2 text-3xl font-bold">{{ service.assets().length }}</p>
        </article>
        <article class="rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <p class="text-sm text-slate-400">Open issues</p><p class="mt-2 text-3xl font-bold">{{ openIssues() }}</p>
        </article>
      </section>
      <section class="mx-auto mt-8 grid max-w-6xl gap-6 lg:grid-cols-2">
        <article class="rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <h2 class="font-bold">Sites</h2>
          <div class="mt-4 divide-y divide-slate-800">
            <p *ngFor="let site of service.sites()" class="py-3 text-sm">{{ site.name }} <span class="text-slate-400">· {{ site.location }}</span></p>
            <p *ngIf="!service.sites().length" class="py-3 text-sm text-slate-400">No sites available.</p>
          </div>
        </article>
        <article class="rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <h2 class="font-bold">Assets</h2>
          <div class="mt-4 divide-y divide-slate-800">
            <p *ngFor="let asset of service.assets()" class="py-3 text-sm">{{ asset.make }} {{ asset.model }} <span class="text-slate-400">· {{ asset.status }}</span></p>
            <p *ngIf="!service.assets().length" class="py-3 text-sm text-slate-400">No assets available.</p>
          </div>
        </article>
      </section>
      <p class="mx-auto mt-6 max-w-6xl text-xs text-slate-500">Your account can view workspace information but cannot create or change records.</p>
    </main>
  `,
})
export class ReadOnlyComponent {
  readonly service = inject(OfficeAdminService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  readonly openIssues = computed(() => this.service.issues().filter((issue) => issue.status === 'Open').length);

  async logout() {
    await this.auth.logout();
    await this.router.navigateByUrl('/landing');
  }
}
