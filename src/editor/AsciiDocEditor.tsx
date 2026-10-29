import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import { Diagnostic } from '@codemirror/lint';
import { Command } from '@codemirror/view';
import { CursorInfo, createEditor, EditorHandle } from '../editor/createEditor';
import { diagnose } from '../editor/language/diagnostics';
import { buildModel } from '../editor/model/document-model';
import { Heading } from '../editor/model/scanner';
import { paletteCommands } from '../editor/commands/palette';
import { renderAsciiDoc } from '../render/asciidoctor';
import { postprocessPreview } from '../render/postprocess';
import { SNBridge } from '../sn/bridge';
import { EditorSettings, loadSettings, saveSettings, ViewMode } from '../sn/settings';
import { CommandPalette, CommandPaletteItem } from '../ui/CommandPalette';
import { Outline } from '../ui/Outline';
import { ProblemsPanel } from '../ui/ProblemsPanel';
import { SettingsPanel } from '../ui/SettingsPanel';
import { ShortcutsHelp } from '../ui/ShortcutsHelp';
import { StatusBar } from '../ui/StatusBar';
import { Toolbar } from '../ui/Toolbar';
import { DialogHost } from '../ui/DialogHost';

export interface AsciiDocEditorProps {
  bridge: SNBridge;
}

interface PreviewState {
  html: string;
  engine: string;
  error?: string;
  warnings: string[];
}

