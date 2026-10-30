import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const mode = process.argv[2] === 'dev' ? 'dev' : 'build';
const passthrough = process.argv.slice(3);
let workdir = root;
let temporary = null;
const watchers = [];
const pending = new Map();
const rootFiles = ['index.html', 'vite.config.mjs', 'tsconfig.json', 'package.json', 'package-lock.json'];

function clean() {
  watchers.forEach(watcher => watcher.close());
  pending.forEach(timer => clearTimeout(timer));
  if (temporary) {
    try { fs.rmSync(temporary, { recursive: true, force: true }); }
    catch { console.warn('The temporary build folder can be removed after all Vite processes stop.'); }
  }
}

function copy(relative) {
  const source = path.resolve(root, relative);
  const target = path.resolve(workdir, relative);
  if (!source.startsWith(root + path.sep) || !target.startsWith(workdir + path.sep)) return;
  if (fs.existsSync(source)) {
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.cpSync(source, target, { recursive: true, force: true });
  } else {
    fs.rmSync(target, { recursive: true, force: true });
  }
}

function queueCopy(relative) {
  clearTimeout(pending.get(relative));
  pending.set(relative, setTimeout(() => {
    pending.delete(relative);
    try { copy(relative); } catch (error) { console.error('Could not synchronize:', relative, error.message); }
  }, 70));
}

if (mode === 'build') {
  const check = spawnSync(process.execPath, [path.join(root, 'node_modules/typescript/bin/tsc'), '--noEmit'], { cwd: root, stdio: 'inherit' });
  if (check.status !== 0) process.exit(check.status || 1);
}

// Vite cannot reliably resolve a Windows project whose physical path contains #.
// Mirror only this project's public sources and installed dependencies, never .env files.
if (/[#?]/.test(root)) {
  temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'html-studio-'));
  if (/[#?]/.test(temporary)) {
    console.error('The temporary directory also contains # or ?. Choose a plain temporary path.');
    process.exit(1);
  }
  workdir = temporary;
  console.log('Using an isolated temporary Vite workspace for this special-character path.');
  for (const entry of ['src', 'public', 'node_modules', ...rootFiles]) {
    if (fs.existsSync(path.join(root, entry))) copy(entry);
  }
  if (mode === 'dev') {
    for (const directory of ['src', 'public']) {
      watchers.push(fs.watch(path.join(root, directory), { recursive: true }, (_event, filename) => {
        if (filename) queueCopy(path.join(directory, String(filename)));
      }));
    }
    watchers.push(fs.watch(root, (_event, filename) => {
      if (filename && rootFiles.includes(String(filename))) queueCopy(String(filename));
    }));
  }
}

const arguments_ = [path.join(workdir, 'node_modules/vite/bin/vite.js')];
if (mode === 'build') arguments_.push('build');
arguments_.push(...passthrough);
const child = spawn(process.execPath, arguments_, { cwd: workdir, stdio: 'inherit', env: process.env });
let stopping = false;
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    stopping = true;
    child.kill(signal);
  });
}
child.on('error', error => {
  console.error(error.message);
  clean();
  process.exitCode = 1;
});
child.on('exit', code => {
  if (mode === 'build' && code === 0 && temporary) {
    fs.rmSync(path.join(root, 'dist'), { recursive: true, force: true });
    fs.cpSync(path.join(workdir, 'dist'), path.join(root, 'dist'), { recursive: true });
  }
  clean();
  process.exitCode = stopping ? 0 : code || 0;
});
