import EditorKit from '@standardnotes/editor-kit';

type Listener<T> = (value: T) => void;

export class SNBridge {
  readonly ready: Promise<void>;

  private kit: EditorKit;
  private noteText = '';
  private previewHtml = '';
  private locked = false;
  private readyResolve!: () => void;
  private readyFlag = false;
  private textListeners = new Set<Listener<string>>();
  private lockListeners = new Set<Listener<boolean>>();
  private themeListeners = new Set<Listener<void>>();

  constructor() {
    this.ready = new Promise((resolve) => {
      this.readyResolve = resolve;
    });

    this.kit = new EditorKit(
      {
        setEditorRawText: (text) => {
          this.noteText = text;
          this.locked = this.readKitLockState();
          this.emit(this.textListeners, text);
          this.emit(this.lockListeners, this.locked);
          this.markReady();
        },
        generateCustomPreview: (text) => ({
          plain: plainPreview(text),
          html: this.previewHtml || undefined,
        }),
        handleRequestForContentHeight: () => undefined,
        onNoteLockToggle: (locked) => {
          this.locked = locked;
          this.emit(this.lockListeners, locked);
        },
        onThemesChange: () => this.emit(this.themeListeners, undefined),
      },
      {
        mode: 'plaintext',
        coallesedSaving: true,
        coallesedSavingDelay: 400,
      },
    );
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
    this.kit.onEditorValueChanged(text);
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
    try {
      return this.kit.getComponentDataValueForKey(key);
    } catch {
      return undefined;
    }
  }

  setComponentDataValueForKey(key: string, value: unknown): void {
    if (!this.readyFlag) {
      return;
    }

    try {
      this.kit.setComponentDataValueForKey(key, value);
    } catch {
      // Component data is not available until the host registers the component.
    }
  }

  private readKitLockState(): boolean {
    try {
      return this.kit.getItemAppDataValue('locked' as never) === true;
    } catch {
      return false;
    }
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
