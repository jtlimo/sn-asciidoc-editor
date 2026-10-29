export type RelayEnvironment = 'web' | 'desktop' | 'mobile';

export interface RelayNote {
  uuid: string;
  content?: {
    text?: string;
    preview_plain?: string;
    preview_html?: string;
    appData?: Record<string, Record<string, unknown>>;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface RegisteredPayload {
  environment: RelayEnvironment;
  componentData: Record<string, unknown>;
}

export interface ComponentRelayOptions {
  window: Window;
  targetWindow: Window;
  onRegistered?: (payload: RegisteredPayload) => void;
  onThemesChange?: () => void;
}

interface OutgoingMessage {
  action: string;
  data: unknown;
  messageId: string;
  sessionKey: string;
  api: 'component';
}

interface QueuedMessage {
  action: string;
  data: unknown;
  callback?: (data: unknown) => void;
}

interface SentMessage {
  messageId: string;
  callback?: (data: unknown) => void;
}

let messageCounter = 0;

/**
 * Minimal implementation of the Standard Notes component protocol.
 *
 * The official editor-kit sends messages with the parent origin as target
 * origin. Desktop and mobile hosts run from `file://`, so that origin is the
 * opaque string "null", which makes postMessage throw. This relay always uses
 * the wildcard target origin and authenticates messages with the session key.
 */
export class ComponentRelay {
  private sessionKey = '';
  private environment: RelayEnvironment = 'web';
  private queue: QueuedMessage[] = [];
  private sent: SentMessage[] = [];

  constructor(private readonly options: ComponentRelayOptions) {
    this.options.window.addEventListener('message', this.handleMessage);
  }

  streamContextItem(listener: (note: RelayNote) => void): void {
    this.post('stream-context-item', {}, (data) => {
      const item = (data as { item?: RelayNote } | undefined)?.item;
      if (item) {
        listener(item);
      }
    });
  }

  saveItems(items: RelayNote[]): void {
    this.post('save-items', { items });
  }

  setComponentData(componentData: Record<string, unknown>): void {
    this.post('set-component-data', { componentData });
  }

  destroy(): void {
    this.options.window.removeEventListener('message', this.handleMessage);
  }

  private handleMessage = (event: MessageEvent): void => {
    if (event.source && event.source !== this.options.targetWindow) {
      return;
    }

    const message = parseMessage(event.data);
    if (!message) {
      return;
    }

    if (message.action === 'component-registered') {
      this.onRegistered(message);
      return;
    }

    if (message.action === 'themes') {
      this.activateThemes(message.data?.themes ?? []);
      this.options.onThemesChange?.();
      return;
    }

    if (message.action === 'reply') {
      this.resolveReply(message);
    }
  };

  private onRegistered(message: any): void {
    this.sessionKey = message.sessionKey ?? '';
    this.environment = normalizeEnvironment(message.data?.environment);

    const componentData = message.componentData ?? {};
    this.options.onRegistered?.({
      environment: this.environment,
      componentData,
    });

    this.flush();
    this.post('themes-activated', {});
    this.activateThemes(message.data?.activeThemeUrls ?? []);
  }

  private resolveReply(message: any): void {
    const messageId = message.original?.messageId;
    const sent = this.sent.find((item) => item.messageId === messageId);
    if (!sent) {
      return;
    }

    this.sent = this.sent.filter((item) => item !== sent);
    sent.callback?.(message.data);
  }

  private flush(): void {
    const pending = this.queue;
    this.queue = [];

    for (const message of pending) {
      this.post(message.action, message.data, message.callback);
    }
  }

  private post(action: string, data: unknown, callback?: (data: unknown) => void): void {
    if (!this.sessionKey) {
      this.queue.push({ action, data, callback });
      return;
    }

    const message: OutgoingMessage = {
      action,
      data,
      messageId: nextMessageId(),
      sessionKey: this.sessionKey,
      api: 'component',
    };

    if (callback) {
      this.sent.push({ messageId: message.messageId, callback });
    }

    const payload = this.environment === 'mobile' ? JSON.stringify(message) : message;
    this.options.targetWindow.postMessage(payload, '*');
  }

  private activateThemes(themes: string[]): void {
    for (const theme of themes) {
      if (!theme) {
        continue;
      }

      const link = this.options.window.document.createElement('link');
      link.id = btoa(theme);
      link.href = theme;
      link.type = 'text/css';
      link.rel = 'stylesheet';
      link.media = 'screen,print';
      link.className = 'custom-theme';
      this.options.window.document.head.appendChild(link);
    }
  }
}

function parseMessage(data: unknown): any {
  if (typeof data === 'string') {
    try {
      return JSON.parse(data);
    } catch {
      return undefined;
    }
  }

  return data;
}

function normalizeEnvironment(value: unknown): RelayEnvironment {
  return value === 'desktop' || value === 'mobile' ? value : 'web';
}

function nextMessageId(): string {
  messageCounter += 1;
  return `${Date.now().toString(36)}-${messageCounter}`;
}
