# Senatla Trading Client Feedback: Tasks & Issues Register

**Date:** 8 November 2026  
**Scope:** Director and Office Admin Workspaces  
**Executive Audit Scope:** `rubinthoso@senatlatrading.com`, `thosontula@gmail.com`, and `thosontula+*@gmail.com`  
**Active Domains (Initial Phase):** Engineering, Demolition & Rehabilitation, Overall Macro Scope *(Underground Works deferred)*

---

## Issue & Task Summary Matrix

| ID | Module / Epic | Issue Title | Priority | Status | Estimate | Primary Role Scope | Delivered in Release |
|:---|:---|:---|:---:|:---:|:---:|:---|:---:|
| **ISSUE-01** | Governance & Access | 3-Domain Operational Scope & Dynamic Admin Provisioning | **P0** | **PLANNED** | 3 days | Director Full CRUD / Admin Provisioned | Phase 1 Foundation |
| **ISSUE-02** | Security & Compliance | Executive Root Audit & Office Admin Activity Traceability | **P0** | **PLANNED** | 2 days | Executive Restricted (`rubinthoso` / `thosontula`) | Phase 1 Foundation |
| **ISSUE-03** | Dashboards | Engineering Operational & 70:30 Profit Split Dashboard | **P0** | **COMPLETE** | 3 days | Director & Office Admin (Engineering) | **v0.5.5** (`afc525c`) |
| **ISSUE-04** | Dashboards | Demolition & Rehabilitation Operational Dashboard | **P1** | **COMPLETE** | 2 days | Director & Office Admin (Demolition) | **v0.5.5** (`afc525c`) |
| **ISSUE-05** | Dashboards | Overall Macro Scope (Combined P&L & Bottlenecks) Dashboard | **P1** | **COMPLETE** | 2.5 days | Director & Office Admin (Macro) | **v0.5.5** (`afc525c`) |
| **ISSUE-06** | Order Management | Client P/O → Quote → Invoice → Job-Card Parent-Child Flow | **P0** | **PLANNED** | 3.5 days | Director & Office Admin | Phase 2 Commercial |
| **ISSUE-07** | Procurement | Supplier & Vendor Sourcing Audit with Job-Card Line Linkage | **P1** | **PLANNED** | 2.5 days | Director & Office Admin | Phase 2 Commercial |
| **ISSUE-08** | Workshop Operations | Workshops 1–3 Activities (Boilermaking & Train Wheels CRUD) | **P1** | **IN PROGRESS** | 3 days | Director & Office Admin | Overview in v0.5.5 / Full CRUD next |
| **ISSUE-09** | Financial Controls | Monthly Scope Variable & Non-Variable Workshop Overheads | **P1** | **IN PROGRESS** | 2 days | Director & Office Admin | Absorption in v0.5.5 / Utility form next |
| **ISSUE-10** | Asset Management | Asset Maintenance Job-Cards & Downtime Cost-to-Company | **P1** | **IN PROGRESS** | 2 days | Director & Office Admin | Field Capture in **v0.5.5** |
| **ISSUE-11** | Asset Management | Fleet Fuel Telemetry (Heavy Machinery $/hr vs Light Vehicle km) | **P2** | **IN PROGRESS** | 2 days | Director & Office Admin | Field Telemetry in **v0.5.5** |
| **ISSUE-12** | Scrap Security | Harmony Scrap Waybill Intake & Joint-Liability Dual Sign-Off | **P0** | **IN PROGRESS** | 2.5 days | Director & Office Admin | Gate Dwell Timer in **v0.5.5** |
| **ISSUE-13** | Scrap Security | Covert Director Proximity GPS Beacons & Cash Reconciliation | **P0** | **PLANNED** | 3 days | Executive / Director Exclusive | Phase 5 Security |

---

## Detailed Task Breakdown

### EPIC 1: Governance, Access & Executive Root Audit

#### `ISSUE-01`: 3-Domain Operational Scope & Dynamic Admin Provisioning
* **Objective:** Establish domain boundaries for Engineering, Demolition & Rehabilitation, and Overall Macro Scope. Grant Director full CRUD across all 3 domains, and provide Directors with an interface to provision, grant, or revoke specific permissions for Office Admins.
* **Sub-Tasks:**
  1. `TASK-01.1` *(DB)*: Define enum `operational_domain` (`engineering`, `demolition_rehabilitation`, `overall_macro`).
  2. `TASK-01.2` *(DB)*: Create `domain_admin_permissions` table (user_id, domain, can_read, can_write, can_delete, granted_by, updated_at).
  3. `TASK-01.3` *(API/RLS)*: Enforce Director unconditional CRUD on domain tables while restricting Office Admins to their granted domain flags.
  4. `TASK-01.4` *(UI)*: Add a Director Management Panel to toggle Office Admin domain permissions on and off in real time.

