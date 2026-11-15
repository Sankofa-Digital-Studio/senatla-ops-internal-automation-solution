import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const { Presentation, PresentationFile } = await import(pathToFileURL('C:/Program Files/WindowsApps/OpenAI.CodexPrimaryRuntime.v26-1112-737-0_26.1112.737.0_x64__3k8sg7r9htsxt/dependencies/node/node_modules/@oai/artifact-tool/dist/artifact_tool.mjs').href);

const root = process.cwd();
const outDir = path.join(root, 'output', 'client-current-version');
const buildDir = path.join(root, '.codex-build', 'client-current-version');
await fs.mkdir(outDir, { recursive: true });
await fs.mkdir(buildDir, { recursive: true });

const navy = '#071A33';
const navy2 = '#0D2A4A';
const teal = '#16B8A6';
const orange = '#F59E0B';
const red = '#D94C4C';
const ink = '#10233C';
const muted = '#53657A';
const pale = '#F4F7FA';
const white = '#FFFFFF';
const font = 'Arial';

const presentation = Presentation.create({ slideSize: { width: 1280, height: 720 } });
presentation.theme.colorScheme = {
  name: 'Senatla Client Review',
  themeColors: { accent1: teal, accent2: orange, accent3: red, accent4: navy2, accent5: '#7B61FF', accent6: '#4C9AFF', bg1: white, bg2: pale, tx1: ink, tx2: muted, dk1: '#000000', dk2: navy, lt1: white, lt2: '#DCE6EF', hlink: teal, folHlink: '#7B61FF' },
};

function box(slide, x, y, w, h, fill = 'none', lineFill = 'none', radius = 0) {
  return slide.shapes.add({ geometry: radius ? 'roundRect' : 'rect', position: { left: x, top: y, width: w, height: h }, fill, line: { style: 'solid', fill: lineFill, width: lineFill === 'none' ? 0 : 1 }, ...(radius ? { borderRadius: radius } : {}) });
}
function text(slide, value, x, y, w, h, style = {}) {
  const s = slide.shapes.add({ geometry: 'textbox', position: { left: x, top: y, width: w, height: h }, fill: 'none', line: { style: 'solid', fill: 'none', width: 0 } });
  s.text = value;
  s.text.style = { fontFamily: font, fontSize: 20, color: ink, ...style };
  return s;
}
function title(slide, value, kicker, dark = false) {
  text(slide, kicker.toUpperCase(), 64, 44, 520, 22, { fontSize: 13, bold: true, color: dark ? '#9EDDD5' : teal, letterSpacing: 1.2 });
  text(slide, value, 64, 76, 960, 72, { fontSize: 34, bold: true, color: dark ? white : ink });
}
function footer(slide, page, dark = false) {
  text(slide, `Senatla Ops  |  Client review  |  v0.5.7 release candidate`, 64, 680, 760, 18, { fontSize: 11, color: dark ? '#A9BBCD' : '#6D7D8C' });
  text(slide, String(page).padStart(2, '0'), 1180, 680, 36, 18, { fontSize: 11, bold: true, color: dark ? '#A9BBCD' : '#6D7D8C', align: 'right' });
}
function addNotes(slide, notes) { slide.speakerNotes.text = notes; }
function bullet(slide, value, x, y, w, color = ink, size = 19) {
  text(slide, '•', x, y, 20, 26, { fontSize: size, bold: true, color: teal });
  text(slide, value, x + 26, y, w - 26, 40, { fontSize: size, color });
}
const imageCache = new Map();
function image(slide, file, alt, x, y, w, h, fit = 'cover') {
  slide.images.add({ blob: imageCache.get(file), contentType: 'image/png', alt, fit, position: { left: x, top: y, width: w, height: h }, geometry: 'roundRect', borderRadius: 'rounded-xl' });
}

for (const file of [
  path.join(root, 'docs', 'visuals', 'senatla-ops-mobile-concept.png'),
  path.join(root, 'docs', 'visuals', 'senatla-ops-asset-lifecycle-story.png'),
  path.join(root, 'docs', 'visuals', 'senatla-ops-desktop-concept.png'),
]) {
  const bytes = await fs.readFile(file);
  imageCache.set(file, bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));
}

