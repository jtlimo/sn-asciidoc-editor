import { Command } from '@codemirror/view';
import { scanInline } from '../model/inline';
import { buildModel } from '../model/document-model';

export const goToDefinition: Command = (view) => {
  const pos = view.state.selection.main.head;
  const line = view.state.doc.lineAt(pos);
  const span = scanInline(line.text, line.from).find(
    (candidate) => candidate.type === 'xref' && pos >= candidate.from && pos <= candidate.to,
  );

  if (!span?.target) {
    return false;
  }

  const model = buildModel(view.state.doc.toString());
  const entry = model.symbols.ids.get(span.target) ?? model.symbols.ids.get(`_${span.target}`);

  if (!entry) {
    return false;
  }

  view.dispatch({ selection: { anchor: entry.from }, scrollIntoView: true });
  view.focus();
  return true;
};
