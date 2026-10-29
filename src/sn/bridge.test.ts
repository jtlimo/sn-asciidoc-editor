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

function postToComponent(data: unknown): void {
  window.dispatchEvent(new MessageEvent('message', { data, origin: window.location.origin }));
}

function register(componentData: Record<string, unknown> = {}): void {
  postToComponent({
    action: 'component-registered',
    sessionKey: 'session-key',
    componentData,
    data: {
      uuid: 'component-1',
      environment: 'web',
      platform: 'web',
      activeThemeUrls: [],
    },
  });
}

describe('SNBridge', () => {
  afterEach(() => {
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

    const bridge = new SNBridge();
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

  it('notifies listeners when the host changes the theme', async () => {
    const bridge = new SNBridge();
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