// 1 Cover
{
  const s = presentation.slides.add(); s.background.fill = navy;
  box(s, 0, 0, 1280, 720, navy); box(s, 0, 0, 18, 720, teal);
  text(s, 'SENATLA OPS', 72, 76, 360, 32, { fontSize: 16, bold: true, color: '#B9F1E9', letterSpacing: 2 });
  text(s, 'Current application journey', 72, 180, 820, 100, { fontSize: 48, bold: true, color: white });
  text(s, 'Client review of the platform from field capture to accountable oversight', 76, 300, 700, 60, { fontSize: 24, color: '#D7E2EC' });
  text(s, 'Current release candidate: v0.5.7  |  Preview/UAT reference: senatla-ops-uat.vercel.app', 76, 608, 850, 24, { fontSize: 14, color: '#A9BBCD' });
  text(s, 'Prepared for Senatla Trading', 76, 650, 400, 22, { fontSize: 14, bold: true, color: orange });
  addNotes(s, 'Sources: README.md, metadata.json, docs/release-notes-0.5.7.md, docs/environments.md. UAT route verified from the hosted preview landing page on 14 November 2026.');
}

// 2 Product outcome
{
  const s = presentation.slides.add(); s.background.fill = pale; title(s, 'One operating record for the whole day', 'Product outcome');
  text(s, 'Senatla Ops connects field activity, workforce controls, asset evidence, approvals and director oversight so teams can act from the same source record.', 64, 170, 760, 74, { fontSize: 24, color: muted });
  const qs = [
    ['01', 'Are people present, safe and synchronized?'],
    ['02', 'Which exceptions need action now?'],
    ['03', 'Where is each asset and is it safe to use?'],
    ['04', 'Which approvals and financial controls remain open?'],
    ['05', 'Can each decision be traced to evidence?'],
  ];
  qs.forEach(([n, v], i) => { const y = 286 + i * 64; text(s, n, 70, y, 48, 28, { fontSize: 15, bold: true, color: teal }); text(s, v, 130, y, 650, 32, { fontSize: 21, color: ink }); box(s, 64, y + 40, 720, 1, '#D7E2EC'); });
  box(s, 860, 176, 320, 330, navy, 'none', 'rounded-2xl');
  text(s, 'Current release position', 900, 220, 240, 30, { fontSize: 18, bold: true, color: '#9EDDD5' });
  text(s, 'v0.5.7', 900, 268, 220, 70, { fontSize: 44, bold: true, color: white });
  text(s, 'Release candidate with current profile controls, role guidance, scope selection, job-card improvements and session caching.', 900, 354, 240, 110, { fontSize: 18, color: '#D7E2EC' });
  footer(s, 2); addNotes(s, 'Sources: docs/client-senatla-ops-planning-requirements-guidance.md, docs/release-notes-0.5.7.md, README.md.');
}

// 3 Flow
{
  const s = presentation.slides.add(); s.background.fill = white; title(s, 'The operating flow', 'How work moves through the application');
  const stages = [
    ['1', 'Capture', 'Site manager records attendance, safety, inspections and evidence.'],
    ['2', 'Validate', 'Rules check identity, completeness, role and site scope.'],
    ['3', 'Resolve', 'Office teams work exceptions, issues, assets, payroll and vendors.'],
    ['4', 'Approve', 'A named reviewer completes the maker-checker decision.'],
    ['5', 'Oversee', 'Director views source-backed readiness, cost and risk.'],
  ];
  stages.forEach(([n, h, b], i) => { const x = 64 + i * 236; box(s, x, 210, 204, 250, i === 0 ? '#E9FBF7' : '#F7F9FB', i === 0 ? '#9EDDD5' : '#D7E2EC', 'rounded-xl'); text(s, n, x + 22, 232, 34, 34, { fontSize: 20, bold: true, color: teal }); text(s, h, x + 22, 284, 160, 34, { fontSize: 24, bold: true, color: ink }); text(s, b, x + 22, 338, 160, 96, { fontSize: 16, color: muted }); if (i < stages.length - 1) text(s, '›', x + 210, 300, 26, 34, { fontSize: 32, bold: true, color: orange }); });
  text(s, 'The application keeps the handoff visible. Each transition carries the actor, timestamp, source evidence and allowed next action.', 64, 520, 1100, 48, { fontSize: 22, color: ink, bold: true });
  footer(s, 3); addNotes(s, 'Sources: docs/client-senatla-ops-planning-requirements-guidance.md, docs/architecture.md, docs/director-flow-v0.5.6.md.');
}

