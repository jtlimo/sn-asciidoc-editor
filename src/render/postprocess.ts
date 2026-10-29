import hljs from 'highlight.js';
import katex from 'katex';

export interface PostprocessOptions {
  enableKroki?: boolean;
  krokiUrl?: string;
}

let mermaidReady: Promise<any> | null = null;

export async function postprocessPreview(
  container: HTMLElement,
  options: PostprocessOptions = {},
): Promise<void> {
  transformChecklists(container);
  transformAdmonitionIcons(container);

  container.querySelectorAll<HTMLElement>('pre code').forEach((code) => {
    if (code.classList.contains('language-mermaid')) {
      return;
    }
    try {
      hljs.highlightElement(code);
    } catch {
      // Ignore unsupported languages.
    }
  });

  container.querySelectorAll<HTMLElement>('.math').forEach((element) => {
    const expression = element.textContent ?? '';
    try {
      katex.render(expression, element, {
        throwOnError: false,
        displayMode: element.tagName === 'DIV',
      });
    } catch {
      // Keep the source expression when KaTeX cannot parse it.
    }
  });

  renderStemText(container);

  await renderKroki(container, options);
  await renderMermaid(container);

  container.querySelectorAll<HTMLAnchorElement>('a[href]').forEach((anchor) => {
    if (/^https?:/i.test(anchor.getAttribute('href') ?? '')) {
      anchor.target = '_blank';
      anchor.rel = 'noopener noreferrer';
    }
  });
}

function transformChecklists(container: HTMLElement): void {
  container.querySelectorAll<HTMLElement>('ul.checklist li').forEach((item) => {
    const icon = item.querySelector<HTMLElement>('i.fa');
    if (!icon) {
      return;
    }

    const classes = icon.className;
    const checked =
      /fa-(?:check(?:-square)?|square-check)/.test(classes) && !/fa-square-o/.test(classes);
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.className = 'adoc-preview-checkbox';
    input.checked = checked;
    input.disabled = true;
    input.setAttribute('aria-label', checked ? 'Completed task' : 'Incomplete task');
    icon.replaceWith(input);
    item.classList.add('adoc-checklist-item');
  });
}

function transformAdmonitionIcons(container: HTMLElement): void {
  const icons: Record<string, string> = {
    'icon-note': 'fa-circle-info',
    'icon-tip': 'fa-lightbulb',
    'icon-warning': 'fa-triangle-exclamation',
    'icon-caution': 'fa-triangle-exclamation',
    'icon-important': 'fa-circle-exclamation',
  };

  container.querySelectorAll<HTMLElement>('td.icon i').forEach((icon) => {
    for (const [name, replacement] of Object.entries(icons)) {
      if (icon.classList.contains(name)) {
        icon.className = `fa-solid ${replacement}`;
        return;
      }
    }
  });
}

function renderStemText(container: HTMLElement): void {
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const value = node.nodeValue ?? '';
      if (!value.includes('\\(') && !value.includes('\\[')) {
        return NodeFilter.FILTER_REJECT;
      }
      if (node.parentElement?.closest('pre, code, .math, script, style')) {
        return NodeFilter.FILTER_REJECT;
      }
      return NodeFilter.FILTER_ACCEPT;
    },
  });

  const nodes: Text[] = [];

  while (walker.nextNode()) {
    nodes.push(walker.currentNode as Text);
  }

  for (const node of nodes) {
    const value = node.nodeValue ?? '';
    const parts = value.split(/(\\\[[\s\S]*?\\\]|\\\([\s\S]*?\\\))/g);

    if (parts.length < 2) {
      continue;
    }

    const fragment = document.createDocumentFragment();

    for (const part of parts) {
      const display = part.startsWith('\\[') && part.endsWith('\\]');
      const inline = part.startsWith('\\(') && part.endsWith('\\)');

      if (!display && !inline) {
        fragment.appendChild(document.createTextNode(part));
        continue;
      }

      const element = document.createElement(display ? 'div' : 'span');
      element.className = display ? 'adoc-stem adoc-stem-display' : 'adoc-stem';

      try {
        katex.render(part.slice(2, -2), element, {
          throwOnError: false,
          displayMode: display,
        });
      } catch {
        element.textContent = part;
      }

      fragment.appendChild(element);
    }

    node.replaceWith(fragment);
  }
}

