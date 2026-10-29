import { EditorSelection, EditorState } from '@codemirror/state';
import { Command, EditorView } from '@codemirror/view';

const LIST_RE = /^([ \t]*)([*+-]+|\.+)[ \t]+/;
const CHECKLIST_RE = /^([ \t]*)([*+-]+)[ \t]+\[( |x|X|\*)\][ \t]+/;

export function toggleList(marker: '*' | '.'): Command {
  return (view) => {
    const changes = selectedLines(view.state).map((line) => {
      const match = LIST_RE.exec(line.text);

      if (match && match[2][0] === marker) {
        return {
          from: line.from,
          to: line.from + match[0].length,
          insert: match[2].length > 1 ? `${marker.repeat(match[2].length - 1)} ` : '',
        };
      }

      if (match) {
        return { from: line.from, to: line.from + match[0].length, insert: `${marker} ` };
      }

      return { from: line.from, insert: `${marker} ` };
    });

    view.dispatch({ changes, selection: selectionAfterChanges(view.state, changes) });
    view.focus();
    return true;
  };
}

export const toggleChecklist: Command = (view) => {
  const changes = selectedLines(view.state).map((line) => {
    const checklist = CHECKLIST_RE.exec(line.text);

    if (checklist) {
      return {
        from: line.from,
        to: line.from + checklist[0].length,
        insert: `${checklist[2]} `,
      };
    }

    const list = LIST_RE.exec(line.text);

    if (list) {
      return {
        from: line.from,
        to: line.from + list[0].length,
        insert: `${list[2]} [ ] `,
      };
    }

    return { from: line.from, insert: '* [ ] ' };
  });

  view.dispatch({ changes, selection: selectionAfterChanges(view.state, changes) });
  view.focus();
  return true;
};

export const toggleDescriptionList: Command = (view) => {
  const changes = selectedLines(view.state).map((line) => {
    const match = /^([^:\n]+?)(:::|::)(?:[ \t]+(.*))?$/.exec(line.text);

    if (match) {
      const insert = `${match[1]}: ${match[3] ?? ''}`.trimEnd();
      return { from: line.from, to: line.to, insert };
    }

    return { from: line.to, insert: ':: ' };
  });

  view.dispatch({ changes, selection: selectionAfterChanges(view.state, changes) });
  view.focus();
  return true;
};

export const continueList: Command = (view) => {
  const range = view.state.selection.main;

  if (!range.empty) {
    return false;
  }

  const line = view.state.doc.lineAt(range.head);
  const before = view.state.sliceDoc(line.from, range.head);
  const match = CHECKLIST_RE.exec(before) ?? LIST_RE.exec(before);

  if (!match) {
    return false;
  }

  const content = before.slice(match[0].length);
  const isChecklist = CHECKLIST_RE.test(before);

  if (!content.trim()) {
    view.dispatch({
      changes: { from: line.from, to: range.head, insert: '' },
      selection: EditorSelection.range(line.from, line.from),
    });
    return true;
  }

  const marker = isChecklist ? `${match[2]} [ ] ` : `${match[2]} `;
  const insert = `\n${marker}`;

  view.dispatch({
    changes: { from: range.head, insert },
    selection: EditorSelection.range(range.head + insert.length, range.head + insert.length),
  });
  return true;
};

export const indentList: Command = (view) => {
  const line = view.state.doc.lineAt(view.state.selection.main.head);
  const match = LIST_RE.exec(line.text);

  if (!match) {
    return false;
  }

  const marker = match[2];
  const insert = `${marker[0].repeat(marker.length + 1)} `;
  view.dispatch({
    changes: { from: line.from, to: line.from + match[0].length, insert },
  });
  return true;
};

export const outdentList: Command = (view) => {
  const line = view.state.doc.lineAt(view.state.selection.main.head);
  const match = LIST_RE.exec(line.text);

  if (!match || match[2].length < 2) {
    return false;
  }

  const insert = `${match[2][0].repeat(match[2].length - 1)} `;
  view.dispatch({
    changes: { from: line.from, to: line.from + match[0].length, insert },
  });
  return true;
};

export function toggleChecklistAt(view: EditorView, lineNumber: number): void {
  const line = view.state.doc.line(lineNumber);
  const match = /\[( |x|X|\*)\]/.exec(line.text);

  if (!match) {
    return;
  }

  const checked = match[1] !== ' ';
  view.dispatch({
    changes: {
      from: line.from + match.index + 1,
      to: line.from + match.index + 2,
      insert: checked ? ' ' : 'x',
    },
  });
}

function selectedLines(state: EditorState): Array<{ from: number; to: number; text: string }> {
  const lines: Array<{ from: number; to: number; text: string }> = [];
  const seen = new Set<number>();

  for (const range of state.selection.ranges) {
    const start = state.doc.lineAt(range.from).number;
    const end = state.doc.lineAt(range.to).number;

    for (let number = start; number <= end; number += 1) {
      if (seen.has(number)) {
        continue;
      }
      seen.add(number);
      const line = state.doc.line(number);
      lines.push({ from: line.from, to: line.to, text: line.text });
    }
  }

  return lines;
}

function selectionAfterChanges(
  state: EditorState,
  changes: Array<{ from: number; to?: number; insert?: string }>,
): EditorSelection {
  const head = state.selection.main.head;
  let offset = 0;

  for (const change of changes) {
    if (change.from <= head) {
      offset += (change.insert?.length ?? 0) - ((change.to ?? change.from) - change.from);
    }
  }

  return EditorSelection.single(head + offset);
}
