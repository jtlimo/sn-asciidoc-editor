import { EditorSelection } from '@codemirror/state';
import { Command } from '@codemirror/view';
import { openDialog } from '../../ui/dialogs';
import { captureInsertTarget, insertBlockAt } from './dialog';

export const insertTable: Command = (view) => {
  const target = captureInsertTarget(view);

  openDialog({
    title: 'Insert table',
    fields: [
      { name: 'columns', label: 'Columns', type: 'number', value: '3', required: true },
      {
        name: 'header',
        label: 'Header row',
        type: 'select',
        value: 'yes',
        options: [
          { label: 'Yes', value: 'yes' },
          { label: 'No', value: 'no' },
        ],
      },
    ],
    onSubmit: ({ columns, header }) => {
      const count = Math.max(1, Math.min(12, Number(columns) || 3));
      const widths = Array.from({ length: count }, () => '1').join(',');
      const head = `|${Array.from({ length: count }, (_, index) => `Header ${index + 1}`).join(' | ')}`;
      const row = `|${Array.from({ length: count }, () => 'Cell').join(' | ')}`;
      const text =
        header === 'yes'
          ? `[cols="${widths}",options="header"]\n|===\n${head}\n\n${row}\n|===`
          : `[cols="${widths}"]\n|===\n${row}\n|===`;
      const offset = text.indexOf('\n|===\n') + 7;
      insertBlockAt(view, target, text, offset);
    },
  });

  return true;
};

export const nextTableCell: Command = (view) => {
  const pos = view.state.selection.main.head;
  const line = view.state.doc.lineAt(pos);
  const previous = line.number > 1 ? view.state.doc.line(line.number - 1) : null;
  const inTable =
    line.text.includes('|') ||
    /^[ \t]*\|/.test(previous?.text ?? '') ||
    /^[ \t]*[|,:]={3,}/.test(previous?.text ?? '');

  if (!inTable) {
    return false;
  }

  const rest = line.text.slice(pos - line.from);
  const pipe = rest.indexOf('|');

  if (pipe >= 0) {
    const target = pos + pipe + 1;
    view.dispatch({ selection: EditorSelection.range(target, target), scrollIntoView: true });
    return true;
  }

  if (line.number < view.state.doc.lines) {
    const next = view.state.doc.line(line.number + 1);

    if (/^[ \t]*\|/.test(next.text)) {
      const target = next.from + next.text.indexOf('|') + 1;
      view.dispatch({ selection: EditorSelection.range(target, target), scrollIntoView: true });
      return true;
    }
  }

  const columns = Math.max(1, (line.text.match(/\|/g) ?? []).length - 1);
  const insert = `\n|${Array.from({ length: columns }, () => ' ').join('|')}`;
  view.dispatch({
    changes: { from: line.to, insert },
    selection: EditorSelection.range(line.to + insert.length, line.to + insert.length),
    scrollIntoView: true,
  });
  return true;
};
