import {
  autocompletion,
  closeBrackets,
  closeBracketsKeymap,
  completionKeymap,
} from '@codemirror/autocomplete';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import {
  bracketMatching,
  foldGutter,
  foldKeymap,
  HighlightStyle,
  indentOnInput,
  syntaxHighlighting,
} from '@codemirror/language';
import { lintKeymap } from '@codemirror/lint';
import { highlightSelectionMatches, searchKeymap } from '@codemirror/search';
import { Compartment, EditorState, Extension } from '@codemirror/state';
import {
  crosshairCursor,
  drawSelection,
  dropCursor,
  EditorView,
  highlightActiveLine,
  highlightActiveLineGutter,
  keymap,
  lineNumbers,
  placeholder,
  rectangularSelection,
} from '@codemirror/view';
import { tags } from '@lezer/highlight';
import { bubbleMenu } from './bubble';
import { asciidocKeymap } from './keymap';
import { asciidoc } from './language/asciidoc';
import { asciidocCompletionSource } from './language/autocomplete';
import { asciidocLinter } from './language/diagnostics';
import { asciidocFold } from './language/fold';
import { asciidocHover } from './language/hover';
import { livePreview } from './live-preview/decorations';
import { EditorSettings } from '../sn/settings';

export interface CursorInfo {
  line: number;
  column: number;
  selected: number;
  lines: number;
}

export interface CreateEditorOptions {
  parent: HTMLElement;
  doc: string;
  locked: boolean;
  livePreview: boolean;
  settings: EditorSettings;
  onChange: (text: string) => void;
  onCursor: (info: CursorInfo) => void;
  onCommandPalette?: () => void;
  onShortcutsHelp?: () => void;
}

export interface EditorHandle {
  view: EditorView;
  getValue(): string;
  setValue(text: string): void;
  setLocked(locked: boolean): void;
  setLivePreview(enabled: boolean): void;
  setSettings(settings: EditorSettings): void;
  focus(): void;
  destroy(): void;
}

const highlightStyle = HighlightStyle.define([
  { tag: tags.heading, class: 'tok-heading' },
  { tag: tags.comment, class: 'tok-comment' },
  { tag: tags.keyword, class: 'tok-keyword' },
  { tag: tags.string, class: 'tok-string' },
  { tag: tags.meta, class: 'tok-meta' },
  { tag: tags.variableName, class: 'tok-variable' },
  { tag: tags.link, class: 'tok-link' },
  { tag: tags.url, class: 'tok-url' },
  { tag: tags.strong, class: 'tok-strong' },
  { tag: tags.emphasis, class: 'tok-emphasis' },
  { tag: tags.monospace, class: 'tok-mono' },
  { tag: tags.list, class: 'tok-list' },
  { tag: tags.operator, class: 'tok-operator' },
  { tag: tags.atom, class: 'tok-atom' },
  { tag: tags.labelName, class: 'tok-label' },
  { tag: tags.macroName, class: 'tok-macro' },
  { tag: tags.processingInstruction, class: 'tok-directive' },
  { tag: tags.escape, class: 'tok-escape' },
]);

