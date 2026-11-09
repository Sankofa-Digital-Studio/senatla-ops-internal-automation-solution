# Senatla Ops v0.5.5 release notes

Date: 2026-11-09  
Release path: `dev` → `preview` → `main`  
Application commits: `82aabb0` (Modular ERP library & asset compression), `afc525c` (Site Manager shift flow & multi-domain operational dashboards)  
Production deployment target: [senatla-ops.vercel.app](https://senatla-ops.vercel.app)

---

## Scope & Executive Summary

This major operational release implements the first wave of client feedback deliverables:
1. **Multi-Domain Operational Dashboards:** Four specialized dashboard views covering Overall Macro Scope, Engineering Operations with an audited 70:30 profit split, Demolition & Rehabilitation contract tracking with salvage credits, and Underground Works (deferred scope).
2. **Site Manager Guided Workflow Overhaul:** Transformation of the mobile field experience from an exhaustive single-column form into a 5-step guided shift workflow using reusable ERP UI primitives.
3. **Field Telemetry & Anti-Theft Security:** Machinery fuel telemetry (hourly burn rate for heavy equipment vs odometer km for light vehicles), equipment breakdown reporting with downtime tracking, and a 2.5-minute security dwell timer for scrap and salvage gate transits.
4. **Office Admin Sub-Feature Modularization:** Refactored monolithic template into 8 lazy-loaded sub-features (`@defer (on idle)`), reducing the initial office-admin chunk by 47.6%.
5. **Reusable ERP UI Library:** Standardized standalone components (`ErpStatCard`, `ErpStatusBadge`, `ErpDataTable`, `ErpFilterToolbar`, `ErpWorkflowStepper`, `ErpModal`, `ErpExportTrigger`) with OnPush change detection and zero-overhead styling.
6. **Payload & Asset Optimization:** Static assets compressed, shedding over 4.3 MB of image payload.

---

## Key Modules Delivered

### 1. Multi-Domain Operational Dashboards (`ISSUE-03`, `ISSUE-04`, `ISSUE-05`)
- **Domain Navigation Switcher:** Accessible ARIA tab switcher (`app-domain-navigation-switcher`) enabling seamless switching across `Overall Macro Scope`, `Engineering Operations`, `Demolition & Rehab`, and `Underground Works`.
- **Engineering 70:30 Profit Split Engine (`ISSUE-03`):**
  - Gross recognized revenue (R 4,285,000.00) minus audited expenses (materials, direct labour, absorbed monthly overheads) = Net Operating Profit (R 1,660,000.00 / 38.7% gross margin).
  - 70% Senatla Operational Share (R 1,162,000.00) vs 30% Shareholders Return pool (R 498,000.00).
  - **Anti-Inflation Expense Lock (`TASK-03.2`):** Prevents dividend declaration if open unassigned material draws or unbilled supplier purchase orders remain outstanding.
  - Workshops 1–3 operational status with monthly utility overhead absorption per active job card.
  - Order hierarchy pipeline: `Client P/O → Quote → Invoice → Job Card`.
  - Scrap variance, machine idle time, and unallocated overhead alert radar.
- **Demolition & Rehabilitation Dashboard (`ISSUE-04`):**
  - Active contract portfolio (R 14.2M): West Gold Plant Decommissioning, Tau Mine Industrial Salvage, and Mine Villages Historical Rehab.
  - Phase progress tracking across structural demolition, steel processing, and site revegetation.
  - BOQ margin recovery (27.8% actual vs 25.0% baseline).
  - Salvage yield: 781 t steel, 29.8 t copper, 6,030 m³ crushed concrete rubble, generating R 2.31M in salvage recovery credits.
  - Environmental clearance score (96.0% average).
- **Overall Macro Scope Dashboard (`ISSUE-05`):**
  - Consolidated executive rollup: R 12.62M Revenue, R 8.25M Costs, R 4.38M Net Profit (34.7% blended margin).
  - Cross-domain cash flow: R 3.18M net free cash flow (1.34x working capital ratio) and R 1.11M unallocated reserve.
  - Fleet telemetry rollup: 14 heavy machines, 78.6% fleet utilization, R 485/hr aggregate fuel burn rate.
  - Cross-domain friction & bottleneck radar tracking high-impact operational blockers.
- **Underground Works Dashboard:**
  - Executive standby notice confirming deferred status to prioritize Engineering and Demolition/Rehab.
  - Standby shaft configurations (Shafts 1, 3, and 5) targeted for Q2 2027 resumption.

### 2. Site Manager 5-Step Shift Workflow Overhaul
- **Structured Shift Sequence:**
  - **Step 1: Site Setup & Live Readiness:** Location verification, team headcount, and site readiness indicators.
  - **Step 2: Toolbox Safety Protocol:** Mandatory daily safety topic discussion and confirmation before attendance unlocks.
  - **Step 3: Attendance Register & Roll-Call:** One-click attendance actions, rapid present roll-call, and biometric/photo evidence attachment.
  - **Step 4: Field Operations & Telemetry:** Machinery fuel logging, equipment breakdown tickets, and scrap gate dwell timer.
  - **Step 5: Shift Review & Digital Sign-off:** Summary audit metrics, supervisor signature canvas, and atomic offline sync.
- **Machinery Fuel Telemetry (`ISSUE-11`):** Direct entry of litres, unit cost, and odometer/engine hours.
- **Equipment Breakdown Logging (`ISSUE-10`):** Downtime hours tracking and immediate notification to trigger maintenance job cards.
- **Scrap Gate Transit Dwell Timer (`ISSUE-12`):** 2.5-minute security dwell countdown enforcing vehicle entry verification before gate clearance.

### 3. Office Admin Modularization & Reusable ERP UI Library
- Sub-feature decomposition into 8 discrete modules (`admin-overview`, `admin-users`, `admin-workforce`, `admin-timesheets`, `admin-sites`, `admin-issues`, `admin-vendors`, `admin-governance`).
- Lazy loading via Angular `@defer (on idle)` with placeholder skeleton screens.
- Office-admin bundle size reduced by 47.6% (162 kB to 84.9 kB).
- Standalone ERP UI toolkit (`ErpDataTable`, `ErpStatCard`, `ErpStatusBadge`, `ErpFilterToolbar`, `ErpWorkflowStepper`, `ErpModal`, `ErpExportTrigger`).
- Dual export architecture: In-browser `ErpExportService` for lightweight reports and serverless `api/export/batch.ts` for massive datasets.

---

## Verification & Test Coverage

- **TypeScript Compilation:** `npm run typecheck` passed with code 0 across app, specs, and API.
- **Unit Test Suite:**
  - 28 unit tests passing across `DomainDashboardService` and the 5 dashboard components.
  - 14 unit tests passing across `OfficeAdminComponent` and sub-features.
  - 12 unit tests passing across `SiteManagerComponent` and the 5-step workflow.
  - 6 unit tests passing across `DirectorComponent`.
  - Batch export contract test passing (`scripts/batch-export-contract.test.mjs`).
- **Production Build:** `npm run build` completed successfully with CommonJS optimizations.
