import { Injectable, signal, computed, effect, inject } from '@angular/core';
import {
  AdminAuditEvent,
  AttendanceAuditEvent,
  AttendanceDeliveryPayload,
  AttendanceQueueSubmission,
  AttendanceEvidence,
  Employee,
  Group,
  SyncRecord,
  DailyLog,
  Site,
  Issue,
  SafetyTalkRecord,
  FinancialType
} from '../models/app.models';
import { APP_STATE_GATEWAY, AppStateGateway, AppStateSnapshot } from '../gateways/app-state.gateway';
import { AuthService } from './auth.service';
import { RUNTIME_CONFIG } from '../config/runtime-config';

@Injectable({ providedIn: 'root' })
export class StaffDataService {
  private readonly appStateGateway = inject<AppStateGateway>(APP_STATE_GATEWAY);
  private readonly auth = inject(AuthService);
  private readonly runtimeConfig = inject(RUNTIME_CONFIG);
  private readonly hydrated = signal(false);
  private readonly persistenceEnabled = signal(false);
  private auditWriteSequence = Promise.resolve();
  private loadSequence = 0;

  currentTime = signal<Date>(new Date());
  siteName = signal<string>(this.runtimeConfig.api.mode === 'local' ? 'Senatla Shaft 1' : '');
  currentSiteId = signal<string>('');
  lastSyncTime = signal<Date | null>(null);
  unsyncedChanges = signal<boolean>(false);
  dataLoadError = signal<string | null>(null);

  safetyTalkCompleted = signal<boolean>(false);
  currentSafetyTopic = signal<string | null>(null);
  safetyTalks = signal<SafetyTalkRecord[]>([]);

  currentSafetyTalk = computed(() => {
    const today = this.currentTime().toDateString();
    return this.safetyTalks().find((talk) => talk.date.toDateString() === today) || null;
  });

  safetyTopics = signal<string[]>([]);
  syncHistory = signal<SyncRecord[]>([]);
  sites = signal<Site[]>([]);
  issues = signal<Issue[]>([]);
  groups = signal<Group[]>([]);
  financialTypes = signal<FinancialType[]>([]);
  adminAuditTrail = signal<AdminAuditEvent[]>([]);
  attendanceAuditTrail = signal<AttendanceAuditEvent[]>([]);
  attendanceQueue = signal<AttendanceQueueSubmission[]>([]);
  deliveryError = signal<string | null>(null);
  auditPersistenceError = signal<string | null>(null);

  private employeeState = signal<Employee[]>([]);

  readonly isHydrated = this.hydrated.asReadonly();
  readonly employees = this.employeeState.asReadonly();
  readonly activeSites = computed(() => this.sites().filter((site) => site.isActive));
  readonly activeFinancialTypes = computed(() => this.financialTypes().filter((type) => type.isActive));
  readonly pendingAttendanceSummary = computed(() => this.getAttendanceSummary());
  readonly latestAttendanceDelivery = computed(() => this.attendanceQueue()[0] || null);

  constructor() {
    effect(() => {
      const ready = this.auth.isReady();

      if (!ready) return;
      void this.loadForSession();
    });

    effect(() => {
      if (!this.hydrated() || !this.persistenceEnabled()) return;
      void this.saveToGateway();
    });
  }

  private async loadForSession() {
    const loadId = ++this.loadSequence;
    this.hydrated.set(false);
    this.persistenceEnabled.set(false);
    this.dataLoadError.set(null);

    try {
      const [snapshotResult, adminAuditResult, attendanceAuditResult, attendanceQueueResult] = await Promise.all([
        this.settlePromise(this.appStateGateway.loadState()),
        this.settlePromise(this.appStateGateway.loadAdminAuditTrail()),
        this.settlePromise(this.appStateGateway.loadAttendanceAuditTrail()),
        this.settlePromise(this.appStateGateway.loadAttendanceQueue()),
      ]);
      if (loadId !== this.loadSequence) return;

      const snapshot = snapshotResult.status === 'fulfilled' ? snapshotResult.value : null;
      if (snapshot) {
        this.applySnapshot(snapshot);
        this.persistenceEnabled.set(true);
      } else if (this.runtimeConfig.api.mode === 'local') {
        this.initializeDefaults();
        this.persistenceEnabled.set(true);
      } else {
        this.clearRuntimeData();
        this.dataLoadError.set('Live site data is unavailable. No local or demonstration records were loaded.');
      }

      this.adminAuditTrail.set(adminAuditResult.status === 'fulfilled' ? adminAuditResult.value : []);
      this.attendanceAuditTrail.set(attendanceAuditResult.status === 'fulfilled' ? attendanceAuditResult.value : []);
      this.attendanceQueue.set(attendanceQueueResult.status === 'fulfilled' ? attendanceQueueResult.value : []);
      this.hydrated.set(true);
    } catch {
      if (loadId !== this.loadSequence) return;
      if (this.runtimeConfig.api.mode === 'local') {
        this.initializeDefaults();
        this.persistenceEnabled.set(true);
      } else {
        this.clearRuntimeData();
        this.dataLoadError.set('Live site data could not be loaded. No local or demonstration records were loaded.');
      }
      this.hydrated.set(true);
    }
  }

