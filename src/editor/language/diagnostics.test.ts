import { describe, expect, it } from 'vitest';
import { diagnose } from './diagnostics';

describe('diagnose', () => {
  it('reports unclosed blocks', () => {
    const diagnostics = diagnose('----\ncode\n');
    expect(diagnostics.some((diagnostic) => diagnostic.message.includes('Unclosed'))).toBe(true);
  });

  it('reports duplicate ids', () => {
    const diagnostics = diagnose('[[same]]\n== One\n\n[[same]]\n== Two\n');
    expect(diagnostics.some((diagnostic) => diagnostic.message.includes('Duplicate'))).toBe(true);
  });

  it('reports unresolved xrefs', () => {
    const diagnostics = diagnose('== One\n\nSee <<missing>>.\n');
    expect(diagnostics.some((diagnostic) => diagnostic.message.includes('Unresolved'))).toBe(true);
  });

  it('accepts resolved xrefs', () => {
    const diagnostics = diagnose('== One\n\nSee <<_one>>.\n');
    expect(diagnostics.some((diagnostic) => diagnostic.message.includes('Unresolved'))).toBe(false);
  });

  it('warns about local includes', () => {
    const diagnostics = diagnose('include::other.adoc[]\n');
    expect(diagnostics.some((diagnostic) => diagnostic.message.includes('Local includes'))).toBe(true);
  });

  it('accepts remote includes', () => {
    const diagnostics = diagnose('include::https://example.com/other.adoc[]\n');
    expect(diagnostics.some((diagnostic) => diagnostic.message.includes('Local includes'))).toBe(false);
  });
});