#### `ISSUE-02`: Executive Root Audit & Office Admin Activity Traceability
* **Objective:** Capture an immutable audit event for every Office Admin action (creating/editing POs, quotes, invoices, job cards, vendor orders, overheads, waybills). Actions do not require pre-approval, but full post-action traceability must be visible **strictly and exclusively** to `rubinthoso@senatlatrading.com` and `thosontula@gmail.com` / `thosontula+*@gmail.com`.
* **Sub-Tasks:**
  1. `TASK-02.1` *(DB)*: Create `admin_activity_logs` table (id, actor_id, actor_email, action_type, entity_type, entity_id, change_payload, timestamp).
  2. `TASK-02.2` *(Security/RLS)*: Write PostgreSQL RLS policy restricting `SELECT` on `admin_activity_logs` strictly to:
     ```sql
     auth.jwt() ->> 'email' IN ('rubinthoso@senatlatrading.com', 'thosontula@gmail.com')
     OR auth.jwt() ->> 'email' LIKE 'thosontula+%@gmail.com'
     ```
  3. `TASK-02.3` *(DB)*: Create automated database triggers capturing INSERT, UPDATE, and DELETE mutations across all operational tables.
  4. `TASK-02.4` *(UI)*: Build the "Executive Traceability Audit" panel accessible only when authenticated under those specific emails.

---

### EPIC 2: Multi-Domain Dashboards

#### `ISSUE-03`: Engineering Operational & 70:30 Profit Split Dashboard
* **Objective:** Dashboard for Engineering tracking inputs vs outputs (expenses vs revenue), order throughput, active bottlenecks, and the transparent 70:30 profit split.
* **Sub-Tasks:**
  1. `TASK-03.1` *(Calculation Engine)*: Calculate gross recognized revenue minus audited expenses (materials, direct labour, absorbed monthly overheads) = Net Operating Profit.
  2. `TASK-03.2` *(Anti-Inflation Controls)*: Enforce expense lock: profit cannot be finalized or declared for dividends if unbilled vendor orders or open material draws remain unassigned.
  3. `TASK-03.3` *(UI)*: Build cards for Total Billed, Total Cost Incurred, Gross Margin, Senatla Share (70%), Shareholder Return (30%), and Wasted Expenditure flags.

#### `ISSUE-04`: Demolition & Rehabilitation Operational Dashboard
* **Objective:** Track demolition and rehabilitation contracts (West Gold, Tau Mine, Mine Villages) focusing on phase milestones, BOQ margin recovery, and salvage rubble vs site clearance.
* **Sub-Tasks:**
  1. `TASK-04.1` *(Metrics)*: Aggregate phase costs, contract revenue, and environmental clearance metrics.
  2. `TASK-04.2` *(UI)*: Build phase progress view with budget vs actual spend and salvage recovery credit tracking.

#### `ISSUE-05`: Overall Macro Scope Dashboard
* **Objective:** Macro executive view consolidating Engineering and Demolition & Rehabilitation operations into a single combined view.
* **Sub-Tasks:**
  1. `TASK-05.1` *(Aggregation)*: Multi-domain P&L rollup, consolidated cash flow, fleet utilization, and cross-domain bottleneck list.
  2. `TASK-05.2` *(UI)*: Executive macro view with domain comparison and drill-down into individual domain dashboards.

---

### EPIC 3: Engineering Order Hierarchy & Procurement Traceability

#### `ISSUE-06`: Client P/O → Quote → Invoice → Job-Card Parent-Child Flow
* **Objective:** Implement the parent-child contract starting with the Harmony Purchase Order, issuing quotes, invoicing, and generating execution job cards.
* **Sub-Tasks:**
  1. `TASK-06.1` *(DB)*: Tables for `client_purchase_orders` (Parent), `client_quotes` (Child), `client_invoices` (Child), and `job_cards` (Execution child).
  2. `TASK-06.2` *(UI/Workflow)*: Intake Harmony P/O → Generate Quote → Client acceptance trigger → Auto-generate Invoice and dispatch Job Card.
  3. `TASK-06.3` *(Micro-Steps)*: Job Card tracking interface for milestones, inputs consumed, technician hours, and completion criteria.

#### `ISSUE-07`: Supplier & Vendor Sourcing Audit with Job-Card Line Linkage
* **Objective:** Complete auditability of every vendor/supplier order. Track materials sourced by unique vendor order number and map each supplier invoice item into the specific job card where it was used.
* **Sub-Tasks:**
  1. `TASK-07.1` *(DB)*: `vendor_purchase_orders` and `vendor_invoice_items` with foreign keys to `job_cards`.
  2. `TASK-07.2` *(Drill-Down)*: Build the drill-down view: `Client P/O → Job Card → Supplier Order # → Invoice Items`.
  3. `TASK-07.3` *(Supplier Summary)*: Supplier monthly totals and cumulative Cost to Company analysis across all vendors.