  private settlePromise<T>(promise: Promise<T>) {
    return promise
      .then((value) => ({ status: 'fulfilled' as const, value }))
      .catch((reason: unknown) => ({ status: 'rejected' as const, reason }));
  }

  private applySnapshot(parsed: AppStateSnapshot) {
    this.siteName.set(this.cleanText(parsed.siteName) || 'Senatla Shaft 1');
    this.sites.set(Array.isArray(parsed.sites) ? parsed.sites.map((site: any) => this.normalizeSite(site)) : []);
    this.employeeState.set(
      Array.isArray(parsed.employees)
        ? parsed.employees.map((employee: any) => this.normalizeEmployee(employee))
        : [],
    );
    this.issues.set(
      Array.isArray(parsed.issues)
        ? parsed.issues.map((issue: any) => this.normalizeIssue(issue))
        : [],
    );
    this.groups.set(
      Array.isArray(parsed.groups)
        ? parsed.groups
            .map((group: any) => ({ id: this.generateId(group.id), name: this.cleanText(group.name) }))
            .filter((group: Group) => Boolean(group.name))
        : [],
    );
    this.financialTypes.set(parsed.financialTypes || []);
    this.safetyTopics.set(
      Array.isArray(parsed.safetyTopics)
        ? parsed.safetyTopics.map((topic: any) => this.cleanText(topic)).filter(Boolean)
        : [],
    );
    this.syncHistory.set(
      Array.isArray(parsed.syncHistory)
        ? parsed.syncHistory.map((record: any) => this.normalizeSyncRecord(record))
        : [],
    );

    this.lastSyncTime.set(parsed.lastSyncTime ? new Date(parsed.lastSyncTime) : null);
    this.safetyTalks.set(
      Array.isArray(parsed.safetyTalks)
        ? parsed.safetyTalks.map((talk: any) => ({ ...talk, date: new Date(talk.date) }))
        : [],
    );
    const today = this.currentTime().toDateString();
    const talkToday = this.safetyTalks().find((talk) => talk.date.toDateString() === today) || null;
    this.safetyTalkCompleted.set(!!talkToday);
    this.currentSafetyTopic.set(talkToday?.topic || null);
  }

  private buildSnapshot(): AppStateSnapshot {
    return {
      siteName: this.siteName(),
      sites: this.sites(),
      employees: this.employeeState(),
      issues: this.issues(),
      groups: this.groups(),
      financialTypes: this.financialTypes(),
      safetyTopics: this.safetyTopics(),
      syncHistory: this.syncHistory(),
      lastSyncTime: this.lastSyncTime()?.toISOString() || null,
      safetyTalks: this.safetyTalks()
    };
  }

  private async saveToGateway() {
    await this.appStateGateway.saveState(this.buildSnapshot());
  }

