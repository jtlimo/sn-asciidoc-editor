import { Decoration, DecorationSet, EditorView, ViewPlugin, ViewUpdate } from '@codemirror/view';
import { scanInline } from '../model/inline';
import { Block, DocumentModel, scanDocument } from '../model/scanner';
import { toggleChecklistAt } from '../commands/lists';
import { BulletWidget, CheckboxWidget, ImageWidget, RuleWidget } from './widgets';

interface Deco {
  from: number;
  to: number;
  deco: Decoration;
  line?: boolean;
}

export function livePreview() {
  return ViewPlugin.fromClass(
    class {
      decorations: DecorationSet;
      private model: DocumentModel;

      constructor(view: EditorView) {
        this.model = scanDocument(view.state.doc.toString());
        this.decorations = build(view, this.model);
      }

      update(update: ViewUpdate): void {
        if (update.docChanged) {
          this.model = scanDocument(update.state.doc.toString());
        }

        if (update.docChanged || update.viewportChanged || update.selectionSet || update.focusChanged) {
          this.decorations = build(update.view, this.model);
        }
      }
    },
    {
      decorations: (value) => value.decorations,
    },
  );
}

function build(view: EditorView, model: DocumentModel): DecorationSet {
  const doc = view.state.doc;
  const active = activeLines(view);
  const blockAt = blockLines(model, doc.lines);
  const imagesDir = attributeValue(model, 'imagesdir');
  const decos: Deco[] = [];
  const seen = new Set<number>();

  for (const visible of view.visibleRanges) {
    const start = doc.lineAt(visible.from).number;
    const end = doc.lineAt(visible.to).number;

    for (let number = start; number <= end; number += 1) {
      if (seen.has(number)) {
        continue;
      }
      seen.add(number);

      const line = doc.line(number);
      const block = blockAt[number];
      const isActive = active.has(number);

      if (!block) {
        decorateInline(decos, line.text, line.from, isActive, 'cm-adoc-paragraph');
        continue;
      }

      addLine(decos, line.from, blockClass(block));

      if (block.type === 'document-title' || block.type === 'section-title' || block.type === 'discrete-heading') {
        decorateHeading(decos, line.text, line.from, isActive, block.level ?? 0);
        continue;
      }

      if (block.type === 'unordered-list' || block.type === 'ordered-list') {
        decorateList(decos, view, line.text, line.from, line.number, isActive, block.type);
        continue;
      }

      if (block.type === 'description-list') {
        decorateDescription(decos, line.text, line.from, isActive);
        continue;
      }

      if (block.type === 'admonition') {
        decorateAdmonition(decos, line.text, line.from, isActive, block.style ?? 'note');
        continue;
      }

      if (block.type === 'image' && block.startLine === number) {
        if (!isActive) {
          const image = parseImage(line.text, imagesDir);
          if (image) {
            decos.push({
              from: line.from,
              to: line.to,
              deco: Decoration.replace({
                widget: new ImageWidget(image.target, image.alt, image.width, image.height),
              }),
            });
            continue;
          }
        }
      }

      if (block.type === 'thematic-break' || block.type === 'page-break') {
        if (!isActive) {
          decos.push({
            from: line.from,
            to: line.to,
            deco: Decoration.replace({ widget: new RuleWidget(block.type === 'page-break') }),
          });
          continue;
        }
      }

      if (isVerbatim(block.type) || block.type === 'attribute-entry' || block.type === 'block-attribute' || block.type === 'comment') {
        continue;
      }

      decorateInline(decos, line.text, line.from, isActive, blockClass(block));
    }
  }

  const sorted = decos.sort((a, b) => a.from - b.from || (a.line ? -1 : 1) - (b.line ? -1 : 1));
  const accepted: Array<{ from: number; to: number; value: Decoration }> = [];
  let lastTo = -1;

  for (const item of sorted) {
    if (!item.line) {
      if (item.from < lastTo) {
        continue;
      }
      lastTo = item.to;
    }
    accepted.push({ from: item.from, to: item.to, value: item.deco });
  }

  return Decoration.set(accepted, true);
}

function activeLines(view: EditorView): Set<number> {
  const doc = view.state.doc;
  const lines = new Set<number>();

  for (const range of view.state.selection.ranges) {
    const start = doc.lineAt(range.from).number;
    const end = doc.lineAt(range.to).number;
    for (let number = start; number <= end; number += 1) {
      lines.add(number);
    }
  }

  return lines;
}

function blockLines(model: DocumentModel, lineCount: number): Array<Block | undefined> {
  const blocks: Array<Block | undefined> = new Array(lineCount + 1);

  for (const block of model.blocks) {
    for (let number = block.startLine; number <= Math.min(block.endLine, lineCount); number += 1) {
      if (!blocks[number]) {
        blocks[number] = block;
      }
    }
  }

  return blocks;
}

function decorateHeading(
  decos: Deco[],
  text: string,
  from: number,
  active: boolean,
  level: number,
): void {
  const match = /^(=+)[ \t]+/.exec(text);
  if (!match) {
    return;
  }

  const titleFrom = from + match[0].length;
  if (titleFrom < from + text.length) {
    decos.push({
      from: titleFrom,
      to: from + text.length,
      deco: Decoration.mark({ class: `cm-adoc-heading cm-adoc-h${Math.min(level, 6)}` }),
    });
  }

  if (!active) {
    decos.push({ from, to: titleFrom, deco: Decoration.replace({}) });
  }
}

