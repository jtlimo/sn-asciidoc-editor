export type BlockType =
  | 'document-title'
  | 'section-title'
  | 'discrete-heading'
  | 'attribute-entry'
  | 'block-attribute'
  | 'anchor'
  | 'comment'
  | 'block-comment'
  | 'listing'
  | 'literal'
  | 'source'
  | 'example'
  | 'sidebar'
  | 'quote'
  | 'verse'
  | 'open'
  | 'passthrough'
  | 'stem'
  | 'table'
  | 'unordered-list'
  | 'ordered-list'
  | 'description-list'
  | 'paragraph'
  | 'admonition'
  | 'image'
  | 'include'
  | 'conditional'
  | 'thematic-break'
  | 'page-break'
  | 'toc'
  | 'raw';

export interface Line {
  from: number;
  to: number;
  number: number;
  text: string;
}

export interface Block {
  type: BlockType;
  from: number;
  to: number;
  startLine: number;
  endLine: number;
  delimiter?: string;
  level?: number;
  title?: string;
  id?: string;
  style?: string;
  attributes?: string[];
  closed?: boolean;
}

export interface Heading {
  level: number;
  title: string;
  id: string;
  from: number;
  to: number;
  line: number;
  discrete?: boolean;
}

export interface DocumentModel {
  text: string;
  lines: Line[];
  blocks: Block[];
  headings: Heading[];
}

const DELIMITER_TYPES: Record<string, BlockType> = {
  '////': 'block-comment',
  '----': 'listing',
  '....': 'literal',
  '====': 'example',
  '****': 'sidebar',
  '____': 'quote',
  '++++': 'passthrough',
  '|===': 'table',
  ',===': 'table',
  ':===': 'table',
  '--': 'open',
};

