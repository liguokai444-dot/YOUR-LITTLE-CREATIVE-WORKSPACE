import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import control from '../scripts/service-control.cjs';

const project = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sleep = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));

function get(port, pathname, token, method = 'GET') {
  return new Promise((resolve, reject) => {
    const request = http.request({ hostname: '127.0.0.1', port, path: pathname, method,
      headers: token ? { 'X-HTML-Studio-Control': token } : {} }, response => {
      let body = '';
      response.setEncoding('utf8'); response.on('data', chunk => { body += chunk; });
      response.on('end', () => resolve({ status: response.statusCode, body, headers: response.headers }));
    });
    request.on('error', reject); request.end();
  });
}

async function fixture(lan = false) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'html-studio-service-test-'));
  fs.mkdirSync(path.join(root, 'scripts'));
  fs.mkdirSync(path.join(root, 'dist'));
  fs.writeFileSync(path.join(root, 'dist/index.html'), '<!doctype html><h1>HTML Studio fixture</h1>');
  for (const file of ['serve-studio.mjs', 'service-control.cjs']) fs.copyFileSync(path.join(project, 'scripts', file), path.join(root, 'scripts', file));
  let failure = '';
  const child = spawn(process.execPath, [path.join(root, 'scripts/serve-studio.mjs'), ...(lan ? ['--lan'] : [])], { env: { ...process.env, PORT: '0' }, stdio: ['ignore', 'ignore', 'pipe'] });
  child.stderr.on('data', data => { failure += data; });
  const exited = new Promise(resolve => child.once('exit', resolve));
  let state;
  for (let i = 0; i < 100; i++) {
    state = control.readState(root);
    if (state) break;
    if (child.exitCode !== null) throw new Error('Fixture failed: ' + failure);
    await sleep(40);
  }
  assert.ok(state, 'Service state must be created');
  return { root, state, child, exited, async cleanup() {
    if (child.exitCode === null) {
      try { await control.requestControl(state, 'stop'); } catch { child.kill('SIGTERM'); }
      await Promise.race([exited, sleep(2500)]);
    }
    fs.rmSync(root, { recursive: true, force: true });
  } };
}

test('local service serves only public assets and protects administrative control', async () => {
  const service = await fixture();
  try {
    const { state } = service;
    const home = await get(state.port, '/');
    assert.equal(home.status, 200);
    assert.match(home.body, /HTML Studio fixture/);
    assert.equal((await get(state.port, '/.runtime/server.json')).status, 403);
    assert.equal((await get(state.port, '/.env')).status, 403);
    assert.equal((await get(state.port, control.CONTROL_PATH + 'status')).status, 403);
    assert.equal((await get(state.port, control.CONTROL_PATH + 'stop', '0'.repeat(64), 'POST')).status, 403);
    const status = await control.requestControl(state, 'status');
    assert.equal(status.mode, 'local');
    assert.equal(status.host, '127.0.0.1');
    assert.equal(status.token, undefined);
    assert.deepEqual(status.lanUrls, []);
    await control.requestControl(state, 'stop');
    await service.exited;
    assert.equal(control.readState(service.root), null);
  } finally { await service.cleanup(); }
});

test('trusted LAN mode is explicit and still requires the local stop secret', async () => {
  const service = await fixture(true);
  try {
    const status = await control.requestControl(service.state, 'status');
    assert.equal(status.mode, 'lan');
    assert.equal(status.host, '0.0.0.0');
    assert.equal((await get(service.state.port, '/')).status, 200);
    assert.equal((await get(service.state.port, control.CONTROL_PATH + 'stop', undefined, 'POST')).status, 403);
    assert.equal(status.token, undefined);
  } finally { await service.cleanup(); }
});
