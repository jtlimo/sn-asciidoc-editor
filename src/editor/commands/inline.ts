import { EditorSelection, EditorState } from '@codemirror/state';
import { Command, EditorView } from '@codemirror/view';
import { scanInline } from '../model/inline';
import { openDialog } from '../../ui/dialogs';
import { captureInsertTarget, insertInlineAt } from './dialog';

export function toggleInline(marker: string, placeholder: string): Command {
  return (view) => {
    const range = view.state.selection.main;
    const selected = view.state.sliceDoc(range.from, range.to);
    const before = view.state.sliceDoc(Math.max(0, range.from - marker.length), range.from);
    const after = view.state.sliceDoc(range.to, Math.min(view.state.doc.length, range.to + marker.length));

    if (selected && before === marker && after === marker) {
      view.dispatch({
        changes: [
          { from: range.from - marker.length, to: range.from },
          { from: range.to, to: range.to + marker.length },
        ],
        selection: EditorSelection.range(range.from - marker.length, range.to - marker.length),
      });
      return true;
    }

    const content = selected || placeholder;
    view.dispatch({
      changes: { from: range.from, to: range.to, insert: `${marker}${content}${marker}` },
      selection: EditorSelection.range(
        range.from + marker.length,
        range.from + marker.length + content.length,
      ),
    });
    view.focus();
    return true;
  };
}

export const toggleBold = toggleInline('*', 'bold text');
export const toggleItalic = toggleInline('_', 'italic text');
export const toggleMono = toggleInline('`', 'monospace');
export const toggleMark = toggleInline('#', 'highlighted text');
export const toggleSuperscript = toggleInline('^', 'superscript');
export const toggleSubscript = toggleInline('~', 'subscript');

export const insertLink: Command = (view) => {
  const target = captureInsertTarget(view);

  openDialog({
    title: 'Insert link',
    fields: [
      {
        name: 'url',
        label: 'URL',
        value: 'https://',
        placeholder: 'https://example.com',
        required: true,
      },
      {
        name: 'text',
        label: 'Link text',
        value: target.selected,
        help: 'Leave blank to use the URL as the link text.',
      },
    ],
    onSubmit: ({ url, text }) => {
      const label = text.trim() || url;
      insertInlineAt(view, target, `link:${url}[${label}]`);
    },
  });

  return true;
};

export const insertXref: Command = (view) => {
  const target = captureInsertTarget(view);

  openDialog({
    title: 'Insert cross reference',
    fields: [
      { name: 'id', label: 'Target id', required: true, placeholder: 'section-id' },
      { name: 'text', label: 'Link text', value: target.selected },
    ],
    onSubmit: ({ id, text }) => {
      const label = text.trim();
      insertInlineAt(view, target, label ? `<<${id},${label}>>` : `<<${id}>>`);
    },
  });

  return true;
};

export const insertFootnote: Command = (view) => {
  const target = captureInsertTarget(view);

  openDialog({
    title: 'Insert footnote',
    fields: [
      {
        name: 'text',
        label: 'Footnote text',
        value: target.selected,
        type: 'textarea',
        required: true,
      },
    ],
    onSubmit: ({ text }) => insertInlineAt(view, target, `footnote:[${text}]`),
  });

  return true;
};

export const insertInlineImage: Command = (view) => {
  const target = captureInsertTarget(view);

  openDialog({
    title: 'Insert inline image',
    description: 'Use an image URL, a legacy FileSafe URL, or upload a small image (up to 512 KB).',
    fields: [
      {
        name: 'source',
        label: 'Image source',
        type: 'file',
        required: true,
        placeholder: 'https://example.com/image.png',
      },
      { name: 'alt', label: 'Alt text', value: target.selected },
    ],
    onSubmit: ({ source, alt }) => insertInlineAt(view, target, `image:${source}[${alt}]`),
  });

  return true;
};

export const insertStem: Command = (view) => {
  const target = captureInsertTarget(view);

  openDialog({
    title: 'Insert STEM expression',
    fields: [
      {
        name: 'expression',
        label: 'LaTeX expression',
        value: target.selected,
        required: true,
        placeholder: 'E = mc^2',
      },
    ],
    onSubmit: ({ expression }) => insertInlineAt(view, target, `stem:[${expression}]`),
  });

  return true;
};

export const insertPassthrough: Command = (view) => {
  const target = captureInsertTarget(view);

  openDialog({
    title: 'Insert passthrough',
    fields: [
      {
        name: 'text',
        label: 'Passthrough content',
        value: target.selected,
        type: 'textarea',
        required: true,
      },
    ],
    onSubmit: ({ text }) => insertInlineAt(view, target, `pass:[${text}]`),
  });

  return true;
};

export function inlineAtCursor(state: EditorState): ReturnType<typeof scanInline>[number] | null {
  const pos = state.selection.main.head;
  const line = state.doc.lineAt(pos);
  return (
    scanInline(line.text, line.from).find(
      (span) => pos >= span.from && pos <= span.to && span.type !== 'attribute',
    ) ?? null
  );
}

export function replaceInline(view: EditorView, from: number, to: number, insert: string): void {
  view.dispatch({
    changes: { from, to, insert },
    selection: EditorSelection.range(from + insert.length, from + insert.length),
  });
}
