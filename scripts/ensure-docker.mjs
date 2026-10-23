import { execFileSync, spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

export function dockerDesktopCandidates(env = process.env) {
  return [
    env.SENATLA_DOCKER_DESKTOP_PATH,
    env.ProgramFiles ? `${env.ProgramFiles}\\Docker\\Docker\\Docker Desktop.exe` : '',
    env.LOCALAPPDATA ? `${env.LOCALAPPDATA}\\Docker\\Docker Desktop.exe` : '',
  ].filter(Boolean);
}

export async function ensureDocker(options = {}) {
  const platform = options.platform || process.platform;
  const env = options.env || process.env;
  const exists = options.exists || existsSync;
  const ready = options.ready || dockerReady;
  const launch = options.launch || launchDockerDesktop;
  const sleep = options.sleep || ((milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)));
  const now = options.now || Date.now;
  const log = options.log || console.log;
  const timeoutMs = Number(env.SENATLA_DOCKER_START_TIMEOUT_MS || 120000);

  if (ready()) {
    log('Docker engine is ready.');
    return { started: false };
  }
  if (env.SENATLA_DOCKER_AUTOSTART === '0') throw new Error('Docker is not running and automatic startup is disabled.');
  if (platform !== 'win32') throw new Error('Docker is not running. Start the Docker service, then retry.');

  const executable = dockerDesktopCandidates(env).find((candidate) => exists(candidate));
  if (!executable) throw new Error('Docker Desktop is not running and Docker Desktop.exe was not found. Set SENATLA_DOCKER_DESKTOP_PATH or install Docker Desktop.');
  log(`Starting Docker Desktop from ${executable}...`);
  launch(executable);

  const deadline = now() + timeoutMs;
  while (now() < deadline) {
    await sleep(2000);
    if (ready()) {
      log('Docker engine is ready.');
      return { started: true };
    }
  }
  throw new Error(`Docker Desktop did not become ready within ${Math.round(timeoutMs / 1000)} seconds. Open Docker Desktop to inspect its status, then retry.`);
}

function dockerReady() {
  try {
    execFileSync('docker', ['info', '--format', '{{.ServerVersion}}'], { stdio: 'ignore', windowsHide: true });
    return true;
  } catch {
    return false;
  }
}

function launchDockerDesktop(executable) {
  const child = spawn(executable, [], { detached: true, stdio: 'ignore', windowsHide: true });
  child.unref();
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  ensureDocker().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
