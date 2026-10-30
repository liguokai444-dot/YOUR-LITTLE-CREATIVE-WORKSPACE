import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactCodeMirrorRef } from '@uiw/react-codemirror';
import type { ViewUpdate } from '@codemirror/view';
import { openSearchPanel } from '@codemirror/search';
import {
  ArrowDownToLine, ArrowUpRight, Braces, Check, ChevronDown, ClipboardPaste,
  CloudCheck, Code2, Copy, Ellipsis, Expand, ExternalLink, FileCode2,
  FolderOpen, GripVertical, Keyboard, LayoutTemplate, LoaderCircle,
  Minimize2, Monitor, Moon, Play, Plus, RefreshCw, ShieldCheck, Smartphone,
  Sun, Tablet, Terminal, Trash2, X,
} from 'lucide-react';
import CodeEditor from './studio/CodeEditor';
import { blankCode, defaultCode, deskImage, templates } from './studio/templates';
import type { StudioTemplate } from './studio/templates';
import { buildPreviewDocument, copyText, createPreviewChannel, downloadText, formatHTML, sanitizeFilename } from './studio/preview';
import type { ConsoleEntry } from './studio/preview';

const STORAGE_KEY = 'html-studio:draft:v1';
const THEME_KEY = 'html-studio:theme:v1';
const MAX_FILE_SIZE = 2 * 1024 * 1024;

function initialDraft() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    if (saved && typeof saved.code === 'string' && saved.code.length <= MAX_FILE_SIZE) {
      return { code: saved.code, filename: sanitizeFilename(saved.filename || 'index.html'), restored: true };
    }
  } catch { /* A blocked or full storage area must not prevent editing. */ }
  return { code: defaultCode, filename: 'index.html', restored: false };
}

function BrandMark({ small = false }: { small?: boolean }) {
  return <span className={`brand-mark ${small ? 'is-small' : ''}`}><Code2 size={small ? 18 : 23} strokeWidth={1.8} /></span>;
}

function TemplateThumbnail({ tone }: { tone: string }) {
  if (tone === 'nature') return <div className="template-art nature" style={{ backgroundImage: `url(${deskImage})` }}><span>f / f.</span><strong>FORM<br />& FIELD.</strong></div>;
  if (tone === 'profile') return <div className="template-art profile"><span className="mini-avatar">lin.</span><strong>你好，我是林间。</strong><i /><i /></div>;
  if (tone === 'counter') return <div className="template-art counter"><span>一点点小进步</span><strong>12</strong><div><i>−</i><i>+</i></div></div>;
  return <div className="template-art pelican"><svg viewBox="0 0 220 110" fill="none" aria-hidden="true"><circle cx="79" cy="79" r="23" stroke="#6d8b75" strokeWidth="2.3" /><circle cx="153" cy="79" r="23" stroke="#6d8b75" strokeWidth="2.3" /><path d="m79 79 24-30 16 30H79m24-30h35l15 30m-34 0 19-30" stroke="#7ea186" strokeWidth="3" strokeLinejoin="round" /><path d="M87 43c-14-19 9-24 23-19 12 4 10-16 14-21 8-8 21 0 16 10-8 4-9 10-4 18 2 13-31 28-49 12Z" fill="#fffdf2" stroke="#658066" strokeWidth="1.5" /><path d="m137 9 43 9-44 10" fill="#e9be7b" stroke="#b59261" strokeWidth="1.3" /><circle cx="133" cy="7" r="1.6" fill="#41604b" /><path d="m119 49 9 13-10 17m-3-30 2 18-8 10" stroke="#cda161" strokeWidth="2.7" /><path d="m122 26-22-7" stroke="#d18c6d" strokeWidth="5" /></svg></div>;
}