  private initializeDefaults() {
    this.sites.set([
      { id: 's1', name: 'Senatla Shaft 1', location: 'Welkom', isActive: true },
      { id: 's2', name: 'Harmony Plant B', location: 'Virginia', isActive: true }
    ]);
    this.groups.set([{ id: 'g1', name: 'Team Alpha' }, { id: 'g2', name: 'Drill Squad' }]);
    this.financialTypes.set([
      { id: 'travel', name: 'Travel Allowance', category: 'Allowance', isActive: true, isSystem: true },
      { id: 'housing', name: 'Housing Allowance', category: 'Allowance', isActive: true, isSystem: true },
      { id: 'advance', name: 'Salary Advance', category: 'Deduction', isActive: true, isSystem: true },
      { id: 'loan', name: 'Company Loan', category: 'Deduction', isActive: true, isSystem: false }
    ]);
    this.adminAuditTrail.set([]);
    this.attendanceAuditTrail.set([]);
    this.safetyTopics.set(['Heat Stress & Dehydration', 'Falls of Ground (FOG)', 'Machinery Safety', 'PPE Compliance', 'Emergency Evacuation']);
    this.employeeState.set([
      { id: '1', firstName: 'Tshepo', surname: 'Mokoena', idNumber: '9001015800080', role: 'General Worker', siteId: 's1', groupId: 'g1', startDate: '2023-01-10', basicRate: 350, salaryAdvances: 0, financials: { travel: 0, housing: 0, advance: 0 }, logs: this.generateMockLogs(), adjustments: {} },
      { id: '2', firstName: 'Johannes', surname: 'Zulu', idNumber: '8805205800080', role: 'Safety Rep', siteId: 's1', groupId: 'g1', startDate: '2022-05-15', basicRate: 450, salaryAdvances: 0, financials: { travel: 50, housing: 0, advance: 0 }, logs: this.generateMockLogs(), adjustments: {} },
      { id: '3', firstName: 'David', surname: 'Botha', idNumber: '8508125800080', role: 'Operator', siteId: 's1', groupId: 'g2', startDate: '2021-11-01', basicRate: 600, salaryAdvances: 500, financials: { travel: 100, housing: 0, advance: 500 }, logs: this.generateMockLogs(), adjustments: {} },
      { id: '4', firstName: 'Samuel', surname: 'Nkosi', idNumber: '9502285800080', role: 'General Worker', siteId: 's1', groupId: undefined, startDate: '2023-06-01', basicRate: 350, salaryAdvances: 0, financials: { travel: 0, housing: 0, advance: 0 }, logs: this.generateMockLogs(), adjustments: {} },
      { id: '5', firstName: 'Michael', surname: 'Khumalo', idNumber: '8207155800080', role: 'Driver', siteId: 's1', groupId: 'g2', startDate: '2020-03-10', basicRate: 550, salaryAdvances: 0, financials: { travel: 0, housing: 0, advance: 0 }, logs: this.generateMockLogs(), adjustments: {} }
    ]);
  }

  private clearRuntimeData() {
    this.siteName.set('');
    this.currentSiteId.set('');
    this.lastSyncTime.set(null);
    this.unsyncedChanges.set(false);
    this.safetyTalkCompleted.set(false);
    this.currentSafetyTopic.set(null);
    this.safetyTalks.set([]);
    this.safetyTopics.set([]);
    this.syncHistory.set([]);
    this.sites.set([]);
    this.issues.set([]);
    this.groups.set([]);
    this.financialTypes.set([]);
    this.adminAuditTrail.set([]);
    this.attendanceAuditTrail.set([]);
    this.employeeState.set([]);
  }

  setTime(hour: number, minute: number) { const d = new Date(); d.setHours(hour, minute, 0, 0); this.currentTime.set(d); }

  completeSafetyTalk(topic: string) {
    const newRecord: SafetyTalkRecord = {
      id: this.generateId(),
      date: new Date(this.currentTime()),
      topic,
      notes: '',
      photoUrl: ''
    };
    this.safetyTalks.update((talks) => [newRecord, ...talks]);
    this.currentSafetyTopic.set(topic);
    this.safetyTalkCompleted.set(true);
    this.recordAttendanceAudit('safety_talk_completed', `Safety talk confirmed for topic "${this.cleanText(topic)}".`);
  }

  updateSafetyTalkDetails(id: string, notes: string, photoUrl: string) {
    this.safetyTalks.update((talks) => talks.map((talk) => {
      if (talk.id === id) return { ...talk, notes: this.cleanText(notes).slice(0, 500), photoUrl: this.cleanText(photoUrl) };
      return talk;
    }));
    this.recordAttendanceAudit('safety_talk_updated', 'Safety talk notes or photo evidence updated.');
  }

  addSafetyTopic(topic: string) {
    const value = this.cleanText(topic);
    if (!value || this.safetyTopics().includes(value)) return;
    this.safetyTopics.update((current) => [...current, value]);
  }
  removeSafetyTopic(topic: string) { this.safetyTopics.update((current) => current.filter((entry) => entry !== topic)); }
  updateSafetyTopic(oldTopic: string, newTopic: string) { if (!newTopic.trim()) return; this.safetyTopics.update((current) => current.map((entry) => entry === oldTopic ? newTopic.trim() : entry)); if (this.currentSafetyTopic() === oldTopic) this.currentSafetyTopic.set(newTopic.trim()); }

