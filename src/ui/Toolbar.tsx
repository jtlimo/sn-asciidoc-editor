import { Command } from '@codemirror/view';
import { redo, undo } from '@codemirror/commands';
import { openSearchPanel } from '@codemirror/search';
import { ViewMode } from '../sn/settings';
import {
  insertAdmonition,
  insertAnchor,
  insertAudio,
  insertCommentBlock,
  insertExampleBlock,
  insertImageBlock,
  insertKroki,
  insertListingBlock,
  insertMermaid,
  insertPageBreak,
  insertQuoteBlock,
  insertSidebarBlock,
  insertSourceBlock,
  insertStemBlock,
  insertThematicBreak,
  insertToc,
  insertVideo,
  insertPassthroughBlock,
  promoteSection,
  demoteSection,
  setHeading,
} from '../editor/commands/blocks';
import { editDocumentProperties } from '../editor/commands/document';
import { insertAttributeEntry, insertBlockAttribute } from '../editor/commands/attributes';
import { toggleComment } from '../editor/commands/comments';
import {
  insertFootnote,
  insertInlineImage,
  insertLink,
  insertStem,
  insertXref,
  toggleBold,
  toggleItalic,
  toggleMark,
  toggleMono,
  toggleSubscript,
  toggleSuperscript,
} from '../editor/commands/inline';
import { toggleChecklist, toggleDescriptionList, toggleList } from '../editor/commands/lists';
import { deleteLines, duplicateLines, moveLinesDown, moveLinesUp } from '../editor/commands/navigation';
import { insertTable } from '../editor/commands/tables';

export interface ToolbarProps {
  onCommand: (command: Command) => void;
  viewMode: ViewMode;
  onViewMode: (mode: ViewMode) => void;
  livePreview: boolean;
  onLivePreview: (value: boolean) => void;
  showOutline: boolean;
  onShowOutline: (value: boolean) => void;
  onSettings: () => void;
  onExport: () => void;
  locked: boolean;
}

