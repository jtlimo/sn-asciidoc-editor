import { EditorSelection } from '@codemirror/state';
import { Command, EditorView } from '@codemirror/view';
import { openDialog } from '../../ui/dialogs';
import { captureInsertTarget, insertBlockAt } from './dialog';

export function insertBlock(view: EditorView, text: string, cursorOffset = text.length): boolean {
  const range = view.state.selection.main;
  const doc = view.state.doc;

  if (range.from !== range.to) {
    view.dispatch({
      changes: { from: range.from, to: range.to, insert: text },
      selection: EditorSelection.range(range.from + cursorOffset, range.from + cursorOffset),
    });
    view.focus();
    return true;
  }

  const line = doc.lineAt(range.from);

  if (!line.text.trim()) {
    view.dispatch({
      changes: { from: line.from, to: line.to, insert: text },
      selection: EditorSelection.range(line.from + cursorOffset, line.from + cursorOffset),
    });
  } else {
    const insert = `\n\n${text}`;
    view.dispatch({
      changes: { from: line.to, insert },
      selection: EditorSelection.range(
        line.to + insert.length - text.length + cursorOffset,
        line.to + insert.length - text.length + cursorOffset,
      ),
    });
  }

  view.focus();
  return true;
}

export function setHeading(level: number): Command {
  return (view) => {
    const range = view.state.selection.main;
    const line = view.state.doc.lineAt(range.from);
    const match = /^(=+)[ \t]+/.exec(line.text);
    const title = match ? line.text.slice(match[0].length) : line.text;
    const prefix = `${'='.repeat(level + 1)} `;
    const insert = `${prefix}${title}`;

    view.dispatch({
      changes: { from: line.from, to: line.to, insert },
      selection: EditorSelection.range(line.from + insert.length, line.from + insert.length),
    });
    view.focus();
    return true;
  };
}

export function promoteSection(view: EditorView): boolean {
  return shiftHeading(view, -1);
}

export function demoteSection(view: EditorView): boolean {
  return shiftHeading(view, 1);
}

function shiftHeading(view: EditorView, delta: number): boolean {
  const range = view.state.selection.main;
  const line = view.state.doc.lineAt(range.from);
  const match = /^(=+)[ \t]+/.exec(line.text);

  if (!match) {
    return false;
  }

  const level = Math.min(6, Math.max(1, match[1].length + delta));
  const insert = `${'='.repeat(level)} ${line.text.slice(match[0].length)}`;

  view.dispatch({
    changes: { from: line.from, to: line.to, insert },
    selection: EditorSelection.range(line.from + insert.length, line.from + insert.length),
  });
  return true;
}

export const insertSourceBlock: Command = (view) => {
  const target = captureInsertTarget(view);

  openDialog({
    title: 'Insert source block',
    fields: [
      {
        name: 'language',
        label: 'Language',
        type: 'select',
        value: 'javascript',
        options: [
          'javascript',
          'typescript',
          'python',
          'java',
          'json',
          'yaml',
          'bash',
          'sql',
          'html',
          'css',
          'ruby',
          'go',
          'rust',
          'c',
          'cpp',
          'other',
        ].map((language) => ({ label: language, value: language })),
      },
      { name: 'code', label: 'Code', type: 'textarea', value: target.selected, rows: 8 },
    ],
    onSubmit: ({ language, code }) => {
      const text = `[source,${language}]\n----\n${code}\n----`;
      insertBlockAt(view, target, text, code ? text.length : `[source,${language}]\n----\n`.length);
    },
  });

  return true;
};

export const insertListingBlock: Command = (view) =>
  insertBlock(view, '----\n\n----', 5);

export const insertExampleBlock: Command = (view) =>
  insertBlock(view, '====\n\n====', 5);

export const insertSidebarBlock: Command = (view) =>
  insertBlock(view, '****\n\n****', 5);