// 4 Roles
{
  const s = presentation.slides.add(); s.background.fill = pale; title(s, 'Three role-shaped journeys', 'Who uses which part');
  const roles = [
    ['Site Manager', 'Complete the site day', ['Readiness', 'Attendance', 'Safety talk', 'Inspections', 'Evidence and sync'], teal],
    ['Office Administrator', 'Resolve exceptions', ['Workforce and sites', 'Issues and payroll', 'Assets and vendors', 'Requests and approvals', 'Exports and audit'], orange],
    ['Director or Reviewer', 'Decide with evidence', ['Readiness and cost', 'Operational risks', 'Approval queue', 'Drill-down records', 'Maker-checker review'], '#7B61FF'],
  ];
  roles.forEach(([h, sub, items, color], i) => { const x = 64 + i * 382; box(s, x, 190, 350, 390, white, '#D7E2EC', 'rounded-xl'); box(s, x, 190, 350, 10, color, 'none', 'rounded-xl'); text(s, h, x + 28, 232, 290, 34, { fontSize: 25, bold: true, color: ink }); text(s, sub, x + 28, 278, 290, 26, { fontSize: 18, color: muted }); items.forEach((it, j) => bullet(s, it, x + 28, 340 + j * 42, 290, ink, 17)); });
  footer(s, 4); addNotes(s, 'Sources: docs/client-senatla-ops-planning-requirements-guidance.md, README.md, hosted UAT landing page role-based access section.');
}

// 5 Field workflow
{
  const s = presentation.slides.add(); s.background.fill = white; title(s, 'Field work stays usable when connectivity changes', 'Daily site workflow');
  image(s, path.join(root, 'docs', 'visuals', 'senatla-ops-mobile-concept.png'), 'Mobile field workflow reference', 64, 166, 430, 430, 'contain');
  text(s, 'A site manager starts with the day, not the database.', 560, 188, 540, 44, { fontSize: 27, bold: true, color: ink });
  const steps = [
    ['01', 'Confirm site readiness', 'The role sees only the actions needed for the site day.'],
    ['02', 'Record attendance and safety', 'Submissions remain attributable to the person and site.'],
    ['03', 'Capture inspection evidence', 'Failed checks become visible exceptions or work orders.'],
    ['04', 'Synchronize and close', 'Offline items stay queued until the server confirms them.'],
  ];
  steps.forEach(([n, h, b], i) => { const y = 270 + i * 82; text(s, n, 560, y, 38, 28, { fontSize: 15, bold: true, color: teal }); text(s, h, 620, y, 400, 28, { fontSize: 20, bold: true, color: ink }); text(s, b, 620, y + 28, 470, 40, { fontSize: 16, color: muted }); });
  footer(s, 5); addNotes(s, 'Image source: docs/visuals/senatla-ops-mobile-concept.png. The image is a design reference with illustrative data, not a live operational record. Workflow claims: docs/client-senatla-ops-planning-requirements-guidance.md and README.md.');
}

// 6 Checks
{
  const s = presentation.slides.add(); s.background.fill = pale; title(s, 'Checks that protect the operating record', 'Control points');
  const cols = [
    ['Implemented in the product', teal, ['Role-aware routes and workspace guidance', 'Asset identifiers require serial, VIN or plate', 'Audit events preserve actor, time, action and entity', 'Human review before OCR data becomes authoritative']],
    ['Verified in release evidence', orange, ['v0.5.7 typecheck and production build passed', 'Preview and production promotion records exist', 'Responsive and contract test suites are part of the gate', 'Session cache clears when a user signs out']],
    ['Needs confirmation', red, ['Physical Android and iOS OCR UAT', 'Pilot sites and pilot asset list', 'Named reviewers and custody owners', 'Evidence-retention periods and export rules']],
  ];
  cols.forEach(([h, color, items], i) => { const x = 64 + i * 382; box(s, x, 188, 350, 418, white, '#D7E2EC', 'rounded-xl'); text(s, h, x + 26, 220, 300, 50, { fontSize: 22, bold: true, color }); items.forEach((it, j) => { text(s, '✓', x + 28, 300 + j * 68, 22, 28, { fontSize: 20, bold: true, color }); text(s, it, x + 62, 300 + j * 68, 250, 50, { fontSize: 17, color: ink }); }); });
  footer(s, 6); addNotes(s, 'Sources: docs/release-notes-0.5.7.md, docs/ocr-device-uat.md, docs/client-senatla-ops-planning-requirements-guidance.md, docs/environments.md.');
}

