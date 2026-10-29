import { describe, expect, it } from 'vitest';
import { scanDocument } from './scanner';
import { collectSymbols } from './symbols';

describe('collectSymbols', () => {
  it('collects ids, xrefs, attributes and footnotes', () => {
    const model = scanDocument(`= Doc
:imagesdir: images

== Section

See <<_section>> and footnote:[A note].
`);
    const symbols = collectSymbols(model);

    expect(symbols.ids.has('_section')).toBe(true);
    expect(symbols.xrefs[0].id).toBe('_section');
    expect(symbols.attributes.get('imagesdir')).toBe('images');
    expect(symbols.footnotes).toBe(1);
  });

  it('removes unset attributes', () => {
    const model = scanDocument(':name: value\n:name!:\n');
    const symbols = collectSymbols(model);
    expect(symbols.attributes.has('name')).toBe(false);
  });
});
