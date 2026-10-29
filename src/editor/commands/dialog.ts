import { EditorSelection } from '@codemirror/state';
import { EditorView } from '@codemirror/view';

export interface InsertTarget {
  from: number;
  to: number;
  lineFrom: number;
  lineTo: number;
  lineEmpty: boolean;
  selected: string;
}

export function captureInsertTarget(view: EditorView): InsertTarget {
  const range = view.state.selection.main;
  const line = view.state.doc.lineAt(range.from);

  return {
    from: range.from,
    to: range.to,
    lineFrom: line.from,
    lineTo: line.to,
    lineEmpty: !line.text.trim(),
    selected: view.state.sliceDoc(range.from, range.to),
  };
}

export function insertInlineAt(
  view: EditorView,
  target: InsertTarget,
  text: string,
  cursorOffset = text.length,
): void {
  const length = view.state.doc.length;
  const from = Math.min(target.from, length);
  const to = Math.min(target.to, length);
  const position = Math.min(from + cursorOffset, from + text.length);

  view.dispatch({
    changes: { from, to, insert: text },
    selection: EditorSelection.single(position),
  });
  view.focus();
}

export function insertBlockAt(
  view: EditorView,
  target: InsertTarget,
  text: string,
  cursorOffset = text.length,
): void {
  if (target.from !== target.to) {
    insertInlineAt(view, target, text, cursorOffset);
    return;
  }

  if (target.lineEmpty) {
    const position = Math.min(target.lineFrom + cursorOffset, target.lineFrom + text.length);
    view.dispatch({
      changes: { from: target.lineFrom, to: target.lineTo, insert: text },
      selection: EditorSelection.single(position),
    });
    view.focus();
    return;
  }

  const insert = `\n\n${text}`;
  const position = Math.min(target.lineTo + 2 + cursorOffset, target.lineTo + insert.length);
  view.dispatch({
    changes: { from: target.lineTo, insert },
    selection: EditorSelection.single(position),
  });
  view.focus();
}