export default function App() {
  const [draft] = useState(initialDraft);
  const [code, setCode] = useState(draft.code);
  const [filename, setFilename] = useState(draft.filename);
  const [renderedCode, setRenderedCode] = useState(draft.code);
  const [channel, setChannel] = useState(createPreviewChannel);
  const [runVersion, setRunVersion] = useState(0);
  const [autoRun, setAutoRun] = useState(true);
  const [scriptsEnabled, setScriptsEnabled] = useState(true);
  const [dark, setDark] = useState(() => { try { return localStorage.getItem(THEME_KEY) === 'dark'; } catch { return false; } });
  const [device, setDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [zoom, setZoom] = useState('fit');
  const [split, setSplit] = useState(.46);
  const [resizing, setResizing] = useState(false);
  const [mobilePanel, setMobilePanel] = useState<'code' | 'preview'>('preview');
  const [focusPreview, setFocusPreview] = useState(false);
  const [consoleOpen, setConsoleOpen] = useState(false);
  const [logs, setLogs] = useState<ConsoleEntry[]>([]);
  const [cursor, setCursor] = useState({ line: 1, column: 1 });
  const [saved, setSaved] = useState<'saving' | 'saved' | 'error'>('saved');
  const [formatting, setFormatting] = useState(false);
  const [loadingTemplate, setLoadingTemplate] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(true);
  const [lastRun, setLastRun] = useState(() => new Date());
  const [toast, setToast] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [draggingFile, setDraggingFile] = useState(false);
  const [isEdited, setIsEdited] = useState(draft.restored);
  const [confirm, setConfirm] = useState({ title: '', description: '', label: '确认替换' });
  const [viewport, setViewport] = useState({ width: 600, height: 500 });
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const editorRef = useRef<ReactCodeMirrorRef>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const workbenchRef = useRef<HTMLDivElement>(null);
  const templateDialog = useRef<HTMLDialogElement>(null);
  const guideDialog = useRef<HTMLDialogElement>(null);
  const confirmDialog = useRef<HTMLDialogElement>(null);
  const pendingAction = useRef<(() => void) | null>(null);
  const codeRef = useRef(code);
  const renderedRef = useRef(renderedCode);
  const channelRef = useRef(channel);
  const logId = useRef(0);
  codeRef.current = code;
  renderedRef.current = renderedCode;
  channelRef.current = channel;

  const notify = useCallback((message: string) => setToast(message), []);
  const run = useCallback((next?: string) => {
    setRenderedCode(next ?? codeRef.current);
    setChannel(createPreviewChannel());
    setRunVersion(value => value + 1);
    setLogs([]);
    setPreviewLoading(true);
    setLastRun(new Date());
  }, []);

  const changeCode = useCallback((value: string) => { setCode(value); setIsEdited(true); }, []);
  const updateCursor = useCallback((update: ViewUpdate) => {
    if (!update.selectionSet && !update.docChanged) return;
    const position = update.state.selection.main.head;
    const line = update.state.doc.lineAt(position);
    setCursor(previous => previous.line === line.number && previous.column === position - line.from + 1 ? previous : { line: line.number, column: position - line.from + 1 });
  }, []);

  useEffect(() => {
    if (!autoRun || code === renderedRef.current) return;
    const timer = window.setTimeout(() => run(codeRef.current), 350);
    return () => clearTimeout(timer);
  }, [code, autoRun, run]);

  useEffect(() => {
    setSaved('saving');
    const timer = window.setTimeout(() => {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ code, filename, updatedAt: Date.now() })); setSaved('saved'); }
      catch { setSaved('error'); }
    }, 550);
    return () => clearTimeout(timer);
  }, [code, filename]);

  useEffect(() => {
    try { localStorage.setItem(THEME_KEY, dark ? 'dark' : 'light'); } catch { /* Theme remains usable without storage. */ }
  }, [dark]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(''), 3000);
    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    const listener = (event: MessageEvent) => {
      if (event.source !== iframeRef.current?.contentWindow || !event.data || event.data.channel !== channelRef.current || event.data.source !== 'html-studio-preview') return;
      const { level, text } = event.data;
      if (!['log', 'info', 'warn', 'error'].includes(level) || typeof text !== 'string') return;
      const entry: ConsoleEntry = { id: ++logId.current, level, text: text.slice(0, 3000), time: new Date().toLocaleTimeString('zh-CN', { hour12: false }) };
      setLogs(previous => previous.length >= 200 ? previous : [...previous, entry]);
    };
    window.addEventListener('message', listener);
    return () => window.removeEventListener('message', listener);
  }, []);

  useEffect(() => {
    if (!stageRef.current) return;
    const observer = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect;
      setViewport({ width: Math.max(240, width), height: Math.max(200, height) });
    });
    observer.observe(stageRef.current);
    return () => observer.disconnect();
  }, [focusPreview]);

  const ask = (title: string, description: string, action: () => void, label = '确认替换') => {
    setConfirm({ title, description, label });
    pendingAction.current = action;
    confirmDialog.current?.showModal();
  };

  const replace = (next: string, name = 'index.html') => {
    setCode(next); setFilename(name); setIsEdited(false); run(next); setMobilePanel('preview');
  };

  const format = useCallback(async () => {
    const snapshot = codeRef.current;
    if (!snapshot.trim()) { notify('先写一点代码，再让它整齐起来。'); return; }
    setFormatting(true);
    try {
      const formatted = await formatHTML(snapshot);
      if (codeRef.current !== snapshot) { notify('代码已发生变化，本次未覆盖你的新内容。'); return; }
      setCode(formatted); setIsEdited(true); notify('代码已整理得整整齐齐。');
    } catch (error) {
      notify('格式化未完成：' + (error instanceof Error ? error.message.split('\n')[0] : '请检查 HTML 语法。'));
    } finally { setFormatting(false); }
  }, [notify]);

  const exportHTML = useCallback(async () => {
    try {
      let output = codeRef.current;
      if (output.includes(deskImage)) {
        const response = await fetch(deskImage);
        if (response.ok) {
          const blob = await response.blob();
          const data = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = reject; reader.readAsDataURL(blob); });
          output = output.split(deskImage).join(data);
        }
      }
      downloadText(output, filename);
      notify('HTML 已导出，带走这一点小灵感。');
    } catch { notify('导出暂未完成，请稍后再试。'); }
  }, [filename, notify]);

  useEffect(() => {
    const keydown = (event: KeyboardEvent) => {
      const modifier = event.ctrlKey || event.metaKey;
      if (modifier && event.key === 'Enter') { event.preventDefault(); run(); }
      if (modifier && event.key.toLowerCase() === 's') { event.preventDefault(); void exportHTML(); }
      if (modifier && event.shiftKey && event.key.toLowerCase() === 'f') { event.preventDefault(); void format(); }
      if (modifier && event.key.toLowerCase() === 'o') { event.preventDefault(); fileInput.current?.click(); }
      if (event.key === 'Escape') { setFocusPreview(false); setMenuOpen(false); }
    };
    window.addEventListener('keydown', keydown);
    return () => window.removeEventListener('keydown', keydown);
  }, [run, format, exportHTML]);

  const importFile = async (file: File) => {
    if (!/\.(html?|txt)$/i.test(file.name)) { notify('请选择 .html、.htm 或 .txt 文件。'); return; }
    if (file.size > MAX_FILE_SIZE) { notify('请选择小于 2 MB 的 HTML 文件。'); return; }
    try {
      const text = (await file.text()).replace(/^\uFEFF/, '');
      const apply = () => { replace(text, sanitizeFilename(file.name)); notify('已打开 ' + file.name); };
      if (isEdited) ask('打开新的 HTML？', '当前编辑内容将被替换。需要保留的话，请先导出当前草稿。', apply, '打开文件');
      else apply();
    } catch { notify('无法读取此文件，请确认它使用 UTF-8 编码。'); }
  };

  const pasteHTML = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (!text.trim()) { notify('剪贴板还是空的，先复制一段 HTML 吧。'); return; }
      if (text.length > MAX_FILE_SIZE) { notify('请选择小于 2 MB 的 HTML 内容。'); return; }
      const apply = () => { changeCode(text); run(text); setMobilePanel('preview'); notify('代码已粘贴，看看它的样子。'); };
      if (isEdited) ask('粘贴一个新想法？', '剪贴板内容会替换当前草稿，需要保留时请先导出。', apply, '粘贴 HTML');
      else apply();
    } catch {
      setMobilePanel('code');
      window.setTimeout(() => editorRef.current?.view?.focus(), 50);
      notify(window.matchMedia('(pointer: coarse)').matches
        ? '请在编辑器中长按，选择「粘贴」。局域网 HTTP 可能不支持自动读取剪贴板。'
        : '请直接在编辑器中按 Ctrl+V 粘贴代码。');
    }
  };

  const selectTemplate = async (template: StudioTemplate) => {
    setLoadingTemplate(template.id);
    try {
      const next = template.code ?? await fetch(`${import.meta.env.BASE_URL}${template.file}`).then(response => { if (!response.ok) throw new Error('template'); return response.text(); });
      templateDialog.current?.close();
      const apply = () => { replace(next || '', template.id + '.html'); notify('已载入「' + template.name + '」。'); };
      if (isEdited) ask('换一个新的灵感？', '载入示例会替换当前草稿。你可以先导出，再回来继续探索。', apply, '载入示例');
      else apply();
    } catch { notify('示例暂时无法载入，请稍后再试。'); }
    finally { setLoadingTemplate(null); }
  };

  const popout = () => {
    const view = window.open('about:blank', '_blank');
    if (!view) { notify('请允许此站点弹出预览窗口。'); return; }
    const escape = (value: string) => value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    view.opener = null;
    view.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${escape(filename)} · HTML Studio</title><style>html,body,iframe{margin:0;border:0;width:100%;height:100%;display:block}</style></head><body><iframe title="独立沙箱预览" sandbox="${scriptsEnabled ? 'allow-scripts' : ''}" referrerpolicy="no-referrer" srcdoc="${escape(codeRef.current)}"></iframe></body></html>`);
    view.document.close();
  };

  const width = device === 'mobile' ? 390 : device === 'tablet' ? 768 : viewport.width;
  const scale = zoom === 'fit' ? Math.min(1, viewport.width / width) : Number(zoom) / 100;
  const frameHeight = Math.max(200, viewport.height / scale);
  const source = useMemo(() => buildPreviewDocument(renderedCode, channel, scriptsEnabled), [renderedCode, channel, scriptsEnabled]);
  const errorCount = logs.filter(entry => entry.level === 'error').length;
  const lines = code.split('\n').length;
  const pending = code !== renderedCode;
  const openTemplates = () => { setMenuOpen(false); templateDialog.current?.showModal(); };

  return (
    <div className={`studio-app ${focusPreview ? 'preview-focused' : ''} ${resizing ? 'is-resizing' : ''}`} data-theme={dark ? 'dark' : 'light'}>
      <header className="studio-header">
        <a className="studio-brand" href="#" onClick={event => { event.preventDefault(); setFocusPreview(false); }} aria-label="HTML Studio 工作台"><BrandMark /><span>HTML<span className="brand-studio">Studio</span><small>让灵感，即刻可见</small></span></a>
        <nav className="studio-nav" aria-label="主导航">
          <button className="active" onClick={() => setFocusPreview(false)}>工作台</button>
          <button onClick={openTemplates}>示例库</button>
          <button onClick={() => guideDialog.current?.showModal()}>使用指南<ArrowUpRight size={12} /></button>
        </nav>
        <div className="header-actions"><span className="local-label"><i />仅在本机</span><span className="header-divider" /><button className="icon-button theme-button" onClick={() => setDark(value => !value)} title={dark ? '切换浅色主题' : '切换深色主题'} aria-label={dark ? '切换浅色主题' : '切换深色主题'}>{dark ? <Sun size={17} /> : <Moon size={17} />}</button><button className="export-button" aria-label="导出 HTML" onClick={() => void exportHTML()}><ArrowDownToLine size={15} /><span>导出 HTML</span></button></div>
      </header>

      <main className="studio-main">
        <div className="workspace-heading"><div><div className="heading-eyebrow">YOUR LITTLE CREATIVE WORKSPACE</div><h1>所写，即所见<span>。</span></h1><p>粘贴一段 HTML，让想法在眼前发生。</p></div><div className="workspace-actions"><button className="secondary-button" onClick={() => fileInput.current?.click()}><FolderOpen size={15} />打开文件</button><button className="secondary-button template-button" onClick={openTemplates}><LayoutTemplate size={15} />示例模板<ChevronDown size={12} /></button><button className="primary-button paste-button" onClick={() => void pasteHTML()}><ClipboardPaste size={14} />粘贴 HTML</button></div></div>

        <div className="mobile-pane-tabs"><button className={mobilePanel === 'code' ? 'selected' : ''} onClick={() => setMobilePanel('code')}><Code2 size={15} />代码</button><button className={mobilePanel === 'preview' ? 'selected' : ''} onClick={() => setMobilePanel('preview')}><Monitor size={15} />预览</button></div>

        <div ref={workbenchRef} className={`workbench mobile-${mobilePanel}`} style={{ gridTemplateColumns: `minmax(0, ${split}fr) 7px minmax(0, ${1 - split}fr)` }}
          onDragOver={event => { if (event.dataTransfer.types.includes('Files')) { event.preventDefault(); setDraggingFile(true); } }}
          onDragLeave={event => { if (!event.currentTarget.contains(event.relatedTarget as Node)) setDraggingFile(false); }}
          onDrop={event => { if (event.dataTransfer.files.length) { event.preventDefault(); setDraggingFile(false); void importFile(event.dataTransfer.files[0]); } }}>
          <section className="editor-panel" aria-label="HTML 编辑区">
            <div className="panel-toolbar"><div className="file-tab"><span className="html-file-icon"><FileCode2 size={16} /></span><input aria-label="文件名" value={filename} spellCheck={false} onChange={event => setFilename(event.target.value)} onBlur={() => setFilename(sanitizeFilename(filename))} /><span className="file-dot" title={saved === 'saved' ? '已保存' : '保存中'} /></div><div className="editor-tools"><button className="text-tool" onClick={() => void format()} disabled={formatting} title="格式化代码 (Ctrl+Shift+F)">{formatting ? <LoaderCircle className="spinning" size={14} /> : <Braces size={14} />}<span>格式化</span></button><button className="icon-button" aria-label="复制代码" title="复制代码" onClick={() => void copyText(code).then(() => notify('代码已复制到剪贴板。')).catch(() => notify('无法访问剪贴板，请在编辑器中手动复制。'))}><Copy size={14} /></button><div className="menu-anchor"><button className={`icon-button ${menuOpen ? 'is-selected' : ''}`} aria-label="更多编辑操作" title="更多操作" onClick={() => setMenuOpen(value => !value)}><Ellipsis size={17} /></button>{menuOpen && <><button className="menu-backdrop" aria-label="关闭操作菜单" onClick={() => setMenuOpen(false)} /><div className="editor-menu"><button onClick={() => { setMenuOpen(false); const apply = () => replace(blankCode, 'untitled.html'); if (isEdited) ask('新建一个页面？', '当前草稿会被替换，需要保留时请先导出。', apply, '新建页面'); else apply(); }}><Plus size={14} />新建空白文档</button><button onClick={() => { setMenuOpen(false); const view = editorRef.current?.view; if (view) openSearchPanel(view); }}><Code2 size={14} />搜索代码<kbd>Ctrl F</kbd></button><button className="danger" onClick={() => { setMenuOpen(false); ask('清空编辑器？', '这个操作会清空当前草稿。需要保留时，请先导出。', () => { replace('', 'untitled.html'); notify('编辑器已清空，新的灵感准备出发。'); }, '清空代码'); }}><Trash2 size={14} />清空编辑器</button></div></>}</div></div></div>
            <div className="editor-content"><CodeEditor value={code} dark={dark} onChange={changeCode} onUpdate={updateCursor} editorRef={editorRef} /></div>
            <div className="editor-bottom"><div><span className="language-tag"><i />HTML</span><span className="code-size">{lines} 行 · {code.length.toLocaleString()} 字符</span></div><button className="run-button" onClick={() => { run(); setMobilePanel('preview'); }} title="运行代码 (Ctrl+Enter)"><Play size={12} fill="currentColor" />运行代码<kbd>Ctrl ↵</kbd></button></div>
            <div className="panel-status"><span>Ln {cursor.line}, Col {cursor.column}</span><span>UTF-8<span className="status-divider" />2 个空格</span></div>
          </section>

          <div className="panel-resizer" role="separator" aria-label="调整编辑器和预览宽度" aria-orientation="vertical" tabIndex={0} aria-valuemin={28} aria-valuemax={68} aria-valuenow={Math.round(split * 100)}
            onPointerDown={event => { event.currentTarget.setPointerCapture(event.pointerId); setResizing(true); }}
            onPointerMove={event => { if (resizing && workbenchRef.current) { const rectangle = workbenchRef.current.getBoundingClientRect(); setSplit(Math.max(.28, Math.min(.68, (event.clientX - rectangle.left) / rectangle.width))); } }}
            onPointerUp={() => setResizing(false)} onPointerCancel={() => setResizing(false)}
            onKeyDown={event => { if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); setSplit(value => Math.max(.28, Math.min(.68, value + (event.key === 'ArrowRight' ? .02 : -.02)))); } }}><GripVertical size={12} /></div>

          <section className={`preview-panel ${focusPreview ? 'focused' : ''}`} aria-label="实时预览区">
            <div className="panel-toolbar preview-toolbar"><span className="preview-label"><i className={errorCount ? 'error' : pending ? 'pending' : ''} />实时预览</span><div className="device-controls" aria-label="设备视图"><button className={device === 'desktop' ? 'selected' : ''} onClick={() => setDevice('desktop')} aria-label="桌面视图" title="桌面视图" aria-pressed={device === 'desktop'}><Monitor size={15} /></button><button className={device === 'tablet' ? 'selected' : ''} onClick={() => setDevice('tablet')} aria-label="平板视图" title="平板视图" aria-pressed={device === 'tablet'}><Tablet size={14} /></button><button className={device === 'mobile' ? 'selected' : ''} onClick={() => setDevice('mobile')} aria-label="手机视图" title="手机视图" aria-pressed={device === 'mobile'}><Smartphone size={14} /></button></div><div className="preview-tools"><label className="live-toggle" title="自动更新预览"><span>实时</span><input type="checkbox" checked={autoRun} onChange={event => setAutoRun(event.target.checked)} aria-label="自动更新预览" /><i /></label><select className="zoom-control" aria-label="预览缩放" value={zoom} onChange={event => setZoom(event.target.value)}><option value="fit">适应</option><option value="50">50%</option><option value="75">75%</option><option value="100">100%</option><option value="125">125%</option></select><button className="icon-button" aria-label="刷新预览" title="刷新预览" onClick={() => run()}><RefreshCw size={14} /></button><button className="icon-button popout-button" aria-label="新窗口预览" title="新窗口预览（保持沙箱隔离）" onClick={popout}><ExternalLink size={14} /></button><button className="icon-button" aria-label={focusPreview ? '退出全屏预览' : '全屏预览'} title={focusPreview ? '退出全屏 (Esc)' : '全屏预览'} onClick={() => setFocusPreview(value => !value)}>{focusPreview ? <Minimize2 size={15} /> : <Expand size={15} />}</button></div></div>
            <div className="preview-stage" ref={stageRef}>
              {!renderedCode.trim() ? <div className="empty-preview"><span><Code2 size={35} strokeWidth={1.3} /></span><h2>这里，等你的灵感出现。</h2><p>在左侧写下 HTML，或从一个小示例开始。</p><button className="secondary-button" onClick={openTemplates}><LayoutTemplate size={14} />看看示例</button></div> : <div className={`viewport-align ${width * scale > viewport.width ? 'overflows' : ''}`}><div className={`viewport-shell ${device === 'mobile' ? 'mobile-frame' : ''}`} style={{ width: width * scale, height: frameHeight * scale }}><iframe key={runVersion} ref={iframeRef} title="HTML 渲染预览" sandbox={scriptsEnabled ? 'allow-scripts' : ''} referrerPolicy="no-referrer" srcDoc={source} onLoad={() => setPreviewLoading(false)} style={{ width, height: frameHeight, transform: `scale(${scale})` }} /></div></div>}
              {previewLoading && renderedCode.trim() && <span className="preview-refreshing" aria-label="正在渲染"><LoaderCircle size={13} className="spinning" /></span>}
            </div>
            {consoleOpen && <section className="console-panel" aria-label="预览控制台"><div className="console-toolbar"><span><Terminal size={12} />控制台 <i>{logs.length}</i></span><div><button className="icon-button" aria-label="清空控制台" title="清空控制台" onClick={() => setLogs([])}><Trash2 size={12} /></button><button className="icon-button" aria-label="关闭控制台" onClick={() => setConsoleOpen(false)}><X size={13} /></button></div></div><div className="console-entries">{logs.length ? logs.map(entry => <div className={`console-entry ${entry.level}`} key={entry.id}><time>{entry.time}</time><span>{entry.text}</span></div>) : <p className="console-empty">console.log、警告和运行错误，会在这里出现。</p>}</div></section>}
            <div className="preview-bottom"><span className="viewport-size"><Monitor size={11} />{Math.round(width)} × {Math.round(frameHeight)}<span className="preview-updated">{pending ? '有更改待运行' : '已更新 ' + lastRun.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}</span></span><button className={consoleOpen ? 'console-toggle selected' : 'console-toggle'} onClick={() => setConsoleOpen(value => !value)} aria-expanded={consoleOpen}><Terminal size={12} />控制台{errorCount > 0 && <b>{errorCount}</b>}<ChevronDown size={10} /></button></div>
            <div className="panel-status preview-status"><button className={scriptsEnabled ? '' : 'scripts-disabled'} onClick={() => { setScriptsEnabled(value => !value); run(); }} title="点击启用或禁用预览中的 JavaScript"><ShieldCheck size={11} />沙箱隔离<span className="status-divider" />{scriptsEnabled ? 'JavaScript 已启用' : 'JavaScript 已禁用'}</button><span><i />{autoRun ? '自动更新已开启' : '手动运行模式'}</span></div>
          </section>
          {draggingFile && <div className="file-drop-overlay"><FolderOpen size={34} /><strong>松开，让你的页面出现。</strong><span>支持 HTML / HTM 文件，最大 2 MB</span></div>}
        </div>
        <div className="workspace-footer"><span className={`save-state ${saved}`}><CloudCheck size={13} />{saved === 'saving' ? '正在保存草稿...' : saved === 'error' ? '本地存储不可用，请及时导出' : '所有更改已自动保存到本地'}</span><button onClick={() => guideDialog.current?.showModal()}><Keyboard size={13} />键盘快捷键</button><span className="footer-tip">一点代码，一点想象，无限可能。</span></div>
      </main>

      <footer className="studio-footer"><span><BrandMark small />HTML Studio<span className="footer-version">v1.0</span></span><span><ShieldCheck size={11} />应用不会上传你的代码<span className="footer-separator">·</span>为每一个小想法而造</span><button onClick={() => guideDialog.current?.showModal()}>简单，但不止于简单<ArrowUpRight size={11} /></button></footer>

      <input type="file" className="visually-hidden" ref={fileInput} accept=".html,.htm,.txt,text/html" onChange={event => { const file = event.target.files?.[0]; if (file) void importFile(file); event.target.value = ''; }} />

      <dialog ref={templateDialog} className="studio-dialog template-dialog" aria-labelledby="templates-title" onClick={event => { if (event.target === event.currentTarget) templateDialog.current?.close(); }}><button className="dialog-close icon-button" aria-label="关闭示例库" onClick={() => templateDialog.current?.close()}><X size={18} /></button><span className="dialog-eyebrow">A LITTLE INSPIRATION</span><h2 id="templates-title">从一个小灵感开始。</h2><p className="dialog-description">挑一个喜欢的示例，改一改，就变成了你的作品。</p><div className="template-grid">{templates.map(template => <button className="template-choice" key={template.id} disabled={loadingTemplate !== null} onClick={() => void selectTemplate(template)}><TemplateThumbnail tone={template.tone} /><span className="template-category">{template.category}</span><strong>{template.name}{loadingTemplate === template.id ? <LoaderCircle size={14} className="spinning" /> : <ArrowUpRight size={14} />}</strong><p>{template.description}</p></button>)}</div><div className="dialog-footnote"><ShieldCheck size={12} />示例均可直接编辑；替换草稿前，我们会提醒你。</div></dialog>

      <dialog ref={guideDialog} className="studio-dialog guide-dialog" aria-labelledby="guide-title" onClick={event => { if (event.target === event.currentTarget) guideDialog.current?.close(); }}><button className="dialog-close icon-button" aria-label="关闭使用指南" onClick={() => guideDialog.current?.close()}><X size={18} /></button><span className="dialog-eyebrow">MAKE YOURSELF AT HOME</span><h2 id="guide-title">简单上手，自在创作。</h2><p className="dialog-description">一个只在本地工作的 HTML 小工作台。</p><div className="guide-step"><span>01</span><div><h3>粘贴，然后看见</h3><p>完整 HTML 或一小段标签都可以。内联 CSS 与 JavaScript 也能直接运行，默认在停止输入 350 毫秒后更新。</p></div></div><div className="guide-step"><span>02</span><div><h3>用舒服的方式打磨</h3><p>切换设备视图、调整缩放，拖动中间分隔条。通过控制台查看日志与错误，再把页面导出带走。</p></div></div><div className="shortcut-list"><div><span>运行代码</span><kbd>Ctrl / ⌘ + Enter</kbd></div><div><span>格式化代码</span><kbd>Ctrl / ⌘ + Shift + F</kbd></div><div><span>导出 HTML</span><kbd>Ctrl / ⌘ + S</kbd></div><div><span>打开本地文件</span><kbd>Ctrl / ⌘ + O</kbd></div><div><span>搜索代码</span><kbd>Ctrl / ⌘ + F</kbd></div></div><div className="privacy-note"><ShieldCheck size={18} /><p><strong>你的代码，留在你的浏览器。</strong>应用不上传代码，草稿会保存在本地浏览器。预览使用独立沙箱，不能访问应用的存储；但 HTML 内的外链资源仍可能访问网络，请只运行可信代码。可在预览底部关闭 JavaScript。</p></div></dialog>

      <dialog ref={confirmDialog} className="studio-dialog confirm-dialog" aria-labelledby="confirm-title"><span className="dialog-eyebrow">ONE LITTLE CHECK</span><h2 id="confirm-title">{confirm.title}</h2><p className="dialog-description">{confirm.description}</p><div className="confirm-actions"><button className="secondary-button" onClick={() => { confirmDialog.current?.close(); pendingAction.current = null; }}>再想想</button><button className="primary-button" onClick={() => { confirmDialog.current?.close(); pendingAction.current?.(); pendingAction.current = null; }}>{confirm.label}</button></div></dialog>

      <div className={`studio-toast ${toast ? 'visible' : ''}`} role="status" aria-live="polite"><Check size={14} /><span>{toast}</span></div>
      {focusPreview && <button className="focus-exit" onClick={() => setFocusPreview(false)} aria-label="退出全屏预览"><Minimize2 size={16} />退出全屏<kbd>Esc</kbd></button>}
    </div>
  );
}
