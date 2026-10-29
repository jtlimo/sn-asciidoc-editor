import { Command, EditorView, showTooltip, Tooltip } from '@codemirror/view';
import { toggleComment } from './commands/comments';
import {
  insertFootnote,
  insertLink,
  insertXref,
  toggleBold,
  toggleItalic,
  toggleMark,
  toggleMono,
} from './commands/inline';

interface BubbleItem {
  label: string;
  icon: string;
  command: Command;
}

const ITEMS: BubbleItem[] = [
  { label: 'Bold', icon: 'fa-bold', command: toggleBold },
  { label: 'Italic', icon: 'fa-italic', command: toggleItalic },
  { label: 'Monospace', icon: 'fa-code', command: toggleMono },
  { label: 'Highlight', icon: 'fa-highlighter', command: toggleMark },
  { label: 'Link', icon: 'fa-link', command: insertLink },
  { label: 'Cross reference', icon: 'fa-arrow-up-right-from-square', command: insertXref },
  { label: 'Footnote', icon: 'fa-note-sticky', command: insertFootnote },
  { label: 'Toggle comment', icon: 'fa-comment', command: toggleComment },
];

export function bubbleMenu() {
  return showTooltip.compute(['selection'], (state) => {
    const range = state.selection.main;

    if (range.empty || range.to - range.from > 400 || !state.facet(EditorView.editable)) {
      return null;
    }

    return {
      pos: range.from,
      end: range.to,
      above: true,
      arrow: true,
      create(view) {
        const dom = document.createElement('div');
        dom.className = 'cm-adoc-bubble';
        dom.setAttribute('role', 'toolbar');
        dom.setAttribute('aria-label', 'Selection actions');
        dom.addEventListener('mousedown', (event) => event.preventDefault());

        for (const item of ITEMS) {
          const button = document.createElement('button');
          button.type = 'button';
          button.title = item.label;
          button.setAttribute('aria-label', item.label);
          const icon = document.createElement('i');
          icon.className = `fa-solid ${item.icon}`;
          icon.setAttribute('aria-hidden', 'true');
          button.appendChild(icon);
          button.addEventListener('click', () => item.command(view));
          dom.appendChild(button);
        }

        return { dom };
      },
    } satisfies Tooltip;
  });
}
