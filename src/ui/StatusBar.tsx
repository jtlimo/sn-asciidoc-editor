import { CursorInfo } from '../editor/createEditor';

export interface StatusBarProps {
  cursor: CursorInfo;
  words: number;
  characters: number;
  engine: string;
  locked: boolean;
  diagnostics: number;
  saved: boolean;
  breadcrumbs: string;
  onProblems: () => void;
}

export function StatusBar(props: StatusBarProps) {
  return (
    <footer className="adoc-statusbar">
      <span>Ln {props.cursor.line}, Col {props.cursor.column}</span>
      <span>{props.cursor.lines} lines</span>
      <span>{props.words} words</span>
      <span>{props.characters} characters</span>
      <span className="adoc-statusbar-spacer" />
      {props.breadcrumbs ? (
        <span className="adoc-status-breadcrumbs" title={props.breadcrumbs}>
          {props.breadcrumbs}
        </span>
      ) : null}
      <button type="button" className="adoc-status-problems" onClick={props.onProblems}>
        {props.diagnostics > 0 ? (
          <span className="adoc-status-warning">{props.diagnostics} problems</span>
        ) : (
          <span className="adoc-status-ok">No problems</span>
        )}
      </button>
      <span>{props.engine === 'none' ? 'Renderer idle' : `Asciidoctor ${props.engine}`}</span>
      {props.locked ? <span className="adoc-status-locked">Locked</span> : null}
      <span className={props.saved ? 'adoc-status-ok' : 'adoc-status-pending'}>
        {props.saved ? 'Saved' : 'Saving…'}
      </span>
    </footer>
  );
}