const KROKI_TYPES = new Set([
  'actdiag',
  'blockdiag',
  'bpmn',
  'bytefield',
  'ditaa',
  'erd',
  'excalidraw',
  'graphviz',
  'mermaid',
  'nomnoml',
  'nwdiag',
  'packetdiag',
  'plantuml',
  'rackdiag',
  'seqdiag',
  'structurizr',
  'svgbob',
  'symbolator',
  'tikz',
  'umlet',
  'vega',
  'vegalite',
  'wavedrom',
  'wireviz',
]);

const KROKI_STRUCTURAL = new Set([
  'kroki',
  'content',
  'openblock',
  'literalblock',
  'listingblock',
  'exampleblock',
  'sidebarblock',
  'quoteblock',
  'admonitionblock',
  'imageblock',
  'paragraph',
  'dlist',
  'ulist',
  'olist',
  'colist',
]);

function krokiType(block: HTMLElement): string {
  const classes = [...block.classList];
  const known = classes.find((name) => KROKI_TYPES.has(name));

  if (known) {
    return known;
  }

  return classes.find((name) => !KROKI_STRUCTURAL.has(name)) ?? '';
}

async function renderKroki(container: HTMLElement, options: PostprocessOptions): Promise<void> {
  const blocks = [...container.querySelectorAll<HTMLElement>('div.kroki')];
  if (!blocks.length) {
    return;
  }

  const enabled = options.enableKroki === true;
  const baseUrl = (options.krokiUrl ?? 'https://kroki.io').replace(/\/$/, '');

  for (const block of blocks) {
    if (!enabled) {
      block.classList.add('kroki-disabled');
      continue;
    }

    const source = block.textContent?.trim();
    const type = krokiType(block);

    if (!source || !type) {
      block.classList.add('kroki-error');
      continue;
    }

    try {
      const encoded = await encodeKroki(source);
      const image = document.createElement('img');
      image.src = `${baseUrl}/${encodeURIComponent(type)}/svg/${encoded}`;
      image.alt = `${type} diagram`;
      image.loading = 'lazy';
      image.className = 'adoc-kroki-image';
      block.replaceChildren(image);
      block.classList.add('kroki-rendered');
    } catch {
      block.classList.add('kroki-error');
    }
  }
}

async function encodeKroki(source: string): Promise<string> {
  if (typeof CompressionStream === 'undefined') {
    throw new Error('CompressionStream is unavailable');
  }

  const bytes = new TextEncoder().encode(source);
  const stream = new Blob([bytes]).stream().pipeThrough(new CompressionStream('deflate'));
  const compressed = new Uint8Array(await new Response(stream).arrayBuffer());

  let binary = '';
  for (let index = 0; index < compressed.length; index += 0x8000) {
    binary += String.fromCharCode(...compressed.subarray(index, index + 0x8000));
  }

  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function renderMermaid(container: HTMLElement): Promise<void> {
  const blocks = [
    ...container.querySelectorAll<HTMLElement>('pre.mermaid, div.mermaid, pre code.language-mermaid'),
  ].filter((block) => !block.closest('div.kroki'));

  if (!blocks.length) {
    return;
  }

  try {
    mermaidReady ??= import('mermaid').then((module) => {
      const mermaid = module.default;
      mermaid.initialize({ startOnLoad: false, securityLevel: 'strict', theme: 'neutral' });
      return mermaid;
    });

    const mermaid = await mermaidReady;
    let index = 0;

    for (const block of blocks) {
      const source = block.textContent ?? '';
      const target = document.createElement('div');
      target.className = 'mermaid';
      const replacement = block.tagName === 'CODE' ? block.closest('pre') ?? block : block;
      replacement.replaceWith(target);

      try {
        const { svg } = await mermaid.render(`adoc-mermaid-${Date.now()}-${index}`, source);
        target.innerHTML = svg;
      } catch {
        target.textContent = source;
        target.classList.add('mermaid-error');
      }
      index += 1;
    }
  } catch {
    // Mermaid is optional; leave the source text in place when it cannot load.
  }
}