  addFinancialType(name: string, category: 'Allowance' | 'Deduction') {
    const normalizedName = this.cleanText(name);
    if (!normalizedName) return;
    const newType: FinancialType = { id: this.generateId(), name: normalizedName, category, isActive: true, isSystem: false };
    this.financialTypes.update((types) => [...types, newType]);
  }
  toggleFinancialType(id: string) { this.financialTypes.update((types) => types.map((type) => { if (type.id === id && !type.isSystem) return { ...type, isActive: !type.isActive }; return type; })); }
  deleteFinancialType(id: string) { this.financialTypes.update((types) => types.filter((type) => type.id !== id || type.isSystem)); }

  addSite(site: Omit<Site, 'id' | 'isActive'>) {
    const newSite = this.normalizeSite({ ...site, id: this.generateId(), isActive: true });
    this.sites.update((current) => [...current, newSite]);
  }
  updateSite(id: string, updates: Partial<Site>) { this.sites.update((current) => current.map((site) => site.id === id ? this.normalizeSite({ ...site, ...updates, id }) : site)); }
  deleteSite(id: string) { this.sites.update((current) => current.map((site) => site.id === id ? { ...site, isActive: false } : site)); }

  addEmployee(emp: Omit<Employee, 'id' | 'logs' | 'adjustments'>) {
    const newEmp = this.normalizeEmployee({ ...emp, id: this.generateId(), logs: {}, adjustments: {} });
    this.employeeState.update((current) => [...current, newEmp]);
  }
  updateEmployee(id: string, updates: Partial<Employee>) { this.employeeState.update((current) => current.map((emp) => emp.id === id ? this.normalizeEmployee({ ...emp, ...updates, id }) : emp)); }
  deleteEmployee(id: string) { this.employeeState.update((current) => current.filter((emp) => emp.id !== id)); }

  addGroup(name: string) {
    const groupName = this.cleanText(name);
    if (!groupName) return;
    const newGroup: Group = { id: this.generateId(), name: groupName };
    this.groups.update((current) => [...current, newGroup]);
  }
  assignGroup(empId: string, groupId: string | undefined) { this.employeeState.update((employees) => employees.map((employee) => employee.id === empId ? { ...employee, groupId } : employee)); }

  recordAdminAudit(action: AdminAuditEvent['action'], details?: string, actor = this.currentActor()) {
    const entry: AdminAuditEvent = {
      id: this.generateId(),
      action,
      occurredAt: new Date(this.currentTime()),
      actor,
      details: this.cleanText(details) || undefined,
    };
    this.adminAuditTrail.update((events) => [entry, ...events].slice(0, 25));
    this.queueAuditWrite(() => this.appStateGateway.appendAdminAuditEvent(entry));
  }

  resolveIssue(id: string, note: string) { this.updateIssueStatus(id, 'Resolved', note); }
  escalateIssue(id: string, note: string) { this.updateIssueStatus(id, 'Escalated', note); }
  private updateIssueStatus(id: string, status: 'Resolved' | 'Escalated', note: string) {
    const actor = this.currentActor();
    this.issues.update((issues) => issues.map((issue) => {
      if (issue.id !== id) return issue;
      return {
        ...issue,
        status,
        auditTrail: [...issue.auditTrail, { date: new Date(this.currentTime()), action: this.cleanText(note) || status, user: actor }],
      };
    }));
  }

  setManualAdjustment(empId: string, month: number, year: number, week: number, days: number) {
    const key = `${year}-${month}-${week}`;
    const safeDays = this.clampNumber(days, 0, 31);
    this.employeeState.update((employees) => employees.map((employee) => {
      if (employee.id !== empId) return employee;
      return { ...employee, adjustments: { ...employee.adjustments, [key]: safeDays } };
    }));
  }
  getManualAdjustment(empId: string, month: number, year: number, week: number): number { const emp = this.employeeState().find((employee) => employee.id === empId); if (!emp) return 0; const key = `${year}-${month}-${week}`; return emp.adjustments[key] || 0; }

  readonly timeStatus = computed(() => {
    const now = this.currentTime();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    if (hours < 15 || (hours === 15 && minutes < 30)) return 'normal';
    if ((hours === 15 && minutes >= 30) || hours === 16) return 'warning_1';
    if (hours === 17 && minutes <= 5) return 'warning_2';
    if (hours >= 17 || hours < 6) return 'blocked';
    if (hours === 6) return 'late_window';
    if (hours >= 7 && hours < 9) return 'critical_late';
    return 'normal';
  });

