import React, { use } from "react";
import TextArea from "./TextArea";
import RowControl from "./RowControl";
import SpacingControl from "./SpacingControl";
import snApi from "sn-extension-api";
import { useEffect, useState, useMemo, useRef } from "preact/hooks";
import asciidoctor from "asciidoctor";
import hljs from "highlight.js";

const processor = asciidoctor();

function CustomEditor() {
  const [text, setText] = useState("");
  const [spacing, setSpacing] = useState<string>("Default");
  const [rows, setRows] = useState<number>(3);
  const previewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    snApi.initialize();
    snApi.subscribe(() => {
      setText(snApi.text);
    });

    setSpacing(snApi.extensionMeta?.spacing || "Default");
    setRows(snApi.meta?.rows || 3);
  }, []);

  const htmlContent = useMemo(() => {
    try {
      const html = processor.convert(text, {
        safe: "secure",
        attributes: {
          showtitle: true,
        },
      });

      const cssLink = `<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.8.0/styles/monokai.min.css">`;

      return cssLink + html;
    } catch (e) {
      return `<p style="color:red">Error parsing AsciiDoc: ${e.message}</p>`;
    }
  }, [text]);

  useEffect(() => {
    if (previewRef.current) {
      const codeBlocks = previewRef.current.querySelectorAll('code[class^="language"]');
      codeBlocks.forEach((code) => {
        hljs.highlightElement(code as HTMLElement);
      });
    }
  }, [htmlContent]);

  const handleTextChange = (newText: string) => {
    setText(newText);
    snApi.text = newText;
  };

  const handleSpacingChange = (newSpacing: string) => {
    setSpacing(newSpacing);
    snApi.extensionMeta = { spacing: newSpacing };
  };

  const handleRowsChange = (newRows: number) => {
    setRows(newRows);
    snApi.meta = { rows: newRows };
  };

  return (
    <div className={"editor-wrapper main__" + spacing}>
      <div className="editor-controls">
        <SpacingControl spacing={spacing} onSpacingChange={handleSpacingChange} />
        <RowControl rows={rows} onRowsChange={handleRowsChange} />
      </div>

      <div className="editor-content-split">
        <div className="editor-edit">
          <TextArea value={text} onChange={handleTextChange} rows={rows} disabled={snApi.locked} />
        </div>
        <div className="editor-divider" />
        <div className="editor-preview">
          <div ref={previewRef} className="asciidoc-preview" dangerouslySetInnerHTML={{ __html: htmlContent }} />
        </div>
      </div>
    </div>
  );
}

export default CustomEditor;

