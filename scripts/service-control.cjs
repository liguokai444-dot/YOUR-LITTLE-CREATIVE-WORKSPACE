const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');

const APP_ID = 'html-studio';
const CONTROL_PATH = '/__html_studio_control__/';
const runtimeDirectory = root => path.join(root, '.runtime');
const statePath = root => path.join(runtimeDirectory(root), '.env.server.local');

function readState(root) {
  try {
    const state = JSON.parse(fs.readFileSync(statePath(root), 'utf8'));
    if (state.app !== APP_ID || !Number.isInteger(state.port) || state.port < 1 || state.port > 65535
      || !/^[a-f0-9]{64}$/.test(state.token) || !/^[a-f0-9]{32}$/.test(state.instance)) return null;
    return state;
  } catch { return null; }
}

function writeState(root, state) {
  fs.mkdirSync(runtimeDirectory(root), { recursive: true, mode: 0o700 });
  const temporary = path.join(runtimeDirectory(root), `.env.server-${process.pid}.local`);
  fs.writeFileSync(temporary, JSON.stringify(state, null, 2), { mode: 0o600 });
  fs.renameSync(temporary, statePath(root));
}

function removeState(root, instance) {
  if (readState(root)?.instance === instance) {
    try { fs.unlinkSync(statePath(root)); } catch { /* Another launch may already have removed it. */ }
  }
}

function requestControl(state, action, timeout = 2000) {
  return new Promise((resolve, reject) => {
    const request = http.request({
      hostname: '127.0.0.1', port: state.port,
      path: CONTROL_PATH + action, method: action === 'stop' ? 'POST' : 'GET',
      headers: { 'X-HTML-Studio-Control': state.token },
    }, response => {
      let body = '';
      response.setEncoding('utf8');
      response.on('data', chunk => { body += chunk; if (body.length > 10000) response.destroy(new Error('Invalid control response')); });
      response.on('error', reject);
      response.on('end', () => {
        try {
          const data = JSON.parse(body);
          if (response.statusCode !== 200 || data.app !== APP_ID || data.instance !== state.instance) {
            throw new Error('The listening process is not the recorded HTML Studio instance.');
          }
          resolve(data);
        } catch (error) { reject(error); }
      });
    });
    request.setTimeout(timeout, () => request.destroy(new Error('The service did not respond.')));
    request.on('error', reject);
    request.end();
  });
}

module.exports = { APP_ID, CONTROL_PATH, runtimeDirectory, statePath, readState, writeState, removeState, requestControl };
