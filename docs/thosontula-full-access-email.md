# Subject: Senatla Ops (UAT) – Full Access Credentials & Workflow Guide (Director, Office Admin & Site Manager)

**To:** Thoso Ntula <thosontula@gmail.com>  
**From:** Senatla Operations Engineering Team  
**Subject:** Senatla Ops (UAT) – Full Access Credentials & Workflow Guide (Director, Office Admin & Site Manager)  

---

Hi Thoso,

Your administrator account has been granted **full cross-workspace access** to the Senatla Operations platform across all three operational domains: **Director**, **Office Admin**, and **Site Manager**.

Below are your credentials, the onboarding flow, direct workflow entry points, and details on UAT user routing.

---

### 1. Credentials & Portal Access

* **UAT Testing Portal (Landing Page):** [https://senatla-ops-uat.vercel.app/landing](https://senatla-ops-uat.vercel.app/landing)
* **Username / Work Email:** `thosontula@gmail.com`
* **Temporary Password:** `Sen4t!aFullAccessThoso2026!`
* **Assigned Role:** Director *(with Permanent Developer Override & Cross-Workspace Switching)*

---

### 2. Available Workflows & Direct Links

Because your account holds elevated developer privileges, you can navigate and test all areas of the system without needing separate accounts:

1. **Director Executive Operations (`/director`)**
   * *URL:* [https://senatla-ops-uat.vercel.app/director](https://senatla-ops-uat.vercel.app/director)
   * *Capabilities:* Period actuals, executive KPI rollups, attendance tracking, compliance risk queue, asset readiness overview, and multi-domain financial oversight.
2. **Office Admin Control Centre (`/office-admin`)**
   * *URL:* [https://senatla-ops-uat.vercel.app/office-admin](https://senatla-ops-uat.vercel.app/office-admin)
   * *Capabilities:* The 8 modular sub-features: Workforce/People registers, site allocations, daily timesheet audits, facility locations, operational issues, vendor registers, governance audit logs, and serverless batch data exports.
3. **Site Manager 5-Step Guided Shift Flow (`/site-manager`)**
   * *URL:* [https://senatla-ops-uat.vercel.app/site-manager](https://senatla-ops-uat.vercel.app/site-manager)
   * *Capabilities:* Full field experience:
     * *Step 1:* Site Setup & Headcount Readiness.
     * *Step 2:* Toolbox Safety Talk Protocol (unlocks attendance).
     * *Step 3:* Daily Attendance Register & Roll-Call with photo/biometrics.
     * *Step 4:* Fuel Logging (hourly burn / odometer), equipment breakdown tickets, and scrap gate dwell timer (2.5 min).
     * *Step 5:* Shift review, supervisor canvas signature, and atomic offline sync.
4. **Specialized Multi-Domain Dashboards (`/dashboards`)**
   * *URL:* [https://senatla-ops-uat.vercel.app/dashboards](https://senatla-ops-uat.vercel.app/dashboards)
   * *Capabilities:* Overall Macro Scope, Engineering 70:30 Profit Split Engine (with Anti-Inflation Expense Lock), Demolition & Rehabilitation portfolio tracking (BOQ margins & scrap salvage credits), and Underground Works standby status.
5. **Asset Register & OCR Intake (`/asset-register`)**
   * *URL:* [https://senatla-ops-uat.vercel.app/asset-register](https://senatla-ops-uat.vercel.app/asset-register)
   * *Capabilities:* Camera/photo license disc OCR parsing, serial identification, and machinery fleet inspection.

---

### 3. Step-by-Step On-Boarding Flow

1. **Open the Portal:**
   * Go to [https://senatla-ops-uat.vercel.app/landing](https://senatla-ops-uat.vercel.app/landing) and click **Sign In** (or navigate to `/login/director`).
2. **Sign In with Temporary Password:**
   * Username: `thosontula@gmail.com`
   * Password: `Sen4t!aFullAccessThoso2026!`
3. **Set Permanent Password:**
   * The system will detect your first-time login and prompt for a permanent password.
   * Enter a password of at least 12 characters (meeting upper, lower, numeric, and symbol rules).
4. **Register a 4- or 5-Digit Security PIN:**
   * Set your personal PIN (e.g. `58291`) which serves as your second-factor verification for future password recovery.
5. **Seamless Cross-Workspace Navigation:**
   * You can switch between Director, Office Admin, and Site Manager either by using the in-app navigation headers or by bookmarking the direct URLs above.

---

### 4. UAT Routing Note (`<username>+UAT@domain`)

All UAT test users configured with `<username>+UAT@<domain>` (such as `maggie+UAT@senatlatrading.com`) are configured to land at:
**[https://senatla-ops-uat.vercel.app/landing](https://senatla-ops-uat.vercel.app/landing)**

* Any attempts by `+UAT` users to sign in through the production domain (`senatla-ops.vercel.app`) will automatically detect the test tag and guide them directly to the UAT landing page.
* All test notifications and password recovery messages route safely back to the user's primary mailbox.

Please reach out if you require any adjustments to your test sites or permissions.

Warm regards,  
**Senatla Operations Team**  