---

### EPIC 4: Workshops & Monthly Overheads

#### `ISSUE-08`: Workshops 1–3 Activities (Boilermaking & Train Wheels CRUD)
* **Objective:** CRUD activity tracking for Workshop 1, Workshop 2, and Workshop 3, specifically handling Boilermaking and Train Wheel manufacturing.
* **Sub-Tasks:**
  1. `TASK-08.1` *(DB)*: `workshops` and `workshop_activity_records` (batch #, activity: boilermaking / wheel_manufacturing, machine ID, status, cycle time).
  2. `TASK-08.2` *(UI)*: Workshop activity kanban/table with CRUD operations, linking each batch to its active Job Card.
  3. `TASK-08.3` *(Quality)*: Final inspection sign-off and defect tracking per workshop batch.

#### `ISSUE-09`: Monthly Scope Variable & Non-Variable Workshop Overheads
* **Objective:** Track variable and non-variable overheads per workshop on a monthly scope and allocate costs across active job cards.
* **Sub-Tasks:**
  1. `TASK-09.1` *(DB)*: `workshop_monthly_overheads` (workshop_id, month_year, rent, electricity, water, municipal, gas, diesel, petrol, PPE, ad-hoc).
  2. `TASK-09.2` *(UI)*: Monthly utility and expense capture form for Office Admin.
  3. `TASK-09.3` *(Absorption Engine)*: Compute overhead absorption per active job card for accurate net margin reporting.

---

### EPIC 5: Asset Cost to Company & Telemetry

#### `ISSUE-10`: Asset Maintenance Job-Cards & Downtime Cost-to-Company
* **Objective:** Track equipment downtime and maintenance costs (spares purchases + internal/external labour).
* **Sub-Tasks:**
  1. `TASK-10.1` *(DB)*: `asset_maintenance_logs` (asset_id, reason: breakdown/scheduled/preventative, time_booked_off_hours, maintenance_job_card_id).
  2. `TASK-10.2` *(Spares & Labour)*: Link parts purchased to supplier invoice lines and record technician hours.
  3. `TASK-10.3` *(UI)*: Asset maintenance history and downtime revenue impact view.

#### `ISSUE-11`: Fleet Fuel Telemetry (Heavy Machinery $/hr vs Light Vehicle km)
* **Objective:** Fuel logging distinguishing heavy equipment from light vehicles.
* **Sub-Tasks:**
  1. `TASK-11.1` *(DB)*: `asset_fuel_telemetry` (asset_id, fuel_type, litres, cost, engine_hours, odometer_km).
  2. `TASK-11.2` *(Rate Engine)*: Heavy machinery fuel burn rate (`$/operating hour`); Light vehicles fuel consumption (`L/100km`).
  3. `TASK-11.3` *(Siphoning Alert)*: Flag abnormal consumption variance against baseline.

---

### EPIC 6: Scrap Material Chain of Custody & Anti-Theft Security

#### `ISSUE-12`: Harmony Scrap Waybill Intake & Joint-Liability Dual Sign-Off
* **Objective:** Controlled custody tracking for salvaged scrap and copper, preventing theft and establishing clear legal liability.
* **Sub-Tasks:**
  1. `TASK-12.1` *(DB)*: `scrap_consignments` (harmony_waybill_no, date, material_type: copper/steel, estimated_weight_kg, origin_shaft).
  2. `TASK-12.2` *(Gate Dwell Check)*: Simplified gate entry log enforcing a 2–3 minute dwell window before clearance, with photo evidence upload.
  3. `TASK-12.3` *(Dual Sign-Off)*: Digital custody handover requiring authenticated signatures from **Driver** and **Securing Storage Officer**, binding joint liability.

#### `ISSUE-13`: Covert Director Proximity GPS Beacons & Cash Reconciliation
* **Objective:** Real-time covert GPS alerting when company vehicles approach known scrap dealers, plus cash settlement reconciliation.
* **Sub-Tasks:**
  1. `TASK-13.1` *(DB)*: `scrap_dealers` (name, address, lat, lng, radius_meters) and `scrap_dealer_proximity_alerts`.
  2. `TASK-13.2` *(Covert Security Channel)*: Device GPS coordinate pings evaluated against dealer geofences; alerts sent strictly to the Director Dashboard and never shown on driver/guard devices.
  3. `TASK-13.3` *(Cash Reconciliation)*: Record dealer weighbridge certificates, cash slips, and calculate scale discrepancy against Harmony waybill.