  calculateMonthlyPayroll(empId: string, month: number, year: number) {
    const emp = this.employeeState().find((employee) => employee.id === empId); if (!emp) return null;

    let automatedDays = 0;
    Object.values(emp.logs).forEach((log) => {
      const date = new Date(log.date);
      if (date.getMonth() === month && date.getFullYear() === year && log.status === 'present') {
        automatedDays++;
      }
    });

    let adjustmentDays = 0;
    for (let week = 1; week <= 5; week++) {
      adjustmentDays += (emp.adjustments[`${year}-${month}-${week}`] || 0);
    }

    const totalDays = Math.max(0, automatedDays + adjustmentDays);
    const grossWages = totalDays * emp.basicRate;

    let totalAllowances = 0;
    let totalDeductions = 0;

    this.financialTypes().forEach((type) => {
      if (!type.isActive) return;
      const amount = emp.financials[type.id] || 0;
      if (type.category === 'Allowance') totalAllowances += amount;
      if (type.category === 'Deduction') totalDeductions += amount;
    });

    const advance = emp.salaryAdvances || 0;
    const uifDeduction = (grossWages + totalAllowances) * 0.01;
    const totalEarnings = grossWages + totalAllowances;
    const netPay = totalEarnings - uifDeduction - totalDeductions - advance;

    return { daysWorked: totalDays, automatedDays, adjustmentDays, grossWages, allowances: totalAllowances, deductions: totalDeductions, salaryAdvances: advance, uifDeduction, totalEarnings, netPay };
  }

  generateCSV(month: number, year: number, options: { includeFullIdNumbers?: boolean } = {}): string {
    const header = 'ID Number,Surname,First Name,Site,Days Worked,Manual Adj,Basic Rate,Gross Wage,Allowances,Deductions,Advances,UIF Deduction,Net Pay\n';
    const rows = this.employeeState().map((emp) => {
      const payroll = this.calculateMonthlyPayroll(emp.id, month, year);
      if (!payroll) return '';
      const siteName = this.sites().find((site) => site.id === emp.siteId)?.name || 'Unknown';
      const idNumber = options.includeFullIdNumbers ? emp.idNumber : this.maskIdNumber(emp.idNumber);
      return `${idNumber},${emp.surname},${emp.firstName},${siteName},${payroll.daysWorked},${payroll.adjustmentDays},${emp.basicRate},${payroll.grossWages},${payroll.allowances},${payroll.deductions},${payroll.salaryAdvances},${payroll.uifDeduction.toFixed(2)},${payroll.netPay.toFixed(2)}`;
    }).join('\n');
    return header + rows;
  }

  exportPayrollCsv(
    month: number,
    year: number,
    options: { includeFullIdNumbers?: boolean; confirmationText?: string } = {},
  ) {
    const includeFullIdNumbers = !!options.includeFullIdNumbers;
    if (includeFullIdNumbers && this.cleanText(options.confirmationText).toUpperCase() !== 'EXPORT') {
      throw new Error('Type EXPORT to unlock a full-ID payroll export.');
    }

    const csvData = this.generateCSV(month, year, { includeFullIdNumbers });
    this.recordAdminAudit(
      includeFullIdNumbers ? 'full_payroll_export' : 'masked_payroll_export',
      `${this.monthName(month)} ${year} payroll export`,
    );
    return {
      csvData,
      sensitivitySuffix: includeFullIdNumbers ? 'full-ids' : 'masked-ids',
    };
  }

  async performSync(signature: string, isRolloverAck: boolean = false, workDate = this.getTodayStr()) {
    const status = this.determineSyncStatus();
    const summary = this.getAttendanceSummary(workDate);
    const site = this.sites().find((entry) => entry.name === this.siteName()) || this.sites()[0];
    if (!site) throw new Error('An assigned site is required before attendance can be delivered.');
    const rows = this.employeeState().filter((employee) => employee.siteId === site.id).map((employee) => {
      const log = employee.logs[workDate] || { date: workDate, status: 'pending' as const };
      return { employeeId: employee.id, status: log.status, reason: log.reason, comment: log.comment, isFlagged: log.isFlagged };
    });
    const payload: AttendanceDeliveryPayload = { siteId: site.id, workDate, rows, summary, timingStatus: status, acknowledgedWarning: isRolloverAck, safetyTopic: this.currentSafetyTopic() || 'None Recorded' };
    const idempotencyKey = `attendance:${site.id}:${workDate}`;
    this.deliveryError.set(null);
    let delivery: AttendanceQueueSubmission;
    try {
      delivery = await this.appStateGateway.submitAttendance(payload, idempotencyKey);
      this.attendanceQueue.update((entries) => [delivery, ...entries.filter((entry) => entry.id !== delivery.id)]);
    } catch (error) {
      this.deliveryError.set(error instanceof Error ? error.message : 'Attendance delivery failed.');
      this.unsyncedChanges.set(true);
      throw error;
    }
    this.syncHistory.update((history) => [{ siteId: site.id, syncTime: this.currentTime(), status, acknowledgedWarning: isRolloverAck, signatureData: signature, safetyTopic: payload.safetyTopic, actor: this.currentActor(), attendanceSummary: summary }, ...history]);
    this.recordAttendanceAudit('sync_submitted', `Daily sync submitted with ${summary.present} present, ${summary.absent} absent, ${summary.pending} pending.`);
    this.lastSyncTime.set(this.currentTime());
    this.unsyncedChanges.set(delivery.outcome !== 'accepted');
    if (delivery.outcome !== 'accepted') this.deliveryError.set(delivery.lastError || 'Attendance delivery requires attention.');
    return delivery;
  }

