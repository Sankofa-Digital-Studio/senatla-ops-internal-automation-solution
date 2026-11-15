import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const runtimeNodeModules = 'C:/Program Files/WindowsApps/OpenAI.CodexPrimaryRuntime.v26-1112-737-0_26.1112.737.0_x64__3k8sg7r9htsxt/dependencies/node/node_modules';
process.env.RUNTIME_NODE_MODULES = runtimeNodeModules;
process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES = runtimeNodeModules;
const skillDir = 'C:/Users/thoso/.codex/plugins/cache/openai-primary-runtime/presentations/26.1112.11217/skills/presentations';
const root = process.cwd();
const buildDir = path.join(root, '.codex-build', 'detailed-findings');
const outputDir = path.join(root, 'output', 'client-current-version');
const finalPath = path.join(outputDir, 'Senatla-Ops-Detailed-Findings-Review.pptx');
const stagingDir = path.join(root, '.codex-finalizer', 'detailed-findings');
await fs.mkdir(buildDir, { recursive: true });
await fs.mkdir(outputDir, { recursive: true });
await fs.mkdir(stagingDir, { recursive: true });

const { Presentation, PresentationFile } = await import(pathToFileURL(path.join(runtimeNodeModules, '@oai/artifact-tool/dist/artifact_tool.mjs')).href);

const navy = '#071A33';
const navy2 = '#0D2A4A';
const teal = '#16B8A6';
const orange = '#F59E0B';
const red = '#D94C4C';
const green = '#1B7340';
const ink = '#10233C';
const muted = '#53657A';
const pale = '#F4F7FA';
const white = '#FFFFFF';
const line = '#D6E1E9';
const font = 'Arial';
const presentation = Presentation.create({ slideSize: { width: 1280, height: 720 } });
presentation.theme.colorScheme = { name: 'Senatla Detailed Findings', themeColors: { accent1: teal, accent2: orange, accent3: red, accent4: navy2, accent5: '#7B61FF', accent6: '#4C9AFF', bg1: white, bg2: pale, tx1: ink, tx2: muted, dk1: '#000000', dk2: navy, lt1: white, lt2: '#DCE6EF', hlink: teal, folHlink: '#7B61FF' } };

function box(slide, x, y, w, h, fill = 'none', lineFill = 'none', radius = 0) {
  return slide.shapes.add({ geometry: radius ? 'roundRect' : 'rect', position: { left: x, top: y, width: w, height: h }, fill, line: { style: 'solid', fill: lineFill, width: lineFill === 'none' ? 0 : 1 }, ...(radius ? { borderRadius: radius } : {}) });
}
function text(slide, value, x, y, w, h, style = {}) {
  const s = slide.shapes.add({ geometry: 'textbox', position: { left: x, top: y, width: w, height: h }, fill: 'none', line: { style: 'solid', fill: 'none', width: 0 } });
  s.text = value;
  s.text.style = { fontFamily: font, fontSize: 18, color: ink, ...style };
  return s;
}
function title(slide, value, kicker, dark = false) {
  text(slide, kicker.toUpperCase(), 64, 42, 600, 22, { fontSize: 13, bold: true, color: dark ? '#9EDDD5' : teal, letterSpacing: 1.2 });
  text(slide, value, 64, 78, 1080, 58, { fontSize: 34, bold: true, color: dark ? white : ink });
}
function footer(slide, page, dark = false) {
  text(slide, 'Senatla Ops  |  Detailed findings  |  v0.5.8', 64, 680, 760, 18, { fontSize: 11, color: dark ? '#A9BBCD' : '#6D7D8C' });
  text(slide, String(page).padStart(2, '0'), 1180, 680, 36, 18, { fontSize: 11, bold: true, color: dark ? '#A9BBCD' : '#6D7D8C', align: 'right' });
}
function rule(slide, x, y, w, color = line) { box(slide, x, y, w, 2, color); }
function bullet(slide, value, x, y, w, color = ink, size = 19) {
  text(slide, '•', x, y, 18, 24, { fontSize: size, bold: true, color: teal });
  text(slide, value, x + 26, y, w - 26, 42, { fontSize: size, color });
}
function note(slide, value) { slide.speakerNotes.text = value; }
function finding(slide, number, label, body, severity, y) {
  const tone = severity === 'High' ? red : severity === 'Medium' ? orange : teal;
  text(slide, String(number).padStart(2, '0'), 72, y, 40, 24, { fontSize: 14, bold: true, color: tone });
  text(slide, label, 126, y, 270, 26, { fontSize: 18, bold: true, color: ink });
  text(slide, body, 420, y, 650, 42, { fontSize: 16, color: muted });
  text(slide, severity.toUpperCase(), 1110, y + 2, 90, 20, { fontSize: 11, bold: true, color: tone, align: 'right', letterSpacing: 0.8 });
  rule(slide, 72, y + 48, 1128);
}

