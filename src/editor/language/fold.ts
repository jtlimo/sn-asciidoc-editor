import { foldService } from '@codemirror/language';
import { Block, scanDocument } from '../model/scanner';

export const asciidocFold = foldService.of((state, lineStart) => {
  const model = scanDocument(state.doc.toString());
  const line = state.doc.lineAt(lineStart);

  const section = model.headings.find((heading) => heading.line === line.number && !heading.discrete);
  if (section) {
    const next = model.headings.find(
      (heading) => heading.line > section.line && !heading.discrete && heading.level <= section.level,
    );
    return foldRange(state.doc, line.number, next ? next.line - 1 : state.doc.lines);
  }

  const delimited = model.blocks.find(
    (block) => block.startLine === line.number && block.endLine > block.startLine && block.delimiter,
  );
  if (delimited) {
    return foldRange(state.doc, line.number, delimited.endLine);
  }

  const list = model.blocks.find((block) => block.startLine === line.number && isListBlock(block));
  if (list) {
    let end = list.endLine;

    for (const block of model.blocks) {
      if (block.startLine <= end) {
        continue;
      }
      if (!isListBlock(block) || block.startLine !== end + 1) {
        break;
      }
      end = block.endLine;
    }

    return foldRange(state.doc, line.number, end);
  }

  return null;
});

function isListBlock(block: Block): boolean {
  return (
    block.type === 'unordered-list' || block.type === 'ordered-list' || block.type === 'description-list'
  );
}

function foldRange(
  doc: { line(number: number): { to: number; text: string }; lines: number },
  startLine: number,
  endLine: number,
): { from: number; to: number } | null {
  let last = Math.min(endLine, doc.lines);

  while (last > startLine && !doc.line(last).text.trim()) {
    last -= 1;
  }

  const from = doc.line(startLine).to;
  const to = doc.line(last).to;

  return to > from ? { from, to } : null;
}
