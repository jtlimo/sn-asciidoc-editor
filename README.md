# Standard Notes AsciiDoc Editor

A Standard Notes editor extension for writing AsciiDoc. Notes remain plain AsciiDoc text; the extension adds a CodeMirror 6 editing surface, live preview, and AsciiDoc-aware authoring tools without introducing a proprietary note format.

## Status

**Phases 0–3 complete. Phases 4–5 are deferred.**

The editor covers the AsciiDoc authoring loop end to end: plain-text notes, a CodeMirror source editor, Asciidoctor preview, live editing, AsciiDoc-native commands, and Standard Notes integration.

| Phase | Focus | Status |
| --- | --- | --- |
| 0 | Foundation: editor host, render pipeline, tooling | Complete |
| 1 | Document model and language: scanner, highlighting, folding, outline, diagnostics, autocomplete | Complete |
| 2 | Rendering: Asciidoctor pipeline, sanitization, preview styles, media, STEM | Complete |
| 3 | Authoring and live core: toolbar, dialogs, live preview, palette, problems, export | Complete |
| 4–5 | Full live preview and Super-style polish | Not scheduled |

Implemented so far:

- CodeMirror 6 editor with an AsciiDoc tokenizer, folding, outline, breadcrumbs, hover, go-to-definition, anchor rename, lint, and autocomplete.
- Structural scanner and symbol table for headings, blocks, lists, tables, attributes, anchors, xrefs, and footnotes.
- Asciidoctor 4.1.1 renderer with 3.0.4 fallback, DOMPurify sanitization, source-mapped preview clicks, highlight.js, KaTeX, Mermaid, and opt-in Kroki.
- Live editor core for headings, inline formatting, lists, checklists, images, code, admonitions, quotes, rules, and comments.
- Toolbar, bubble menu, slash menu, command palette, shortcuts help, status bar, problems panel, settings, and export.
- AsciiDoc-native dialogs for document properties, attributes, links, xrefs, footnotes, images, tables, source blocks, admonitions, anchors, includes, audio, video, Mermaid, and Kroki.
- Unit and integration tests for the scanner, inline scanner, symbols, diagnostics, includes, rendering, bridge, and commands.

## Architecture

- **CodeMirror 6 is the source of truth.** The note text is the editor document and is saved as plain AsciiDoc; preview and tooling are derived views.
- **Standard Notes integration** uses `@standardnotes/editor-kit` for note text, save events, and host lifecycle.
- **Rendering** uses `@asciidoctor/core` 4.1.1, with 3.0.4 as a fallback. Asciidoctor produces the HTML preview; CodeMirror remains authoritative for the note.
- **Custom structural scanner** reads AsciiDoc block and inline structure for highlighting, folding, outline, diagnostics, and live-preview updates. It complements Asciidoctor rather than replacing it.
- **Source mapping** uses a source-mapped HTML5 converter so preview blocks carry `data-srclineno` and clicks jump to the matching source line.
- **Post-processing** adds syntax highlighting, KaTeX, Mermaid, Kroki, checklist inputs, admonition icons, and safe link targets.
- **Offline assets.** Editor, renderer, styles, and dependencies are bundled; no CDN is used.
- **AsciiDoc-native.** There is no Markdown conversion or Markdown command layer; commands and shortcuts are AsciiDoc-native only.

## Planned feature scope

- **Editing:** full AsciiDoc syntax coverage, syntax highlighting, folding, outline, slash menu, toolbar, dialogs, autocomplete, and diagnostics.
- **Preview:** live preview core, split and preview-only modes, and source-mapped editor/preview updates.
- **Content:** tables, images, code blocks, admonitions, checklists, TOC, links, and includes.
- **Advanced:** STEM rendering, built-in Mermaid diagrams, and opt-in Kroki diagrams (Kroki disabled by default).

## Scope by phase

### Phase 1 — Document model and language

- Structural scanner, inline scanner, document model, and symbol table.
- Syntax highlighting, folding, indentation, outline, and breadcrumbs.
- Diagnostics, autocomplete, hover, go-to-definition, and anchor rename.
- Unit tests for the scanner, inline scanner, symbols, and diagnostics.

### Phase 2 — Rendering

- Asciidoctor 4.1.1 adapter with 3.0.4 fallback and stale-result protection.
- Source-mapped HTML5 converter, checklist and TOC handling, safe links, and includes.
- Complete preview styles, light/dark themes, and print layout.
- Images, SVG, audio/video, icons, STEM, Mermaid, and opt-in Kroki.
- Include handling for URLs and FileSafe, conditionals, and cycle detection.
- `preview_plain` and `preview_html` metadata for the note list.
- Render conformance tests for headings, inline marks, source lines, tables, admonitions, TOC, and STEM.

### Phase 3 — Authoring and live core

- Toolbar, bubble menu, and slash menu.
- Dialogs for document properties, attributes, images, links, tables, code, admonitions, footnotes, anchors, includes, media, Mermaid, and Kroki.
- Inline, block, list, table, attribute, comment, and navigation commands.
- Native typing assistance for headings, lists, checklists, delimiters, tables, xrefs, attributes, and macros.
- Live core for headings, inline formatting, lists, checklists, images, code, admonitions, quotes, rules, and comments.
- Search and replace, command palette, shortcuts help, status bar, outline, and problems panel.
- Settings migration and export (`.adoc`, HTML, print/PDF, clipboard).
- Unit and integration tests, plus browser smoke coverage for live editing, preview, dialogs, themes, and lock state.

### Deferred

- Phase 4: full Super-style live preview for every block type.
- Phase 5: additional polish, collaboration affordances, and broader conformance fixtures.

## Limitations

- **Local file includes and docinfo are not supported.** The extension runs in a browser sandbox and cannot read local files. Pre-process with the Asciidoctor CLI and paste the resolved content, or keep shared content in the note itself.
- **PDF, EPUB, and DocBook are not native backends.** The extension renders HTML previews. Use the Asciidoctor CLI or another external toolchain for those formats.
- **No iframe file API.** The Standard Notes extension iframe cannot access the local filesystem. Reference images by URL, embed data URIs manually, or process local assets externally before inserting them.
- **Kroki is opt-in and remote.** When enabled, diagram source is sent to `kroki.io` to render an SVG. Leave it disabled for offline or confidential notes; Mermaid renders locally.

## Development

Requires Node.js and pnpm.

```bash
pnpm install
pnpm start      # start the dev server and demo
pnpm build      # production build
pnpm test
pnpm typecheck
```

## Demo and installation

- Demo: https://jtlimo.github.io/sn-asciidoc-editor/demo.html
- Installation guide: https://randombits.dev/standard-notes/installing-extensions

The demo runs the editor against a mock Standard Notes host, so it can be developed and tested outside the app.

## Resources

- [AsciiDoc language documentation](https://docs.asciidoctor.org/asciidoc/latest/)
- [Asciidoctor.js documentation](https://docs.asciidoctor.org/asciidoctor.js/latest/)
- [Standard Notes editor-kit](https://github.com/standardnotes/editor-kit)
- [Guide to creating Standard Notes extensions](https://randombits.dev/standard-notes/creating-extensions)
