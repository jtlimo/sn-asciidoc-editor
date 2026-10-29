import { Command } from '@codemirror/view';
import { redo, undo } from '@codemirror/commands';
import { openSearchPanel } from '@codemirror/search';
import { insertAttributeEntry, insertBlockAttribute } from './attributes';
import {
  demoteSection,
  insertAdmonition,
  insertAnchor,
  insertAudio,
  insertCommentBlock,
  insertConditional,
  insertExampleBlock,
  insertImageBlock,
  insertInclude,
  insertKroki,
  insertListingBlock,
  insertMermaid,
  insertOpenBlock,
  insertPageBreak,
  insertPassthroughBlock,
  insertQuoteBlock,
  insertSidebarBlock,
  insertSourceBlock,
  insertStemBlock,
  insertThematicBreak,
  insertToc,
  insertVideo,
  promoteSection,
  setHeading,
} from './blocks';
import { toggleComment } from './comments';
import { editDocumentProperties } from './document';
import {
  insertFootnote,
  insertInlineImage,
  insertLink,
  insertPassthrough,
  insertStem,
  insertXref,
  toggleBold,
  toggleItalic,
  toggleMark,
  toggleMono,
  toggleSubscript,
  toggleSuperscript,
} from './inline';
import { toggleChecklist, toggleDescriptionList, toggleList } from './lists';
import {
  deleteLines,
  duplicateLines,
  goToLine,
  goToNextHeading,
  goToPreviousHeading,
  moveLinesDown,
  moveLinesUp,
} from './navigation';
import { insertTable } from './tables';

export interface PaletteCommand {
  label: string;
  group: string;
  hint?: string;
  command: Command;
}

export const paletteCommands: PaletteCommand[] = [
  { label: 'Undo', group: 'Edit', hint: 'Mod+Z', command: undo },
  { label: 'Redo', group: 'Edit', hint: 'Mod+Shift+Z', command: redo },
  { label: 'Find and replace', group: 'Edit', hint: 'Mod+F', command: openSearchPanel },
  { label: 'Go to line', group: 'Navigate', hint: 'Mod+G', command: goToLine },
  { label: 'Next section', group: 'Navigate', hint: 'Mod+Shift+ArrowDown', command: goToNextHeading },
  { label: 'Previous section', group: 'Navigate', hint: 'Mod+Shift+ArrowUp', command: goToPreviousHeading },
  { label: 'Move line up', group: 'Navigate', hint: 'Alt+ArrowUp', command: moveLinesUp },
  { label: 'Move line down', group: 'Navigate', hint: 'Alt+ArrowDown', command: moveLinesDown },
  { label: 'Duplicate line', group: 'Navigate', hint: 'Mod+D', command: duplicateLines },
  { label: 'Delete line', group: 'Navigate', hint: 'Mod+Shift+Backspace', command: deleteLines },
  { label: 'Document title', group: 'Heading', hint: 'Mod+Alt+0', command: setHeading(0) },
  { label: 'Document properties', group: 'Heading', command: editDocumentProperties },
  { label: 'Heading 1', group: 'Heading', hint: 'Mod+Alt+1', command: setHeading(1) },
  { label: 'Heading 2', group: 'Heading', hint: 'Mod+Alt+2', command: setHeading(2) },
  { label: 'Heading 3', group: 'Heading', hint: 'Mod+Alt+3', command: setHeading(3) },
  { label: 'Promote section', group: 'Heading', hint: 'Mod+Alt+ArrowLeft', command: promoteSection },
  { label: 'Demote section', group: 'Heading', hint: 'Mod+Alt+ArrowRight', command: demoteSection },
  { label: 'Bold', group: 'Inline', hint: 'Mod+B', command: toggleBold },
  { label: 'Italic', group: 'Inline', hint: 'Mod+I', command: toggleItalic },
  { label: 'Monospace', group: 'Inline', hint: 'Mod+E', command: toggleMono },
  { label: 'Highlight', group: 'Inline', hint: 'Mod+Shift+H', command: toggleMark },
  { label: 'Superscript', group: 'Inline', command: toggleSuperscript },
  { label: 'Subscript', group: 'Inline', command: toggleSubscript },
  { label: 'Link', group: 'Inline', hint: 'Mod+K', command: insertLink },
  { label: 'Cross reference', group: 'Inline', hint: 'Mod+Shift+K', command: insertXref },
  { label: 'Footnote', group: 'Inline', hint: 'Mod+Shift+F', command: insertFootnote },
  { label: 'Inline image', group: 'Inline', hint: 'Mod+Shift+I', command: insertInlineImage },
  { label: 'Inline STEM', group: 'Inline', hint: 'Mod+Shift+M', command: insertStem },
  { label: 'Passthrough', group: 'Inline', command: insertPassthrough },
  { label: 'Bullet list', group: 'List', command: toggleList('*') },
  { label: 'Numbered list', group: 'List', command: toggleList('.') },
  { label: 'Checklist', group: 'List', hint: 'Mod+Shift+C', command: toggleChecklist },
  { label: 'Description list', group: 'List', command: toggleDescriptionList },
  { label: 'Source block', group: 'Block', hint: 'Mod+Shift+L', command: insertSourceBlock },
  { label: 'Listing block', group: 'Block', command: insertListingBlock },
  { label: 'Example block', group: 'Block', command: insertExampleBlock },
  { label: 'Sidebar block', group: 'Block', command: insertSidebarBlock },
  { label: 'Quote block', group: 'Block', command: insertQuoteBlock },
  { label: 'Open block', group: 'Block', command: insertOpenBlock },
  { label: 'Passthrough block', group: 'Block', command: insertPassthroughBlock },
  { label: 'STEM block', group: 'Block', command: insertStemBlock },
  { label: 'Comment block', group: 'Block', command: insertCommentBlock },
  { label: 'Admonition', group: 'Block', hint: 'Mod+Shift+A', command: insertAdmonition },
  { label: 'Image', group: 'Block', hint: 'Mod+Shift+G', command: insertImageBlock },
  { label: 'Audio', group: 'Block', command: insertAudio },
  { label: 'Video', group: 'Block', command: insertVideo },
  { label: 'Mermaid diagram', group: 'Block', command: insertMermaid },
  { label: 'Kroki diagram', group: 'Block', command: insertKroki },
  { label: 'Table', group: 'Block', command: insertTable },
  { label: 'Table of contents', group: 'Block', command: insertToc },
  { label: 'Anchor', group: 'Block', command: insertAnchor },
  { label: 'Thematic break', group: 'Block', command: insertThematicBreak },
  { label: 'Page break', group: 'Block', command: insertPageBreak },
  { label: 'Document attribute', group: 'Attribute', command: insertAttributeEntry },
  { label: 'Block attribute', group: 'Attribute', command: insertBlockAttribute },
  { label: 'Include', group: 'Attribute', command: insertInclude },
  { label: 'Conditional block', group: 'Attribute', command: insertConditional },
  { label: 'Toggle comment', group: 'Attribute', hint: 'Mod+/', command: toggleComment },
];

