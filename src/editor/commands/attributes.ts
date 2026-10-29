import { EditorSelection } from '@codemirror/state';
import { Command } from '@codemirror/view';
import { openDialog } from '../../ui/dialogs';
import { captureInsertTarget, insertBlockAt } from './dialog';

export const insertAttributeEntry: Command = (view) => {
  const target = captureInsertTarget(view);

  openDialog({
    title: 'Insert document attribute',
    fields: [
      { name: 'name', label: 'Name', required: true, placeholder: 'icons' },
      { name: 'value', label: 'Value', placeholder: 'font' },
    ],
    onSubmit: ({ name, value }) => {
      insertBlockAt(view, target, `:${name}: ${value}`);
    },
  });

  return true;
};

export const insertBlockAttribute: Command = (view) => {
  const target = captureInsertTarget(view);

  openDialog({
    title: 'Insert block attribute',
    fields: [
      {
        name: 'value',
        label: 'Attribute',
        value: 'source,javascript',
        required: true,
        placeholder: 'source,javascript',
      },
    ],
    onSubmit: ({ value }) => {
      const insert = `[${value}]\n`;
      const position = target.lineFrom + insert.length;
      view.dispatch({
        changes: { from: target.lineFrom, insert },
        selection: EditorSelection.single(position),
      });
      view.focus();
    },
  });

  return true;
};
