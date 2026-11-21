# Joel Plant Gold Plant Demolition & Rehabilitation: WBS Scheduler & South Africa Calendar Integration

## 1. Overview & Baseline
This document establishes the architecture, work breakdown structure (WBS), statutory calendar logic, and implementation plan for integrating the interactive **South African Work Calendar & Dynamic WBS Scheduler** into the `senatla-ops-internal-automation-solution` repository.

- **Feature Branch**: `feat/joel-plant-demolition-wbs-scheduler`
- **Baseline HTML Artifact**: [`docs/joel-plant-demolition-wbs-scheduler.html`](file:///C:/Users/thoso/Sankofa_mvp/senatla-ops-internal-automation-solution/docs/joel-plant-demolition-wbs-scheduler.html)
- **Primary Scope**: Demolition and Rehabilitation of Joel Plant Gold Plant across Phases 03 through 07, conforming to South African statutory holiday rules (Public Holidays Act 36 of 1994) and mining contractor holiday shutdown agreements.

---

## 2. Core Calendar & Scheduling Rules

### 2.1 Statutory & Industry Non-Working Days
1. **Weekends**: Every Saturday and Sunday are strictly non-working days.
2. **South African Statutory Public Holidays**:
   - New Year's Day (1 Jan)
   - Human Rights Day (21 Mar)
   - Good Friday (Variable Easter)
   - Family Day (Easter Monday)
   - Freedom Day (27 Apr)
   - Workers' Day (1 May)
   - Youth Day (16 Jun)
   - National Women's Day (9 Aug)
   - Heritage Day (24 Sep)
   - Day of Reconciliation (16 Dec)
   - Christmas Day (25 Dec)
   - Day of Goodwill (26 Dec)
   - **Sunday Observed Rollover**: Section 2(1) of Act 36 of 1994 provides that whenever any public holiday falls on a Sunday, the following Monday is an observed non-working public holiday.
3. **Contractor's Annual Break**:
   - Fixed shutdown from **18 December to 11 January inclusive** each year.
   - All calendar days within this window are designated non-working contractor break days.

### 2.2 Phase Sequence & Durations
The project executes sequentially through the defined operational phases:
1. **Row 1 Summary Task**: `Demolition and Rehabilitation of Joel Plant Gold Plant: Phase 03-07`
   - Start Date: `Tue 07 12 27` (Tuesday, 7 December 2027) [or configurable `Mon 07 12 26`]
   - Rollup: Total working days, calendar days, start date, and finish date calculated dynamically.
2. **Phase Sequence & Working Day Allocation**:
   - **Phase 03**: Demolition & Rehabilitation — 3 Months (~63 working days)
   - **Phase 02**: Demolition & Rehabilitation — 3 Months (~63 working days)
   - **Phase 04**: Demolition & Rehabilitation — 2 Months (~42 working days)
   - **Phase 01**: Demolition & Rehabilitation — 4 Months (~84 working days)
   - **Phase 06**: Demolition & Rehabilitation — 4 Months (~84 working days)
   - **Phase 07**: Demolition & Rehabilitation — 3 Months (~63 working days)
   - **Total Project Duration**: ~373 statutory working days (spanning ~600+ calendar days).

---


### 2.3 Duration Reconciliation Math (Workable Days vs Non-Working Weekdays)
A workable weekday is defined as any Monday through Friday. When computing the total program duration:
- **Base Working Days**: Statutory days worked according to task durations (e.g., 407 days across 19 allocated months).
- **Observed Public Holidays**: Statutory and Sunday-rollover public holidays falling on a Monday–Friday (+18 days in 2027 start / +19 days in 2026 start).
- **Contractor Break Weekdays**: Days during 18 Dec – 11 Jan shutdown falling on a Monday–Friday that are not public holidays (+32 days in 2027 start / +31 days in 2026 start).
- **Total Workable Weekdays Elapsed**: Working Days + Observed Mon-Fri Holidays + Mon-Fri Contractor Break = 457 weekdays.
- **Weekend Days**: Saturdays and Sundays (+178 days in 2027 start / +180 days in 2026 start).
- **Total Calendar Days**: 640 calendar days (Span: Tue 07 12 27 to Thu 06 09 29).

## 3. Implementation Plan (`/plan`) & Task Breakdown

### Task 1: Baseline Registration & Documentation
- [x] Create feature branch `feat/joel-plant-demolition-wbs-scheduler`.
- [x] Stage and commit standalone HTML application at `docs/joel-plant-demolition-wbs-scheduler.html`.
- [x] Author comprehensive plan and task specifications in `docs/joel-plant-demolition-wbs-scheduler.md`.
- [ ] Link artifact into `docs/client-artifact-index.md` and `docs/artifact-register.md`.

### Task 2: South Africa Statutory & Contractor Calendar Service
- [ ] Create `src/app/core/services/sa-work-calendar.service.ts`:
  - Implement anonymous Gregorian Easter algorithm (Meeus/Jones/Butcher) for Good Friday and Family Day.
  - Implement South African fixed public holidays + Sunday-to-Monday rollover rule.
  - Implement Annual Contractor Break (18 Dec – 11 Jan inclusive) detector.
  - Implement forward and backward date progression: `addWorkingDays(startDate, daysCount)`.
  - Expose API to query day classification (`WORKING`, `WEEKEND`, `HOLIDAY`, `OBSERVED_HOLIDAY`, `CONTRACTOR_BREAK`).
- [ ] Author unit tests in `src/app/core/services/sa-work-calendar.service.spec.ts` covering 2026–2029 boundary dates, Easter variations, and contractor breaks.

### Task 3: WBS Engine & Schedule State Service
- [ ] Create `src/app/core/services/wbs-scheduler.service.ts`:
  - Manage reactive state (Signals / RxJS) for project summary, phases, and activities.
  - Auto-schedule cascade from Phase 03 Task 01: when an activity duration changes, recalculate its finish date and push subsequent task starts to the next valid working day.
  - Support full CRUD: Edit activity name/duration, delete activity, duplicate/copy activity across phases, and re-order tasks.
  - Provide phase and project level duration rollups (total working days, calendar days, start/finish dates).

### Task 4: Interactive Scheduler Component & Visual Gantt Timeline
- [ ] Create standalone Angular component `src/app/pages/site-manager/components/joel-plant-scheduler/`:
  - **Summary Header**: Display Row 1 Summary Task (`Demolition and Rehabilitation of Joel Plant Gold Plant: Phase 03-07`) with total days, start date (`Tue 07 12 27`), and finish date.
  - **Visual Gantt Timeline**:
    - Color-coded phase execution bars.
    - Shaded background strips for non-working periods (weekends in gray, contractor breaks in distinct amber/coral, holidays in gold).
    - Milestone indicators for Phase start and completion dates.
  - **Phase Collapsible Tables**:
    - Interactive rows with inline editing for Activity Name, Duration (Days), Start Date, and Finish Date.
    - Action buttons: Add Task, Copy Task to another phase, Delete Task.
  - **Floating Calendar Viewer**:
    - Floating month navigator (Nov 2026 – Jan 2029) highlighting all day categories.
    - Day click to set project start date.

### Task 5: Multi-Format Exporters (MS Project XML & JSON)
- [ ] Create `src/app/core/services/wbs-export.service.ts`:
  - **MS Project XML Exporter**: Valid MSPDI schema (`http://schemas.microsoft.com/project`) with `<Calendars>`, `<CalendarHours>`, `<Exceptions>`, `<Tasks>`, `<OutlineLevel>`, and `<Predecessors>`.
  - **Monthly & Full Project JSON Exporter**: Structured schema exporting monthly working day tallies and full hierarchical WBS breakdown.
- [ ] Verify seamless import of generated `.xml` into Microsoft Project 2016/2019/365 without schema errors.

### Task 6: Review & Merge
- [ ] Run test suite (`npm test -- --watch=false`).
- [ ] Verify build (`npm run build`).
- [ ] Open Pull Request from `feat/joel-plant-demolition-wbs-scheduler` to `dev`.

---

## 4. Master Prompt for Exact Artifact Re-Creation

To re-create this exact interactive application at any time, run the prompt below in Antigravity or any modern LLM coding assistant:

```markdown
Create a single-file, production-grade interactive HTML5/JavaScript application named "south_africa_dynamic_wbs_scheduler.html" that implements an advanced South African Work Calendar and Dynamic Work Breakdown Structure (WBS) Scheduler for the Demolition and Rehabilitation of Joel Plant Gold Plant (Phases 03 through 07).

### 1. Requirements & Architectural Constraints
1. **Calendar Range & Jurisdiction**:
   - Date Span: 1 November 2026 through 31 January 2029 (27 continuous months).
   - Jurisdiction: Republic of South Africa (Public Holidays Act 36 of 1994).
   - Include all 12 statutory public holidays with dynamic Easter calculation (Good Friday, Family Day).
   - Sunday Rollover Rule: Whenever a public holiday falls on a Sunday, the following Monday is designated as an observed non-working public holiday.
   - Weekends: Every Saturday and Sunday are non-working days.
   - Contractor's Annual Break: Every year from 18 December to 11 January inclusive is strictly a non-working contractor break.
   - Day Classification Legend:
     * Working Day: Default neutral/light styling
     * Weekend: Distinct subtle gray
     * Statutory Public Holiday: Distinct crimson/rose
     * Observed Holiday (Sunday rollover): Distinct purple/indigo
     * Contractor Break (18 Dec - 11 Jan): Distinct amber/orange

2. **Phase Sequence & Durations**:
   - Sequence: Phase 03 -> Phase 02 -> Phase 04 -> Phase 01 -> Phase 06 -> Phase 07.
   - Durations:
     * Phase 03: Demolition & Rehabilitation (~3 months / ~63 working days)
     * Phase 02: Demolition & Rehabilitation (~3 months / ~63 working days)
     * Phase 04: Demolition & Rehabilitation (~2 months / ~42 working days)
     * Phase 01: Demolition & Rehabilitation (~4 months / ~84 working days)
     * Phase 06: Demolition & Rehabilitation (~4 months / ~84 working days)
     * Phase 07: Demolition & Rehabilitation (~3 months / ~63 working days)

3. **Project Summary Row (Row 1)**:
   - "Demolition and Rehabilitation of Joel Plant Gold Plant: Phase 03-07"
   - Display total working days, total calendar days, start date (formatted e.g. "Tue 07 12 27" or "Mon 07 12 26"), and calculated finish date.
   - Project Start Date selector defaults to Tue 07 12 27 (with quick toggle for Mon 07 12 26).

4. **Dynamic WBS Activity Engine**:
   - Initial activities per phase (preloaded):
     * Phase 03: Health & Safety and Environmental Compliance (Task #1, starts on project start date), Site Establishment, Confirm Phase 03 workfront release and isolation, Break up and pulverise above-ground concrete and brickwork, Expose, break up and pulverise below-ground concrete and brickwork, Cut, segregate and remove reinforcement and steel structures, Load, haul and stockpile pulverised material on site, Shape, level and clean the work area, Inspect rehabilitated area and close Phase 03, Phase 03 complete.
     * Phase 02: Confirm Phase 02 workfront release and isolation, Break up and pulverise above-ground concrete and brickwork, Expose, break up and pulverise below-ground concrete and brickwork, Cut, segregate and remove reinforcement and steel structures, Load, haul and stockpile pulverised material on site, Shape, level and clean the work area, Inspect rehabilitated area and close Phase 02, Phase 02 complete.
     * Phase 04: Confirm Phase 04 workfront release and isolation, Confirm dam workfront release and environmental controls, Break up and pulverise above-ground concrete and brickwork, Expose, break up and pulverise below-ground concrete and brickwork, Demolish and pulverise the on-site dam structures, Cut, segregate and remove reinforcement and steel structures, Load, haul and stockpile pulverised material on site, Load and haul designated material from Joel Gold Plant to Target Gold Plant, Shape, level and clean the work area, Inspect rehabilitated area and close Phase 04, Phase 04 complete.
     * Phase 01: Confirm Phase 01 workfront release and isolation, Break up and pulverise above-ground concrete and brickwork, Expose, break up and pulverise below-ground concrete and brickwork, Cut, segregate and remove reinforcement and steel structures, Load and haul pulverised material to Target Plant and stockpile on site, Shape, level and clean the work area, Inspect rehabilitated area and close Phase 01, Phase 01 complete.
     * Phase 06: Confirm Phase 06 workfront release and isolation, Break up and pulverise above-ground concrete and brickwork, Expose, break up and pulverise below-ground silo foundations, Cut, segregate and remove reinforcement and steel structures, Load, haul and stockpile pulverised material on site, Load and haul designated material from Joel Gold Plant to Target Gold Plant, Shape, level and clean the work area, Inspect rehabilitated area and close Phase 06, Phase 06 complete.
     * Phase 07: Confirm Phase 07 workfront release and isolation, Break up and pulverise above-ground concrete and brickwork, Expose, break up and pulverise below-ground concrete and brickwork, Cut, segregate and remove reinforcement and steel structures, Load, haul and stockpile pulverised material on site, Shape, level and clean the work area, Inspect rehabilitated area and close Phase 07, Phase 07 complete.
   - Activity Management Features:
     * Inline editing of task names and working day duration.
     * Adding tasks to any phase.
     * Copying tasks across phases with target phase selector modal/dropdown.
     * Deleting tasks with real-time recalculation of subsequent dates.
     * Automatic schedule cascade starting from Phase 03 Task 01 through all subsequent phases and tasks.
     * Each phase header must display its collapsible trigger, working days count, start date, and finish date.

5. **Visual Gantt Timeline**:
   - Visual Gantt chart rendering Row 1 (Overall Project) and each Phase bar horizontally proportional to time.
   - Highlights all non-working spans (weekends, contractor break, public holidays) in distinct colors.
   - Displays milestone tags with precise start and end dates.

6. **Interactive Floating Calendar & Controls**:
   - Floating month navigation pill (Prev / Next Month / Today / Jump).
   - Accordions for Total Amount Calculator and Exports closed by default.
   - Date click updates start/end constraints.

7. **Export Capabilities**:
   - Microsoft Project XML (.xml): Compliant with standard Microsoft Project MSPDI schema, containing calendar working weeks, holiday exceptions, contractor break exceptions, WBS outline codes, tasks, durations in minutes (e.g. PT64H for 8-hour days), and finish-to-start predecessor relationships.
   - JSON Export: Downloadable JSON files for active month working days tally as well as full 27-month project schedule hierarchy.

8. **Design & Styling**:
   - Modern, executive Tailwind CSS styling (via CDN) with dark/light responsive palette, clean cards, crisp badge chips, and smooth transitions.
   - Self-contained in a single executable .html file with no build step required.
```