  async retryAttendanceDelivery(submissionId: string) {
    this.deliveryError.set(null);
    try {
      const delivery = await this.appStateGateway.retryAttendance(submissionId);
      this.attendanceQueue.update((entries) => [delivery, ...entries.filter((entry) => entry.id !== delivery.id)]);
      this.unsyncedChanges.set(delivery.outcome !== 'accepted');
      if (delivery.outcome !== 'accepted') this.deliveryError.set(delivery.lastError || 'Attendance delivery remains retryable.');
      return delivery;
    } catch (error) {
      this.deliveryError.set(error instanceof Error ? error.message : 'Attendance retry failed.');
      throw error;
    }
  }
  private determineSyncStatus(): 'On Time' | 'Late' | 'Critical' | 'Rollover' {
    const status = this.timeStatus();
    if (status === 'late_window') return 'Late';
    if (status === 'critical_late') return 'Critical';
    if (status === 'normal' || status === 'warning_1' || status === 'warning_2') return 'On Time';
    return 'Rollover';
  }

  setSiteName(name: string) { this.siteName.set(this.cleanText(name).slice(0, 80) || (this.runtimeConfig.api.mode === 'local' ? 'Senatla Shaft 1' : '')); }
  setCurrentSite(siteId: string, siteName: string) {
    this.currentSiteId.set(this.cleanText(siteId));
    this.setSiteName(siteName);
  }
  updateStatus(empId: string, dateStr: string, newStatus: DailyLog['status'], evidence?: DailyLog['evidence']) {
    this.unsyncedChanges.set(true);
    const todayStr = this.getTodayStr();
    if (dateStr > todayStr) return;
    const isRetroactive = dateStr < todayStr;
    const employee = this.employeeState().find((entry) => entry.id === empId);
    const employeeName = employee ? `${employee.firstName} ${employee.surname}` : 'Unknown employee';

    this.employeeState.update((employees) => employees.map((employee) => {
      if (employee.id !== empId) return employee;
      const oldLog = employee.logs[dateStr] || { date: dateStr, status: 'pending' };
      if (oldLog.status === newStatus) return employee;

      const updatedLog: DailyLog = {
        ...oldLog,
        status: newStatus,
        reason: newStatus === 'absent' ? oldLog.reason || 'Sick' : null,
        evidence: newStatus === 'present' ? evidence ?? oldLog.evidence ?? null : null,
        isFlagged: isRetroactive ? true : oldLog.isFlagged,
        lastUpdated: new Date(this.currentTime()),
      };
      return { ...employee, logs: { ...employee.logs, [dateStr]: updatedLog } };
    }));
    this.recordAttendanceAudit(
      newStatus === 'present'
        ? 'attendance_marked_present'
        : newStatus === 'absent'
          ? 'attendance_marked_absent'
          : 'attendance_marked_pending',
      `${employeeName} marked ${newStatus} for ${dateStr}${isRetroactive ? ' (retroactive)' : ''}.`,
      empId,
      employeeName,
    );
  }

