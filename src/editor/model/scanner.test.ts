import { describe, expect, it } from 'vitest';
import { autoId, scanDocument } from './scanner';

const DOC = `= Title
:icons: font

== Section One

* item
* [ ] task

[source,js]
----
const x = 1;
----

NOTE: hello

[[custom]]
== Other

See <<_section_one>>.
`;

describe('scanDocument', () => {
  it('finds headings and ids', () => {
    const model = scanDocument(DOC);
    expect(model.headings.map((heading) => heading.level)).toEqual([0, 1, 1]);
    expect(model.headings.map((heading) => heading.id)).toEqual(['_title', '_section_one', 'custom']);
  });

  it('finds delimited blocks', () => {
    const model = scanDocument(DOC);
    const source = model.blocks.find((block) => block.type === 'source');
    expect(source).toBeDefined();
    expect(source?.closed).toBe(true);
    expect(source?.delimiter).toBe('----');
  });

  it('finds lists and admonitions', () => {
    const model = scanDocument(DOC);
    expect(model.blocks.filter((block) => block.type === 'unordered-list')).toHaveLength(2);
    expect(model.blocks.find((block) => block.type === 'admonition')?.style).toBe('note');
  });

  it('marks unclosed blocks', () => {
    const model = scanDocument('----\ncode\n');
    const block = model.blocks[0];
    expect(block.type).toBe('listing');
    expect(block.closed).toBe(false);
  });

  it('generates Asciidoctor-style ids', () => {
    expect(autoId('Hello, World!')).toBe('_hello_world');
    expect(autoId('A B', 'id-', '-')).toBe('id-a-b');
  });
});