// 1. Cover
{
  const s = presentation.slides.add(); s.background.fill = navy; box(s, 0, 0, 1280, 720, navy); box(s, 0, 0, 18, 720, teal);
  text(s, 'SENATLA OPS', 72, 78, 360, 28, { fontSize: 16, bold: true, color: '#B9F1E9', letterSpacing: 2 });
  text(s, 'Detailed product findings', 72, 190, 900, 80, { fontSize: 48, bold: true, color: white });
  text(s, 'What is working, where trust can break, and the shortest path to a stronger operating product', 76, 300, 760, 70, { fontSize: 24, color: '#D7E2EC' });
  box(s, 76, 510, 360, 62, navy2, '#1D4667', 8);
  text(s, 'Prepared for Thosontula', 100, 528, 300, 22, { fontSize: 16, bold: true, color: white });
  text(s, '15 November 2026  |  Release candidate v0.5.8', 76, 650, 620, 22, { fontSize: 14, color: '#A9BBCD' });
  note(s, 'Source: docs/product-teardown-2026-11-15.md, docs/site-manager-phase-plan.md, README.md, and docs/release-notes-0.5.8.md.');
}

// 2. Verdict
{
  const s = presentation.slides.add(); s.background.fill = pale; title(s, 'The product has a credible core', 'Executive verdict');
  text(s, 'The strongest idea is an evidence-backed operating heartbeat that connects field activity, office controls, and director decisions.', 64, 158, 820, 62, { fontSize: 24, color: muted });
  box(s, 64, 270, 530, 250, white, line, 10); text(s, 'THE DIAMOND', 92, 302, 260, 20, { fontSize: 13, bold: true, color: teal, letterSpacing: 1.2 });
  text(s, 'A trustworthy chain from work performed to evidence captured to decision made.', 92, 342, 430, 100, { fontSize: 30, bold: true, color: ink });
  box(s, 654, 270, 510, 74, white, line, 8); text(s, '1', 682, 294, 28, 28, { fontSize: 20, bold: true, color: teal }); text(s, 'Keep the evidence chain visible at the point of action.', 730, 294, 390, 28, { fontSize: 18, color: ink });
  box(s, 654, 366, 510, 74, white, line, 8); text(s, '2', 682, 390, 28, 28, { fontSize: 20, bold: true, color: orange }); text(s, 'Make recovery states plain enough for field pressure.', 730, 390, 390, 28, { fontSize: 18, color: ink });
  box(s, 654, 462, 510, 74, white, line, 8); text(s, '3', 682, 486, 28, 28, { fontSize: 20, bold: true, color: red }); text(s, 'Prove adoption before adding more modules.', 730, 486, 390, 28, { fontSize: 18, color: ink });
  footer(s, 2); note(s, 'Source: product teardown verdict and diamonds. The three actions are a synthesis of the documented priority sequence.');
}

