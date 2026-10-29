import { Command } from '@codemirror/view';
import { openDialog } from '../../ui/dialogs';

export const editDocumentProperties: Command = (view) => {
  const doc = view.state.doc.toString();
  const title = /^= (.+)$/m.exec(doc)?.[1] ?? '';

  openDialog({
    title: 'Document properties',
    description: 'Write the AsciiDoc document header. Existing header lines are replaced.',
    fields: [
      { name: 'title', label: 'Title', value: title, required: true },
      { name: 'author', label: 'Author', placeholder: 'Ada Lovelace' },
      { name: 'email', label: 'Email', placeholder: 'ada@example.com' },
      { name: 'revnumber', label: 'Revision', placeholder: '1.0' },
      { name: 'revdate', label: 'Revision date', placeholder: '2026-10-28' },
      { name: 'description', label: 'Description', type: 'textarea', rows: 2 },
    ],
    submitLabel: 'Apply',
    onSubmit: (values) => {
      const lines = [`= ${values.title.trim()}`];

      if (values.author.trim()) {
        const email = values.email.trim();
        lines.push(email ? `${values.author.trim()} <${email}>` : values.author.trim());
      }

      const revision = [values.revnumber.trim() && `v${values.revnumber.trim()}`, values.revdate.trim()]
        .filter(Boolean)
        .join(', ');

      if (revision) {
        lines.push(revision);
      }

      if (values.description.trim()) {
        lines.push(`:description: ${values.description.trim()}`);
      }

      const header = lines.join('\n');
      const blank = doc.search(/\n[ \t]*\n/);
      const hasHeader = /^= /.test(doc);
      const to = hasHeader && blank >= 0 ? blank : 0;
      const insert = hasHeader ? header : `${header}\n\n`;

      view.dispatch({
        changes: { from: 0, to, insert },
        selection: { anchor: insert.length },
      });
      view.focus();
    },
  });

  return true;
};
