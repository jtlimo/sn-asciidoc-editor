import DOMPurify from 'dompurify';
import { expandRemoteIncludes } from './includes';

export interface RenderOptions {
  allowRemoteIncludes?: boolean;
  enableKroki?: boolean;
}

export interface RenderResult {
  html: string;
  plain: string;
  error?: string;
  warnings: string[];
  engine: '4.1.1' | '3.0.4' | 'none';
}

const ATTRIBUTES = {
  showtitle: true,
  icons: 'font',
  experimental: true,
  stem: 'latexmath',
};

const OPTIONS = {
  safe: 'secure',
  backend: 'html5',
  sourcemap: true,
  standalone: false,
  attributes: ATTRIBUTES,
};

let core41: typeof import('@asciidoctor/core') | undefined;
let core3: any;
let mappedConverter: any;

export async function renderAsciiDoc(
  text: string,
  options: RenderOptions = {},
): Promise<RenderResult> {
  if (!text.trim()) {
    return { html: '', plain: '', engine: 'none', warnings: [] };
  }

  let source = text;
  const warnings: string[] = [];

  if (options.allowRemoteIncludes) {
    const expanded = await expandRemoteIncludes(text);
    source = expanded.text;
    warnings.push(...expanded.errors);
  }

  try {
    return await renderWith41(source, warnings);
  } catch {
    try {
      return await renderWith3(source, warnings);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        html: `<p class="adoc-error">${escapeHtml(message)}</p>`,
        plain: plainPreview(text),
        error: message,
        warnings,
        engine: 'none',
      };
    }
  }
}

async function renderWith41(text: string, warnings: string[]): Promise<RenderResult> {
  core41 ??= await import('@asciidoctor/core');
  const converter = sourceMappedConverter(core41);
  const options = converter ? { ...OPTIONS, converter } : OPTIONS;
  const document = await core41.load(text, options);
  const html = await document.convert(options);

  return finalize(html, '4.1.1', warnings);
}

function sourceMappedConverter(core: typeof import('@asciidoctor/core')): any {
  if (mappedConverter) {
    return mappedConverter;
  }

  const Html5Converter = (core as any).Html5Converter;

  if (typeof Html5Converter !== 'function') {
    return undefined;
  }

  class SourceMappedConverter extends Html5Converter {
    convert(node: any, transform: string | null = null, opts: any = null): unknown {
      const result = super.convert(node, transform, opts);

      if (result && typeof result.then === 'function') {
        return result.then((value: unknown) => annotateSourceLine(node, value));
      }

      return annotateSourceLine(node, result);
    }
  }

  mappedConverter = SourceMappedConverter;
  return mappedConverter;
}

function annotateSourceLine(node: any, value: unknown): unknown {
  if (typeof value !== 'string' || !value.startsWith('<')) {
    return value;
  }

  if (typeof node?.getNodeName !== 'function' || node.getNodeName() === 'document') {
    return value;
  }

  if (typeof node.getSourceLocation !== 'function') {
    return value;
  }

  const line = node.getSourceLocation()?.getLineNumber?.();

  if (!Number.isInteger(line) || line < 1) {
    return value;
  }

  if (/^<[a-z][\w-]*[^>]*\sdata-srclineno=/.test(value)) {
    return value;
  }

  return value.replace(/^<([a-z][\w-]*)/, `<$1 data-srclineno="${line}"`);
}

async function renderWith3(text: string, warnings: string[]): Promise<RenderResult> {
  if (!core3) {
    const module = await import('asciidoctor');
    core3 = module.default();
  }

  const html = core3.convert(text, OPTIONS);
  return finalize(html, '3.0.4', warnings);
}

function finalize(html: string, engine: RenderResult['engine'], warnings: string[]): RenderResult {
  const sanitized = DOMPurify.sanitize(html, {
    ADD_ATTR: ['target', 'data-srclineno', 'data-item-complete', 'data-lang', 'data-value'],
    ADD_TAGS: ['semantic'],
  });

  return {
    html: sanitized,
    plain: htmlToPlain(sanitized),
    engine,
    warnings,
  };
}

export function htmlToPlain(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const text = doc.body.textContent?.replace(/\s+/g, ' ').trim() ?? '';
  return text.length > 160 ? `${text.slice(0, 157)}...` : text;
}

function plainPreview(text: string): string {
  return text.replace(/\s+/g, ' ').trim().slice(0, 160);
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
