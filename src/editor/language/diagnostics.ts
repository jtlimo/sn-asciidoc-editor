import { Diagnostic, linter } from '@codemirror/lint';
import { scanDocument } from '../model/scanner';
import { collectSymbols } from '../model/symbols';

export const asciidocLinter = linter((view) => diagnose(view.state.doc.toString()), { delay: 300 });

export function diagnose(text: string): Diagnostic[] {
  const model = scanDocument(text);
  const symbols = collectSymbols(model);
  const diagnostics: Diagnostic[] = [];
  const idLines = new Map<string, number[]>();

  for (const heading of model.headings) {
    if (heading.discrete) {
      continue;
    }
    addId(idLines, heading.id, heading.line);
  }

  for (const block of model.blocks) {
    if (block.id) {
      addId(idLines, block.id, block.startLine);
    }

    if (block.delimiter && block.closed === false) {
      diagnostics.push({
        from: block.from,
        to: block.to,
        severity: 'error',
        message: `Unclosed block delimiter ${block.delimiter}`,
        source: 'asciidoc',
      });
    }

    if (block.type === 'include' && !/^[a-z]+:\/\//i.test(block.attributes?.[0] ?? '')) {
      diagnostics.push({
        from: block.from,
        to: block.to,
        severity: 'warning',
        message: 'Local includes are not available in the browser. Use a URL or the FileSafe URL.',
        source: 'asciidoc',
      });
    }
  }

  for (const [id, lines] of idLines) {
    if (lines.length < 2) {
      continue;
    }
    for (const line of lines.slice(1)) {
      const lineInfo = model.lines[line - 1];
      diagnostics.push({
        from: lineInfo.from,
        to: lineInfo.to,
        severity: 'warning',
        message: `Duplicate anchor id "${id}"`,
        source: 'asciidoc',
      });
    }
  }

  for (const xref of symbols.xrefs) {
    if (xref.id.includes('#') || symbols.ids.has(xref.id) || symbols.ids.has(`_${xref.id}`)) {
      continue;
    }
    diagnostics.push({
      from: xref.from,
      to: xref.to,
      severity: 'warning',
      message: `Unresolved cross reference "${xref.id}"`,
      source: 'asciidoc',
    });
  }

  return diagnostics.sort((a, b) => a.from - b.from);
}

function addId(map: Map<string, number[]>, id: string, line: number): void {
  const lines = map.get(id) ?? [];
  lines.push(line);
  map.set(id, lines);
}