export const insertQuoteBlock: Command = (view) =>
  insertBlock(view, '____\n\n____', 5);

export const insertLiteralBlock: Command = (view) =>
  insertBlock(view, '....\n\n....', 5);

export const insertOpenBlock: Command = (view) =>
  insertBlock(view, '--\n\n--', 3);

export const insertPassthroughBlock: Command = (view) =>
  insertBlock(view, '++++\n\n++++', 5);

export const insertStemBlock: Command = (view) =>
  insertBlock(view, '[stem]\n++++\n\n++++', 12);

export const insertAdmonition: Command = (view) => {
  const target = captureInsertTarget(view);

  openDialog({
    title: 'Insert admonition',
    fields: [
      {
        name: 'style',
        label: 'Type',
        type: 'select',
        value: 'NOTE',
        options: ['NOTE', 'TIP', 'WARNING', 'CAUTION', 'IMPORTANT'].map((style) => ({
          label: style,
          value: style,
        })),
      },
      { name: 'body', label: 'Content', type: 'textarea', rows: 4 },
    ],
    onSubmit: ({ style, body }) => {
      const text = `[${style}]\n====\n${body}\n====`;
      insertBlockAt(view, target, text, body ? text.length : `[${style}]\n====\n`.length);
    },
  });

  return true;
};

export const insertImageBlock: Command = (view) => {
  const target = captureInsertTarget(view);

  openDialog({
    title: 'Insert image',
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
      { name: 'width', label: 'Width', placeholder: '480 or 80%' },
    ],
    onSubmit: ({ source, alt, width }) => {
      const attributes = [alt, width].filter(Boolean).join(',');
      insertBlockAt(view, target, `image::${source}[${attributes}]`);
    },
  });

  return true;
};

export const insertToc: Command = (view) => insertBlock(view, 'toc::[]');

