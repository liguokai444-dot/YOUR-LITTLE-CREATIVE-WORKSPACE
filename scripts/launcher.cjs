const fs = require('node:fs');
const path = require('node:path');
const { spawn, spawnSync } = require('node:child_process');
const control = require('./service-control.cjs');

const root = path.resolve(__dirname, '..');
const mode = process.argv[2] || 'start';
const lan = process.argv.includes('--lan');
const sleep = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));
const log = message => console.log(message);

async function waitStopped(info) {
  for (let i = 0; i < 35; i++) {
    try { await control.requestControl(info, 'status', 450); }
    catch { return; }
    await sleep(100);
  }
  throw new Error('The server is still shutting down. Please try again shortly.');
}

function show(info) {
  log(`HTML Studio: ${info.url}`);
  log(info.mode === 'lan' ? 'Mode: trusted Wi-Fi / LAN' : 'Mode: this computer only');
  for (const url of info.lanUrls || []) log('Phone / same Wi-Fi: ' + url);
  if (info.mode === 'lan') log('Keep the computer on. Do not expose this port to the public Internet.');
}

function openBrowser(url) {
  if (process.env.STUDIO_NO_OPEN === '1') return;
  if (process.platform === 'win32') {
    const child = spawn('cmd.exe', ['/d', '/s', '/c', `start "" "${url}"`], { detached: true, stdio: 'ignore', windowsHide: true });
    child.on('error', () => {}); child.unref();
  }
}

async function main() {
  if (!['start', 'stop', 'status'].includes(mode)) throw new Error('Use start, stop, or status.');
  fs.mkdirSync(control.runtimeDirectory(root), { recursive: true, mode: 0o700 });
  const lock = path.join(control.runtimeDirectory(root), '.env.launcher-lock.local');
  let descriptor;
  for (let i = 0; i < 80; i++) {
    try { descriptor = fs.openSync(lock, 'wx', 0o600); break; }
    catch (error) {
      if (error.code !== 'EEXIST') throw error;
      try {
        if (Date.now() - fs.statSync(lock).mtimeMs > 120000) {
          const owner = JSON.parse(fs.readFileSync(lock, 'utf8'));
          try { process.kill(owner.pid, 0); }
          catch (probe) { if (probe.code === 'ESRCH') fs.unlinkSync(lock); }
        }
      } catch {}
      await sleep(100);
    }
  }
  if (descriptor === undefined) throw new Error('Another HTML Studio launcher is busy. Try again in a moment.');
  fs.writeFileSync(descriptor, JSON.stringify({ pid: process.pid, startedAt: Date.now() }));
  try {
    let info = control.readState(root);
    if (info) {
      try { info = { ...info, ...await control.requestControl(info, 'status') }; }
      catch { control.removeState(root, info.instance); info = null; }
    }
    if (mode === 'status') {
      if (info) show(info); else log('HTML Studio is not running through the managed launcher.');
      return;
    }
    if (mode === 'stop') {
      if (!info) { log('No managed HTML Studio service is running. No other process was stopped.'); return; }
      await control.requestControl(info, 'stop');
      await waitStopped(info);
      control.removeState(root, info.instance);
      log('HTML Studio stopped. Other Node processes were not touched.');
      return;
    }
    if (info && info.mode === (lan ? 'lan' : 'local')) {
      log('HTML Studio is already running.'); show(info); openBrowser(info.url); return;
    }
    if (info) {
      await control.requestControl(info, 'stop');
      await waitStopped(info);
      control.removeState(root, info.instance);
    }
    if (!fs.existsSync(path.join(root, 'dist/index.html'))) {
      if (!fs.existsSync(path.join(root, 'node_modules'))) throw new Error('Run npm ci and npm run build first. Node.js 20.19+ or 22.12+ is needed to build.');
      const build = spawnSync(process.execPath, [path.join(root, 'scripts/vite-task.mjs'), 'build'], { cwd: root, stdio: 'inherit' });
      if (build.status !== 0) throw new Error('The build did not complete. Please use Node.js 20.19+ or the project-local runtime.');
    }
    const output = fs.openSync(path.join(control.runtimeDirectory(root), '.env.server-log.local'), 'a', 0o600);
    const child = spawn(process.execPath, [path.join(root, 'scripts/serve-studio.mjs'), ...(lan ? ['--lan'] : [])], {
      cwd: root, detached: true, stdio: ['ignore', output, output], windowsHide: true,
    });
    fs.closeSync(output);
    let startupError;
    child.on('error', error => { startupError = error; });
    child.unref();
    for (let i = 0; i < 120; i++) {
      if (startupError) throw startupError;
      const candidate = control.readState(root);
      if (candidate && candidate.pid === child.pid) {
        try {
          const status = await control.requestControl(candidate, 'status', 800);
          show(status);
          log('The application keeps running after this window closes. Use stop.cmd to stop it.');
          openBrowser(status.url);
          return;
        } catch {}
      }
      await sleep(150);
    }
    throw new Error('Startup timed out. Check the private log in the .runtime folder.');
  } finally {
    fs.closeSync(descriptor);
    try { fs.unlinkSync(lock); } catch {}
  }
}

main().catch(error => { console.error(error.message); process.exitCode = 1; });