// 7 Asset story
{
  const s = presentation.slides.add(); s.background.fill = white; title(s, 'Assets follow one controlled lifecycle', 'Asset and maintenance flow');
  image(s, path.join(root, 'docs', 'visuals', 'senatla-ops-asset-lifecycle-story.png'), 'Asset lifecycle story reference', 64, 170, 620, 430, 'contain');
  text(s, 'Identity → inspection → defect → repair → independent return', 740, 190, 440, 44, { fontSize: 24, bold: true, color: ink });
  const states = [['Active', teal], ['Maintenance', orange], ['Blocked', red], ['Return approved', '#7B61FF']];
  states.forEach(([v, c], i) => { const y = 286 + i * 70; box(s, 740, y, 280, 42, c, 'none', 'rounded-xl'); text(s, v, 760, y + 8, 240, 24, { fontSize: 18, bold: true, color: white }); if (i < states.length - 1) text(s, '↓', 1028, y + 7, 30, 26, { fontSize: 20, bold: true, color: muted }); });
  text(s, 'The dossier keeps custody, meters, compliance evidence and audit history when responsibility changes.', 740, 586, 440, 52, { fontSize: 18, color: muted });
  footer(s, 7); addNotes(s, 'Image source: docs/visuals/senatla-ops-asset-lifecycle-story.png. Lifecycle claims: docs/client-senatla-ops-planning-requirements-guidance.md and supabase/migrations/20261031050606_prestart_inspection_safety_blocks.sql.');
}

// 8 Director
{
  const s = presentation.slides.add(); s.background.fill = pale; title(s, 'The director sees what needs attention next', 'Executive oversight');
  image(s, path.join(root, 'docs', 'visuals', 'senatla-ops-desktop-concept.png'), 'Desktop operational command design reference', 64, 170, 740, 420, 'contain');
  text(s, 'Evidence-first oversight', 860, 202, 320, 36, { fontSize: 26, bold: true, color: ink });
  bullet(s, 'Pending approvals stay connected to their evidence.', 860, 284, 330, ink, 17);
  bullet(s, 'Readiness and cost indicators lead back to source records.', 860, 350, 330, ink, 17);
  bullet(s, 'Freshness is explicit so stale data is not mistaken for current status.', 860, 416, 330, ink, 17);
  bullet(s, 'The director reviews and decides, while server-side policy protects the boundary.', 860, 482, 330, ink, 17);
  footer(s, 8); addNotes(s, 'Image source: docs/visuals/senatla-ops-desktop-concept.png. It is a design reference with illustrative concept data, not a live operational record. Director flow: docs/director-flow-v0.5.6.md.');
}

// 9 UAT
{
  const s = presentation.slides.add(); s.background.fill = navy; title(s, 'UAT shows the access boundary before sign in', 'Preview evidence', true);
  box(s, 64, 188, 520, 360, '#123453', 'none', 'rounded-xl');
  text(s, 'Hosted UAT preview', 100, 224, 360, 30, { fontSize: 19, bold: true, color: '#9EDDD5' });
  text(s, 'senatla-ops-uat.vercel.app/landing', 100, 276, 420, 40, { fontSize: 22, bold: true, color: white });
  text(s, 'The preview entry screen exposes the role model, capabilities, assurance controls and employee sign-in route without exposing operational records.', 100, 348, 420, 108, { fontSize: 18, color: '#D7E2EC' });
  text(s, 'Screen captured from UAT preview for this review', 100, 494, 420, 24, { fontSize: 13, color: '#A9BBCD' });
  text(s, 'What remains open', 660, 210, 400, 34, { fontSize: 26, bold: true, color: white });
  bullet(s, 'Signed Android and iOS device execution for OCR-3.', 660, 286, 480, '#D7E2EC', 18);
  bullet(s, 'All 25 required access and device outcomes must pass.', 660, 358, 480, '#D7E2EC', 18);
  bullet(s, 'Screenshots and detailed logs remain in controlled private evidence storage.', 660, 430, 480, '#D7E2EC', 18);
  text(s, 'UAT status: implemented gate, physical-device execution pending.', 660, 532, 500, 32, { fontSize: 17, bold: true, color: orange });
  footer(s, 9, true); addNotes(s, 'UAT route verified from hosted preview landing page on 14 November 2026. Source: docs/ocr-device-uat.md. The deck does not embed private signed-in data or credentials. The preview screen itself is protected from client data by the access boundary.');
}