function decorateList(
  decos: Deco[],
  view: EditorView,
  text: string,
  from: number,
  line: number,
  active: boolean,
  type: 'unordered-list' | 'ordered-list',
): void {
  const checklist = /^([ \t]*)([*+-]+)[ \t]+(\[( |x|X|\*)\][ \t]+)/.exec(text);

  if (checklist) {
    if (!active) {
      decos.push({
        from: from + checklist[1].length,
        to: from + checklist[0].length,
        deco: Decoration.replace({
          widget: new CheckboxWidget(checklist[4] !== ' ', line, () => toggleChecklistAt(view, line)),
        }),
      });
    }
    const contentFrom = from + checklist[0].length;
    if (contentFrom < from + text.length) {
      decos.push({
        from: contentFrom,
        to: from + text.length,
        deco: Decoration.mark({ class: 'cm-adoc-list-content' }),
      });
    }
    return;
  }

  if (type === 'ordered-list') {
    return;
  }

  const bullet = /^([ \t]*)([*+-]+)[ \t]+/.exec(text);
  if (bullet && !active) {
    decos.push({
      from: from + bullet[1].length,
      to: from + bullet[0].length,
      deco: Decoration.replace({ widget: new BulletWidget(bullet[2].length) }),
    });
  }
}

function decorateDescription(decos: Deco[], text: string, from: number, active: boolean): void {
  const match = /^([^:\n]+?)(:::|::)(?:[ \t]+(.*))?$/.exec(text);
  if (!match) {
    return;
  }

  decos.push({
    from,
    to: from + match[1].length,
    deco: Decoration.mark({ class: 'cm-adoc-term' }),
  });

  if (!active) {
    const markerFrom = from + match[1].length;
    decos.push({
      from: markerFrom,
      to: markerFrom + match[2].length,
      deco: Decoration.replace({}),
    });
  }
}

function decorateAdmonition(
  decos: Deco[],
  text: string,
  from: number,
  active: boolean,
  style: string,
): void {
  const match = /^(NOTE|TIP|WARNING|CAUTION|IMPORTANT):[ \t]+/.exec(text);
  if (!match) {
    return;
  }

  if (!active) {
    decos.push({ from, to: from + match[0].length, deco: Decoration.replace({}) });
  }

  const contentFrom = from + match[0].length;
  if (contentFrom < from + text.length) {
    decos.push({
      from: contentFrom,
      to: from + text.length,
      deco: Decoration.mark({ class: `cm-adoc-admonition-content cm-adoc-admonition-${style}` }),
    });
  }
}

function decorateInline(decos: Deco[], text: string, from: number, active: boolean, lineClass: string): void {
  if (!text.trim()) {
    return;
  }

  for (const span of scanInline(text, from)) {
    const spanDecos: Deco[] = [];

    if (!active) {
      for (const marker of span.markers) {
        if (marker.from < marker.to) {
          spanDecos.push({ from: marker.from, to: marker.to, deco: Decoration.replace({}) });
        }
      }
    }

    if (span.contentFrom < span.contentTo) {
      spanDecos.push({
        from: span.contentFrom,
        to: span.contentTo,
        deco: Decoration.mark({ class: `cm-adoc-inline-${span.type} ${lineClass}` }),
      });
    }

    spanDecos.sort((a, b) => a.from - b.from);
    decos.push(...spanDecos);
  }
}

function addLine(decos: Deco[], from: number, className: string): void {
  decos.push({ from, to: from, deco: Decoration.line({ class: className }), line: true });
}

function blockClass(block: Block): string {
  const style = block.style ? ` cm-adoc-style-${block.style.toLowerCase()}` : '';
  return `cm-adoc-line cm-adoc-${block.type}${style}`;
}

function isVerbatim(type: Block['type']): boolean {
  return (
    type === 'source' ||
    type === 'listing' ||
    type === 'literal' ||
    type === 'passthrough' ||
    type === 'stem' ||
    type === 'block-comment'
  );
}

function attributeValue(model: DocumentModel, name: string): string | undefined {
  const pattern = new RegExp(`^:${name}:\\s*(.*)$`);

  for (const line of model.lines) {
    const match = pattern.exec(line.text);
    if (match) {
      return match[1].trim();
    }
  }

  return undefined;
}

function parseImage(
  text: string,
  imagesDir?: string,
): { target: string; alt: string; width?: string; height?: string } | null {
  const match = /^image::([^\[]+)\[(.*)\]$/.exec(text);
  if (!match) {
    return null;
  }

  const parts = match[2].split(',').map((part) => part.trim());
  const target = resolveTarget(match[1], imagesDir);

  return {
    target,
    alt: parts[0] ?? '',
    width: parts[1] || undefined,
    height: parts[2] || undefined,
  };
}

function resolveTarget(target: string, imagesDir?: string): string {
  if (/^(?:[a-z][a-z0-9+.-]*:|\/|#)/i.test(target)) {
    return target;
  }
  if (!imagesDir) {
    return target;
  }
  return `${imagesDir.replace(/\/$/, '')}/${target}`;
}
