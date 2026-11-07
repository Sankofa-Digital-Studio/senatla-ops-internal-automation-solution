# v0.5.4 route indexing matrix

| Route | Indexing | Mechanism |
|---|---|---|
| `/landing` | Indexable | Canonical and social metadata point to the configured production origin; it is the only sitemap entry. |
| `/` | No index | Redirects in the app; Vercel serves a `noindex, nofollow, noarchive` response header. |
| `/login`, `/login/:role`, `/login/recovery`, `/register` | No index | Vercel response header and client route metadata. |
| `/site-manager`, `/office-admin`, `/director` | No index | Authentication gate plus Vercel response header and client route metadata. |
| `/asset-register`, `/costing-model`, `/profile-settings` | No index | Authentication gate plus Vercel response header and client route metadata. |
| Unknown SPA route | No index | Catch-all Vercel response header; app redirects to landing. |

The owner confirmed `https://senatla-ops.vercel.app` as the public canonical origin. The committed HTML and sitemap use that origin, so even a Vercel project that invokes `ng build` directly produces the correct public files. `SENATLA_CANONICAL_ORIGIN` is an HTTPS origin without a path and controls client route metadata; change the committed HTML and sitemap in the same release if the public domain changes. Preview deployments retain the production canonical URL.

`robots.txt` permits crawling so search engines can read the `noindex` response headers. It advertises a sitemap containing only `/landing`. Blocking protected routes in `robots.txt` would prevent crawlers from seeing their `noindex` instruction.

The landing metadata describes an internal operations application. It does not claim public purchasing, pricing, or capabilities outside the product. No authenticated record is included in metadata or analytics.
