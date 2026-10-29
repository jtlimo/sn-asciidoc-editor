import { indentLess, indentMore } from '@codemirror/commands';
import { Command, keymap } from '@codemirror/view';
import { goToDefinition } from './language/definitions';
import { renameAnchor } from './language/rename';
import {
  toggleBold,
  toggleItalic,
  toggleMark,
  toggleMono,
  insertLink,
  insertFootnote,
  insertXref,
  insertInlineImage,
  insertStem,
} from './commands/inline';
import { insertAdmonition, insertImageBlock, insertSourceBlock, promoteSection, demoteSection, setHeading } from './commands/blocks';
import { continueList, indentList, outdentList, toggleChecklist } from './commands/lists';
import { nextTableCell } from './commands/tables';
import { toggleComment } from './commands/comments';
import { deleteLines, duplicateLines, goToLine, goToNextHeading, goToPreviousHeading, moveLinesDown, moveLinesUp } from './commands/navigation';

const tab: Command = (view) => {
  if (nextTableCell(view)) {
    return true;
  }
  if (indentList(view)) {
    return true;
  }
  return indentMore(view);
};

const shiftTab: Command = (view) => {
  if (outdentList(view)) {
    return true;
  }
  return indentLess(view);
};

export const asciidocKeymap = keymap.of([
  { key: 'Enter', run: continueList },
  { key: 'Tab', run: tab },
  { key: 'Shift-Tab', run: shiftTab },
  { key: 'Mod-b', run: toggleBold },
  { key: 'Mod-i', run: toggleItalic },
  { key: 'Mod-e', run: toggleMono },
  { key: 'Mod-Shift-h', run: toggleMark },
  { key: 'Mod-k', run: insertLink },
  { key: 'Mod-Shift-k', run: insertXref },
  { key: 'Mod-Shift-f', run: insertFootnote },
  { key: 'Mod-Shift-i', run: insertInlineImage },
  { key: 'Mod-Shift-m', run: insertStem },
  { key: 'Mod-Shift-a', run: insertAdmonition },
  { key: 'Mod-Shift-l', run: insertSourceBlock },
  { key: 'Mod-Shift-g', run: insertImageBlock },
  { key: 'Mod-Shift-c', run: toggleChecklist },
  { key: 'Mod-/', run: toggleComment },
  { key: 'Mod-Alt-1', run: setHeading(1) },
  { key: 'Mod-Alt-2', run: setHeading(2) },
  { key: 'Mod-Alt-3', run: setHeading(3) },
  { key: 'Mod-Alt-0', run: setHeading(0) },
  { key: 'Mod-Alt-ArrowLeft', run: promoteSection },
  { key: 'Mod-Alt-ArrowRight', run: demoteSection },
  { key: 'Mod-Shift-ArrowUp', run: goToPreviousHeading },
  { key: 'Mod-Shift-ArrowDown', run: goToNextHeading },
  { key: 'Alt-ArrowUp', run: moveLinesUp },
  { key: 'Alt-ArrowDown', run: moveLinesDown },
  { key: 'Mod-g', run: goToLine },
  { key: 'Mod-d', run: duplicateLines },
  { key: 'Mod-Shift-Backspace', run: deleteLines },
  { key: 'F12', run: goToDefinition },
  { key: 'Shift-F12', run: renameAnchor },
]);
