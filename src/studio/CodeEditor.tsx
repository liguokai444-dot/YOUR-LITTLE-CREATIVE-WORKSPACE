import { memo, useMemo } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import type { ReactCodeMirrorRef } from '@uiw/react-codemirror';
import { html } from '@codemirror/lang-html';
import { EditorView } from '@codemirror/view';
import type { ViewUpdate } from '@codemirror/view';
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { tags } from '@lezer/highlight';

interface CodeEditorProps {
  value: string;
  dark: boolean;
  onChange: (value: string) => void;
  onUpdate: (update: ViewUpdate) => void;
  editorRef: React.RefObject<ReactCodeMirrorRef | null>;
}

const language = html({ autoCloseTags: true });

export default memo(function CodeEditor({ value, dark, onChange, onUpdate, editorRef }: CodeEditorProps) {
  const theme = useMemo(() => EditorView.theme({
    '&': { color: dark ? '#c5d3c9' : '#586269', backgroundColor: dark ? '#1b2421' : '#fff', height: '100%', fontSize: '12px' },
    '&.cm-focused': { outline: 'none' },
    '.cm-content': { padding: '17px 0 30px', caretColor: '#438166' },
    '.cm-scroller': { fontFamily: '"SFMono-Regular", Consolas, "Liberation Mono", monospace', lineHeight: '1.85', overflow: 'auto' },
    '.cm-line': { padding: '0 17px 0 8px' },
    '.cm-gutters': { backgroundColor: dark ? '#1b2421' : '#fff', color: dark ? '#586c5e' : '#b9bec1', border: 'none', minWidth: '50px' },
    '.cm-lineNumbers .cm-gutterElement': { padding: '0 10px 0 10px', minWidth: '34px' },
    '.cm-activeLine, .cm-activeLineGutter': { backgroundColor: dark ? '#25342b' : '#f3f7f3' },
    '.cm-foldGutter .cm-gutterElement': { color: dark ? '#647e6b' : '#b7bdb6', padding: '0 2px' },
    '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, ::selection': { backgroundColor: dark ? '#3a5844' : '#dfece0' },
    '.cm-cursor': { borderLeftColor: '#4d8a64' },
    '.cm-tooltip': { border: '1px solid #dce4dc', backgroundColor: dark ? '#25342b' : '#fff', borderRadius: '5px', overflow: 'hidden' },
    '.cm-panels': { backgroundColor: dark ? '#25342b' : '#f5f8f3', borderColor: '#dfe6dd' },
    '.cm-searchMatch': { backgroundColor: '#e9dca657' },
  }, { dark }), [dark]);
  const extensions = useMemo(() => [language, EditorView.contentAttributes.of({ 'aria-label': 'HTML 代码编辑器', spellcheck: 'false', autocapitalize: 'off', autocorrect: 'off' }), syntaxHighlighting(HighlightStyle.define([
    { tag: [tags.tagName, tags.angleBracket], color: dark ? '#dfae90' : '#a97561' },
    { tag: tags.attributeName, color: dark ? '#b5c787' : '#7d8b58' },
    { tag: [tags.string, tags.attributeValue], color: dark ? '#97bd9c' : '#829669' },
    { tag: tags.comment, color: dark ? '#627b68' : '#a4aaa0', fontStyle: 'italic' },
    { tag: [tags.keyword, tags.controlKeyword], color: dark ? '#c0b1dc' : '#9c7a9f' },
    { tag: tags.propertyName, color: dark ? '#9fbdca' : '#708796' },
    { tag: tags.number, color: dark ? '#ddb58b' : '#ad8b65' },
    { tag: [tags.punctuation, tags.brace, tags.operator], color: dark ? '#859c8b' : '#9ba39c' },
    { tag: tags.meta, color: dark ? '#8da595' : '#a3aaa4' },
  ]))], [dark]);

  return <CodeMirror ref={editorRef} value={value} theme={theme} extensions={extensions}
    onChange={onChange} onUpdate={onUpdate} height="100%" aria-label="HTML 代码编辑器"
    placeholder="在这里粘贴 HTML 代码，右侧即刻呈现。"
    basicSetup={{ lineNumbers: true, foldGutter: true, highlightActiveLine: true, bracketMatching: true, autocompletion: true, searchKeymap: true }}
    indentWithTab />;
});
