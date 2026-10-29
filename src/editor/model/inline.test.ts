import { describe, expect, it } from 'vitest';
import { scanInline } from './inline';

describe('scanInline', () => {
  it('finds formatting spans without overlapping', () => {
    const spans = scanInline('This is *bold* and _italic_ and `mono`.');
    expect(spans.map((span) => span.type)).toEqual(['strong', 'emphasis', 'mono']);
    expect(spans.map((span) => span.text)).toEqual(['bold', 'italic', 'mono']);
  });

  it('finds links and xrefs', () => {
    const spans = scanInline('See link:https://example.com[Example] and <<section,Section>>.');
    const link = spans.find((span) => span.type === 'link');
    const xref = spans.find((span) => span.type === 'xref');

    expect(link?.target).toBe('https://example.com');
    expect(link?.text).toBe('Example');
    expect(xref?.target).toBe('section');
    expect(xref?.text).toBe('Section');
  });

  it('finds footnotes, attributes and ui macros', () => {
    const spans = scanInline('footnote:[Note] {name} kbd:[Ctrl]');
    expect(spans.map((span) => span.type)).toEqual(['footnote', 'attribute', 'kbd']);
    expect(spans[1].text).toBe('name');
    expect(spans[2].text).toBe('Ctrl');
  });

  it('does not treat the inside of a link as an autolink', () => {
    const spans = scanInline('link:https://example.com[Example]');
    expect(spans).toHaveLength(1);
    expect(spans[0].type).toBe('link');
  });
});