export function Toolbar(props: ToolbarProps) {
  const run = (command: Command) => () => props.onCommand(command);

  return (
    <header className="adoc-toolbar">
      <div className="adoc-toolbar-group adoc-toolbar-brand">
        <span className="adoc-brand-mark">A</span>
        <span className="adoc-brand-name">AsciiDoc</span>
      </div>

      <div className="adoc-toolbar-group">
        <ToolButton title="Undo" icon="fa-rotate-left" onClick={run(undo)} />
        <ToolButton title="Redo" icon="fa-rotate-right" onClick={run(redo)} />
        <ToolButton title="Find and replace" icon="fa-magnifying-glass" onClick={run(openSearchPanel)} />
      </div>

      <div className="adoc-toolbar-group">
        <ToolButton title="Document title" label="H0" onClick={run(setHeading(0))} />
        <ToolButton title="Heading 1" label="H1" onClick={run(setHeading(1))} />
        <ToolButton title="Heading 2" label="H2" onClick={run(setHeading(2))} />
        <ToolButton title="Heading 3" label="H3" onClick={run(setHeading(3))} />
        <ToolButton title="Promote section" icon="fa-angles-left" onClick={run(promoteSection)} />
        <ToolButton title="Demote section" icon="fa-angles-right" onClick={run(demoteSection)} />
        <ToolButton title="Document properties" icon="fa-id-card" onClick={run(editDocumentProperties)} />
      </div>

      <div className="adoc-toolbar-group">
        <ToolButton title="Bold (Mod+B)" icon="fa-bold" onClick={run(toggleBold)} />
        <ToolButton title="Italic (Mod+I)" icon="fa-italic" onClick={run(toggleItalic)} />
        <ToolButton title="Monospace (Mod+E)" icon="fa-code" onClick={run(toggleMono)} />
        <ToolButton title="Highlight" icon="fa-highlighter" onClick={run(toggleMark)} />
        <ToolButton title="Superscript" label="x²" onClick={run(toggleSuperscript)} />
        <ToolButton title="Subscript" label="x₂" onClick={run(toggleSubscript)} />
      </div>

      <div className="adoc-toolbar-group">
        <ToolButton title="Link" icon="fa-link" onClick={run(insertLink)} />
        <ToolButton title="Cross reference" icon="fa-arrow-up-right-from-square" onClick={run(insertXref)} />
        <ToolButton title="Footnote" icon="fa-note-sticky" onClick={run(insertFootnote)} />
        <ToolButton title="Inline image" icon="fa-image" onClick={run(insertInlineImage)} />
        <ToolButton title="Inline STEM" icon="fa-square-root-variable" onClick={run(insertStem)} />
      </div>

      <div className="adoc-toolbar-group">
        <ToolButton title="Bullet list" icon="fa-list-ul" onClick={run(toggleList('*'))} />
        <ToolButton title="Numbered list" icon="fa-list-ol" onClick={run(toggleList('.'))} />
        <ToolButton title="Checklist" icon="fa-square-check" onClick={run(toggleChecklist)} />
        <ToolButton title="Description list" icon="fa-list" onClick={run(toggleDescriptionList)} />
      </div>

      <div className="adoc-toolbar-group">
        <ToolButton title="Source block" icon="fa-file-code" onClick={run(insertSourceBlock)} />
        <ToolButton title="Listing block" icon="fa-terminal" onClick={run(insertListingBlock)} />
        <ToolButton title="Example block" icon="fa-cube" onClick={run(insertExampleBlock)} />
        <ToolButton title="Sidebar block" icon="fa-columns" onClick={run(insertSidebarBlock)} />
        <ToolButton title="Quote block" icon="fa-quote-left" onClick={run(insertQuoteBlock)} />
        <ToolButton title="Passthrough block" icon="fa-code-branch" onClick={run(insertPassthroughBlock)} />
        <ToolButton title="STEM block" icon="fa-superscript" onClick={run(insertStemBlock)} />
        <ToolButton title="Comment block" icon="fa-comment-slash" onClick={run(insertCommentBlock)} />
      </div>

      <div className="adoc-toolbar-group">
        <ToolButton title="Table" icon="fa-table" onClick={run(insertTable)} />
        <ToolButton title="Block image" icon="fa-image" onClick={run(insertImageBlock)} />
        <ToolButton title="Audio" icon="fa-volume-high" onClick={run(insertAudio)} />
        <ToolButton title="Video" icon="fa-video" onClick={run(insertVideo)} />
        <ToolButton title="Mermaid diagram" icon="fa-diagram-project" onClick={run(insertMermaid)} />
        <ToolButton title="Kroki diagram" icon="fa-sitemap" onClick={run(insertKroki)} />
        <ToolButton title="Admonition" icon="fa-triangle-exclamation" onClick={run(insertAdmonition)} />
        <ToolButton title="Table of contents" icon="fa-list-check" onClick={run(insertToc)} />
        <ToolButton title="Anchor" icon="fa-anchor" onClick={run(insertAnchor)} />
        <ToolButton title="Thematic break" icon="fa-minus" onClick={run(insertThematicBreak)} />
        <ToolButton title="Page break" icon="fa-scissors" onClick={run(insertPageBreak)} />
        <ToolButton title="Document attribute" icon="fa-tag" onClick={run(insertAttributeEntry)} />
        <ToolButton title="Block attribute" icon="fa-sliders" onClick={run(insertBlockAttribute)} />
        <ToolButton title="Toggle comment" icon="fa-comment" onClick={run(toggleComment)} />
      </div>

      <div className="adoc-toolbar-group">
        <ToolButton title="Move line up" icon="fa-arrow-up" onClick={run(moveLinesUp)} />
        <ToolButton title="Move line down" icon="fa-arrow-down" onClick={run(moveLinesDown)} />
        <ToolButton title="Duplicate line" icon="fa-copy" onClick={run(duplicateLines)} />
        <ToolButton title="Delete line" icon="fa-trash" onClick={run(deleteLines)} />
      </div>

      <div className="adoc-toolbar-spacer" />

      <div className="adoc-toolbar-group adoc-view-switch" role="group" aria-label="View mode">
        <button
          type="button"
          className={props.viewMode === 'live' ? 'adoc-segment active' : 'adoc-segment'}
          onClick={() => props.onViewMode('live')}
        >
          Live
        </button>
        <button
          type="button"
          className={props.viewMode === 'split' ? 'adoc-segment active' : 'adoc-segment'}
          onClick={() => props.onViewMode('split')}
        >
          Split
        </button>
        <button
          type="button"
          className={props.viewMode === 'preview' ? 'adoc-segment active' : 'adoc-segment'}
          onClick={() => props.onViewMode('preview')}
        >
          Preview
        </button>
      </div>

      <div className="adoc-toolbar-group">
        <ToolButton
          title={props.livePreview ? 'Disable live preview' : 'Enable live preview'}
          icon={props.livePreview ? 'fa-eye' : 'fa-eye-slash'}
          active={props.livePreview}
          onClick={() => props.onLivePreview(!props.livePreview)}
        />
        <ToolButton
          title={props.showOutline ? 'Hide outline' : 'Show outline'}
          icon="fa-bars-staggered"
          active={props.showOutline}
          onClick={() => props.onShowOutline(!props.showOutline)}
        />
        <ToolButton title="Export" icon="fa-download" onClick={props.onExport} />
        <ToolButton title="Settings" icon="fa-gear" onClick={props.onSettings} />
      </div>
    </header>
  );
}

interface ToolButtonProps {
  title: string;
  icon?: string;
  label?: string;
  active?: boolean;
  onClick: () => void;
}

function ToolButton({ title, icon, label, active, onClick }: ToolButtonProps) {
  return (
    <button
      type="button"
      className={active ? 'adoc-tool active' : 'adoc-tool'}
      title={title}
      aria-label={title}
      onClick={onClick}
    >
      {icon ? <i class={`fa-solid ${icon}`} aria-hidden="true" /> : label}
    </button>
  );
}
