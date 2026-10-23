import { CommonModule, DatePipe } from '@angular/common';
import { Component, ElementRef, ViewChild, inject, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AttendanceCommentChange, AttendanceReasonChange, AttendanceRowComponent, AttendanceStatusChange } from '../../components/attendance-row.component';
import { TimesheetSummaryComponent } from '../../components/timesheet-summary.component';
import { DailyLog, Employee } from 'src/app/core/models/app.models';
import { StaffDataService } from 'src/app/core/services/staff-data.service';
import { TimesheetRegisterService } from 'src/app/core/services/timesheet-register.service';
import { SiteReadinessRow } from 'src/app/core/gateways/readiness.gateway';
import { SiteReadinessService } from 'src/app/core/services/site-readiness.service';
import { readFileAsDataUrl } from '../../core/utils/browser-file.util';
import { toLocalDateKey } from '../../core/utils/date.util';

@Component({
  selector: 'app-site-manager',
  templateUrl: './site-manager.component.html',
  styleUrls: ['./site-manager.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe, AttendanceRowComponent, TimesheetSummaryComponent],
})
export class SiteManagerComponent {
  service = inject(StaffDataService);
  readonly readiness = inject(SiteReadinessService);
  private readonly timesheetRegister = inject(TimesheetRegisterService);
  @ViewChild('sigCanvas') sigCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('canvasContainer') canvasContainer!: ElementRef<HTMLDivElement>;
  @ViewChild('photoInput') photoInput!: ElementRef<HTMLInputElement>;

  selectedDate = new Date(this.service.currentTime());
  searchTerm = '';
  filterGroup: string | null = null;
  localSiteName = '';
  showGroupModal = false;
  newGroupName = '';
  reasonsList: Array<NonNullable<DailyLog['reason']>> = ['Sick', 'Family', 'AWOL', 'Confirm in Office'];
  showDailySetup = true;
  siteLocationLabel = 'Location not captured yet.';
  siteLocationWarning = '';
  plannedTargets = '';
  tripAssetId = '';
  tripCurrentKm: number | null = null;
  tripReason = '';
  tripCustomReason = '';
  tripLocationLabel = 'Trip location not captured yet.';
  tripLocationWarning = '';
  tripLogs: Array<{ assetId: string; assetLabel: string; km: number | null; reason: string; customReason: string; location: string; capturedAt: Date }> = [];
  readonly tripReasons = ['Fuel', 'Delivery', 'Collection', 'Maintenance', 'Breakdown support', 'Client instruction', 'Other'];

  selectedSafetyTopic: string | null = null;
  isManagingTopics = false;
  newTopicName = '';

  showSafetyDetailModal = false;
  tempSafetyDetails: any = {};

  showPhotoModal = false;
  photoTargetEmp: Employee | null = null;
  capturedPhoto: string | null = null;
  capturedLocationLabel = 'Location not captured yet.';
  locationWarning = '';

  showSignatureModal = false;
  showRolloverModal = false;
  rolloverAcknowledged = false;

  isDrawing = false;
  hasSigned = false;
  private ctx!: CanvasRenderingContext2D;
  readonly latestSyncRecord = computed(() => this.service.syncHistory()[0] || null);
  readonly recentAttendanceAudit = computed(() => this.service.attendanceAuditTrail().slice(0, 6));
  readonly deliveryBusy = signal(false);
  readonly siteAssets = computed(() => this.readiness.assetRows());

  constructor() {
    this.localSiteName = this.service.siteName();
    void this.initializeReadiness();
  }


  async captureCurrentSiteLocation() {
    const location = await this.captureGpsLabel('site');
    this.siteLocationLabel = location.label;
    this.siteLocationWarning = location.warning;
  }

  async confirmDailySetup() {
    const selectedSite = this.readiness.selectedSite();
    if (!selectedSite || !this.readiness.canProceed() || !this.plannedTargets.trim() || !this.siteLocationLabel.includes(',')) {
      this.siteLocationWarning = 'Confirm an authorized ready site, planned work targets, and current GPS location before starting the day.';
      return;
    }
    if (!await this.readiness.confirmSelectedSite()) {
      this.siteLocationWarning = 'Live readiness changed or could not be confirmed. Refresh and review before continuing.';
      return;
    }
    this.service.setCurrentSite(selectedSite.id, selectedSite.name);
    this.localSiteName = selectedSite.name;
    this.showDailySetup = false;
  }

  async selectReadinessSite(siteId: string) {
    await this.readiness.selectSite(siteId);
    const selectedSite = this.readiness.selectedSite();
    if (selectedSite) {
      this.service.setCurrentSite(selectedSite.id, selectedSite.name);
      this.localSiteName = selectedSite.name;
    }
  }

  async refreshReadiness() { await this.readiness.refresh(); }

  async captureTripLocation() {
    const location = await this.captureGpsLabel('trip');
    this.tripLocationLabel = location.label;
    this.tripLocationWarning = location.warning;
  }

  logTripAway() {
    const asset = this.siteAssets().find((entry) => entry.entityId === this.tripAssetId) || null;
    if (!asset || !this.tripReason || !this.tripLocationLabel.includes(',')) {
      this.tripLocationWarning = 'Select an asset or vehicle, capture GPS, and choose a reason before logging a trip away.';
      return;
    }

    this.tripLogs = [{
      assetId: asset.entityId,
      assetLabel: this.assetLabel(asset),
      km: this.tripCurrentKm,
      reason: this.tripReason,
      customReason: this.tripCustomReason.trim(),
      location: this.tripLocationLabel,
      capturedAt: new Date(this.service.currentTime()),
    }, ...this.tripLogs].slice(0, 8);

    this.tripAssetId = '';
    this.tripCurrentKm = null;
    this.tripReason = '';
    this.tripCustomReason = '';
    this.tripLocationLabel = 'Trip location not captured yet.';
    this.tripLocationWarning = '';
  }

  assetLabel(asset: SiteReadinessRow) { return asset.entityLabel; }

  private async captureGpsLabel(context: 'site' | 'trip') {
    if (!navigator.geolocation) {
      return { label: context === 'site' ? 'Proceeding without GPS fix.' : 'Trip GPS unavailable.', warning: 'Browser geolocation is unavailable on this device.' };
    }

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 });
      });
      const { latitude, longitude } = position.coords;
      return { label: `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`, warning: '' };
    } catch {
      return { label: context === 'site' ? 'No GPS fix captured.' : 'Trip GPS not captured.', warning: 'Location capture failed. Check location permissions and try again.' };
    }
  }
  handleAttendanceToggle(emp: Employee) {
    if (this.isFuture || this.service.timeStatus() === 'blocked') return;

    const currentStatus = this.getLog(emp).status;
    if (currentStatus !== 'present') {
      this.photoTargetEmp = emp;
      this.capturedPhoto = null;
      this.capturedLocationLabel = 'Location not captured yet.';
      this.locationWarning = '';
      this.showPhotoModal = true;
      setTimeout(() => this.photoInput?.nativeElement?.click(), 50);
    } else {
      this.service.updateStatus(emp.id, this.selectedDateStr, 'absent');
    }
  }

  setAttendanceStatus(emp: Employee, status: DailyLog['status']) {
    if (this.isFuture || this.service.timeStatus() === 'blocked' || this.getLog(emp).status === status) return;
    if (status === 'present') {
      this.photoTargetEmp = emp;
      this.capturedPhoto = null;
      this.capturedLocationLabel = 'Location not captured yet.';
      this.locationWarning = '';
      this.showPhotoModal = true;
      setTimeout(() => this.photoInput?.nativeElement?.click(), 50);
      return;
    }
    this.service.updateStatus(emp.id, this.selectedDateStr, status);
  }

  triggerPhotoInput() {
    this.photoInput?.nativeElement?.click();
  }

  async onPhotoSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }

    this.capturedPhoto = await readFileAsDataUrl(file);
    await this.captureLocation();
  }

  async captureLocation() {
    if (!navigator.geolocation) {
      this.locationWarning = 'Browser geolocation is unavailable on this device.';
      this.capturedLocationLabel = 'Proceeding without GPS fix.';
      return;
    }

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        });
      });

      const { latitude, longitude } = position.coords;
      this.capturedLocationLabel = `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
      this.locationWarning = '';
    } catch {
      this.locationWarning = 'Location capture failed. Attendance can continue, but the log will show no GPS proof.';
      this.capturedLocationLabel = 'No GPS fix captured.';
    }
  }

  confirmAttendance() {
    if (!this.photoTargetEmp || !this.capturedPhoto) {
      return;
    }

    const evidence = { photoDataUrl: this.capturedPhoto, capturedAt: new Date(this.service.currentTime()), location: this.parseLocation() };
    this.service.updateStatus(this.photoTargetEmp.id, this.selectedDateStr, 'present', evidence);
    this.closePhotoModal();
  }

  closePhotoModal() {
    this.showPhotoModal = false;
    this.photoTargetEmp = null;
    this.capturedPhoto = null;
    this.capturedLocationLabel = 'Location not captured yet.';
    this.locationWarning = '';
    if (this.photoInput?.nativeElement) {
      this.photoInput.nativeElement.value = '';
    }
  }

  confirmSafetyTalk() {
    if (this.selectedSafetyTopic) {
      this.service.completeSafetyTalk(this.selectedSafetyTopic);
    }
  }

  openSafetyDetailModal() {
    const current = this.service.currentSafetyTalk();
    this.tempSafetyDetails = current
      ? { ...current }
      : { topic: this.service.currentSafetyTopic(), date: new Date(this.service.currentTime()), notes: '' };
    this.showSafetyDetailModal = true;
  }

  saveSafetyDetails() {
    if (this.tempSafetyDetails.id) {
      this.service.updateSafetyTalkDetails(
        this.tempSafetyDetails.id,
        this.tempSafetyDetails.notes,
        this.tempSafetyDetails.photoUrl
      );
    }
    this.showSafetyDetailModal = false;
  }

  toggleManageTopics() { this.isManagingTopics = !this.isManagingTopics; this.newTopicName = ''; }
  addTopic() { if (this.newTopicName) { this.service.addSafetyTopic(this.newTopicName); this.newTopicName = ''; } }
  deleteTopic(topic: string) { if (confirm(`Remove "${topic}"?`)) { this.service.removeSafetyTopic(topic); if (this.selectedSafetyTopic === topic) this.selectedSafetyTopic = null; } }

  setupCanvas() {
    if (!this.sigCanvas) return;
    const canvas = this.sigCanvas.nativeElement;
    const container = this.canvasContainer.nativeElement;
    canvas.width = container.offsetWidth;
    canvas.height = container.offsetHeight;
    this.ctx = canvas.getContext('2d')!;
    this.ctx.lineWidth = 3;
    this.ctx.lineCap = 'round';
    this.ctx.strokeStyle = '#000';
  }

  startDrawing(e: MouseEvent | TouchEvent) {
    this.isDrawing = true; this.hasSigned = true;
    const pos = this.getPos(e);
    this.ctx.beginPath(); this.ctx.moveTo(pos.x, pos.y); e.preventDefault();
  }

  draw(e: MouseEvent | TouchEvent) {
    if (!this.isDrawing) return;
    const pos = this.getPos(e);
    this.ctx.lineTo(pos.x, pos.y); this.ctx.stroke(); e.preventDefault();
  }

  stopDrawing() { this.isDrawing = false; }
  clearSignature() { if (!this.ctx) return; this.ctx.clearRect(0, 0, this.sigCanvas.nativeElement.width, this.sigCanvas.nativeElement.height); this.hasSigned = false; }
  getPos(e: MouseEvent | TouchEvent) { const canvas = this.sigCanvas.nativeElement; const rect = canvas.getBoundingClientRect(); const clientX = (e instanceof MouseEvent) ? e.clientX : e.touches[0].clientX; const clientY = (e instanceof MouseEvent) ? e.clientY : e.touches[0].clientY; return { x: clientX - rect.left, y: clientY - rect.top }; }

  get selectedDateStr() { return toLocalDateKey(this.selectedDate); }
  get isFuture() { return this.selectedDateStr > toLocalDateKey(this.service.currentTime()); }
  get isFutureLimit() { return false; }
  getLog(emp: Employee): DailyLog { return emp.logs[this.selectedDateStr] || { date: this.selectedDateStr, status: 'pending' }; }
  getGroupName(id: string) { return this.service.groups().find(g => g.id === id)?.name || 'Unknown'; }

  filteredEmployees() {
    return this.service.employees().filter(e => {
      const matchesSearch = e.firstName.toLowerCase().includes(this.searchTerm.toLowerCase()) || e.surname.toLowerCase().includes(this.searchTerm.toLowerCase());
      const matchesGroup = this.filterGroup ? e.groupId === this.filterGroup : true;
      return matchesSearch && matchesGroup;
    });
  }

  registerSummary() {
    return this.timesheetRegister.summarize(
      this.timesheetRegister.buildRows(this.filteredEmployees(), this.service.sites(), this.selectedDateStr),
    );
  }

  changeDate(days: number) {
    const newDate = new Date(this.selectedDate);
    newDate.setDate(this.selectedDate.getDate() + days);
    this.selectedDate = newDate;
  }

  onAttendanceStatusChange(change: AttendanceStatusChange) { this.setAttendanceStatus(change.employee, change.status); }
  onAttendanceReasonChange(change: AttendanceReasonChange) { this.service.updateReason(change.employeeId, this.selectedDateStr, change.reason); }
  onAttendanceCommentChange(change: AttendanceCommentChange) { this.service.updateComment(change.employeeId, this.selectedDateStr, change.comment); }
  updateSiteName() {
    const selectedSite = this.readiness.selectedSite();
    if (selectedSite) this.localSiteName = selectedSite.name;
  }
  createGroup() { if (this.newGroupName) { this.service.addGroup(this.newGroupName); this.newGroupName = ''; this.showGroupModal = false; } }

  toggleGroupSelect(emp: Employee) {
    if (this.filterGroup && !emp.groupId) this.service.assignGroup(emp.id, this.filterGroup);
    else if (emp.groupId) this.service.assignGroup(emp.id, undefined);
  }

  handleSync() {
    const status = this.service.timeStatus();
    if (status === 'late_window' || status === 'critical_late') {
      this.showRolloverModal = true;
    } else {
      this.openSignatureModal();
    }
  }

  continueLateSync() {
    if (!this.rolloverAcknowledged) {
      return;
    }
    this.showRolloverModal = false;
    this.openSignatureModal();
  }

  openSignatureModal() {
    this.showSignatureModal = true;
    setTimeout(() => this.setupCanvas(), 100);
  }

  async submitSyncWithSignature() {
    const sig = this.sigCanvas.nativeElement.toDataURL();
    this.deliveryBusy.set(true);
    try {
      await this.service.performSync(sig, this.rolloverAcknowledged, this.selectedDateStr);
      this.showSignatureModal = false;
      this.rolloverAcknowledged = false;
    } finally {
      this.deliveryBusy.set(false);
    }
  }

  async retryAttendanceDelivery(submissionId: string) {
    this.deliveryBusy.set(true);
    try { await this.service.retryAttendanceDelivery(submissionId); }
    finally { this.deliveryBusy.set(false); }
  }

  private async initializeReadiness() {
    await this.readiness.initialize();
    const selectedSite = this.readiness.selectedSite();
    if (selectedSite) {
      this.service.setCurrentSite(selectedSite.id, selectedSite.name);
      this.localSiteName = selectedSite.name;
    }
  }

  private parseLocation() {
    if (this.capturedLocationLabel.includes(',')) {
      const [latitude, longitude] = this.capturedLocationLabel.split(',').map((value) => Number(value.trim()));
      if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
        return { latitude, longitude };
      }
    }
    return null;
  }

}
