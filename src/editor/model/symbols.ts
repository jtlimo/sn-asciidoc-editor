import { scanInline } from './inline';
import { DocumentModel } from './scanner';

export interface SymbolEntry {
  id: string;
  title?: string;
  line: number;
  from: number;
  kind: 'heading' | 'anchor' | 'block';
}

export interface Xref {
  id: string;
  text?: string;
  line: number;
  from: number;
  to: number;
}

export interface SymbolTable {
  ids: Map<string, SymbolEntry>;
  xrefs: Xref[];
  attributes: Map<string, string>;
  footnotes: number;
}

export const BUILTIN_ATTRIBUTES = new Set([
  'asciidoc-dir',
  'asciidoctor',
  'asciidoctor-version',
  'backend',
  'basebackend',
  'docdate',
  'docdatetime',
  'docdir',
  'docfile',
  'docname',
  'doctime',
  'doctitle',
  'doctype',
  'embedded',
  'filetype',
  'htmlsyntax',
  'idprefix',
  'idseparator',
  'imagesdir',
  'icons',
  'includedir',
  'localdate',
  'localdatetime',
  'localtime',
  'notitle',
  'outdir',
  'outfile',
  'safe-mode-name',
  'sectids',
  'showtitle',
  'source-highlighter',
  'stem',
  'toc',
  'toclevels',
  'user-home',
]);

export function collectSymbols(model: DocumentModel): SymbolTable {
  const ids = new Map<string, SymbolEntry>();
  const xrefs: Xref[] = [];
  const attributes = new Map<string, string>();
  let footnotes = 0;

  for (const heading of model.headings) {
    if (heading.discrete) {
      continue;
    }
    if (!ids.has(heading.id)) {
      ids.set(heading.id, {
        id: heading.id,
        title: heading.title,
        line: heading.line,
        from: heading.from,
        kind: 'heading',
      });
    }
  }

  for (const block of model.blocks) {
    if (block.id && !ids.has(block.id)) {
      ids.set(block.id, {
        id: block.id,
        title: block.title,
        line: block.startLine,
        from: block.from,
        kind: block.type === 'anchor' ? 'anchor' : 'block',
      });
    }
  }

  for (const line of model.lines) {
    const attribute = /^:([A-Za-z0-9_][\w-]*)(!?):[ \t]*(.*)$/.exec(line.text);
    if (attribute) {
      if (attribute[2] === '!') {
        attributes.delete(attribute[1]);
      } else {
        attributes.set(attribute[1], attribute[3]);
      }
      continue;
    }

    for (const span of scanInline(line.text, line.from)) {
      if (span.type === 'xref' && span.target) {
        xrefs.push({
          id: span.target,
          text: span.text,
          line: line.number,
          from: span.from,
          to: span.to,
        });
      } else if (span.type === 'anchor' && span.target && !ids.has(span.target)) {
        ids.set(span.target, {
          id: span.target,
          line: line.number,
          from: span.from,
          kind: 'anchor',
        });
      } else if (span.type === 'footnote') {
        footnotes += 1;
      }
    }
  }

  return { ids, xrefs, attributes, footnotes };
}

export function unresolvedXrefs(symbols: SymbolTable): Xref[] {
  return symbols.xrefs.filter((xref) => {
    if (xref.id.includes('#')) {
      return false;
    }
    return !symbols.ids.has(xref.id) && !symbols.ids.has(`_${xref.id}`);
  });
}
