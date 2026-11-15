import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const root = process.cwd();
const skillDir = 'C:/Users/thoso/.codex/plugins/cache/openai-primary-runtime/presentations/26.1112.11217/skills/presentations';
const workspaceDir = root;
const candidatePath = path.join(root, 'output', 'client-current-version', 'Senatla-Ops-Client-Current-Version-Review.pptx');
const finalPath = path.join(root, 'output', 'client-current-version', 'Senatla-Ops-Client-Current-Version-Review-Final.pptx');
const stagingDir = path.join(root, '.codex-finalizer', 'client-current-version');
await fs.mkdir(stagingDir, { recursive: true });
const { finalizePresentation } = await import(pathToFileURL(path.join(skillDir, 'container_tools', 'artifact_tool_utils.mjs')).href);
const result = await finalizePresentation({
  workspaceDir,
  candidatePath,
  finalPath,
  pythonExecutable: 'C:/Program Files/WindowsApps/OpenAI.CodexPrimaryRuntime.v26-1112-737-0_26.1112.737.0_x64__3k8sg7r9htsxt/dependencies/python/python.exe',
  integrityValidatorPath: path.join(skillDir, 'container_tools', 'inspect_presentation_package_integrity.py'),
  layoutValidatorPath: path.join(skillDir, 'container_tools', 'inspect_presentation_layout_geometry.py'),
  layoutArgs: ['--expected-slide-size-emu', '12192000,6858000', '--validate-bullet-geometry', '--validate-heading-fit'],
  requiredNativeTableOwnerSlides: [],
  requirements: { explicitTotalSlideCount: 11, requiredNativeTableOwnerSlides: [], requiredNativeChartOwnerSlides: [] },
  fontPolicy: { basis: 'design', families: ['Arial'] },
  verifyArtifactToolImport: true,
  receiptPath: path.join(stagingDir, 'validation.json'),
});
console.log(JSON.stringify({ finalPath, result }));