  updateReason(empId: string, dateStr: string, reason: DailyLog['reason']) {
    this.unsyncedChanges.set(true);
    const employee = this.employeeState().find((entry) => entry.id === empId);
    const employeeName = employee ? `${employee.firstName} ${employee.surname}` : 'Unknown employee';
    this.employeeState.update((employees) => employees.map((employee) => {
      if (employee.id !== empId) return employee;
      const log = employee.logs[dateStr];
      if (!log) return employee;
      return { ...employee, logs: { ...employee.logs, [dateStr]: { ...log, reason } } };
    }));
    this.recordAttendanceAudit('attendance_reason_updated', `${employeeName} absence reason set to ${reason || 'None'} for ${dateStr}.`, empId, employeeName);
  }
  updateComment(empId: string, dateStr: string, comment: string) {
    this.unsyncedChanges.set(true);
    const employee = this.employeeState().find((entry) => entry.id === empId);
    const employeeName = employee ? `${employee.firstName} ${employee.surname}` : 'Unknown employee';
    this.employeeState.update((employees) => employees.map((employee) => {
      if (employee.id !== empId) return employee;
      const log = employee.logs[dateStr] || { date: dateStr, status: 'pending' };
      return { ...employee, logs: { ...employee.logs, [dateStr]: { ...log, comment: this.cleanText(comment).slice(0, 280) } } };
    }));
    this.recordAttendanceAudit('attendance_comment_updated', `${employeeName} comment updated for ${dateStr}.`, empId, employeeName);
  }

