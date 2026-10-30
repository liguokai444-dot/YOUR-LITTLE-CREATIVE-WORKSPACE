import { spawnSync } from 'node:child_process';
import path from 'node:path';

const tracked = process.argv.includes('--tracked');
const selection = spawnSync('git', tracked ? ['ls-files', '-z'] : ['diff', '--cached', '--name-only', '--diff-filter=ACMR', '-z'], { encoding: 'utf8' });
if (selection.status !== 0) { console.error('Run this check inside the independent HTML Studio Git repository.'); process.exit(1); }
const files = selection.stdout.split('\0').filter(Boolean);
const forbidden = /(^|\/)(?:node_modules|dist|\.tools|\.runtime|artifacts|playwright-report|test-results|\.git)(?:\/|$)|(^|\/)\.env(?:\.|$)|(^|\/)\.npmrc$|\.(?:log|pem|key|pfx|p12|exe|zip)$/i;
const patterns = [
  ['GitHub access token', /\b(?:github_pat_[a-zA-Z0-9_]{20,}|gh[pousr]_[a-zA-Z0-9]{20,})\b/],
  ['private key material', /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/],
  ['MCP access endpoint', /https?:\/\/[^\s"'<>]*\bmcp\.[^\s"'<>]*\/mcp\/[a-zA-Z0-9_-]{16,}/],
  ['encoded MCP connection assignment', /MCP_URL_BASE64\s*=\s*[A-Za-z0-9+/]{32,}={0,2}/],
  ['personal Windows home path', /[a-zA-Z]:[\\/]Users[\\/][^\\/\s"'<>]+/],
  ['credential embedded in a URL', /https?:\/\/[^\s/@"']+:[^\s/@"']+@/],
];
const findings = [];
for (const file of files) {
  if (forbidden.test(file)) { findings.push([file, 'private/generated file must not be published']); continue; }
  const result = spawnSync('git', ['show', ':' + file], { encoding: null, maxBuffer: 8 * 1024 * 1024 });
  if (result.status !== 0) { findings.push([file, 'could not inspect staged content']); continue; }
  if (['.png', '.jpg', '.jpeg', '.gif', '.webp', '.ico'].includes(path.extname(file).toLowerCase())) continue;
  const text = result.stdout.toString('utf8');
  for (const [reason, expression] of patterns) if (expression.test(text)) findings.push([file, reason]);
}
if (findings.length) {
  console.error('Privacy check failed. Values are intentionally not printed:');
  for (const [file, reason] of findings) console.error(`- ${file}: ${reason}`);
  process.exit(1);
}
console.log(`Privacy check passed: ${files.length} ${tracked ? 'tracked' : 'staged'} files inspected. No private runtime files or known credential patterns found.`);
