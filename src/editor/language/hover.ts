import { hoverTooltip } from '@codemirror/view';
import { scanInline } from '../model/inline';
import { buildModel } from '../model/document-model';

export const asciidocHover = hoverTooltip((view, pos) => {
  const line = view.state.doc.lineAt(pos);
  const span = scanInline(line.text, line.from).find(
    (candidate) => candidate.type === 'xref' && pos >= candidate.from && pos <= candidate.to,
  );

  if (!span?.target) {
    return null;
  }

  const model = buildModel(view.state.doc.toString());
  const entry = model.symbols.ids.get(span.target) ?? model.symbols.ids.get(`_${span.target}`);

  if (!entry) {
    return null;
  }

  return {
    pos: span.from,
    end: span.to,
    above: true,
    create: () => {
      const dom = document.createElement('div');
      dom.className = 'cm-adoc-hover';
      const title = document.createElement('strong');
      title.textContent = entry.title ?? entry.id;
      const id = document.createElement('div');
      id.textContent = `#${entry.id} · line ${entry.line}`;
      dom.append(title, id);
      return { dom };
    },
  };
});