  private getTodayStr(): string {
    const current = this.currentTime();
    const year = current.getFullYear();
    const month = `${current.getMonth() + 1}`.padStart(2, '0');
    const day = `${current.getDate()}`.padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  private generateMockLogs(): Record<string, DailyLog> { const today = this.getTodayStr(); return { [today]: { date: today, status: 'present' } }; }
  maskIdNumber(idNumber: string): string {
    const trimmed = this.cleanText(idNumber);
    if (trimmed.length <= 4) return trimmed;
    return `${trimmed.slice(0, 2)}${'*'.repeat(Math.max(trimmed.length - 4, 0))}${trimmed.slice(-2)}`;
  }
  searchableIdNumber(idNumber: string, includeSensitiveValue: boolean): string {
    return includeSensitiveValue ? this.cleanText(idNumber).toLowerCase() : this.maskIdNumber(idNumber).toLowerCase();
  }
  private recordAttendanceAudit(
    action: AttendanceAuditEvent['action'],
    details: string,
    employeeId?: string,
    employeeName?: string,
  ) {
    const entry: AttendanceAuditEvent = {
      id: this.generateId(),
      action,
      occurredAt: new Date(this.currentTime()),
      actor: this.currentActor(),
      employeeId,
      employeeName,
      siteId: employeeId
        ? this.employeeState().find((employee) => employee.id === employeeId)?.siteId
        : this.currentSiteId() || undefined,
      details: this.cleanText(details) || undefined,
    };
    this.attendanceAuditTrail.update((events) => [entry, ...events].slice(0, 40));
    this.queueAuditWrite(() => this.appStateGateway.appendAttendanceAuditEvent(entry));
  }

  private queueAuditWrite(write: () => Promise<void>) {
    this.auditWriteSequence = this.auditWriteSequence
      .then(write)
      .then(() => this.auditPersistenceError.set(null))
      .catch((error: unknown) => {
        this.auditPersistenceError.set(error instanceof Error ? error.message : 'Audit event persistence failed.');
      });
  }

  private getAttendanceSummary(dateStr = this.getTodayStr()) {
    const today = dateStr;
    return this.employeeState().reduce(
      (summary, employee) => {
        const log = employee.logs[today] || { date: today, status: 'pending' as const };
        if (log.status === 'present') summary.present += 1;
        if (log.status === 'absent') summary.absent += 1;
        if (log.status === 'pending') summary.pending += 1;
        if (log.isFlagged) summary.flagged += 1;
        if (log.evidence?.photoDataUrl) summary.evidenceCount += 1;
        return summary;
      },
      { present: 0, absent: 0, pending: 0, flagged: 0, evidenceCount: 0 },
    );
  }

  private monthName(month: number) {
    return new Date(2000, month, 1).toLocaleDateString('en-US', { month: 'short' });
  }
  private cleanText(value: unknown): string { return typeof value === 'string' ? value.trim() : ''; }
  private clampNumber(value: unknown, min: number, max: number): number {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return min;
    return Math.min(max, Math.max(min, numeric));
  }
  private generateId(seed?: string): string {
    const value = this.cleanText(seed);
    return value || Math.random().toString(36).slice(2, 11);
  }
  private normalizeSite(site: Partial<Site>): Site {
    return {
      id: this.generateId(site.id),
      name: this.cleanText(site.name) || 'Unnamed Site',
      location: this.cleanText(site.location) || 'Unknown',
      managerId: this.cleanText(site.managerId) || undefined,
      isActive: site.isActive ?? true,
    };
  }
  private normalizeEmployee(employee: Partial<Employee>): Employee {
    const financials = { ...(employee.financials || {}) };
    const travel = this.clampNumber(financials['travel'] ?? employee.travelAllowance ?? 0, 0, 1_000_000);
    const housing = this.clampNumber(financials['housing'] ?? employee.housingAllowance ?? 0, 0, 1_000_000);
    const advance = this.clampNumber(financials['advance'] ?? 0, 0, 1_000_000);

    return {
      id: this.generateId(employee.id),
      firstName: this.cleanText(employee.firstName) || 'Unknown',
      surname: this.cleanText(employee.surname) || 'Employee',
      idNumber: this.cleanText(employee.idNumber),
      role: employee.role || 'General Worker',
      siteId: this.cleanText(employee.siteId),
      groupId: this.cleanText(employee.groupId) || undefined,
      startDate: this.cleanText(employee.startDate) || this.getTodayStr(),
      basicRate: this.clampNumber(employee.basicRate, 0, 1_000_000),
      salaryAdvances: this.clampNumber(employee.salaryAdvances, 0, 1_000_000),
      financials: {
        ...financials,
        travel,
        housing,
        advance,
      },
      logs: this.normalizeLogs(employee.logs),
      adjustments: employee.adjustments || {},
      travelAllowance: travel,
      housingAllowance: housing,
      taxRefNumber: this.cleanText(employee.taxRefNumber) || undefined,
    };
  }

  private normalizeLogs(logs: Employee['logs'] | undefined): Employee['logs'] {
    if (!logs || typeof logs !== 'object') return {};

    return Object.entries(logs).reduce<Employee['logs']>((normalized, [date, log]) => {
        const currentLog = log || { date, status: 'pending' };
        normalized[date] = {
          ...currentLog,
          date,
          lastUpdated: currentLog.lastUpdated ? new Date(currentLog.lastUpdated) : undefined,
          evidence: this.normalizeEvidence(currentLog.evidence),
        };
        return normalized;
      }, {});
  }

  private normalizeEvidence(evidence: AttendanceEvidence | null | undefined): AttendanceEvidence | null {
    if (!evidence?.photoDataUrl) return null;
    return {
      photoDataUrl: this.cleanText(evidence.photoDataUrl),
      capturedAt: new Date(evidence.capturedAt),
      location: evidence.location && Number.isFinite(evidence.location.latitude) && Number.isFinite(evidence.location.longitude)
        ? {
            latitude: evidence.location.latitude,
            longitude: evidence.location.longitude,
          }
        : null,
    };
  }

  private normalizeIssue(issue: Partial<Issue>): Issue {
    return {
      id: this.generateId(issue.id),
      siteId: this.cleanText(issue.siteId),
      reportedBy: this.cleanText(issue.reportedBy) || 'Unknown',
      dateReported: new Date(issue.dateReported || this.currentTime()),
      category: issue.category || 'Operations',
      description: this.cleanText(issue.description),
      status: issue.status || 'Open',
      auditTrail: Array.isArray(issue.auditTrail)
        ? issue.auditTrail.map((entry) => ({
            date: new Date(entry.date),
            action: this.cleanText(entry.action),
            user: this.cleanText(entry.user) || 'Unknown',
          }))
        : [],
    };
  }

  private normalizeSyncRecord(record: Partial<SyncRecord>): SyncRecord {
    return {
      siteId: this.cleanText(record.siteId) || this.siteName(),
      syncTime: new Date(record.syncTime || this.currentTime()),
      status: record.status || 'On Time',
      acknowledgedWarning: !!record.acknowledgedWarning,
      signatureData: this.cleanText(record.signatureData) || undefined,
      safetyTopic: this.cleanText(record.safetyTopic) || undefined,
      actor: this.cleanText(record.actor) || undefined,
      attendanceSummary: record.attendanceSummary
        ? {
            present: this.clampNumber(record.attendanceSummary.present, 0, 100000),
            absent: this.clampNumber(record.attendanceSummary.absent, 0, 100000),
            pending: this.clampNumber(record.attendanceSummary.pending, 0, 100000),
            flagged: this.clampNumber(record.attendanceSummary.flagged, 0, 100000),
            evidenceCount: this.clampNumber(record.attendanceSummary.evidenceCount, 0, 100000),
          }
        : undefined,
    };
  }

  private currentActor(): string {
    return this.auth.currentSession()?.displayName || 'Unknown User';
  }
}

