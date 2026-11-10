// Shared minimal HTML scanner/writer. Deliberately regex-light: we must know exactly
// which bytes are text vs markup so that a swap can never touch structure, attributes
// or CSS. Only text segments between tags, and an explicit whitelist of copy-bearing
// attribute values, are ever rewritten.
export const CJK = /[\u3400-\u9fff]/;

// Splits HTML into ordered parts: {kind:'text'|'tag'|'comment'|'raw', s, start, end}
export function scan(html) {
  const parts = [];
  let i = 0;
  while (i < html.length) {
    if (html.startsWith('<!--', i)) {
      const e = html.indexOf('-->', i + 4);
      const end = e === -1 ? html.length : e + 3;
      parts.push({ kind: 'comment', s: html.slice(i, end), start: i, end });
      i = end;
      continue;
    }
    if (html[i] === '<') {
      const e = html.indexOf('>', i);
      const end = e === -1 ? html.length : e + 1;
      const raw = html.slice(i, end);
      parts.push({ kind: 'tag', s: raw, start: i, end });
      i = end;
      const m = raw.match(/^<(script|style|textarea)\b/i);
      if (m && !raw.startsWith('</')) {
        const tag = m[1].toLowerCase();
        const close = html.toLowerCase().indexOf('</' + tag, i);
        const end2 = close === -1 ? html.length : close;
        parts.push({ kind: 'raw', s: html.slice(i, end2), start: i, end: end2 });
        i = end2;
      }
      continue;
    }
    const n = html.indexOf('<', i);
    const end = n === -1 ? html.length : n;
    parts.push({ kind: 'text', s: html.slice(i, end), start: i, end });
    i = end;
  }
  return parts;
}

// Rewrites attribute values in place inside a single tag string, via callback.
// cb(name, value, tagName) -> newValue | null (null = leave alone)
export function mapAttrs(tag, cb) {
  const m = tag.match(/^<([a-zA-Z0-9-]+)/);
  if (!m) return tag;
  const tagName = m[1].toLowerCase();
  return tag.replace(/([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*("([^"]*)"|'([^']*)')/g, (all, name, _q, dq, sq) => {
    const val = dq !== undefined ? dq : sq;
    const q = dq !== undefined ? '"' : "'";
    const next = cb(name.toLowerCase(), val, tagName);
    if (next === null || next === undefined || next === val) return all;
    return `${name}=${q}${next}${q}`;
  });
}
