import { EditorSelection } from '@codemirror/state';
import { Command, EditorView } from '@codemirror/view';
import { openDialog } from '../../ui/dialogs';
import { scanDocument } from '../model/scanner';

export const moveLinesUp: Command = (view) => moveLines(view, -1);
export const moveLinesDown: Command = (view) => moveLines(view, 1);

export const duplicateLines: Command = (view) => {
  const range = view.state.selection.main;
  const doc = view.state.doc;
  const start = doc.lineAt(range.from);
  const end = doc.lineAt(range.to);
  const text = view.state.sliceDoc(start.from, end.to);
  const insert = `\n${text}`;

  view.dispatch({
    changes: { from: end.to, insert },
    selection: EditorSelection.range(range.from + insert.length, range.to + insert.length),
  });
  return true;
};

export const deleteLines: Command = (view) => {
  const range = view.state.selection.main;
  const doc = view.state.doc;
  const start = doc.lineAt(range.from);
  const end = doc.lineAt(range.to);
  const from = start.from;
  const to = Math.min(doc.length, end.to + 1);

  view.dispatch({
    changes: { from, to },
    selection: EditorSelection.range(Math.min(from, doc.length), Math.min(from, doc.length)),
  });
  return true;
};

export const goToLine: Command = (view) => {
  openDialog({
    title: 'Go to line',
    fields: [
      {
        name: 'line',
        label: 'Line number',
        type: 'number',
        required: true,
        value: String(view.state.doc.lineAt(view.state.selection.main.head).number),
      },
    ],
    submitLabel: 'Go',
    onSubmit: ({ line }) => {
      const number = Math.max(1, Math.min(view.state.doc.lines, Number(line) || 1));
      const target = view.state.doc.line(number);
      view.dispatch({ selection: EditorSelection.range(target.from, target.from), scrollIntoView: true });
      view.focus();
    },
  });

  return true;
};

export const goToNextHeading: Command = (view) => goToHeading(view, 1);
export const goToPreviousHeading: Command = (view) => goToHeading(view, -1);

function goToHeading(view: EditorView, direction: -1 | 1): boolean {
  const model = scanDocument(view.state.doc.toString());
  const current = view.state.doc.lineAt(view.state.selection.main.head).number;
  const headings = model.headings.filter((heading) => !heading.discrete);
  const target =
    direction > 0
      ? headings.find((heading) => heading.line > current)
      : [...headings].reverse().find((heading) => heading.line < current);

  if (!target) {
    return false;
  }

  const line = view.state.doc.line(target.line);
  view.dispatch({ selection: EditorSelection.range(line.from, line.from), scrollIntoView: true });
  view.focus();
  return true;
}

function moveLines(view: EditorView, direction: -1 | 1): boolean {
  const range = view.state.selection.main;
  const doc = view.state.doc;
  const start = doc.lineAt(range.from);
  const end = doc.lineAt(range.to);

  if (direction < 0 && start.number === 1) {
    return false;
  }
  if (direction > 0 && end.number === doc.lines) {
    return false;
  }

  const block = view.state.sliceDoc(start.from, end.to);

  if (direction < 0) {
    const previous = doc.line(start.number - 1);
    const insert = `${block}\n${previous.text}`;
    view.dispatch({
      changes: { from: previous.from, to: end.to, insert },
      selection: EditorSelection.range(
        range.from - previous.text.length - 1,
        range.to - previous.text.length - 1,
      ),
      scrollIntoView: true,
    });
  } else {
    const next = doc.line(end.number + 1);
    const insert = `${next.text}\n${block}`;
    view.dispatch({
      changes: { from: start.from, to: next.to, insert },
      selection: EditorSelection.range(
        range.from + next.text.length + 1,
        range.to + next.text.length + 1,
      ),
      scrollIntoView: true,
    });
  }

  return true;
}
