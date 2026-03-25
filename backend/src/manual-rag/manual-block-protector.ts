import { randomUUID } from 'crypto';

/** 마크다운 펜스 코드 블록을 치환해 분할 시 깨지지 않게 함 */
export function protectFencedBlocks(markdown: string): {
  text: string;
  placeholders: Map<string, string>;
} {
  const placeholders = new Map<string, string>();
  const re = /```[\w-]*\s*\n[\s\S]*?```/g;
  let result = '';
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(markdown)) !== null) {
    result += markdown.slice(last, m.index);
    const token = `<<<FENCE_${randomUUID()}>>>`;
    placeholders.set(token, m[0]);
    result += token;
    last = m.index + m[0].length;
  }
  result += markdown.slice(last);
  return { text: result, placeholders };
}

function isTableRow(line: string): boolean {
  const t = line.trim();
  return t.startsWith('|') && t.includes('|', 1);
}

/** 연속된 GFM 표 블록을 치환 */
export function protectTables(markdown: string): {
  text: string;
  placeholders: Map<string, string>;
} {
  const lines = markdown.split('\n');
  const placeholders = new Map<string, string>();
  const out: string[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (isTableRow(line)) {
      const blockLines: string[] = [];
      while (i < lines.length && isTableRow(lines[i])) {
        blockLines.push(lines[i]);
        i++;
      }
      const token = `<<<TABLE_${randomUUID()}>>>`;
      placeholders.set(token, blockLines.join('\n'));
      out.push(token);
    } else {
      out.push(line);
      i++;
    }
  }
  return { text: out.join('\n'), placeholders };
}

export function protectBlocks(markdown: string): {
  text: string;
  allPlaceholders: Map<string, string>;
} {
  const f = protectFencedBlocks(markdown);
  const t = protectTables(f.text);
  const allPlaceholders = new Map<string, string>([
    ...f.placeholders,
    ...t.placeholders,
  ]);
  return { text: t.text, allPlaceholders };
}

export function restorePlaceholders(
  text: string,
  placeholders: Map<string, string>,
): string {
  let result = text;
  const keys = [...placeholders.keys()].sort((a, b) => b.length - a.length);
  for (const k of keys) {
    const v = placeholders.get(k);
    if (v) result = result.split(k).join(v);
  }
  return result;
}
