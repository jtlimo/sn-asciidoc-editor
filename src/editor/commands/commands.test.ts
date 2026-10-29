import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { describe, expect, it } from 'vitest';
import { setHeading } from './blocks';
import { continueList, toggleChecklistAt } from './lists';
import { goToNextHeading, goToPreviousHeading } from './navigation';
import { nextTableCell } from './tables';

function makeView(doc: string, pos = 0): EditorView {
  let state = EditorState.create({ doc, selection: { anchor: pos } });

  return {
    get state() {
      return state;
    },
    dispatch(transaction: Parameters<EditorView['dispatch']>[0]) {
      state = state.update(transaction).state;
    },
    focus() {},
  } as unknown as EditorView;
}

describe('editor commands', () => {
  it('turns a paragraph into a section heading', () => {
    const view = makeView('Introduction', 0);
    setHeading(1)(view);
    expect(view.state.doc.toString()).toBe('== Introduction');
  });

  it('continues a checklist with an unchecked item', () => {
    const doc = '* [ ] first';
    const view = makeView(doc, doc.length);
    continueList(view);
    expect(view.state.doc.toString()).toBe('* [ ] first\n* [ ] ');
  });

  it('removes an empty list item when continuing', () => {
    const doc = '* [ ] first\n* [ ] ';
    const view = makeView(doc, doc.length);
    continueList(view);
    expect(view.state.doc.toString()).toBe('* [ ] first\n');
  });

  it('toggles a checklist item by line number', () => {
    const view = makeView('* [ ] first\n* [x] second');
    toggleChecklistAt(view, 1);
    expect(view.state.doc.toString()).toBe('* [x] first\n* [x] second');
    toggleChecklistAt(view, 1);
    expect(view.state.doc.toString()).toBe('* [ ] first\n* [x] second');
  });

  it('navigates between sections', () => {
    const doc = '= Title\n\n== One\n\ntext\n\n== Two\n\ntext';
    const view = makeView(doc, 0);
    goToNextHeading(view);
    expect(view.state.selection.main.head).toBe(doc.indexOf('== One'));
    goToNextHeading(view);
    expect(view.state.selection.main.head).toBe(doc.indexOf('== Two'));
    goToPreviousHeading(view);
    expect(view.state.selection.main.head).toBe(doc.indexOf('== One'));
  });

  it('moves to the next table cell', () => {
    const doc = '|===\n|one |two\n|===\n';
    const view = makeView(doc, doc.indexOf('one'));
    nextTableCell(view);
    expect(view.state.selection.main.head).toBe(doc.indexOf('two'));
  });
});
