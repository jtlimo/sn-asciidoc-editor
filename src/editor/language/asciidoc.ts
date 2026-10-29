import { LanguageSupport, StreamLanguage } from '@codemirror/language';
import { tags } from '@lezer/highlight';

interface BlockState {
  delimiter: string | null;
  blockType: string | null;
}

const DELIMITERS = ['////', '----', '....', '====', '****', '____', '++++', '|===', ',===', ':===', '--'];
const VERBATIM = new Set(['comment', 'listing', 'literal', 'passthrough', 'stem']);
const ADMONITIONS = /^(NOTE|TIP|WARNING|CAUTION|IMPORTANT):/;
const MACROS = /^(?:image|link|xref|footnote|include|ifdef|ifndef|ifeval|endif|stem|kbd|btn|menu|icon|pass|anchor|mailto|toc|video|audio):/;
const BLOCK_MACROS = /^(?:image|include|toc|video|audio)::/;

export const asciidocLanguage = StreamLanguage.define<BlockState>({
  name: 'asciidoc',
  startState: () => ({ delimiter: null, blockType: null }),
  token(stream, state) {
    if (stream.sol()) {
      if (state.delimiter) {
        if (isClosing(stream.string, state.delimiter)) {
          stream.skipToEnd();
          state.delimiter = null;
          state.blockType = null;
          return 'meta';
        }

        if (state.blockType && VERBATIM.has(state.blockType)) {
          stream.skipToEnd();
          return state.blockType === 'comment' ? 'comment' : 'monospace';
        }
      } else {
        const delimiter = DELIMITERS.find((value) => stream.string === value || stream.string.startsWith(`${value}`) && new RegExp(`^\\${value[0]}{${value.length},}$`).test(stream.string));
        if (delimiter) {
          stream.skipToEnd();
          state.delimiter = delimiter;
          state.blockType = delimiterType(delimiter);
          return 'meta';
        }
      }

      if (/^\/\/(?!\/)/.test(stream.string)) {
        stream.skipToEnd();
        return 'comment';
      }

      if (stream.match(/^=+\s/)) {
        stream.skipToEnd();
        return 'heading';
      }

      if (stream.match(/^\[\[[^\]]+\]\]$/)) {
        stream.skipToEnd();
        return 'labelName';
      }

      if (stream.match(/^\[.*\]$/)) {
        stream.skipToEnd();
        return 'meta';
      }

      if (stream.match(/^\.[^.\s]/)) {
        stream.skipToEnd();
        return 'string';
      }

      if (stream.match(/^:[\w-]+!?:/)) {
        stream.skipToEnd();
        return 'variableName';
      }

      if (stream.match(ADMONITIONS)) {
        return 'keyword';
      }

      if (stream.match(/^\s*(?:[*+-]+|\.+)\s/)) {
        return 'list';
      }

      if (stream.match(/^\s*\|/)) {
        return 'operator';
      }

      if (stream.match(/^(?:'''|<<<)/)) {
        return 'operator';
      }

      if (stream.match(BLOCK_MACROS)) {
        return 'macroName';
      }

      if (stream.match(/^(?:ifdef|ifndef|ifeval|endif)::/)) {
        return 'processingInstruction';
      }
    }

    if (stream.match(/^\/\/.*/)) {
      return 'comment';
    }

    if (stream.match(/^<<[^>\n]+>>/)) {
      return 'link';
    }

    if (stream.match(/^(?:link|xref):[^\s\[]+\[[^\]]*\]/)) {
      return 'link';
    }

    if (stream.match(/^(?:footnote|anchor|image|kbd|btn|menu|icon|pass|stem):[^\s\[]*\[[^\]]*\]/)) {
      return 'macroName';
    }

    if (stream.match(MACROS)) {
      return 'macroName';
    }

    if (stream.match(/^\{[\w-]+\}/)) {
      return 'variableName';
    }

    if (stream.match(/^\*\*[^*\n]+\*\*/)) {
      return 'strong';
    }

    if (stream.match(/^__[^_\n]+__/)) {
      return 'emphasis';
    }

    if (stream.match(/^``[^`\n]+``/)) {
      return 'monospace';
    }

    if (stream.match(/^\*[^*\n]+\*/)) {
      return 'strong';
    }

    if (stream.match(/^_[^_\n]+_/)) {
      return 'emphasis';
    }

    if (stream.match(/^`[^`\n]+`/)) {
      return 'monospace';
    }

    if (stream.match(/^#[^#\n]+#/)) {
      return 'atom';
    }

    if (stream.match(/^\^[^\^\n]+\^/)) {
      return 'atom';
    }

    if (stream.match(/^~[^~\n]+~/)) {
      return 'atom';
    }

    if (stream.match(/^https?:\/\/\S+/)) {
      return 'url';
    }

    if (stream.match(/^[&<>]/)) {
      return 'escape';
    }

    stream.next();
    return null;
  },
  tokenTable: {
    heading: tags.heading,
    keyword: tags.keyword,
    string: tags.string,
    comment: tags.comment,
    meta: tags.meta,
    variableName: tags.variableName,
    link: tags.link,
    strong: tags.strong,
    emphasis: tags.emphasis,
    monospace: tags.monospace,
    list: tags.list,
    operator: tags.operator,
    atom: tags.atom,
    labelName: tags.labelName,
    macroName: tags.macroName,
    processingInstruction: tags.processingInstruction,
    url: tags.url,
    escape: tags.escape,
  },
});

function delimiterType(delimiter: string): string {
  if (delimiter === '////') return 'comment';
  if (delimiter === '----') return 'listing';
  if (delimiter === '....') return 'literal';
  if (delimiter === '++++') return 'passthrough';
  if (delimiter === '|===' || delimiter === ',===' || delimiter === ':===') return 'table';
  return 'content';
}

function isClosing(line: string, delimiter: string): boolean {
  if (delimiter === '--') {
    return line === '--';
  }

  const char = delimiter[0];
  return new RegExp(`^\\${char}{${delimiter.length},}$`).test(line);
}

export function asciidoc(): LanguageSupport {
  return new LanguageSupport(asciidocLanguage);
}
