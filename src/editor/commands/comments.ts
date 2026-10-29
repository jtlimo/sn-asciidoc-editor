import { Command } from '@codemirror/view';

export const toggleComment: Command = (view) => {
  const state = view.state;
  const ranges = state.selection.ranges;
  const changes: Array<{ from: number; to?: number; insert?: string }> = [];
  const seen = new Set<number>();

  for (const range of ranges) {
    const start = state.doc.lineAt(range.from).number;
    const end = state.doc.lineAt(range.to).number;

    for (let number = start; number <= end; number += 1) {
      if (seen.has(number)) {
        continue;
      }
      seen.add(number);
      const line = state.doc.line(number);
      if (!line.text.trim()) {
        continue;
      }
      if (/^\/\/[ \t]?/.test(line.text)) {
        changes.push({ from: line.from, to: line.from + line.text.match(/^\/\/[ \t]?/)[0].length, insert: '' });
      } else {
        changes.push({ from: line.from, insert: '// ' });
      }
    }
  }

  if (!changes.length) {
    return false;
  }

  view.dispatch({ changes });
  view.focus();
  return true;
};