// 3. Strengths
{
  const s = presentation.slides.add(); s.background.fill = white; title(s, 'The diamonds are defensible', 'What already works');
  const items = [
    ['Evidence before commitment', 'OCR, approvals, audit events, and source-backed metrics create records that can be defended.'],
    ['Role-specific lanes', 'Site, office, and director workspaces reflect different responsibilities instead of forcing one screen on everyone.'],
    ['Operational heartbeat', 'Attendance, safety, assets, approvals, and costs connect into one operating picture.'],
    ['Accountable handovers', 'Custody, approvals, onboarding, and synchronization preserve who acted and what changed.'],
  ];
  items.forEach((item, i) => { const x = 64 + (i % 2) * 580; const y = 170 + Math.floor(i / 2) * 190; box(s, x, y, 520, 142, pale, line, 10); text(s, String(i + 1).padStart(2, '0'), x + 24, y + 22, 40, 22, { fontSize: 14, bold: true, color: teal }); text(s, item[0], x + 82, y + 20, 390, 28, { fontSize: 20, bold: true, color: ink }); text(s, item[1], x + 82, y + 62, 400, 55, { fontSize: 16, color: muted }); });
  text(s, 'Polish rule: every strength becomes more valuable when it appears at the exact moment a user commits, approves, syncs, or hands over work.', 64, 584, 1100, 40, { fontSize: 19, bold: true, color: navy2 });
  footer(s, 3); note(s, 'Source: product teardown, section “The diamonds”.');
}

// 4. Adversarial findings
{
  const s = presentation.slides.add(); s.background.fill = pale; title(s, 'The failure modes are mostly trust failures', 'Devil’s advocate');
  text(s, 'The product can be technically correct and still lose confidence if the user cannot tell what is safe, current, or complete.', 64, 148, 980, 44, { fontSize: 20, color: muted });
  finding(s, 1, 'Platform before tool', 'The capability surface is broad. New users may understand the architecture without knowing what to do in the first five minutes.', 'High', 230);
  finding(s, 2, 'Demo data leakage', 'Local fixtures and recovery affordances must remain unmistakably separate from hosted operational records.', 'High', 310);
  finding(s, 3, 'Hidden audit proof', 'Auditability is strong in the system but can sit behind a tab when the decision needs evidence in the moment.', 'Medium', 390);
  finding(s, 4, 'Offline ambiguity', 'Saved locally, waiting to sync, rejected, duplicated, and committed need different plain-language states.', 'High', 470);
  finding(s, 5, 'Value proof gap', 'The landing page explains responsibility better than measurable operational outcomes.', 'Medium', 550);
  footer(s, 4); note(s, 'Source: product teardown, devil’s advocate findings. Severity is a prioritisation judgement, not a measured incident rate.');
}

// 5. Role friction
{
  const s = presentation.slides.add(); s.background.fill = white; title(s, 'Each role needs a different first decision', 'Role-by-role findings');
  const roles = [
    ['Site Manager', teal, '“Can I start safely?”', 'Needs readiness, attendance, sync state, blockers, and handover in one shift-level loop.', 'Risk: a local draft can look complete before signed synchronization.'],
    ['Office Administrator', orange, '“What needs correction?”', 'Needs the highest-risk exception, source record, owner, and audit action without searching every register.', 'Risk: control-centre breadth can hide the one exception that matters now.'],
    ['Director / Reviewer', '#7B61FF', '“What deserves a decision?”', 'Needs evidence state, decision queue, accountable owner, and downstream consequence in one review path.', 'Risk: a summary can be persuasive while source provenance remains one click away.'],
  ];
  roles.forEach((role, i) => { const x = 64 + i * 390; box(s, x, 174, 350, 340, pale, line, 10); box(s, x, 174, 350, 8, role[1]); text(s, role[0].toUpperCase(), x + 26, 208, 280, 20, { fontSize: 13, bold: true, color: role[1], letterSpacing: 1.2 }); text(s, role[2], x + 26, 252, 290, 40, { fontSize: 24, bold: true, color: ink }); text(s, role[3], x + 26, 322, 290, 78, { fontSize: 17, color: muted }); rule(s, x + 26, 425, 290); text(s, role[4], x + 26, 450, 290, 46, { fontSize: 15, color: ink }); });
  footer(s, 5); note(s, 'Source: README application roles, product teardown, and the implemented shared action strip across Director, Office Administrator, and Site Manager.');
}

