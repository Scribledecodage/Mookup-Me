import { spawn } from 'node:child_process';
import path from 'node:path';

const root = process.cwd();
const port = process.env.PORT || '3000';
const localUrl = process.env.MOOKUP_ELECTRON_URL?.trim() || `http://localhost:${port}`;
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const electronCli = path.join(root, 'node_modules', 'electron', 'cli.js');

let devServer = null;
let electronProcess = null;
let ownsDevServer = false;
let shuttingDown = false;

async function isServerReady() {
  try {
    const response = await fetch(localUrl, { signal: AbortSignal.timeout(1000) });
    return response.status < 500;
  } catch {
    return false;
  }
}

async function waitForServer(timeoutMs = 30000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await isServerReady()) return true;
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  return false;
}

function stopProcess(child) {
  if (!child || child.killed || child.exitCode !== null) return;

  if (process.platform === 'win32' && child.pid) {
    const taskkill = spawn('taskkill', ['/pid', String(child.pid), '/t', '/f'], { stdio: 'ignore' });
    taskkill.on('error', () => child.kill());
    return;
  }

  child.kill('SIGTERM');
}

function shutdown(exitCode = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  stopProcess(electronProcess);
  if (ownsDevServer) stopProcess(devServer);
  process.exitCode = exitCode;
}

async function main() {
  if (!(await isServerReady())) {
    console.log(`🌐 Serveur local indisponible sur ${localUrl}, démarrage de Next.js...`);
    devServer = spawn(npmCommand, ['run', 'dev'], {
      cwd: root,
      env: process.env,
      stdio: 'inherit',
      windowsHide: false,
    });
    ownsDevServer = true;

    devServer.on('error', error => {
      console.error('❌ Impossible de démarrer Next.js :', error.message);
      shutdown(1);
    });

    if (!(await waitForServer())) {
      console.error(`❌ Next.js n’est pas disponible après 30 secondes sur ${localUrl}.`);
      shutdown(1);
      return;
    }
  } else {
    console.log(`🌐 Serveur local déjà disponible sur ${localUrl}.`);
  }

  console.log('🖥️ Démarrage d’Electron...');
  electronProcess = spawn(process.execPath, [
    electronCli,
    'electron/main.cjs',
    '--dev',
    ...process.argv.slice(2),
  ], {
    cwd: root,
    env: {
      ...process.env,
      MOOKUP_ELECTRON_URL: localUrl,
    },
    stdio: 'inherit',
    windowsHide: false,
  });

  electronProcess.on('error', error => {
    console.error('❌ Impossible de démarrer Electron :', error.message);
    shutdown(1);
  });

  electronProcess.on('exit', (code, signal) => {
    if (shuttingDown) return;
    shuttingDown = true;
    if (ownsDevServer) stopProcess(devServer);
    process.exitCode = code ?? (signal ? 1 : 0);
  });
}

process.once('SIGINT', () => shutdown(0));
process.once('SIGTERM', () => shutdown(0));

main().catch(error => {
  console.error('❌ Échec du lancement local :', error);
  shutdown(1);
});
