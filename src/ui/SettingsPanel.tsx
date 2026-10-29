import { EditorSettings, DEFAULT_SETTINGS, ViewMode } from '../sn/settings';

export interface SettingsPanelProps {
  settings: EditorSettings;
  onChange: (settings: EditorSettings) => void;
  onClose: () => void;
}

export function SettingsPanel({ settings, onChange, onClose }: SettingsPanelProps) {
  const update = <K extends keyof EditorSettings>(key: K, value: EditorSettings[K]) => {
    onChange({ ...settings, [key]: value });
  };

  return (
    <div className="adoc-modal-backdrop" onClick={onClose}>
      <div className="adoc-modal" role="dialog" aria-modal="true" aria-label="Settings" onClick={(event) => event.stopPropagation()}>
        <div className="adoc-modal-header">
          <h2>Settings</h2>
          <button type="button" className="adoc-modal-close" onClick={onClose} aria-label="Close settings">
            ×
          </button>
        </div>

        <div className="adoc-settings-grid">
          <label>
            Default view
            <select
              value={settings.viewMode}
              onChange={(event) => update('viewMode', event.currentTarget.value as ViewMode)}
            >
              <option value="live">Live</option>
              <option value="split">Split</option>
              <option value="preview">Preview</option>
            </select>
          </label>

          <label className="adoc-check">
            <input
              type="checkbox"
              checked={settings.livePreview}
              onChange={(event) => update('livePreview', event.currentTarget.checked)}
            />
            Live preview in editor
          </label>

          <label className="adoc-check">
            <input
              type="checkbox"
              checked={settings.showLineNumbers}
              onChange={(event) => update('showLineNumbers', event.currentTarget.checked)}
            />
            Line numbers
          </label>

          <label className="adoc-check">
            <input
              type="checkbox"
              checked={settings.softWrap}
              onChange={(event) => update('softWrap', event.currentTarget.checked)}
            />
            Soft wrap
          </label>

          <label className="adoc-check">
            <input
              type="checkbox"
              checked={settings.showOutline}
              onChange={(event) => update('showOutline', event.currentTarget.checked)}
            />
            Show outline
          </label>

          <label className="adoc-check">
            <input
              type="checkbox"
              checked={settings.allowRemoteIncludes}
              onChange={(event) => update('allowRemoteIncludes', event.currentTarget.checked)}
            />
            Allow remote includes
          </label>

          <label className="adoc-check">
            <input
              type="checkbox"
              checked={settings.enableKroki}
              onChange={(event) => update('enableKroki', event.currentTarget.checked)}
            />
            Render Kroki diagrams
          </label>

          <label>
            Font size <span>{settings.fontSize}px</span>
            <input
              type="range"
              min="12"
              max="28"
              step="1"
              value={settings.fontSize}
              onInput={(event) => update('fontSize', Number(event.currentTarget.value))}
            />
          </label>

          <label>
            Line height <span>{settings.lineHeight.toFixed(1)}</span>
            <input
              type="range"
              min="1.2"
              max="2.2"
              step="0.1"
              value={settings.lineHeight}
              onInput={(event) => update('lineHeight', Number(event.currentTarget.value))}
            />
          </label>

          <label>
            Preview delay <span>{settings.previewDelay}ms</span>
            <input
              type="range"
              min="100"
              max="1000"
              step="50"
              value={settings.previewDelay}
              onInput={(event) => update('previewDelay', Number(event.currentTarget.value))}
            />
          </label>
        </div>

        <div className="adoc-modal-footer">
          <button type="button" className="adoc-button secondary" onClick={() => onChange({ ...DEFAULT_SETTINGS })}>
            Reset
          </button>
          <button type="button" className="adoc-button" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
