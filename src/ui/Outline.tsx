import { Heading } from '../editor/model/scanner';

export interface OutlineProps {
  headings: Heading[];
  activeLine: number;
  onSelect: (heading: Heading) => void;
}

export function Outline({ headings, activeLine, onSelect }: OutlineProps) {
  const visible = headings.filter((heading) => !heading.discrete);
  const current = currentHeading(visible, activeLine);

  return (
    <aside className="adoc-outline" aria-label="Document outline">
      <div className="adoc-outline-header">Outline</div>
      {visible.length === 0 ? (
        <p className="adoc-outline-empty">Add a section with <code>== Title</code>.</p>
      ) : (
        <nav>
          {visible.map((heading) => (
            <button
              type="button"
              key={`${heading.line}-${heading.id}`}
              className={
                current?.line === heading.line
                  ? 'adoc-outline-item active'
                  : 'adoc-outline-item'
              }
              style={{ paddingLeft: `${12 + Math.max(0, heading.level) * 14}px` }}
              onClick={() => onSelect(heading)}
              title={`Line ${heading.line}`}
            >
              {heading.title}
            </button>
          ))}
        </nav>
      )}
    </aside>
  );
}

function currentHeading(headings: Heading[], line: number): Heading | undefined {
  let current: Heading | undefined;

  for (const heading of headings) {
    if (heading.line > line) {
      break;
    }
    current = heading;
  }

  return current;
}
