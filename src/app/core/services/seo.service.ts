import { DOCUMENT } from '@angular/common';
import { inject, Injectable } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { RUNTIME_CONFIG } from '../config/runtime-config';

@Injectable({ providedIn: 'root' })
export class SeoService {
  private readonly document = inject(DOCUMENT);
  private readonly meta = inject(Meta);
  private readonly title = inject(Title);
  private readonly config = inject(RUNTIME_CONFIG);

  applyRoute(url: string): void {
    const isLanding = url.split(/[?#]/)[0] === '/landing';
    const canonical = `${this.config.seo?.canonicalOrigin || 'https://senatla-ops.vercel.app'}/landing`;
    this.title.setTitle(isLanding ? 'Senatla Ops | Field and office operations' : 'Senatla Ops');
    this.meta.updateTag({ name: 'robots', content: isLanding ? 'index, follow' : 'noindex, nofollow, noarchive' });
    let link = this.document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (isLanding) {
      if (!link) {
        link = this.document.createElement('link');
        link.rel = 'canonical';
        this.document.head.appendChild(link);
      }
      link.href = canonical;
      this.meta.updateTag({ property: 'og:url', content: canonical });
    } else {
      link?.remove();
      this.meta.removeTag('property="og:url"');
    }
  }
}
