export type ViewMode = 'live' | 'split' | 'preview';

export interface EditorSettings {
  version: 1;
  viewMode: ViewMode;
  livePreview: boolean;
  showLineNumbers: boolean;
  softWrap: boolean;
  fontSize: number;
  lineHeight: number;
  previewDelay: number;
  showOutline: boolean;
  allowRemoteIncludes: boolean;
  enableKroki: boolean;
}

export const DEFAULT_SETTINGS: EditorSettings = {
  version: 1,
  viewMode: 'live',
  livePreview: true,
  showLineNumbers: false,
  softWrap: true,
  fontSize: 16,
  lineHeight: 1.6,
  previewDelay: 200,
  showOutline: true,
  allowRemoteIncludes: false,
  enableKroki: false,
};

export interface SettingsStore {
  getComponentDataValueForKey(key: string): unknown;
  setComponentDataValueForKey(key: string, value: unknown): void;
}

const SETTINGS_KEY = 'settings';

export function loadSettings(store: SettingsStore | null): EditorSettings {
  if (!store) {
    return { ...DEFAULT_SETTINGS };
  }

  const stored = store.getComponentDataValueForKey(SETTINGS_KEY);
  if (!stored || typeof stored !== 'object') {
    return migrateLegacySettings(store);
  }

  return sanitizeSettings(stored as Partial<EditorSettings>);
}

export function saveSettings(store: SettingsStore | null, settings: EditorSettings): void {
  store?.setComponentDataValueForKey(SETTINGS_KEY, settings);
}

function migrateLegacySettings(store: SettingsStore): EditorSettings {
  const spacing = store.getComponentDataValueForKey('spacing');
  const legacyPadding = spacing === 'Cozy' ? 10 : spacing === 'Comfortable' ? 30 : 20;

  return {
    ...DEFAULT_SETTINGS,
    fontSize: Math.max(14, Math.round(DEFAULT_SETTINGS.fontSize + (legacyPadding - 20) / 10)),
  };
}

function sanitizeSettings(value: Partial<EditorSettings>): EditorSettings {
  const viewMode: ViewMode =
    value.viewMode === 'split' || value.viewMode === 'preview' ? value.viewMode : 'live';

  return {
    version: 1,
    viewMode,
    livePreview: value.livePreview !== false,
    showLineNumbers: value.showLineNumbers === true,
    softWrap: value.softWrap !== false,
    fontSize: clampNumber(value.fontSize, 12, 28, DEFAULT_SETTINGS.fontSize),
    lineHeight: clampNumber(value.lineHeight, 1.2, 2.2, DEFAULT_SETTINGS.lineHeight),
    previewDelay: clampNumber(value.previewDelay, 100, 1000, DEFAULT_SETTINGS.previewDelay),
    showOutline: value.showOutline !== false,
    allowRemoteIncludes: value.allowRemoteIncludes === true,
    enableKroki: value.enableKroki === true,
  };
}

function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, value));
}
