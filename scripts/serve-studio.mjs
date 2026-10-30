import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import control from './service-control.cjs';

const project = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const root = path.join(project, 'dist');
const lan = process.argv.includes('--lan');
const host = lan ? '0.0.0.0' : '127.0.0.1';
const token = crypto.randomBytes(32).toString('hex');
const instance = crypto.randomBytes(16).toString('hex');
const startedAt = new Date().toISOString();
const sockets = new Set();
let stopping = false;
let ready = false;
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.png': 'image/png', '.woff2': 'font/woff2', '.json': 'application/json' };

function lanAddresses(port) {
  const addresses = [];
  for (const entries of Object.values(os.networkInterfaces())) {
    for (const entry of entries || []) {
      if (entry.internal || entry.family !== 'IPv4') continue;
      const parts = entry.address.split('.').map(Number);
      if (parts[0] === 10 || (parts[0] === 192 && parts[1] === 168)
        || (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31)) {
        addresses.push(`http://${entry.address}:${port}`);
      }
    }
  }
  return [...new Set(addresses)];
}

function publicStatus() {
  const address = server.address();
  return { app: control.APP_ID, instance, pid: process.pid, port: address.port, host,
    mode: lan ? 'lan' : 'local', url: `http://127.0.0.1:${address.port}`,
    lanUrls: lan ? lanAddresses(address.port) : [], startedAt };
}

function authorized(request) {
  const address = request.socket.remoteAddress;
  if (!['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(address)) return false;
  const supplied = request.headers['x-html-studio-control'];
  return typeof supplied === 'string' && /^[a-f0-9]{64}$/.test(supplied)
    && crypto.timingSafeEqual(Buffer.from(supplied, 'hex'), Buffer.from(token, 'hex'));
}

function shutdown() {
  if (stopping) return;
  stopping = true;
  control.removeState(project, instance);
  console.log('HTML Studio stopped.');
  server.close(() => process.exit(0));
  if (typeof server.closeIdleConnections === 'function') server.closeIdleConnections();
  setTimeout(() => { sockets.forEach(socket => socket.destroy()); process.exit(0); }, 1200).unref();
}

if (!fs.existsSync(path.join(root, 'index.html'))) {
  console.error('Build not found. Run npm run build first.');
  process.exit(1);
}
const server = http.createServer((request, response) => {
  let pathname;
  try { pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname); }
  catch { response.writeHead(400); response.end('Bad request'); return; }
  if (pathname.startsWith(control.CONTROL_PATH)) {
    response.setHeader('Cache-Control', 'no-store');
    if (!authorized(request)) { response.writeHead(403); response.end('Forbidden'); return; }
    const action = pathname.slice(control.CONTROL_PATH.length);
    if ((action === 'status' && request.method === 'GET') || (action === 'stop' && request.method === 'POST')) {
      response.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      response.end(JSON.stringify(publicStatus()));
      if (action === 'stop') setImmediate(shutdown);
    } else { response.writeHead(405); response.end('Method not allowed'); }
    return;
  }
  if (!['GET', 'HEAD'].includes(request.method || '')) { response.writeHead(405); response.end('Method not allowed'); return; }
  if (pathname.split('/').some(part => part.startsWith('.') && part !== '.')) {
    response.writeHead(403); response.end('Forbidden'); return;
  }
  const filename = path.resolve(root, '.' + pathname);
  if (filename !== root && !filename.startsWith(root + path.sep)) {
    response.writeHead(403); response.end('Forbidden'); return;
  }
  const target = pathname === '/' ? path.join(root, 'index.html') : filename;
  fs.stat(target, (error, info) => {
    if (error || !info.isFile()) { response.writeHead(404); response.end('Not found'); return; }
    response.writeHead(200, { 'Content-Type': types[path.extname(target)] || 'application/octet-stream', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer', 'Cache-Control': 'no-cache' });
    if (request.method === 'HEAD') { response.end(); return; }
    fs.createReadStream(target).on('error', () => response.destroy()).pipe(response);
  });
});
server.on('connection', socket => { sockets.add(socket); socket.on('close', () => sockets.delete(socket)); });
let port = Number(process.env.PORT || 4178);
if (!Number.isInteger(port) || port < 0 || port > 65535) {
  console.error('PORT must be an integer between 0 and 65535.'); process.exit(1);
}
let attempts = 0;
server.on('error', error => {
  if (error.code === 'EADDRINUSE' && port && attempts++ < 10) server.listen(++port, host);
  else { console.error(error.message); process.exit(1); }
});
server.on('listening', () => {
  ready = true;
  const status = publicStatus();
  control.writeState(project, { ...status, token });
  console.log(`HTML Studio is ready: ${status.url}`);
  if (lan) {
    console.log('Trusted Wi-Fi mode. Allow only Private networks in Windows Firewall.');
    status.lanUrls.forEach(url => console.log('Phone / same Wi-Fi: ' + url));
  } else console.log('Local-only mode. Use start-lan.cmd for a trusted Wi-Fi network.');
  console.log('Use stop.cmd or npm run stop to stop only this project.');
});
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
process.on('exit', () => { if (ready) control.removeState(project, instance); });
server.listen(port, host);
