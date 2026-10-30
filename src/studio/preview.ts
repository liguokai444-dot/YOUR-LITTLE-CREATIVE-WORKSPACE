export interface ConsoleEntry {
  id: number;
  level: 'log' | 'info' | 'warn' | 'error';
  text: string;
  time: string;
}

export function createPreviewChannel() {
  if (typeof globalThis.crypto?.randomUUID === 'function') return globalThis.crypto.randomUUID();
  if (typeof globalThis.crypto?.getRandomValues === 'function') {
    const bytes = globalThis.crypto.getRandomValues(new Uint8Array(16));
    return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
  }
  return 'preview-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2);
}

export function buildPreviewDocument(code: string, channel: string, scriptsEnabled: boolean) {
  if (!scriptsEnabled) return code;
  const bridge = `<script>(function(){
    const channel=${JSON.stringify(channel)};
    let sent=0;
    const text=(value)=>{try{if(typeof value==='string')return value;if(value instanceof Error)return value.message;return JSON.stringify(value)??String(value)}catch{return String(value)}};
    const send=(level,args)=>{if(sent++>200)return;parent.postMessage({source:'html-studio-preview',channel,level,text:args.map(text).join(' ').slice(0,3000)},'*')};
    ['log','info','warn','error'].forEach(level=>{const original=console[level].bind(console);console[level]=(...args)=>{send(level,args);original(...args)}});
    addEventListener('error',event=>send('error',[event.message+(event.lineno?' (line '+event.lineno+')':'')]));
    addEventListener('unhandledrejection',event=>send('error',['Unhandled promise rejection:',event.reason]));
  })();<\/script>`;
  if (/<head\b[^>]*>/i.test(code)) return code.replace(/<head\b[^>]*>/i, match => match + bridge);
  if (/<!doctype\b[^>]*>/i.test(code)) return code.replace(/<!doctype\b[^>]*>/i, match => match + bridge);
  return bridge + code;
}

export function sanitizeFilename(name: string) {
  const clean = name.replace(/[\\/:*?"<>|\x00-\x1f]/g, '-').trim().slice(0, 100);
  if (!clean) return 'index.html';
  return /\.html?$/i.test(clean) ? clean : clean + '.html';
}

export function downloadText(content: string, filename: string) {
  const name = sanitizeFilename(filename);
  const file = new File([content], name, { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(file);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = name;
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export async function formatHTML(code: string) {
  const [prettier, html, postcss, babel, estree] = await Promise.all([
    import('prettier/standalone'), import('prettier/plugins/html'),
    import('prettier/plugins/postcss'), import('prettier/plugins/babel'), import('prettier/plugins/estree'),
  ]);
  return prettier.format(code, { parser: 'html', plugins: [html, postcss, babel, estree], tabWidth: 2, printWidth: 88, htmlWhitespaceSensitivity: 'css' });
}

export async function copyText(value: string) {
  try { await navigator.clipboard.writeText(value); }
  catch {
    const field = document.createElement('textarea');
    field.value = value;
    field.style.position = 'fixed';
    field.style.left = '-9999px';
    document.body.appendChild(field);
    field.select();
    const copied = document.execCommand('copy');
    field.remove();
    if (!copied) throw new Error('Clipboard access denied');
  }
}