export function AsciiDocEditor({ bridge }: AsciiDocEditorProps) {
  const [settings, setSettings] = useState<EditorSettings>(() => loadSettings(bridge));
  const [text, setText] = useState(bridge.text);
  const [locked, setLocked] = useState(bridge.isLocked);
  const [viewMode, setViewMode] = useState<ViewMode>(settings.viewMode);
  const [livePreview, setLivePreview] = useState(settings.livePreview);
  const [showOutline, setShowOutline] = useState(settings.showOutline);
  const [cursor, setCursor] = useState<CursorInfo>({ line: 1, column: 1, selected: 0, lines: 1 });
  const [model, setModel] = useState(() => buildModel(bridge.text));
  const [preview, setPreview] = useState<PreviewState>({ html: '', engine: 'none', warnings: [] });
  const [diagnostics, setDiagnostics] = useState<Diagnostic[]>(() => diagnose(bridge.text));
  const [saved, setSaved] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [problemsOpen, setProblemsOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [dark, setDark] = useState(isDarkTheme());

  const refreshTheme = useCallback(() => {
    setDark(isDarkTheme());
    window.setTimeout(() => setDark(isDarkTheme()), 120);
    window.setTimeout(() => setDark(isDarkTheme()), 600);
  }, []);

  const hostRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<EditorHandle | null>(null);
  const renderSeq = useRef(0);
  const savedTimer = useRef<number | undefined>(undefined);
  const initialSettings = useRef(settings).current;

  const handleChange = useCallback(
    (value: string) => {
      setText(value);
      bridge.save(value);
      setSaved(false);
      window.clearTimeout(savedTimer.current);
      savedTimer.current = window.setTimeout(() => setSaved(true), 700);
    },
    [bridge],
  );

  const handleCursor = useCallback((info: CursorInfo) => setCursor(info), []);

  useEffect(() => {
    if (!hostRef.current) {
      return;
    }

    const editor = createEditor({
      parent: hostRef.current,
      doc: bridge.text,
      locked: bridge.isLocked,
      livePreview: initialSettings.viewMode === 'live' && initialSettings.livePreview,
      settings: initialSettings,
      onChange: handleChange,
      onCursor: handleCursor,
      onCommandPalette: () => setPaletteOpen(true),
      onShortcutsHelp: () => setShortcutsOpen(true),
    });

    editorRef.current = editor;

    return () => {
      editor.destroy();
      editorRef.current = null;
    };
  }, [bridge, handleChange, handleCursor, initialSettings]);

  useEffect(() => {
    const offText = bridge.onText((value) => {
      setText(value);
      setModel(buildModel(value));
      setDiagnostics(diagnose(value));
      const editor = editorRef.current;
      if (editor && editor.getValue() !== value) {
        editor.setValue(value);
      }
      setSaved(true);
    });
    const offLocked = bridge.onLocked(setLocked);
    const offTheme = bridge.onTheme(refreshTheme);

    return () => {
      offText();
      offLocked();
      offTheme();
    };
  }, [bridge]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setModel(buildModel(text));
      setDiagnostics(diagnose(text));
    }, 180);

    return () => window.clearTimeout(timer);
  }, [text]);

  useEffect(() => {
    const sequence = ++renderSeq.current;
    const timer = window.setTimeout(async () => {
      if (!text.trim()) {
        if (sequence === renderSeq.current) {
          setPreview({ html: '', engine: 'none', warnings: [] });
          bridge.setPreview('');
        }
        return;
      }

      const result = await renderAsciiDoc(text, {
        allowRemoteIncludes: settings.allowRemoteIncludes,
      });
      if (sequence !== renderSeq.current) {
        return;
      }

      setPreview({
        html: result.html,
        engine: result.engine,
        error: result.error,
        warnings: result.warnings,
      });
      bridge.setPreview(result.html);
    }, settings.previewDelay);

    return () => window.clearTimeout(timer);
  }, [text, settings.previewDelay, settings.allowRemoteIncludes, bridge]);

  useEffect(() => {
    if (previewRef.current) {
      void postprocessPreview(previewRef.current, {
        enableKroki: settings.enableKroki,
      });
    }
  }, [preview.html, viewMode, settings.enableKroki]);

  useEffect(() => {
    editorRef.current?.setLocked(locked);
  }, [locked]);

  useEffect(() => {
    editorRef.current?.setLivePreview(viewMode === 'live' && livePreview);
  }, [viewMode, livePreview]);

  useEffect(() => {
    editorRef.current?.setSettings(settings);
  }, [settings]);

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => refreshTheme();
    media.addEventListener?.('change', handler);
    return () => media.removeEventListener?.('change', handler);
  }, [refreshTheme]);

  useEffect(() => {
    const observer = new MutationObserver(() => refreshTheme());
    observer.observe(document.head, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['href', 'disabled'],
    });
    window.addEventListener('load', refreshTheme);

    return () => {
      observer.disconnect();
      window.removeEventListener('load', refreshTheme);
    };
  }, [refreshTheme]);

  useEffect(() => () => window.clearTimeout(savedTimer.current), []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) {
        return;
      }

      const mod = event.metaKey || event.ctrlKey;

      if (mod && event.shiftKey && event.key.toLowerCase() === 'p') {
        event.preventDefault();
        setPaletteOpen(true);
      } else if (event.key === 'F1') {
        event.preventDefault();
        setShortcutsOpen(true);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const updateSettings = (next: EditorSettings) => {
    setSettings(next);
    setViewMode(next.viewMode);
    setLivePreview(next.livePreview);
    setShowOutline(next.showOutline);
    saveSettings(bridge, next);
  };

  const changeViewMode = (mode: ViewMode) => {
    setViewMode(mode);
    const next = { ...settings, viewMode: mode };
    setSettings(next);
    saveSettings(bridge, next);
    window.requestAnimationFrame(() => editorRef.current?.view.requestMeasure());
  };

  const toggleLivePreview = (value: boolean) => {
    setLivePreview(value);
    const next = { ...settings, livePreview: value };
    setSettings(next);
    saveSettings(bridge, next);
  };

  const toggleOutline = (value: boolean) => {
    setShowOutline(value);
    const next = { ...settings, showOutline: value };
    setSettings(next);
    saveSettings(bridge, next);
  };

  const runCommand = (command: Command) => {
    const view = editorRef.current?.view;
    if (view) {
      command(view);
    }
  };

  const selectHeading = (heading: Heading) => {
    const view = editorRef.current?.view;
    if (!view) {
      return;
    }
    const line = view.state.doc.line(Math.min(heading.line, view.state.doc.lines));
    view.dispatch({ selection: { anchor: line.from }, scrollIntoView: true });
    view.focus();
  };

  const goToOffset = (offset: number) => {
    const view = editorRef.current?.view;
    if (!view) {
      return;
    }
    if (viewMode === 'preview') {
      changeViewMode('split');
    }
    const position = Math.min(Math.max(0, offset), view.state.doc.length);
    view.dispatch({ selection: { anchor: position }, scrollIntoView: true });
    view.focus();
  };

  const handlePreviewClick = (event: MouseEvent) => {
    const target = (event.target as HTMLElement | null)?.closest('[data-srclineno]');
    const view = editorRef.current?.view;
    if (!target || !view) {
      return;
    }

    const sourceLine = Number(target.getAttribute('data-srclineno'));
    if (!Number.isFinite(sourceLine) || sourceLine < 1) {
      return;
    }

    const line = view.state.doc.line(Math.min(sourceLine, view.state.doc.lines));
    view.dispatch({ selection: { anchor: line.from }, scrollIntoView: true });
    view.focus();
  };

  const downloadAdoc = () => {
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'note.adoc';
    link.click();
    URL.revokeObjectURL(url);
    setExportOpen(false);
  };

  const copyText = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      // Clipboard access can be unavailable in a sandboxed iframe.
    }
    setExportOpen(false);
  };

  const printPreview = () => {
    setExportOpen(false);
    window.print();
  };

  const paletteItems: CommandPaletteItem[] = [
    ...paletteCommands.map((item) => ({
      label: item.label,
      group: item.group,
      hint: item.hint,
      run: () => runCommand(item.command),
    })),
    { label: 'Live view', group: 'View', run: () => changeViewMode('live') },
    { label: 'Split view', group: 'View', run: () => changeViewMode('split') },
    { label: 'Preview view', group: 'View', run: () => changeViewMode('preview') },
    {
      label: livePreview ? 'Disable live preview' : 'Enable live preview',
      group: 'View',
      run: () => toggleLivePreview(!livePreview),
    },
    {
      label: showOutline ? 'Hide outline' : 'Show outline',
      group: 'View',
      run: () => toggleOutline(!showOutline),
    },
    { label: 'Show problems', group: 'View', run: () => setProblemsOpen(true) },
    { label: 'Settings', group: 'View', run: () => setSettingsOpen(true) },
    { label: 'Keyboard shortcuts', group: 'View', hint: 'F1', run: () => setShortcutsOpen(true) },
    { label: 'Export .adoc', group: 'Export', run: downloadAdoc },
    { label: 'Copy AsciiDoc', group: 'Export', run: () => void copyText(text) },
    { label: 'Copy HTML', group: 'Export', run: () => void copyText(preview.html) },
    { label: 'Print / PDF', group: 'Export', run: printPreview },
  ];

  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  const empty = !text.trim();

  return (
    <div className={dark ? 'adoc-root dark' : 'adoc-root'}>
      <Toolbar
        onCommand={runCommand}
        viewMode={viewMode}
        onViewMode={changeViewMode}
        livePreview={livePreview}
        onLivePreview={toggleLivePreview}
        showOutline={showOutline}
        onShowOutline={toggleOutline}
        onSettings={() => setSettingsOpen(true)}
        onExport={() => setExportOpen((value) => !value)}
        locked={locked}
      />

      <div className="adoc-body">
        {showOutline ? (
          <Outline headings={model.document.headings} activeLine={cursor.line} onSelect={selectHeading} />
        ) : null}

        <main className="adoc-main">
          <section className={viewMode === 'preview' ? 'adoc-editor-pane is-hidden' : 'adoc-editor-pane'}>
            <div ref={hostRef} className="adoc-editor-host" />
            {empty ? (
              <div className="adoc-empty">
                <div className="adoc-empty-title">Write AsciiDoc</div>
                <p>Start with a title, then add sections, lists, and blocks.</p>
                <pre>{`= My document
:icons: font

== First section

* A bullet
* [ ] A task
* [x] A completed task

NOTE: AsciiDoc is the source of truth.

[source,javascript]
----
const value = 42;
----`}</pre>
                <p className="adoc-empty-hint">Type <kbd>/</kbd> at the start of a line for blocks.</p>
              </div>
            ) : null}
          </section>

          <section className={viewMode === 'live' ? 'adoc-preview-pane is-hidden' : 'adoc-preview-pane'}>
            <div className="adoc-preview-header">
              <span>Preview</span>
              <span className="adoc-preview-engine">
                {preview.engine === 'none' ? 'idle' : `Asciidoctor ${preview.engine}`}
              </span>
            </div>
            {preview.error ? <div className="adoc-preview-error">{preview.error}</div> : null}
            {preview.warnings.length > 0 ? (
              <div className="adoc-preview-warnings" role="status">
                {preview.warnings.map((warning) => (
                  <div key={warning}>{warning}</div>
                ))}
              </div>
            ) : null}
            <div
              ref={previewRef}
              className="adoc-preview asciidoc"
              onClick={handlePreviewClick}
              dangerouslySetInnerHTML={{ __html: preview.html }}
            />
          </section>
        </main>
      </div>

      <StatusBar
        cursor={cursor}
        words={words}
        characters={text.length}
        engine={preview.engine}
        locked={locked}
        diagnostics={diagnostics.length}
        saved={saved}
        breadcrumbs={breadcrumbPath(model.document.headings, cursor.line)}
        onProblems={() => setProblemsOpen(true)}
      />

      {settingsOpen ? (
        <SettingsPanel
          settings={settings}
          onChange={updateSettings}
          onClose={() => setSettingsOpen(false)}
        />
      ) : null}

      {problemsOpen ? (
        <ProblemsPanel
          diagnostics={diagnostics}
          text={text}
          onSelect={goToOffset}
          onClose={() => setProblemsOpen(false)}
        />
      ) : null}

      {paletteOpen ? (
        <CommandPalette items={paletteItems} onClose={() => setPaletteOpen(false)} />
      ) : null}

      {shortcutsOpen ? <ShortcutsHelp onClose={() => setShortcutsOpen(false)} /> : null}

      <DialogHost />

      {exportOpen ? (
        <div className="adoc-export-menu" role="menu">
          <button type="button" onClick={downloadAdoc}>
            Download .adoc
          </button>
          <button type="button" onClick={() => void copyText(text)}>
            Copy AsciiDoc
          </button>
          <button type="button" onClick={() => void copyText(preview.html)}>
            Copy HTML
          </button>
          <button type="button" onClick={printPreview}>
            Print / PDF
          </button>
        </div>
      ) : null}
    </div>
  );
}

function isDarkTheme(): boolean {
  const background = getComputedStyle(document.body).backgroundColor;
  const match = /rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(background);

  if (!match) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  const [, red, green, blue] = match;
  return (Number(red) * 299 + Number(green) * 587 + Number(blue) * 114) / 1000 < 128;
}

function breadcrumbPath(headings: Heading[], line: number): string {
  const stack: Heading[] = [];

  for (const heading of headings) {
    if (heading.discrete) {
      continue;
    }

    if (heading.line > line) {
      break;
    }

    while (stack.length > 0 && stack[stack.length - 1].level >= heading.level) {
      stack.pop();
    }

    stack.push(heading);
  }

  return stack.map((heading) => heading.title).join(' › ');
}
