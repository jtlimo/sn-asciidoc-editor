export type InlineType =
  | 'strong'
  | 'emphasis'
  | 'mono'
  | 'mark'
  | 'sup'
  | 'sub'
  | 'link'
  | 'xref'
  | 'footnote'
  | 'image'
  | 'anchor'
  | 'attribute'
  | 'kbd'
  | 'btn'
  | 'menu'
  | 'icon'
  | 'pass'
  | 'stem'
  | 'autolink';

export interface Marker {
  from: number;
  to: number;
}

export interface InlineSpan {
  type: InlineType;
  from: number;
  to: number;
  contentFrom: number;
  contentTo: number;
  text?: string;
  target?: string;
  markers: Marker[];
}

interface Candidate extends InlineSpan {
  priority: number;
}

export function scanInline(text: string, base = 0): InlineSpan[] {
  const candidates: Candidate[] = [];

  const add = (
    type: InlineType,
    match: RegExpExecArray,
    contentGroup: number,
    markers: Array<[number, number]>,
    priority: number,
    targetGroup?: number,
  ): void => {
    const from = base + match.index;
    const to = from + match[0].length;
    const contentFrom = base + match.index + match[0].indexOf(match[contentGroup] ?? '');
    const contentTo = contentFrom + (match[contentGroup]?.length ?? 0);

    candidates.push({
      type,
      from,
      to,
      contentFrom,
      contentTo,
      text: match[contentGroup],
      target: targetGroup === undefined ? undefined : match[targetGroup],
      markers: markers.map(([start, end]) => ({ from: from + start, to: from + end })),
      priority,
    });
  };

  for (const match of text.matchAll(/(\*\*[^*\n]+\*\*)/g)) {
    add('strong', match, 0, [[0, 2], [match[0].length - 2, match[0].length]], 100);
    candidates[candidates.length - 1].contentFrom += 2;
    candidates[candidates.length - 1].contentTo -= 2;
    candidates[candidates.length - 1].text = match[0].slice(2, -2);
  }

  for (const match of text.matchAll(/(?<![\w*])\*([^*\n]+)\*(?![\w*])/g)) {
    add('strong', match, 1, [[0, 1], [match[0].length - 1, match[0].length]], 90);
  }

  for (const match of text.matchAll(/(__[^_\n]+__)/g)) {
    add('emphasis', match, 0, [[0, 2], [match[0].length - 2, match[0].length]], 100);
    candidates[candidates.length - 1].contentFrom += 2;
    candidates[candidates.length - 1].contentTo -= 2;
    candidates[candidates.length - 1].text = match[0].slice(2, -2);
  }

  for (const match of text.matchAll(/(?<![\w_])_([^_\n]+)_(?![\w_])/g)) {
    add('emphasis', match, 1, [[0, 1], [match[0].length - 1, match[0].length]], 90);
  }

  for (const match of text.matchAll(/(``[^`\n]+``)/g)) {
    add('mono', match, 0, [[0, 2], [match[0].length - 2, match[0].length]], 100);
    candidates[candidates.length - 1].contentFrom += 2;
    candidates[candidates.length - 1].contentTo -= 2;
    candidates[candidates.length - 1].text = match[0].slice(2, -2);
  }

  for (const match of text.matchAll(/(?<![\w`])`([^`\n]+)`(?![\w`])/g)) {
    add('mono', match, 1, [[0, 1], [match[0].length - 1, match[0].length]], 90);
  }

  for (const match of text.matchAll(/(?<![\w#])#([^#\n]+)#(?![\w#])/g)) {
    add('mark', match, 1, [[0, 1], [match[0].length - 1, match[0].length]], 80);
  }

  for (const match of text.matchAll(/(?<![\w^])\^([^\^\n]+)\^(?![\w^])/g)) {
    add('sup', match, 1, [[0, 1], [match[0].length - 1, match[0].length]], 80);
  }

  for (const match of text.matchAll(/(?<![\w~])~([^~\n]+)~(?![\w~])/g)) {
    add('sub', match, 1, [[0, 1], [match[0].length - 1, match[0].length]], 80);
  }

  for (const match of text.matchAll(/link:([^\[\s]+)\[([^\]]*)\]/g)) {
    const textGroup = match[2] ? 2 : 1;
    const contentFrom = match.index + match[0].indexOf(match[textGroup]);
    candidates.push({
      type: 'link',
      from: base + match.index,
      to: base + match.index + match[0].length,
      contentFrom: base + contentFrom,
      contentTo: base + contentFrom + match[textGroup].length,
      text: match[textGroup],
      target: match[1],
      markers: [
        { from: base + match.index, to: base + match.index + 5 },
        { from: base + match.index + 5 + match[1].length, to: base + match.index + 6 + match[1].length },
        { from: base + match.index + match[0].length - 1, to: base + match.index + match[0].length },
      ],
      priority: 120,
    });
  }

  for (const match of text.matchAll(/<<([^,>\s]+)(?:,([^>]*))?>>/g)) {
    const label = match[2] ?? match[1];
    const contentFrom = match[2]
      ? match.index + match[0].indexOf(match[2])
      : match.index + 2;
    candidates.push({
      type: 'xref',
      from: base + match.index,
      to: base + match.index + match[0].length,
      contentFrom: base + contentFrom,
      contentTo: base + contentFrom + label.length,
      text: label,
      target: match[1],
      markers: [
        { from: base + match.index, to: base + match.index + 2 },
        ...(match[2] ? [{ from: base + contentFrom - 1, to: base + contentFrom }] : []),
        { from: base + match.index + match[0].length - 2, to: base + match.index + match[0].length },
      ],
      priority: 120,
    });
  }

  for (const match of text.matchAll(/xref:([^\[\s]+)\[([^\]]*)\]/g)) {
    const label = match[2] || match[1];
    const contentFrom = match[2] ? match.index + match[0].indexOf(match[2]) : match.index + 5;
    candidates.push({
      type: 'xref',
      from: base + match.index,
      to: base + match.index + match[0].length,
      contentFrom: base + contentFrom,
      contentTo: base + contentFrom + label.length,
      text: label,
      target: match[1],
      markers: [
        { from: base + match.index, to: base + match.index + 5 },
        { from: base + match.index + 5 + match[1].length, to: base + match.index + 6 + match[1].length },
        { from: base + match.index + match[0].length - 1, to: base + match.index + match[0].length },
      ],
      priority: 120,
    });
  }

  for (const match of text.matchAll(/footnote:([^\[\s]*)\[([^\]]*)\]/g)) {
    candidates.push({
      type: 'footnote',
      from: base + match.index,
      to: base + match.index + match[0].length,
      contentFrom: base + match.index + match[0].indexOf(match[2]),
      contentTo: base + match.index + match[0].indexOf(match[2]) + match[2].length,
      text: match[2],
      target: match[1] || undefined,
      markers: [
        { from: base + match.index, to: base + match.index + match[0].indexOf(match[2]) },
        { from: base + match.index + match[0].length - 1, to: base + match.index + match[0].length },
      ],
      priority: 130,
    });
  }

  for (const match of text.matchAll(/image:([^\[\s]+)\[([^\]]*)\]/g)) {
    candidates.push({
      type: 'image',
      from: base + match.index,
      to: base + match.index + match[0].length,
      contentFrom: base + match.index,
      contentTo: base + match.index + match[0].length,
      text: match[2],
      target: match[1],
      markers: [],
      priority: 110,
    });
  }

  for (const match of text.matchAll(/anchor:([^\[\s]+)\[\]/g)) {
    candidates.push({
      type: 'anchor',
      from: base + match.index,
      to: base + match.index + match[0].length,
      contentFrom: base + match.index + 7,
      contentTo: base + match.index + 7 + match[1].length,
      text: match[1],
      target: match[1],
      markers: [
        { from: base + match.index, to: base + match.index + 7 },
        { from: base + match.index + match[0].length - 2, to: base + match.index + match[0].length },
      ],
      priority: 120,
    });
  }

  for (const match of text.matchAll(/\{([\w-]+)\}/g)) {
    candidates.push({
      type: 'attribute',
      from: base + match.index,
      to: base + match.index + match[0].length,
      contentFrom: base + match.index + 1,
      contentTo: base + match.index + 1 + match[1].length,
      text: match[1],
      target: match[1],
      markers: [],
      priority: 50,
    });
  }

  for (const match of text.matchAll(/(?:kbd|btn|menu|icon):([^\[\s]*)\[([^\]]*)\]/g)) {
    const type = match[0].startsWith('kbd') ? 'kbd' : match[0].startsWith('btn') ? 'btn' : match[0].startsWith('menu') ? 'menu' : 'icon';
    const label = match[2] || match[1];
    const contentIndex = match[0].indexOf(label, match[0].indexOf('[') + 1);
    const contentFrom = base + match.index + (contentIndex >= 0 ? contentIndex : 0);
    candidates.push({
      type,
      from: base + match.index,
      to: base + match.index + match[0].length,
      contentFrom,
      contentTo: contentFrom + label.length,
      text: label,
      target: match[1],
      markers: [],
      priority: 100,
    });
  }

  for (const match of text.matchAll(/(?:pass|stem):\[([^\]]*)\]/g)) {
    const type = match[0].startsWith('stem') ? 'stem' : 'pass';
    candidates.push({
      type,
      from: base + match.index,
      to: base + match.index + match[0].length,
      contentFrom: base + match.index + match[0].indexOf(match[1]),
      contentTo: base + match.index + match[0].indexOf(match[1]) + match[1].length,
      text: match[1],
      markers: [],
      priority: 100,
    });
  }

  for (const match of text.matchAll(/https?:\/\/[^\s\[\]]+/g)) {
    candidates.push({
      type: 'autolink',
      from: base + match.index,
      to: base + match.index + match[0].length,
      contentFrom: base + match.index,
      contentTo: base + match.index + match[0].length,
      text: match[0],
      target: match[0],
      markers: [],
      priority: 10,
    });
  }

  const sorted = candidates.sort((a, b) => a.from - b.from || b.priority - a.priority || b.to - a.to);
  const accepted: InlineSpan[] = [];
  let lastTo = -1;

  for (const candidate of sorted) {
    if (candidate.from < lastTo) {
      continue;
    }
    accepted.push(candidate);
    lastTo = candidate.to;
  }

  return accepted;
}