const DELIMITER_RE = /^(\/{4,}|-{4,}|\.{4,}|={4,}|\*{4,}|_{4,}|\+{4,}|\|={3,}|,={3,}|:={3,}|--)$/;
const HEADING_RE = /^(={1,6})[ \t]+(.+?)[ \t]*$/;
const ATTRIBUTE_ENTRY_RE = /^:([A-Za-z0-9_][\w-]*)(!?):[ \t]*(.*)$/;
const BLOCK_ATTRIBUTE_RE = /^\[(.+)\]$/;
const BLOCK_TITLE_RE = /^\.([^.\s].*)$/;
const ANCHOR_RE = /^\[\[([A-Za-z_:][\w:.-]*)(?:,[^\]]*)?\]\]$/;
const BIBLIO_ANCHOR_RE = /^\[\[\[([^\]]+)\]\]\]$/;
const COMMENT_RE = /^\/\/(?!\/)/;
const UNORDERED_RE = /^([ \t]*)([*+-]+)[ \t]+(.*)$/;
const ORDERED_RE = /^([ \t]*)(\.+)[ \t]+(.*)$/;
const CHECKLIST_RE = /^([ \t]*)([*+-]+)[ \t]+\[( |x|X|\*)\][ \t]+(.*)$/;
const DESCRIPTION_RE = /^([ \t]*)([^:\n]+?)(:::|::)(?:[ \t]+(.*))?$/;
const ADMONITION_RE = /^(NOTE|TIP|WARNING|CAUTION|IMPORTANT):[ \t]+(.*)$/;
const IMAGE_RE = /^image::([^\[]+)\[(.*)\]$/;
const INCLUDE_RE = /^include::([^\[]+)\[(.*)\]$/;
const CONDITIONAL_RE = /^(ifdef|ifndef|ifeval|endif)::/;
const THEMATIC_BREAK_RE = /^'{3,}$/;
const PAGE_BREAK_RE = /^<<<+$/;
const TOC_RE = /^toc::\[(.*)\]$/;

export function splitLines(text: string): Line[] {
  const lines: Line[] = [];
  let from = 0;

  for (const raw of text.split('\n')) {
    const value = raw.endsWith('\r') ? raw.slice(0, -1) : raw;
    lines.push({ from, to: from + value.length, number: lines.length + 1, text: value });
    from += raw.length + 1;
  }

  return lines;
}

export function scanDocument(text: string): DocumentModel {
  const lines = splitLines(text);
  const blocks: Block[] = [];
  const headings: Heading[] = [];
  const pending: { id?: string; style?: string; attributes?: string[]; title?: string; discrete?: boolean } = {};

  let index = 0;

  while (index < lines.length) {
    const line = lines[index];
    const value = line.text;

    if (!value.trim()) {
      index += 1;
      continue;
    }

    const anchor = ANCHOR_RE.exec(value) ?? BIBLIO_ANCHOR_RE.exec(value);
    if (anchor) {
      pending.id = anchor[1];
      blocks.push(makeBlock('anchor', line, line, { id: anchor[1] }));
      index += 1;
      continue;
    }

    const blockAttribute = BLOCK_ATTRIBUTE_RE.exec(value);
    if (blockAttribute) {
      applyBlockAttribute(pending, blockAttribute[1]);
      blocks.push(makeBlock('block-attribute', line, line, { attributes: [blockAttribute[1]] }));
      index += 1;
      continue;
    }

    const title = BLOCK_TITLE_RE.exec(value);
    if (title) {
      pending.title = title[1];
      index += 1;
      continue;
    }

    const attributeEntry = ATTRIBUTE_ENTRY_RE.exec(value);
    if (attributeEntry) {
      blocks.push(makeBlock('attribute-entry', line, line, { id: attributeEntry[1] }));
      index += 1;
      continue;
    }

    const delimiter = DELIMITER_RE.exec(value);
    if (delimiter) {
      const start = index;
      const open = delimiter[1];
      let end = index;
      let closed = false;

      for (let cursor = index + 1; cursor < lines.length; cursor += 1) {
        if (isClosingDelimiter(lines[cursor].text, open)) {
          end = cursor;
          closed = true;
          break;
        }
        end = cursor;
      }

      const baseType = DELIMITER_TYPES[open] ?? 'raw';
      const type = resolveDelimitedType(baseType, pending);
      blocks.push(makeBlock(type, lines[start], lines[end], {
        delimiter: open,
        style: pending.style,
        attributes: pending.attributes,
        title: pending.title,
        id: pending.id,
        closed,
      }));
      clearPending(pending);
      index = end + 1;
      continue;
    }

    if (COMMENT_RE.test(value)) {
      blocks.push(makeBlock('comment', line, line));
      index += 1;
      continue;
    }

    const heading = HEADING_RE.exec(value);
    if (heading) {
      const level = heading[1].length - 1;
      const titleText = heading[2];
      const id = pending.id ?? autoId(titleText);
      const discrete = pending.discrete === true;
      const block = makeBlock(discrete ? 'discrete-heading' : level === 0 ? 'document-title' : 'section-title', line, line, {
        level,
        title: titleText,
        id,
        attributes: pending.attributes,
      });
      blocks.push(block);
      headings.push({ level, title: titleText, id, from: line.from, to: line.to, line: line.number, discrete });
      clearPending(pending);
      index += 1;
      continue;
    }

    if (TOC_RE.test(value)) {
      blocks.push(makeBlock('toc', line, line));
      index += 1;
      continue;
    }

    if (THEMATIC_BREAK_RE.test(value)) {
      blocks.push(makeBlock('thematic-break', line, line));
      index += 1;
      continue;
    }

    if (PAGE_BREAK_RE.test(value)) {
      blocks.push(makeBlock('page-break', line, line));
      index += 1;
      continue;
    }

    const image = IMAGE_RE.exec(value);
    if (image) {
      blocks.push(makeBlock('image', line, line, {
        attributes: splitAttributes(image[2]),
        title: pending.title,
        id: pending.id,
      }));
      clearPending(pending);
      index += 1;
      continue;
    }

    const include = INCLUDE_RE.exec(value);
    if (include) {
      blocks.push(makeBlock('include', line, line, { attributes: [include[1]] }));
      index += 1;
      continue;
    }

    if (CONDITIONAL_RE.test(value)) {
      blocks.push(makeBlock('conditional', line, line));
      index += 1;
      continue;
    }

    const checklist = CHECKLIST_RE.exec(value);
    if (checklist) {
      blocks.push(makeBlock('unordered-list', line, line, { level: checklist[2].length }));
      index += 1;
      continue;
    }

    const unordered = UNORDERED_RE.exec(value);
    if (unordered) {
      blocks.push(makeBlock('unordered-list', line, line, { level: unordered[2].length }));
      index += 1;
      continue;
    }

    const ordered = ORDERED_RE.exec(value);
    if (ordered) {
      blocks.push(makeBlock('ordered-list', line, line, { level: ordered[2].length }));
      index += 1;
      continue;
    }

    const description = DESCRIPTION_RE.exec(value);
    if (description) {
      blocks.push(makeBlock('description-list', line, line, { attributes: [description[2]] }));
      index += 1;
      continue;
    }

    const admonition = ADMONITION_RE.exec(value);
    if (admonition) {
      const end = consumeParagraph(lines, index);
      blocks.push(makeBlock('admonition', line, lines[end], { style: admonition[1].toLowerCase() }));
      index = end + 1;
      continue;
    }

    const end = consumeParagraph(lines, index);
    blocks.push(makeBlock('paragraph', line, lines[end], { title: pending.title, id: pending.id }));
    clearPending(pending);
    index = end + 1;
  }

  return { text, lines, blocks, headings };
}

function consumeParagraph(lines: Line[], start: number): number {
  let end = start;

  for (let index = start + 1; index < lines.length; index += 1) {
    if (!lines[index].text.trim() || isBlockStart(lines[index].text)) {
      break;
    }
    end = index;
  }

  return end;
}

function isBlockStart(value: string): boolean {
  return (
    DELIMITER_RE.test(value) ||
    HEADING_RE.test(value) ||
    ATTRIBUTE_ENTRY_RE.test(value) ||
    BLOCK_ATTRIBUTE_RE.test(value) ||
    BLOCK_TITLE_RE.test(value) ||
    ANCHOR_RE.test(value) ||
    BIBLIO_ANCHOR_RE.test(value) ||
    COMMENT_RE.test(value) ||
    UNORDERED_RE.test(value) ||
    ORDERED_RE.test(value) ||
    DESCRIPTION_RE.test(value) ||
    ADMONITION_RE.test(value) ||
    IMAGE_RE.test(value) ||
    INCLUDE_RE.test(value) ||
    CONDITIONAL_RE.test(value) ||
    THEMATIC_BREAK_RE.test(value) ||
    PAGE_BREAK_RE.test(value) ||
    TOC_RE.test(value)
  );
}

function makeBlock(
  type: BlockType,
  start: Line,
  end: Line,
  extra: Partial<Block> = {},
): Block {
  return {
    type,
    from: start.from,
    to: end.to,
    startLine: start.number,
    endLine: end.number,
    ...extra,
  };
}

function isClosingDelimiter(value: string, open: string): boolean {
  if (open === '--') {
    return value === '--';
  }

  const char = open[0];
  return new RegExp(`^\\${char}{${open.length},}$`).test(value);
}

function applyBlockAttribute(
  pending: { id?: string; style?: string; attributes?: string[]; title?: string; discrete?: boolean },
  value: string,
): void {
  const parts = splitAttributes(value);
  pending.attributes = parts;

  if (parts.includes('discrete')) {
    pending.discrete = true;
  }

  const first = parts[0] ?? '';
  const named = first.split(',').map((part) => part.trim()).filter(Boolean);

  for (const token of named) {
    if (token.startsWith('#')) {
      pending.id = token.slice(1).split('.')[0];
    } else if (!token.includes('=') && !token.startsWith('%') && !token.startsWith('.')) {
      pending.style = token;
    }
  }

  const idMatch = /(?:^|[,\s])#([\w:.-]+)/.exec(value);
  if (idMatch) {
    pending.id = idMatch[1];
  }
}

function splitAttributes(value: string): string[] {
  const parts: string[] = [];
  let current = '';
  let quote: string | null = null;

  for (const char of value) {
    if (quote) {
      if (char === quote) {
        quote = null;
      } else {
        current += char;
      }
    } else if (char === '"' || char === "'") {
      quote = char;
    } else if (char === ',') {
      parts.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  parts.push(current.trim());
  return parts;
}

function resolveDelimitedType(base: BlockType, pending: { style?: string; attributes?: string[] }): BlockType {
  const style = pending.style?.toLowerCase();

  if (style === 'source') return 'source';
  if (style === 'verse') return 'verse';
  if (style === 'quote') return 'quote';
  if (style === 'stem') return 'stem';
  if (style === 'listing') return 'listing';
  if (style === 'literal') return 'literal';
  if (style === 'example') return 'example';
  if (style === 'sidebar') return 'sidebar';
  if (style === 'pass') return 'passthrough';
  if (style === 'note' || style === 'tip' || style === 'warning' || style === 'caution' || style === 'important') {
    return 'admonition';
  }

  return base;
}

function clearPending(pending: {
  id?: string;
  style?: string;
  attributes?: string[];
  title?: string;
  discrete?: boolean;
}): void {
  delete pending.id;
  delete pending.style;
  delete pending.attributes;
  delete pending.title;
  delete pending.discrete;
}

export function autoId(title: string, prefix = '_', separator = '_'): string {
  const value = title
    .toLowerCase()
    .replace(/[^\p{L}\p{N}_]+/gu, separator)
    .replace(new RegExp(`\\${separator}+`, 'g'), separator)
    .replace(new RegExp(`^\\${separator}|\\${separator}$`, 'g'), '');

  return `${prefix}${value}`;
}
