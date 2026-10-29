import { afterEach, describe, expect, it, vi } from 'vitest';
import { ComponentRelay } from './component-relay';

interface PostedMessage {
  message: any;
  targetOrigin: string;
}

function createRelay() {
  const posted: PostedMessage[] = [];
  const targetWindow = {
    postMessage: (message: any, targetOrigin: string) => {
      posted.push({ message, targetOrigin });
    },
  } as unknown as Window;

  const relay = new ComponentRelay({ window, targetWindow });

  return { relay, posted };
}

function dispatch(data: unknown, origin = 'null'): void {
  window.dispatchEvent(new MessageEvent('message', { data, origin }));
}

function registrationMessage(environment = 'desktop', componentData: Record<string, unknown> = {}) {
  return {
    action: 'component-registered',
    sessionKey: 'session-key',
    componentData,
    data: {
      uuid: 'component-1',
      environment,
      platform: 'linux',
      activeThemeUrls: [],
    },
  };
}

function register(environment = 'desktop', componentData: Record<string, unknown> = {}): void {
  dispatch(registrationMessage(environment, componentData));
}

const NOTE = {
  uuid: 'note-1',
  content: {
    text: '= Title\n\nHello.',
    appData: {
      'org.standardnotes.sn': {
        locked: true,
      },
    },
  },
};

describe('ComponentRelay', () => {
  afterEach(() => {
    document.querySelectorAll('link.custom-theme').forEach((link) => link.remove());
  });

  it('waits for registration and posts with the wildcard target origin', () => {
    const { relay, posted } = createRelay();
    relay.streamContextItem(() => undefined);

    expect(posted).toHaveLength(0);

    register();

    const stream = posted.find((item) => item.message.action === 'stream-context-item');
    expect(stream).toBeDefined();
    expect(stream?.targetOrigin).toBe('*');
    expect(stream?.message.sessionKey).toBe('session-key');

    relay.destroy();
  });

  it('ignores messages that do not come from the parent window', () => {
    const { relay, posted } = createRelay();
    relay.streamContextItem(() => undefined);

    window.dispatchEvent(
      new MessageEvent('message', {
        data: registrationMessage(),
        origin: 'null',
        source: {} as Window,
      }),
    );

    expect(posted).toHaveLength(0);

    relay.destroy();
  });

  it('handles an opaque origin without throwing', () => {
    const { relay, posted } = createRelay();
    const listener = vi.fn();
    relay.streamContextItem(listener);

    register('desktop');

    const stream = posted.find((item) => item.message.action === 'stream-context-item');
    dispatch({ action: 'reply', data: { item: NOTE }, original: stream?.message }, 'null');

    expect(listener).toHaveBeenCalledWith(NOTE);

    relay.destroy();
  });

  it('serializes messages as JSON in the mobile environment', () => {
    const { relay, posted } = createRelay();
    relay.streamContextItem(() => undefined);

    register('mobile');

    const stream = posted.find(
      (item) =>
        typeof item.message === 'string' &&
        JSON.parse(item.message).action === 'stream-context-item',
    );
    expect(typeof stream?.message).toBe('string');

    const parsed = JSON.parse(stream?.message);
    expect(parsed.action).toBe('stream-context-item');
    expect(parsed.sessionKey).toBe('session-key');

    relay.destroy();
  });

  it('saves items with the wildcard target origin', () => {
    const { relay, posted } = createRelay();
    register();

    relay.saveItems([NOTE]);

    const save = posted.find((item) => item.message.action === 'save-items');
    expect(save?.targetOrigin).toBe('*');
    expect(save?.message.data.items).toEqual([NOTE]);

    relay.destroy();
  });

  it('reports component data on registration', () => {
    const onRegistered = vi.fn();
    const posted: PostedMessage[] = [];
    const relay = new ComponentRelay({
      window,
      targetWindow: {
        postMessage: (message: any, targetOrigin: string) => posted.push({ message, targetOrigin }),
      } as unknown as Window,
      onRegistered,
    });

    register('desktop', { settings: { fontSize: 21 } });

    expect(onRegistered).toHaveBeenCalledWith({
      environment: 'desktop',
      componentData: { settings: { fontSize: 21 } },
    });

    relay.destroy();
  });

  it('adds theme links and notifies listeners', () => {
    const onThemesChange = vi.fn();
    const relay = new ComponentRelay({
      window,
      targetWindow: { postMessage: () => undefined } as unknown as Window,
      onThemesChange,
    });

    register();
    dispatch({ action: 'themes', data: { themes: ['https://example.com/theme.css'] } }, 'null');

    expect(onThemesChange).toHaveBeenCalled();
    expect(document.querySelectorAll('link.custom-theme')).toHaveLength(1);

    relay.destroy();
  });
});
