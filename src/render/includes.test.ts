import { afterEach, describe, expect, it, vi } from 'vitest';
import { expandRemoteIncludes } from './includes';

describe('expandRemoteIncludes', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('expands remote includes and nested relative includes', async () => {
    const bodies: Record<string, string> = {
      'https://example.com/one.adoc': 'First\ninclude::two.adoc[]',
      'https://example.com/two.adoc': 'Second',
    };

    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => new Response(bodies[url] ?? 'missing', { status: bodies[url] ? 200 : 404 })),
    );

    const result = await expandRemoteIncludes('Before\ninclude::https://example.com/one.adoc[]\nAfter');
    expect(result.text).toContain('First');
    expect(result.text).toContain('Second');
    expect(result.text).toContain('After');
    expect(result.errors).toEqual([]);
  });

  it('leaves local includes untouched', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const result = await expandRemoteIncludes('include::local.adoc[]');
    expect(result.text).toBe('include::local.adoc[]');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('reports fetch failures without failing the render', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('no', { status: 500 })));

    const result = await expandRemoteIncludes('include::https://example.com/missing.adoc[]');
    expect(result.text).toContain('include failed');
    expect(result.errors[0]).toContain('500');
  });

  it('detects include cycles', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        if (url.endsWith('a.adoc')) {
          return new Response('include::https://example.com/b.adoc[]');
        }
        return new Response('include::https://example.com/a.adoc[]');
      }),
    );

    const result = await expandRemoteIncludes('include::https://example.com/a.adoc[]');
    expect(result.errors.some((error) => error.includes('cycle'))).toBe(true);
  });
});