// 6. Evidence and recovery
{
  const s = presentation.slides.add(); s.background.fill = navy; title(s, 'Trust depends on visible state transitions', 'Evidence and recovery', true);
  text(s, 'A user should never have to infer whether a record is a draft, a queue item, or an accepted operating fact.', 64, 150, 900, 44, { fontSize: 22, color: '#D7E2EC' });
  const states = [
    ['Saved on this device', 'The record exists locally. It is not yet an operational source record.', orange],
    ['Waiting to sync', 'Delivery is pending. Show the last retry and the next recovery action.', orange],
    ['Synced to Senatla Ops', 'The server accepted the record and the audit trail can be trusted.', teal],
    ['Needs attention', 'Delivery or evidence failed. Give the user an owner and a concrete recovery step.', red],
  ];
  states.forEach((state, i) => { const x = 64 + i * 285; box(s, x, 270, 250, 210, navy2, '#315473', 8); box(s, x, 270, 250, 7, state[2]); text(s, state[0], x + 20, 308, 210, 50, { fontSize: 20, bold: true, color: white }); text(s, state[1], x + 20, 382, 210, 76, { fontSize: 15, color: '#D7E2EC' }); });
  text(s, 'Acceptance test: a field user can explain the record’s state and next action without opening developer tools or asking an administrator.', 64, 558, 1100, 36, { fontSize: 18, bold: true, color: '#B9F1E9' });
  footer(s, 6, true); note(s, 'Source: product teardown offline recovery finding and Site Manager plan evidence-safe handover. The state wording is the recommended product language.');
}

// 7. F/Z polish
{
  const s = presentation.slides.add(); s.background.fill = pale; title(s, 'The F/Z pattern is the right operating model', 'UX polish implemented');
  box(s, 64, 170, 520, 340, white, line, 10); text(s, 'Z-PATTERN', 94, 204, 180, 20, { fontSize: 13, bold: true, color: teal, letterSpacing: 1.2 }); text(s, 'Public and executive contexts', 94, 246, 380, 34, { fontSize: 24, bold: true, color: ink });
  rule(s, 94, 310, 420, teal); rule(s, 94, 310, 210, orange); text(s, '1  Decision', 94, 342, 160, 24, { fontSize: 16, bold: true, color: ink }); text(s, '2  Evidence', 250, 342, 160, 24, { fontSize: 16, bold: true, color: ink }); text(s, '3  Next action', 94, 398, 180, 24, { fontSize: 16, bold: true, color: ink }); text(s, 'Use one strong summary path before detail.', 94, 456, 380, 28, { fontSize: 16, color: muted });
  box(s, 654, 170, 510, 340, white, line, 10); text(s, 'F-PATTERN', 684, 204, 180, 20, { fontSize: 13, bold: true, color: orange, letterSpacing: 1.2 }); text(s, 'Dense operational contexts', 684, 246, 380, 34, { fontSize: 24, bold: true, color: ink });
  rule(s, 684, 310, 420, orange); rule(s, 684, 310, 420, teal); rule(s, 684, 366, 300, line); rule(s, 684, 422, 240, line); text(s, '1  Status and exceptions', 684, 328, 300, 24, { fontSize: 16, bold: true, color: ink }); text(s, '2  Primary action', 684, 384, 300, 24, { fontSize: 16, bold: true, color: ink }); text(s, '3  Detail on demand', 684, 440, 300, 24, { fontSize: 16, bold: true, color: ink });
  text(s, 'Implemented: shared action strip, explicit Sign in label, native scroll control, live state announcements, responsive stacking, and reduced-motion support.', 64, 574, 1100, 36, { fontSize: 18, bold: true, color: navy2 });
  footer(s, 7); note(s, 'Source: implementation in src/app/components/workspace-action-strip.component.ts, src/global.scss, and landing workspace changes.');
}

