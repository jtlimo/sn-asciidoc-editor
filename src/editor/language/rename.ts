import { Command } from '@codemirror/view';

export const renameAnchor: Command = (view) => {
  const pos = view.state.selection.main.head;
  const line = view.state.doc.lineAt(pos);
  const oldId = findIdAt(line.text, pos - line.from);

  if (!oldId) {
    return false;
  }

  const newId = window.prompt('Rename anchor', oldId)?.trim();

  if (!newId || newId === oldId) {
    return false;
  }

  const doc = view.state.doc.toString();
  const escaped = oldId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const updated = doc
    .replace(new RegExp(`\\[\\[${escaped}(?=[,\\]])`, 'g'), `[[${newId}`)
    .replace(new RegExp(`\\[#${escaped}(?=[.\\],\\s])`, 'g'), `[#${newId}`)
    .replace(new RegExp(`<<${escaped}(?=[,\\s>])`, 'g'), `<<${newId}`)
    .replace(new RegExp(`xref:${escaped}(?=\\[)`, 'g'), `xref:${newId}`);

  if (updated === doc) {
    return false;
  }

  view.dispatch({ changes: { from: 0, to: doc.length, insert: updated } });
  return true;
};

function findIdAt(text: string, offset: number): string | null {
  const patterns = [/\[\[([\w:.-]+)/g, /\[#([\w:.-]+)/g, /<<([\w:.-]+)/g, /xref:([\w:.-]+)/g];

  for (const pattern of patterns) {
    for (const match of text.matchAll(pattern)) {
      const start = match.index ?? 0;
      if (offset >= start && offset <= start + match[0].length) {
        return match[1];
      }
    }
  }

  return null;
}
