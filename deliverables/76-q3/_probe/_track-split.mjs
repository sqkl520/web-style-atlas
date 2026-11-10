// 括号感知的 token 切分。第一版用 split(/\s+/) 会把 minmax(0, 1fr) 切成四段，
// 于是 S03/S12/S13 这些真比例全被判成「其他单位」。
export function splitTracks(v) {
  const out = [];
  let depth = 0, cur = '';
  for (const ch of v) {
    if (ch === '(') { depth++; cur += ch; continue; }
    if (ch === ')') { depth--; cur += ch; continue; }
    if (/\s/.test(ch) && depth === 0) { if (cur.trim()) out.push(cur.trim()); cur = ''; continue; }
    cur += ch;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}
