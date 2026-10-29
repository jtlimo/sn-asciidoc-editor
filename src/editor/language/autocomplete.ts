import {
  Completion,
  CompletionContext,
  CompletionResult,
  snippetCompletion,
} from '@codemirror/autocomplete';
import { scanDocument } from '../model/scanner';
import { BUILTIN_ATTRIBUTES, collectSymbols } from '../model/symbols';

const BLOCK_SNIPPETS: Array<{ label: string; detail: string; template: string; type?: string }> = [
  { label: 'Section', detail: 'Level 1 section', template: '== ${Section}\n\n${text}' },
  { label: 'Subsection', detail: 'Level 2 section', template: '=== ${Subsection}\n\n${text}' },
  { label: 'Bullet list', detail: 'Unordered list', template: '* ${item}\n* ${item}' },
  { label: 'Numbered list', detail: 'Ordered list', template: '. ${item}\n. ${item}' },
  { label: 'Checklist', detail: 'Checklist item', template: '* [ ] ${item}\n* [ ] ${item}' },
  { label: 'Description list', detail: 'Description list', template: '${term}:: ${description}' },
  { label: 'Source block', detail: 'Listing with syntax highlighting', template: '[source,${language}]\n----\n${code}\n----' },
  { label: 'Listing block', detail: 'Verbatim listing', template: '----\n${code}\n----' },
  { label: 'Literal block', detail: 'Verbatim literal', template: '....\n${text}\n....' },
  { label: 'Example block', detail: 'Example', template: '====\n${text}\n====' },
  { label: 'Sidebar block', detail: 'Sidebar', template: '****\n${text}\n****' },
  { label: 'Quote block', detail: 'Quote', template: '[quote,${author},${source}]\n____\n${text}\n____' },
  { label: 'Verse block', detail: 'Verse', template: '[verse,${author}]\n____\n${text}\n____' },
  { label: 'Open block', detail: 'Open block', template: '--\n${text}\n--' },
  { label: 'Passthrough block', detail: 'Raw passthrough', template: '++++\n${html}\n++++' },
  { label: 'Comment block', detail: 'Block comment', template: '////\n${comment}\n////' },
  { label: 'Table', detail: 'Basic table', template: '|===\n|${cell} |${cell}\n|${cell} |${cell}\n|===' },
  { label: 'Table with header', detail: 'Table with header row', template: '[cols="${cols}",options="header"]\n|===\n|${head} |${head}\n\n|${cell} |${cell}\n|===' },
  { label: 'Admonition', detail: 'Note block', template: '[NOTE]\n====\n${text}\n====' },
  { label: 'Image', detail: 'Block image', template: 'image::${target}[${alt}]' },
  { label: 'TOC', detail: 'Table of contents', template: 'toc::[]' },
  { label: 'Anchor', detail: 'Block anchor', template: '[[${id}]]' },
  { label: 'Thematic break', detail: 'Horizontal rule', template: "'''" },
  { label: 'Page break', detail: 'Page break', template: '<<<' },
  { label: 'Attribute', detail: 'Document attribute', template: ':${name}: ${value}' },
  { label: 'Include', detail: 'Include file or URL', template: 'include::${target}[]' },
  { label: 'Conditional', detail: 'Conditional block', template: 'ifdef::${attribute}[]\n${text}\nendif::[]' },
  { label: 'Stem block', detail: 'LaTeX math block', template: '[stem]\n++++\n${latex}\n++++' },
  { label: 'Mermaid', detail: 'Mermaid diagram', template: '[source,mermaid]\n----\n${diagram}\n----' },
  { label: 'Kroki diagram', detail: 'Kroki diagram (opt-in)', template: '[.kroki.mermaid]\n....\n${diagram}\n....' },
];

const BLOCK_STYLES = [
  'source',
  'source,javascript',
  'source,typescript',
  'source,python',
  'source,java',
  'source,json',
  'source,yaml',
  'source,bash',
  'source,sql',
  'quote',
  'verse',
  'listing',
  'literal',
  'example',
  'sidebar',
  'pass',
  'stem',
  'discrete',
  'abstract',
  'appendix',
  'preface',
  'NOTE',
  'TIP',
  'WARNING',
  'CAUTION',
  'IMPORTANT',
  'cols="1,1"',
  'options="header"',
  '%collapsible',
];

export function asciidocCompletionSource(context: CompletionContext): CompletionResult | null {
  const line = context.state.doc.lineAt(context.pos);
  const before = context.state.sliceDoc(line.from, context.pos);

  if (/^\/[\w-]*$/.test(before)) {
    return {
      from: line.from,
      options: BLOCK_SNIPPETS.map((snippet) =>
        snippetCompletion(snippet.template, {
          label: snippet.label,
          detail: snippet.detail,
          type: snippet.type ?? 'keyword',
        }),
      ),
      validFor: /^\/[\w-]*$/,
    };
  }

  if (/^\[[\w,%#."=:-]*$/.test(before)) {
    return {
      from: line.from + 1,
      options: BLOCK_STYLES.map((style) => ({ label: style, type: 'property', apply: `${style}]` })),
      validFor: /^[\w,%#."=:-]*$/,
    };
  }

  if (/^:[\w-]*$/.test(before)) {
    const model = scanDocument(context.state.doc.toString());
    const symbols = collectSymbols(model);
    const names = new Set([...BUILTIN_ATTRIBUTES, ...symbols.attributes.keys()]);

    return {
      from: line.from + 1,
      options: [...names].sort().map((name) => ({ label: name, type: 'variable', apply: `${name}: ` })),
      validFor: /^[\w-]*$/,
    };
  }

  const xref = /(?:<<|xref:)([\w:.-]*)$/.exec(before);
  if (xref) {
    const model = scanDocument(context.state.doc.toString());
    const symbols = collectSymbols(model);
    const options: Completion[] = [...symbols.ids.values()]
      .sort((a, b) => a.id.localeCompare(b.id))
      .map((entry) => ({
        label: entry.id,
        detail: entry.title,
        type: 'text',
        apply: before.startsWith('<<') ? `${entry.id}>>` : `${entry.id}[]`,
      }));

    return {
      from: context.pos - xref[1].length,
      options,
      validFor: /^[\w:.-]*$/,
    };
  }

  const attribute = /\{([\w-]*)$/.exec(before);
  if (attribute) {
    const model = scanDocument(context.state.doc.toString());
    const symbols = collectSymbols(model);
    const names = new Set([...BUILTIN_ATTRIBUTES, ...symbols.attributes.keys()]);

    return {
      from: context.pos - attribute[1].length,
      options: [...names].sort().map((name) => ({ label: name, type: 'variable', apply: `${name}}` })),
      validFor: /^[\w-]*$/,
    };
  }

  return null;
}