export const insertAnchor: Command = (view) => {
  const target = captureInsertTarget(view);

  openDialog({
    title: 'Insert anchor',
    fields: [{ name: 'id', label: 'Anchor id', required: true, placeholder: 'section-id' }],
    onSubmit: ({ id }) => {
      const insert = `[[${id}]]\n`;
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

export const insertThematicBreak: Command = (view) => insertBlock(view, "'''");

export const insertPageBreak: Command = (view) => insertBlock(view, '<<<');

export const insertInclude: Command = (view) => {
  const target = captureInsertTarget(view);

  openDialog({
    title: 'Insert include',
    description: 'Remote includes require the “Allow remote includes” setting.',
    fields: [
      {
        name: 'url',
        label: 'Include URL',
        value: 'https://',
        required: true,
        placeholder: 'https://example.com/partial.adoc',
      },
      { name: 'attributes', label: 'Include attributes', placeholder: 'lines=1..10' },
    ],
    onSubmit: ({ url, attributes }) => {
      insertBlockAt(view, target, `include::${url}[${attributes}]`);
    },
  });

  return true;
};

export const insertConditional: Command = (view) => {
  const target = captureInsertTarget(view);

  openDialog({
    title: 'Insert conditional block',
    fields: [
      { name: 'attribute', label: 'Attribute name', required: true, placeholder: 'backend-html5' },
      { name: 'body', label: 'Content', type: 'textarea', rows: 4 },
    ],
    onSubmit: ({ attribute, body }) => {
      const text = `ifdef::${attribute}[]\n${body}\nendif::[]`;
      insertBlockAt(view, target, text, body ? text.length : `ifdef::${attribute}[]\n`.length);
    },
  });

  return true;
};

export const insertCommentBlock: Command = (view) => insertBlock(view, '////\n\n////', 5);

export const insertAudio: Command = (view) => {
  const target = captureInsertTarget(view);

  openDialog({
    title: 'Insert audio',
    description: 'Use an audio URL, a legacy FileSafe URL, or upload a small audio file.',
    fields: [
      {
        name: 'source',
        label: 'Audio source',
        type: 'file',
        accept: 'audio/*',
        required: true,
        placeholder: 'https://example.com/audio.mp3',
        maxBytes: 2 * 1024 * 1024,
      },
      {
        name: 'options',
        label: 'Options',
        type: 'select',
        value: 'controls',
        options: [
          { label: 'Controls', value: 'controls' },
          { label: 'Controls + autoplay', value: 'controls,autoplay' },
          { label: 'Controls + loop', value: 'controls,loop' },
          { label: 'None', value: '' },
        ],
      },
      { name: 'title', label: 'Title' },
    ],
    onSubmit: ({ source, options, title }) => {
      const attributes = [options, title].filter(Boolean).join(',');
      insertBlockAt(view, target, `audio::${source}[${attributes}]`);
    },
  });

  return true;
};

export const insertVideo: Command = (view) => {
  const target = captureInsertTarget(view);

  openDialog({
    title: 'Insert video',
    description: 'Use a video URL, a legacy FileSafe URL, or upload a small video file.',
    fields: [
      {
        name: 'source',
        label: 'Video source',
        type: 'file',
        accept: 'video/*',
        required: true,
        placeholder: 'https://example.com/video.mp4',
        maxBytes: 4 * 1024 * 1024,
      },
      {
        name: 'options',
        label: 'Options',
        type: 'select',
        value: 'controls',
        options: [
          { label: 'Controls', value: 'controls' },
          { label: 'Controls + autoplay', value: 'controls,autoplay' },
          { label: 'Controls + loop', value: 'controls,loop' },
          { label: 'None', value: '' },
        ],
      },
      { name: 'title', label: 'Title' },
    ],
    onSubmit: ({ source, options, title }) => {
      const attributes = [options, title].filter(Boolean).join(',');
      insertBlockAt(view, target, `video::${source}[${attributes}]`);
    },
  });

  return true;
};

export const insertMermaid: Command = (view) => {
  const target = captureInsertTarget(view);

  openDialog({
    title: 'Insert Mermaid diagram',
    description: 'Mermaid diagrams render in the preview without a network request.',
    fields: [
      {
        name: 'diagram',
        label: 'Diagram source',
        type: 'textarea',
        rows: 10,
        required: true,
        value: target.selected,
        placeholder: 'graph TD;\n  A --> B;',
      },
    ],
    onSubmit: ({ diagram }) => {
      const text = `[source,mermaid]\n----\n${diagram}\n----`;
      insertBlockAt(view, target, text, diagram ? text.length : `[source,mermaid]\n----\n`.length);
    },
  });

  return true;
};

export const insertKroki: Command = (view) => {
  const target = captureInsertTarget(view);

  openDialog({
    title: 'Insert Kroki diagram',
    description: 'Kroki diagrams require the “Render Kroki diagrams” setting.',
    fields: [
      {
        name: 'type',
        label: 'Diagram type',
        type: 'select',
        value: 'mermaid',
        options: ['mermaid', 'graphviz', 'plantuml', 'ditaa', 'blockdiag', 'seqdiag'].map((type) => ({
          label: type,
          value: type,
        })),
      },
      {
        name: 'diagram',
        label: 'Diagram source',
        type: 'textarea',
        rows: 10,
        required: true,
        value: target.selected,
        placeholder: 'graph TD;\n  A --> B;',
      },
    ],
    onSubmit: ({ type, diagram }) => {
      const text = `[.kroki.${type}]\n....\n${diagram}\n....`;
      insertBlockAt(view, target, text, diagram ? text.length : `[.kroki.${type}]\n....\n`.length);
    },
  });

  return true;
};

export function insertRaw(view: EditorView, text: string): boolean {
  const range = view.state.selection.main;
  view.dispatch({
    changes: { from: range.from, to: range.to, insert: text },
    selection: EditorSelection.range(range.from + text.length, range.from + text.length),
  });
  view.focus();
  return true;
}
