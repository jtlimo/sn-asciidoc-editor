import { WidgetType } from '@codemirror/view';

export class BulletWidget extends WidgetType {
  constructor(private readonly level: number) {
    super();
  }

  eq(other: BulletWidget): boolean {
    return other.level === this.level;
  }

  toDOM(): HTMLElement {
    const span = document.createElement('span');
    span.className = 'cm-adoc-bullet';
    span.textContent = this.level > 1 ? '◦' : '•';
    return span;
  }

  ignoreEvent(): boolean {
    return true;
  }
}

export class CheckboxWidget extends WidgetType {
  constructor(
    private readonly checked: boolean,
    private readonly line: number,
    private readonly onToggle: () => void,
  ) {
    super();
  }

  eq(other: CheckboxWidget): boolean {
    return other.checked === this.checked && other.line === this.line;
  }

  toDOM(): HTMLElement {
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.className = 'cm-adoc-checkbox';
    input.checked = this.checked;
    input.addEventListener('change', () => this.onToggle());
    return input;
  }

  ignoreEvent(): boolean {
    return true;
  }
}

export class ImageWidget extends WidgetType {
  constructor(
    private readonly src: string,
    private readonly alt: string,
    private readonly width?: string,
    private readonly height?: string,
  ) {
    super();
  }

  eq(other: ImageWidget): boolean {
    return (
      other.src === this.src &&
      other.alt === this.alt &&
      other.width === this.width &&
      other.height === this.height
    );
  }

  toDOM(): HTMLElement {
    const figure = document.createElement('figure');
    figure.className = 'cm-adoc-image';

    const image = document.createElement('img');
    image.src = this.src;
    image.alt = this.alt;
    image.loading = 'lazy';
    if (this.width) {
      image.style.width = /^\d+$/.test(this.width) ? `${this.width}px` : this.width;
    }
    if (this.height) {
      image.style.height = /^\d+$/.test(this.height) ? `${this.height}px` : this.height;
    }

    figure.appendChild(image);
    return figure;
  }

  ignoreEvent(): boolean {
    return true;
  }
}

export class RuleWidget extends WidgetType {
  constructor(private readonly pageBreak = false) {
    super();
  }

  eq(other: RuleWidget): boolean {
    return other.pageBreak === this.pageBreak;
  }

  toDOM(): HTMLElement {
    const element = document.createElement('div');
    element.className = this.pageBreak ? 'cm-adoc-page-break' : 'cm-adoc-rule';
    return element;
  }

  ignoreEvent(): boolean {
    return true;
  }
}
