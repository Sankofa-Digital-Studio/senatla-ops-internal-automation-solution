# Senatla Ops Front End Audit

**Date:** 1 November 2026  
**Scope:** Public entry, authentication, application navigation, route integrity, loading states, image rendering, responsive behaviour, scrolling, and accessibility  
**Outcome:** Focused first-pass fixes implemented and verified; no dead public CTA or broken landing image was found.

## Executive summary

The public landing flow was functional before this pass, but it imposed avoidable wait time, lost its only level-one heading after loading, used undersized desktop navigation targets, and allowed an internal Gmail route to be opened before operational authentication. The application shell and public pages also defined competing vertical scroll containers, increasing the risk of scroll fatigue and viewport instability.

This pass removes 1,050 milliseconds of artificial delay, restores a correct heading hierarchy, makes navigation targets at least 44 pixels high, associates login labels with their inputs, establishes document-level scrolling, preserves mobile dynamic viewport sizing, guards the Gmail route, and adds a direct return-to-workspace path for authenticated users. The front-page loader remains a non-interactive status surface; there is no tap-anywhere action in the updated source or rendered accessibility tree.

## Audit evidence

| Check | Hosted baseline | Updated production build |
|---|---:|---:|
| Desktop viewport | 1280 by 720 | 1280 by 720 supported |
| Mobile viewport | 390 by 844 | 390 by 844 verified |
| Mobile document height | 2,382 px | 2,300 px before the final mobile gutter refinement |
| Horizontal overflow | None | None |
| Nested content scrollers on landing | None | None; document is the sole vertical scroller |
| Broken or zero-width landing images | None | None |
| Clipped headings or CTA labels | None | None |
| Mobile controls below 44 px | None | None |
| Desktop landing navigation below 44 px | Four at 40 px | None after the fix |
| Level-one heading after load | Missing | Present |

## Findings and actions

### High priority

1. **Internal Gmail route lacked an application authentication guard.** Direct navigation could render the integration before an operational session was established. The route now uses the existing authentication match and activation guards and redirects unsigned users to `/login?redirect=%2Fgmail`.
2. **Artificial loading delays slowed entry.** The landing page enforced a 900 ms minimum and the login flow added a 150 ms simulated resource wait. Both artificial waits were removed. Loaders now reflect real authentication work.

### Medium priority

1. **Heading hierarchy became invalid after the landing loader disappeared.** The hero heading is now the persistent H1. The inactive landing content is inert and hidden from assistive technology while the loader is present, avoiding duplicate top-level headings.
2. **Login labels were not programmatically tied to their fields.** Work email, password, new password, and confirmation now use explicit `for` and `id` pairs. The irrelevant show-password control is hidden during password recovery.
3. **Public page shells and the application shell could compete for vertical scrolling.** The inner application overflow container and page-level public overflow containers were removed. Route changes now restore the page to the top, while anchor navigation remains enabled.
4. **Desktop landing navigation targets were 40 px high.** They now meet the 44 px touch-target baseline. The mobile menu summary also has explicit button semantics, controls association, and a 44 by 44 px minimum target.
5. **Authenticated users lacked a direct return path from secondary areas.** The existing role-aware workspace link is now visible in the account navigation.

### Image and interaction review

- The landing illustration loaded successfully with natural dimensions of 1,536 by 1,024 on desktop and mobile.
- Explicit image dimensions and asynchronous decoding were added to reduce layout shift; the welcome image is prioritised while the below-fold card remains lazy-loaded.
- Attendance image preview areas already reserve their dimensions, preventing viewport movement when a selected image appears.
- The current product contains an evidence grid and lightbox, but no carousel or swiper component. No carousel defect can therefore be reproduced in this version. A swipeable evidence sequence should be treated as a separate feature, not a repair to an existing carousel.

## CTA and route matrix

| Source | Target | Result |
|---|---|---|
| Landing brand | `/landing` | Valid; returns to top |
| Capabilities | `#capabilities` | Valid in-page destination |
| Assurance | `#assurance` | Valid in-page destination |
| Employee Sign In | `/login` | Valid route |
| Redeem Invitation | `/register` | Valid route |
| Android APK | GitHub `dev-latest` release asset | Target defined; external release availability remains a delivery dependency |
| Account workspace link | Role-specific workspace | Valid role-aware route |
| Gmail | `/gmail` | Valid authenticated route |
| Unknown application path | `/landing` | Wildcard fallback |

A static scan found no application button without a click, submit, or router action and no anchor without a route or URL target. This proves wiring at template level; role-authenticated workflow behaviour remains subject to seeded data and back-end availability.

## Three-pass review

### Pass one baseline

The live deployment established that public CTAs worked, the image loaded, and both tested viewports avoided horizontal overflow. It also exposed the missing H1, 40 px desktop targets, and unnecessary wait time.

### Pass two implementation comparison

The updated production bundle restored the H1, explicit input names, 44 px targets, the guarded Gmail redirect, and document-level scrolling. Mobile page height fell by 82 px without removing content.

### Pass three challenge and residual risk

The first CSS pass used a stable scrollbar gutter at every viewport. Mobile measurement showed that it reserved eight pixels unnecessarily, so the gutter was restricted to tablet and desktop widths. Remaining risks are authenticated modal focus management, exhaustive role-specific keyboard traversal, external APK availability, and swipe interaction on a future multi-image sequence.

## Verification

- TypeScript application and specification projects passed.
- Angular lint passed with no errors.
- Production build passed. One existing optional-chain warning remains in the Office Admin issue-history template and is outside this front-end pass.
- The full browser unit suite completed with 138 of 142 tests passing. The four failures are pre-existing worktree tests: one login-mode visibility assertion and three SiteReadiness tests without a `RUNTIME_CONFIG` provider; none exercise this pass's landing, loader, route, image, viewport, or accessibility changes.
- Playwright CLI verified hosted and locally built flows at desktop and mobile sizes.
- The unauthenticated Gmail route resolved to the login page with its return URL preserved.

## Recommended next pass

Run authenticated keyboard and screen-reader journeys for Site Manager, Office Admin, and Director roles using deterministic seed accounts. Prioritise modal focus trapping and restoration, error announcement timing, evidence-lightbox swipe navigation if it becomes a product requirement, and automated external release-link health monitoring.
