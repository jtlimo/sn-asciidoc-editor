import { useEffect } from 'preact/hooks';
import { shortcutGroups } from '../editor/commands/palette';

export interface ShortcutsHelpProps {
  onClose: () => void;
}

export function ShortcutsHelp({ onClose }: ShortcutsHelpProps) {
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
      <div className="adoc-modal adoc-shortcuts" role="dialog" aria-modal="true" aria-label="Keyboard shortcuts">
        <div className="adoc-modal-header">
          <h2>Keyboard shortcuts</h2>
          <button type="button" className="adoc-modal-close" onClick={onClose} aria-label="Close shortcuts">
            ×
          </button>
        </div>

        <div className="adoc-shortcuts-grid">
          {shortcutGroups.map((group) => (
            <section key={group.group}>
              <h3>{group.group}</h3>
              {group.items.map((item) => (
                <div className="adoc-shortcut-row" key={`${group.group}-${item.keys}-${item.label}`}>
                  <span>{item.label}</span>
                  <kbd>{item.keys}</kbd>
                </div>
              ))}
            </section>
          ))}
        </div>

        <div className="adoc-modal-footer">
          <button type="button" className="adoc-button" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
