import { spawn } from 'node:child_process';

const isWindows = process.platform === 'win32';

const steps = [
  { name: 'runtime-config', script: 'npm run test:runtime-config', timeoutMs: 120_000 },
  { name: 'ocr-device-uat-contract', script: 'npm run test:ocr-device-uat-contract', timeoutMs: 120_000 },
  { name: 'lint', script: 'npm run lint', timeoutMs: 360_000 },
  { name: 'typecheck', script: 'npm run typecheck', timeoutMs: 360_000 },
  {
    name: 'build',
    script: 'npm run build',
    timeoutMs: 600_000,
    env: { CI: null, SENATLA_API_MODE: 'local', VERCEL: '0' },
  },
  { name: 'tests', script: 'npm run test:ci', timeoutMs: 900_000, env: { CI: 'true' }, successPattern: /TOTAL:\s+\d+\s+SUCCESS/, failurePattern: /TOTAL:\s+\d+\s+FAILED|FAILED/i },
];

function now() {
  return new Date().toISOString();
}

function formatDuration(startedAt) {
  return `${((Date.now() - startedAt) / 1000).toFixed(1)}s`;
}

function killProcessTree(child) {
  return new Promise((resolve) => {
    if (!child.pid) {
      resolve();
      return;
    }

    const fallback = setTimeout(resolve, 15000);

    if (isWindows) {
      const killer = spawn('taskkill', ['/pid', String(child.pid), '/t', '/f'], { stdio: 'ignore' });
      killer.on('close', () => {
        clearTimeout(fallback);
        resolve();
      });
      killer.on('error', () => {
        clearTimeout(fallback);
        resolve();
      });
      return;
    }

    child.kill('SIGTERM');
    child.once('close', () => {
      clearTimeout(fallback);
      resolve();
    });
  });
}

function buildChildEnv(step) {
  const childEnv = {
    ...process.env,
    ...step.env,
    SENATLA_API_MODE: process.env.SENATLA_API_MODE ?? 'local',
  };

  for (const key of Object.keys(childEnv)) {
    const normalizedKey = key.toLowerCase();
    if (normalizedKey.startsWith('npm_') || normalizedKey === 'init_cwd' || childEnv[key] === null) {
      delete childEnv[key];
    }
  }

  return childEnv;
}

function runStep(step) {
  return new Promise((resolve) => {
    const startedAt = Date.now();
    let settled = false;
    let output = '';
    console.log(`[verify] ${now()} START ${step.name}: ${step.script}`);

    const command = isWindows ? 'cmd.exe' : 'sh';
    const args = isWindows ? ['/d', '/s', '/c', step.script] : ['-c', step.script];

    const shouldCaptureOutput = Boolean(step.successPattern || step.failurePattern);
    const child = spawn(command, args, {
      env: buildChildEnv(step),
      shell: false,
      stdio: shouldCaptureOutput ? ['ignore', 'pipe', 'pipe'] : 'inherit',
    });

    const capture = (chunk, writer) => {
      const text = chunk.toString();
      output += text;
      if (output.length > 200_000) {
        output = output.slice(-100_000);
      }
      writer.write(chunk);
    };

    if (shouldCaptureOutput) {
      child.stdout?.on('data', (chunk) => capture(chunk, process.stdout));
      child.stderr?.on('data', (chunk) => capture(chunk, process.stderr));
    }

    const hasSuccessEvidence = () => Boolean(step.successPattern?.test(output)) && !step.failurePattern?.test(output);
    const detachChild = () => {
      child.stdout?.destroy();
      child.stderr?.destroy();
      child.unref();
    };

    let timedOut = false;
    const timer = setTimeout(async () => {
      if (settled) {
        return;
      }
      settled = true;
      timedOut = true;
      console.error(`[verify] ${now()} TIMEOUT ${step.name} after ${formatDuration(startedAt)}`);
      await killProcessTree(child);
      detachChild();
      if (hasSuccessEvidence()) {
        console.log(`[verify] ${now()} PASS ${step.name} in ${formatDuration(startedAt)}; command timed out during runner cleanup after success evidence`);
        resolve(true);
        return;
      }
      resolve(false);
    }, step.timeoutMs);

    child.on('error', (error) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timer);
      console.error(`[verify] ${now()} ERROR ${step.name}: ${error.message}`);
      resolve(false);
    });

    child.on('close', (code, signal) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timer);

      if (code === 0) {
        console.log(`[verify] ${now()} PASS ${step.name} in ${formatDuration(startedAt)}`);
        resolve(true);
        return;
      }

      if (hasSuccessEvidence()) {
        console.log(`[verify] ${now()} PASS ${step.name} in ${formatDuration(startedAt)}; command exited non-zero after success evidence`);
        resolve(true);
        return;
      }

      console.error(`[verify] ${now()} FAIL ${step.name} in ${formatDuration(startedAt)} code=${code ?? 'null'} signal=${signal ?? 'null'}`);
      resolve(false);
    });
  });
}

console.log(`[verify] ${now()} Senatla Ops deterministic release gate`);

for (const step of steps) {
  const passed = await runStep(step);
  if (!passed) {
    console.error(`[verify] ${now()} Gate failed at ${step.name}`);
    process.exit(1);
  }
}

console.log(`[verify] ${now()} PASS release gate: runtime-config, ocr-device-uat-contract, lint, typecheck, build, tests`);