// 10 Confirmation
{
  const s = presentation.slides.add(); s.background.fill = white; title(s, 'Client confirmation areas', 'Decisions needed to move forward');
  const items = [
    ['Pilot scope', 'Which sites and assets enter the first controlled pilot?'],
    ['Ownership', 'Who owns custody, evidence review and return-to-service decisions?'],
    ['Vocabulary', 'Which asset classes, statuses and site groupings should be standard?'],
    ['Evidence rules', 'How long should photos, signatures, invoices and audit exports be retained?'],
    ['Approvals', 'Who may approve payroll, vendor, asset and operational requests?'],
    ['Success measures', 'Which readiness, safety, downtime and reconciliation measures define acceptance?'],
  ];
  items.forEach(([h, b], i) => { const col = i % 2; const row = Math.floor(i / 2); const x = 64 + col * 580; const y = 186 + row * 138; text(s, `${String(i + 1).padStart(2, '0')}`, x, y, 42, 28, { fontSize: 15, bold: true, color: teal }); text(s, h, x + 62, y, 240, 30, { fontSize: 21, bold: true, color: ink }); text(s, b, x + 62, y + 34, 460, 54, { fontSize: 17, color: muted }); box(s, x, y + 100, 520, 1, '#D7E2EC'); });
  footer(s, 10); addNotes(s, 'Sources: docs/client-senatla-ops-planning-requirements-guidance.md, docs/ocr-device-uat.md, docs/client-artifact-index.md.');
}

// 11 close
{
  const s = presentation.slides.add(); s.background.fill = navy; box(s, 0, 0, 1280, 720, navy); box(s, 0, 0, 18, 720, orange);
  text(s, 'CURRENT POSITION', 72, 92, 300, 24, { fontSize: 14, bold: true, color: '#F7C66B', letterSpacing: 1.2 });
  text(s, 'A usable operating foundation is in place.', 72, 144, 850, 110, { fontSize: 44, bold: true, color: white });
  text(s, 'The next release decision depends on controlled UAT evidence and client confirmation of pilot scope, ownership and acceptance measures.', 76, 296, 760, 74, { fontSize: 24, color: '#D7E2EC' });
  box(s, 76, 452, 450, 84, '#123453', 'none', 'rounded-xl'); text(s, 'Next step', 104, 470, 100, 22, { fontSize: 14, bold: true, color: '#9EDDD5' }); text(s, 'Confirm the pilot and UAT decision owners', 104, 500, 360, 24, { fontSize: 20, bold: true, color: white });
  text(s, 'Thank you', 76, 620, 220, 28, { fontSize: 20, bold: true, color: orange });
  footer(s, 11, true); addNotes(s, 'Sources: README.md, docs/client-senatla-ops-planning-requirements-guidance.md, docs/release-notes-0.5.7.md, docs/ocr-device-uat.md.');
}

const pptx = await PresentationFile.exportPptx(presentation);
const finalPath = path.join(outDir, 'Senatla-Ops-Client-Current-Version-Review.pptx');
await pptx.save(finalPath);
for (let i = 0; i < presentation.slides.items.length; i++) {
  const preview = await presentation.export({ slide: presentation.slides.items[i], format: 'png', scale: 1 });
  await fs.writeFile(path.join(buildDir, `slide-${String(i + 1).padStart(2, '0')}.png`), new Uint8Array(await preview.arrayBuffer()));
}
const montage = await presentation.export({ format: 'webp', montage: { columns: 3, width: 1200 } });
await fs.writeFile(path.join(buildDir, 'deck-montage.webp'), new Uint8Array(await montage.arrayBuffer()));
console.log(JSON.stringify({ finalPath, slideCount: presentation.slides.items.length, buildDir }));
