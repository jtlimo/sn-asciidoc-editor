import { useEffect } from 'preact/hooks';
import { Diagnostic } from '@codemirror/lint';

export interface ProblemsPanelProps {
  diagnostics: Diagnostic[];
  text: string;
  onSelect: (from: number) => void;
  onClose: () => void;
}

export function ProblemsPanel({ diagnostics, text, onSelect, onClose }: ProblemsPanelProps) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <div className="adoc-modal-backdrop" onMouseDown={(event) => {
      if (event.target === event.currentTarget) {
        onClose();
      }
    }}>
      <div className="adoc-modal adoc-problems" role="dialog" aria-modal="true" aria-label="Problems">
        <div className="adoc-modal-header">
          <h2>Problems</h2>
          <button type="button" className="adoc-modal-close" onClick={onClose} aria-label="Close problems">
            ×
          </button>
        </div>

        <div className="adoc-problems-list">
          {diagnostics.length === 0 ? (
            <p className="adoc-problems-empty">No problems found.</p>
          ) : (
            diagnostics.map((diagnostic, index) => {
              const line = lineNumber(text, diagnostic.from);
              return (
                <button
                  type="button"
                  className={`adoc-problem severity-${diagnostic.severity}`}
                  key={`${diagnostic.from}-${diagnostic.message}-${index}`}
                  onClick={() => {
                    onSelect(diagnostic.from);
                    onClose();
                  }}
                >
                  <span className="adoc-problem-severity">{diagnostic.severity}</span>
                  <span className="adoc-problem-message">{diagnostic.message}</span>
                  <span className="adoc-problem-line">Ln {line}</span>
                </button>
              );
            })
          )}
        </div>

        <div className="adoc-modal-footer">
          <button type="button" className="adoc-button" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function lineNumber(text: string, offset: number): number {
  let line = 1;
  const end = Math.min(offset, text.length);

  for (let index = 0; index < end; index += 1) {
    if (text.charCodeAt(index) === 10) {
      line += 1;
    }
  }

  return line;
}
