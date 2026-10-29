import { describe, expect, it } from 'vitest';
import { renderAsciiDoc } from './asciidoctor';

describe('renderAsciiDoc', () => {
  it('renders AsciiDoc with the 4.1.1 engine', async () => {
    const result = await renderAsciiDoc('= Title\n\n== Section\n\nHello *world*.');

    expect(result.engine).toBe('4.1.1');
    expect(result.html).toContain('<h2');
    expect(result.html).toContain('<strong>world</strong>');
    expect(result.plain).toContain('Hello world');
  });

  it('annotates blocks with source line numbers', async () => {
    const result = await renderAsciiDoc('= Title\n\nFirst paragraph.\n\n== Section\n\nSecond paragraph.');

    expect(result.html).toContain('data-srclineno="3"');
    expect(result.html).toContain('data-srclineno="7"');
  });

  it('sanitizes unsafe HTML produced by passthrough blocks', async () => {
    const result = await renderAsciiDoc('++++\n<script>alert(1)</script>\n++++');

    expect(result.html).not.toContain('<script');
    expect(result.html).not.toContain('alert(1)');
  });

  it('renders checklists, admonitions, tables, and cross references', async () => {
    const result = await renderAsciiDoc(`= Title

[[target]]
== Section

* [ ] open
* [x] done

NOTE: Take care.

|===
|A |B
|===

See <<target>>.
`);

    expect(result.html).toContain('checklist');
    expect(result.html).toContain('admonitionblock note');
    expect(result.html).toContain('<table');
    expect(result.html).toContain('href="#target"');
  });

  it('renders a table of contents', async () => {
    const result = await renderAsciiDoc('= Title\n:toc:\n\n== One\n\nText.\n\n== Two\n\nText.');

    expect(result.html).toContain('id="toc"');
    expect(result.html).toContain('href="#_one"');
  });

  it('renders STEM expressions with the latexmath backend', async () => {
    const result = await renderAsciiDoc('stem:[E = mc^2]');

    expect(result.html).toContain('\\(E = mc^2\\)');
  });

  it('returns an empty result for blank input', async () => {
    await expect(renderAsciiDoc('   \n')).resolves.toEqual({
      html: '',
      plain: '',
      engine: 'none',
      warnings: [],
    });
  });
});
