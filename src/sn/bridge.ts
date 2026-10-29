import { ComponentRelay, RelayNote } from './component-relay';

type Listener<T> = (value: T) => void;

const SAVE_DELAY = 400;
const APP_DATA_KEY = 'org.standardnotes.sn';

/**
 * Adapter between the editor UI and the Standard Notes component protocol.
 *
 * `registered` resolves when the host accepts the component, so the editor can
 * mount immediately. `ready` resolves when the first note arrives.
 */
export class SNBridge {
  readonly registered: Promise<void>;
  readonly ready: Promise<void>;

  private relay: ComponentRelay;
  private registeredResolve!: () => void;
  private readyResolve!: () => void;
  private registeredFlag = false;
  private readyFlag = false;
  private note: RelayNote | null = null;
  private noteText = '';
  private previewHtml = '';
  private locked = false;
  private componentData: Record<string, unknown> = {};
  private saveTimer: ReturnType<typeof setTimeout> | null = null;
  private textListeners = new Set<Listener<string>>();
  private lockListeners = new Set<Listener<boolean>>();
  private themeListeners = new Set<Listener<void>>();

  constructor(targetWindow: Window = window.parent) {
    this.registered = new Promise((resolve) => {
      this.registeredResolve = resolve;
    });
    this.ready = new Promise((resolve) => {
      this.readyResolve = resolve;
    });

    this.relay = new ComponentRelay({
      window,
      targetWindow,
      onRegistered: ({ componentData }) => {
        this.componentData = { ...componentData };
        this.markRegistered();
        this.relay.streamContextItem((note) => this.handleNote(note));
      },
      onThemesChange: () => this.emit(this.themeListeners, undefined),
    });
  }

  get text(): string {
    return this.noteText;
  }

  get isLocked(): boolean {
    return this.locked;
  }

  get isReady(): boolean {
    return this.readyFlag;
  }

  save(text: string): void {
    this.noteText = text;

    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
    }

    this.saveTimer = setTimeout(() => {
      this.saveTimer = null;
      this.flushSave();
    }, SAVE_DELAY);
  }

  setPreview(html: string): void {
    this.previewHtml = html;
  }

  onText(listener: Listener<string>): () => void {
    this.textListeners.add(listener);
    listener(this.noteText);
    return () => this.textListeners.delete(listener);
  }

  onLocked(listener: Listener<boolean>): () => void {
    this.lockListeners.add(listener);
    listener(this.locked);
    return () => this.lockListeners.delete(listener);
  }

  onTheme(listener: Listener<void>): () => void {
    this.themeListeners.add(listener);
    return () => this.themeListeners.delete(listener);
  }

  getComponentDataValueForKey(key: string): unknown {
    return this.componentData[key];
  }

  setComponentDataValueForKey(key: string, value: unknown): void {
    this.componentData = { ...this.componentData, [key]: value };
    this.relay.setComponentData(this.componentData);
  }

  destroy(): void {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
      this.saveTimer = null;
    }

    this.relay.destroy();
  }

  private handleNote(note: RelayNote): void {
    this.note = note;
    this.noteText = note.content?.text ?? '';
    this.locked = note.content?.appData?.[APP_DATA_KEY]?.locked === true;

    this.emit(this.textListeners, this.noteText);
    this.emit(this.lockListeners, this.locked);
    this.markReady();
  }

  private flushSave(): void {
    if (!this.note) {
      return;
    }

    const item: RelayNote = {
      ...this.note,
      content: {
        ...this.note.content,
        text: this.noteText,
        preview_plain: plainPreview(this.noteText),
        ...(this.previewHtml ? { preview_html: this.previewHtml } : {}),
      },
    };

    this.relay.saveItems([item]);
  }

  private markRegistered(): void {
    if (this.registeredFlag) {
      return;
    }

    this.registeredFlag = true;
    this.registeredResolve();
  }

  private markReady(): void {
    if (this.readyFlag) {
      return;
    }

    this.readyFlag = true;
    this.readyResolve();
  }

  private emit<T>(listeners: Set<Listener<T>>, value: T): void {
    for (const listener of listeners) {
      listener(value);
    }
  }
}

function plainPreview(text: string): string {
  const value = text
    .split('\n')
    .map((line) => line.trim())
    .filter(
      (line) =>
        line &&
        !line.startsWith(':') &&
        !line.startsWith('//') &&
        !line.startsWith('[') &&
        !line.startsWith('|') &&
        !line.startsWith('.') &&
        !/^=+\s/.test(line) &&
        !/^(?:----|====|\.\.\.\.|\*\*\*\*|____|\+\+\+\+|--)$/.test(line),
    )
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();

  return value ? (value.length > 160 ? `${value.slice(0, 157)}...` : value) : ' ';
}