export function createEditor(options: CreateEditorOptions): EditorHandle {
  const editable = new Compartment();
  const live = new Compartment();
  const theme = new Compartment();
  const gutter = new Compartment();
  const wrapping = new Compartment();
  let suppressChange = false;

  const updateListener = EditorView.updateListener.of((update) => {
    if (update.docChanged && !suppressChange) {
      options.onChange(update.state.doc.toString());
    }

    if (update.docChanged || update.selectionSet) {
      options.onCursor(cursorInfo(update.state));
    }
  });

  const state = EditorState.create({
    doc: options.doc,
    extensions: [
      asciidoc(),
      keymap.of([
        {
          key: 'Mod-Shift-p',
          run: () => {
            options.onCommandPalette?.();
            return true;
          },
        },
        {
          key: 'F1',
          run: () => {
            options.onShortcutsHelp?.();
            return true;
          },
        },
      ]),
      asciidocKeymap,
      keymap.of([
        ...closeBracketsKeymap,
        ...defaultKeymap,
        ...searchKeymap,
        ...historyKeymap,
        ...foldKeymap,
        ...completionKeymap,
        ...lintKeymap,
        indentWithTab,
      ]),
      history(),
      drawSelection(),
      dropCursor(),
      rectangularSelection(),
      crosshairCursor(),
      highlightActiveLine(),
      highlightActiveLineGutter(),
      highlightSelectionMatches(),
      bracketMatching(),
      closeBrackets(),
      indentOnInput(),
      foldGutter(),
      asciidocFold,
      asciidocLinter,
      asciidocHover,
      autocompletion({
        override: [asciidocCompletionSource],
        activateOnTyping: true,
        icons: true,
      }),
      syntaxHighlighting(highlightStyle),
      bubbleMenu(),
      placeholder('Start writing AsciiDoc…'),
      EditorView.contentAttributes.of({
        spellcheck: 'true',
        'aria-label': 'AsciiDoc editor',
      }),
      gutter.of(options.settings.showLineNumbers ? lineNumbers() : []),
      wrapping.of(options.settings.softWrap ? EditorView.lineWrapping : []),
      theme.of(editorTheme(options.settings)),
      editable.of([EditorView.editable.of(!options.locked), EditorState.readOnly.of(options.locked)]),
      live.of(options.livePreview ? livePreview() : []),
      updateListener,
    ],
  });

  const view = new EditorView({ state, parent: options.parent });
  options.onCursor(cursorInfo(view.state));

  return {
    view,
    getValue: () => view.state.doc.toString(),
    setValue: (text: string) => {
      if (text === view.state.doc.toString()) {
        return;
      }
      suppressChange = true;
      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: text },
        selection: { anchor: Math.min(view.state.selection.main.head, text.length) },
      });
      suppressChange = false;
    },
    setLocked: (locked: boolean) => {
      view.dispatch({
        effects: editable.reconfigure([
          EditorView.editable.of(!locked),
          EditorState.readOnly.of(locked),
        ]),
      });
    },
    setLivePreview: (enabled: boolean) => {
      view.dispatch({ effects: live.reconfigure(enabled ? livePreview() : []) });
    },
    setSettings: (settings: EditorSettings) => {
      view.dispatch({
        effects: [
          theme.reconfigure(editorTheme(settings)),
          gutter.reconfigure(settings.showLineNumbers ? lineNumbers() : []),
          wrapping.reconfigure(settings.softWrap ? EditorView.lineWrapping : []),
        ],
      });
    },
    focus: () => view.focus(),
    destroy: () => view.destroy(),
  };
}

function cursorInfo(state: EditorState): CursorInfo {
  const range = state.selection.main;
  const line = state.doc.lineAt(range.head);
  return {
    line: line.number,
    column: range.head - line.from + 1,
    selected: range.to - range.from,
    lines: state.doc.lines,
  };
}

function editorTheme(settings: EditorSettings): Extension {
  return EditorView.theme({
    '&': {
      height: '100%',
      fontSize: `${settings.fontSize}px`,
      backgroundColor: 'var(--adoc-bg)',
      color: 'var(--adoc-text)',
    },
    '.cm-scroller': {
      overflow: 'auto',
      fontFamily: 'var(--adoc-editor-font)',
      lineHeight: String(settings.lineHeight),
    },
    '.cm-content': {
      padding: '1.25rem 0 40vh',
      caretColor: 'var(--adoc-accent)',
      maxWidth: 'var(--adoc-editor-width)',
      margin: '0 auto',
    },
    '.cm-line': {
      padding: '0 1.25rem',
    },
    '.cm-gutters': {
      backgroundColor: 'var(--adoc-bg)',
      color: 'var(--adoc-muted)',
      border: 'none',
    },
    '.cm-activeLine': {
      backgroundColor: 'var(--adoc-active-line)',
    },
    '.cm-activeLineGutter': {
      backgroundColor: 'var(--adoc-active-line)',
    },
    '.cm-selectionBackground, ::selection': {
      backgroundColor: 'var(--adoc-selection) !important',
    },
    '.cm-cursor': {
      borderLeftColor: 'var(--adoc-accent)',
    },
    '.cm-tooltip': {
      backgroundColor: 'var(--adoc-panel)',
      color: 'var(--adoc-text)',
      border: '1px solid var(--adoc-border)',
      borderRadius: '8px',
      boxShadow: '0 10px 30px var(--adoc-shadow)',
    },
    '.cm-tooltip-autocomplete ul li[aria-selected]': {
      backgroundColor: 'var(--adoc-accent)',
      color: '#fff',
    },
  });
}