export const shortcutGroups: Array<{ group: string; items: Array<{ keys: string; label: string }> }> = [
  {
    group: 'Editing',
    items: [
      { keys: 'Mod+B', label: 'Bold' },
      { keys: 'Mod+I', label: 'Italic' },
      { keys: 'Mod+E', label: 'Monospace' },
      { keys: 'Mod+Shift+H', label: 'Highlight' },
      { keys: 'Mod+K', label: 'Link' },
      { keys: 'Mod+Shift+K', label: 'Cross reference' },
      { keys: 'Mod+Shift+F', label: 'Footnote' },
      { keys: 'Mod+/', label: 'Toggle comment' },
      { keys: 'Mod+Shift+C', label: 'Checklist' },
    ],
  },
  {
    group: 'Blocks',
    items: [
      { keys: 'Mod+Shift+A', label: 'Admonition' },
      { keys: 'Mod+Shift+L', label: 'Source block' },
      { keys: 'Mod+Shift+G', label: 'Image' },
      { keys: 'Mod+Alt+0…3', label: 'Document title / headings' },
      { keys: 'Mod+Alt+←/→', label: 'Promote / demote section' },
    ],
  },
  {
    group: 'Navigation',
    items: [
      { keys: 'Mod+F', label: 'Find and replace' },
      { keys: 'Mod+G', label: 'Go to line' },
      { keys: 'Mod+Shift+↑/↓', label: 'Next / previous section' },
      { keys: 'Alt+↑/↓', label: 'Move line' },
      { keys: 'Mod+D', label: 'Duplicate line' },
      { keys: 'Mod+Shift+P', label: 'Command palette' },
      { keys: 'F1', label: 'Keyboard shortcuts' },
    ],
  },
];
