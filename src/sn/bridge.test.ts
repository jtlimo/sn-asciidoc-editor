import { afterEach, describe, expect, it, vi } from 'vitest';
import { SNBridge } from './bridge';
import { loadSettings } from './settings';

const NOTE = {
  uuid: 'note-1',
  content_type: 'Note',
  content: {
    text: '= Title\n\nHello.',
    title: 'Title',
    appData: {
      'org.standardnotes.sn': {
        locked: true,
      },
    },
  },
};

const bridges: SNBridge[] = [];

function createBridge(): SNBridge {
  const bridge = new SNBridge();
  bridges.push(bridge);
  return bridge;
}

function postToComponent(data: unknown, origin = window.location.origin): void {
  window.dispatchEvent(new MessageEvent('message', { data, origin }));
}

function register(
  componentData: Record<string, unknown> = {},
  origin = window.location.origin,
): void {
  postToComponent(
    {
      action: 'component-registered',
      sessionKey: 'session-key',
      componentData,
      data: {
        uuid: 'component-1',
        environment: origin === 'null' ? 'desktop' : 'web',
        platform: 'web',
        activeThemeUrls: [],
      },
    },
    origin,
  );
}

function autoReply(note = NOTE): () => void {
  const listener = (event: MessageEvent) => {
    if (event.data?.action === 'stream-context-item') {
      postToComponent({ action: 'reply', data: { item: note }, original: event.data });
    }
  };
  window.addEventListener('message', listener);
  return () => window.removeEventListener('message', listener);
}

function nextMessage(match: (message: any) => boolean): Promise<any> {
  return new Promise((resolve) => {
    const listener = (event: MessageEvent) => {
      const message = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
      if (message && match(message)) {
        window.removeEventListener('message', listener);
        resolve(message);
      }
    };
    window.addEventListener('message', listener);
  });
}

describe('SNBridge', () => {
  afterEach(() => {
    for (const bridge of bridges.splice(0)) {
      bridge.destroy();
    }
    vi.restoreAllMocks();
  });

  it('loads note text, lock state, and settings from the host', async () => {
    const replies: string[] = [];
    const listener = (event: MessageEvent) => {
      const data = event.data;
      if (data?.action === 'stream-context-item') {
        replies.push('stream');
        postToComponent({ action: 'reply', data: { item: NOTE }, original: data });
      } else if (data?.action === 'save-items') {
        replies.push('save');
        postToComponent({ action: 'reply', data: {}, original: data });
      }
    };
    window.addEventListener('message', listener);

    const bridge = createBridge();
    register({ settings: { fontSize: 21, enableKroki: true } });
    await bridge.ready;

    expect(bridge.text).toBe('= Title\n\nHello.');
    expect(bridge.isLocked).toBe(true);

    const settings = loadSettings(bridge);
    expect(settings.fontSize).toBe(21);
    expect(settings.enableKroki).toBe(true);

    bridge.save('= Changed');
    await new Promise((resolve) => setTimeout(resolve, 600));

    expect(replies).toContain('save');
    window.removeEventListener('message', listener);
  });

  it('registers from an opaque origin and mounts before the note arrives', async () => {
    const bridge = createBridge();
    const stream = nextMessage((message) => message.action === 'stream-context-item');

    register({}, 'null');
    await bridge.registered;

    expect(bridge.isReady).toBe(false);

    const request = await stream;
    postToComponent({ action: 'reply', data: { item: NOTE }, original: request }, 'null');
    await bridge.ready;

    expect(bridge.text).toBe('= Title\n\nHello.');
    expect(bridge.isLocked).toBe(true);
  });

  it('saves the text with a plain preview and keeps the note metadata', async () => {
    const bridge = createBridge();
    const stop = autoReply();
    register();
    await bridge.ready;

    const saved = nextMessage((message) => message.action === 'save-items');
    bridge.setPreview('<h1>Changed</h1>');
    bridge.save('= Changed\n\nBody text.');
    const message = await saved;

    expect(message.data.items[0].uuid).toBe('note-1');
    expect(message.data.items[0].content.text).toBe('= Changed\n\nBody text.');
    expect(message.data.items[0].content.preview_plain).toBe('Body text.');
    expect(message.data.items[0].content.preview_html).toBe('<h1>Changed</h1>');
    expect(message.data.items[0].content.title).toBe('Title');
    stop();
  });

  it('persists component data as a full payload', async () => {
    const bridge = createBridge();
    const stop = autoReply();
    register({ settings: { fontSize: 16 } });
    await bridge.ready;

    const saved = nextMessage((message) => message.action === 'set-component-data');
    bridge.setComponentDataValueForKey('settings', { fontSize: 18 });

    const message = await saved;
    expect(message.data.componentData).toEqual({ settings: { fontSize: 18 } });
    expect(bridge.getComponentDataValueForKey('settings')).toEqual({ fontSize: 18 });
    stop();
  });

  it('notifies listeners when the host changes the theme', async () => {
    const bridge = createBridge();
    const themes: number[] = [];
    bridge.onTheme(() => themes.push(1));

    const listener = (event: MessageEvent) => {
      if (event.data?.action === 'stream-context-item') {
        postToComponent({ action: 'reply', data: { item: NOTE }, original: event.data });
      }
    };
    window.addEventListener('message', listener);

    register();
    await bridge.ready;
    postToComponent({ action: 'themes', data: { themes: ['dark.css'] } });

    expect(themes.length).toBeGreaterThan(0);
    window.removeEventListener('message', listener);
  });
});
