# v0.5.4 route indexing matrix

| Route | Indexing | Mechanism |
|---|---|---|
| `/landing` | Indexable | Canonical and social metadata point to the configured production origin; it is the only sitemap entry. |
| `/` | No index | Redirects in the app; Vercel serves a `noindex, nofollow, noarchive` response header. |
| `/login`, `/login/:role`, `/login/recovery`, `/register` | No index | Vercel response header and client route metadata. |
| `/site-manager`, `/office-admin`, `/director` | No index | Authentication gate plus Vercel response header and client route metadata. |
| `/asset-register`, `/costing-model`, `/profile-settings` | No index | Authentication gate plus Vercel response header and client route metadata. |
| Unknown SPA route | No index | Catch-all Vercel response header; app redirects to landing. |

`SENATLA_CANONICAL_ORIGIN` is an HTTPS origin without a path. The build defaults to `https://senatla-ops.vercel.app`; the generated HTML, sitemap and runtime config use one value. Preview deployments retain the production canonical URL.

`robots.txt` permits crawling so search engines can read the `noindex` response headers. It advertises a sitemap containing only `/landing`. Blocking protected routes in `robots.txt` would prevent crawlers from seeing their `noindex` instruction.

The landing metadata describes an internal operations application. It does not claim public purchasing, pricing, or capabilities outside the product. No authenticated record is included in metadata or analytics.