// 8. Priority sequence
{
  const s = presentation.slides.add(); s.background.fill = white; title(s, 'The next release should deepen proof before breadth', 'Recommended sequence');
  const phases = [
    ['NOW', teal, 'Role home screens', 'Show incomplete, urgent, and safe next action for each role. Add deterministic role-journey tests.'],
    ['NEXT', orange, 'Evidence at commitment', 'Expose provenance at approval, export, sync, and asset commitment. Add negative-path tests.'],
    ['THEN', red, 'Recovery and adoption', 'Prove offline recovery, hosted-boundary checks, and three role journeys before expanding modules.'],
  ];
  phases.forEach((phase, i) => { const x = 64 + i * 390; box(s, x, 190, 350, 250, pale, line, 10); box(s, x, 190, 350, 9, phase[1]); text(s, phase[0], x + 26, 224, 100, 22, { fontSize: 13, bold: true, color: phase[1], letterSpacing: 1.2 }); text(s, phase[2], x + 26, 270, 290, 38, { fontSize: 23, bold: true, color: ink }); text(s, phase[3], x + 26, 340, 290, 70, { fontSize: 16, color: muted }); });
  rule(s, 94, 520, 1040, line); text(s, 'Release principle', 94, 552, 180, 22, { fontSize: 14, bold: true, color: teal, letterSpacing: 1.1 }); text(s, 'A new module earns its place only when it strengthens the chain from work performed to evidence captured to decision made.', 300, 548, 780, 42, { fontSize: 20, bold: true, color: ink });
  footer(s, 8); note(s, 'Source: product teardown priority sequence and Site Manager plan Phase 2 gate.');
}

// 9. Decision
{
  const s = presentation.slides.add(); s.background.fill = navy; box(s, 0, 0, 1280, 720, navy); box(s, 0, 0, 18, 720, orange);
  text(s, 'DECISION REQUEST', 72, 82, 300, 22, { fontSize: 14, bold: true, color: '#FFD37A', letterSpacing: 1.3 });
  text(s, 'Protect the operating heartbeat', 72, 140, 940, 70, { fontSize: 44, bold: true, color: white });
  text(s, 'The product is ready for a controlled rollout conversation when the team treats evidence visibility and recovery clarity as release requirements, not finishing touches.', 76, 250, 820, 74, { fontSize: 24, color: '#D7E2EC' });
  box(s, 76, 410, 500, 112, navy2, '#315473', 8); text(s, 'Recommended approval', 104, 434, 300, 22, { fontSize: 14, bold: true, color: '#B9F1E9', letterSpacing: 1.1 }); text(s, 'Proceed with the role-journey and evidence-proof sequence.', 104, 472, 410, 28, { fontSize: 20, bold: true, color: white });
  text(s, 'Prepared from the product teardown, release notes, application roles, and the Site Manager flow plan.', 76, 638, 800, 22, { fontSize: 14, color: '#A9BBCD' });
  footer(s, 9, true); note(s, 'Source: synthesis of all supplied findings. This is a recommendation for discussion, not a release approval record.');
}

const candidatePath = path.join(stagingDir, 'Senatla-Ops-Detailed-Findings-Review-candidate.pptx');
await (await PresentationFile.exportPptx(presentation)).save(candidatePath);
const { finalizePresentation } = await import(pathToFileURL(path.join(skillDir, 'container_tools/artifact_tool_utils.mjs')).href);
const result = await finalizePresentation({
  workspaceDir: root,
  candidatePath,
  finalPath,
  pythonExecutable: 'C:/Program Files/WindowsApps/OpenAI.CodexPrimaryRuntime.v26-1112-737-0_26.1112.737.0_x64__3k8sg7r9htsxt/dependencies/python/python.exe',
  integrityValidatorPath: path.join(skillDir, 'container_tools/inspect_presentation_package_integrity.py'),
  layoutValidatorPath: path.join(skillDir, 'container_tools/inspect_presentation_layout_geometry.py'),
  layoutArgs: ['--expected-slide-size-emu', '12192000,6858000', '--validate-bullet-geometry', '--validate-heading-fit'],
  requiredNativeTableOwnerSlides: [],
  requirements: { explicitTotalSlideCount: 9, requiredNativeTableOwnerSlides: [], requiredNativeChartOwnerSlides: [] },
  fontPolicy: { basis: 'design', families: [font] },
  verifyArtifactToolImport: true,
  receiptPath: path.join(stagingDir, 'validation.json'),
});
console.log(JSON.stringify({ finalPath, result }));
