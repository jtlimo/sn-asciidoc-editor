import { useEffect, useMemo, useRef, useState } from 'preact/hooks';

export interface CommandPaletteItem {
  label: string;
  group: string;
  hint?: string;
  run: () => void;
}

export interface CommandPaletteProps {
  items: CommandPaletteItem[];
  onClose: () => void;
}

export function CommandPalette({ items, onClose }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [index, setIndex] = useState(0);
  const input = useRef<HTMLInputElement | null>(null);

  const filtered = useMemo(() => {
    const value = query.trim().toLowerCase();
    if (!value) {
      return items;
    }
    return items.filter(
      (item) =>
        item.label.toLowerCase().includes(value) ||
        item.group.toLowerCase().includes(value),
    );
  }, [items, query]);

  useEffect(() => {
    input.current?.focus();
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  useEffect(() => {
    setIndex(0);
  }, [query]);

  const run = (item: CommandPaletteItem | undefined) => {
    if (!item) {
      return;
    }
    onClose();
    item.run();
  };

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      setIndex((current) => Math.min(filtered.length - 1, current + 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setIndex((current) => Math.max(0, current - 1));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      run(filtered[index]);
    }
  };

  return (
    <div
      className="adoc-modal-backdrop adoc-palette-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className="adoc-palette"
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        onKeyDown={onKeyDown}
      >
        <input
          ref={input}
          className="adoc-palette-input"
          type="text"
          value={query}
          placeholder="Type a command…"
          aria-label="Search commands"
          onInput={(event) => setQuery(event.currentTarget.value)}
        />

        <div className="adoc-palette-list" role="listbox">
          {filtered.length === 0 ? (
            <div className="adoc-palette-empty">No matching commands</div>
          ) : (
            filtered.map((item, itemIndex) => (
              <button
                type="button"
                role="option"
                aria-selected={itemIndex === index}
                className={itemIndex === index ? 'adoc-palette-item active' : 'adoc-palette-item'}
                key={`${item.group}-${item.label}`}
                onMouseEnter={() => setIndex(itemIndex)}
                onClick={() => run(item)}
              >
                <span className="adoc-palette-label">{item.label}</span>
                <span className="adoc-palette-group">{item.group}</span>
                {item.hint ? <kbd>{item.hint}</kbd> : null}
              </button>
            ))
          )}
        </div>

        <div className="adoc-palette-footer">
          <span>
            <kbd>↑</kbd> <kbd>↓</kbd> navigate
          </span>
          <span>
            <kbd>Enter</kbd> run
          </span>
          <span>
            <kbd>Esc</kbd> close
          </span>
        </div>
      </div>
    </div>
  );
}
