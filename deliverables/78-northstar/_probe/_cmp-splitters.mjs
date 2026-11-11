// 对比两种切分在同一批案上的结果差异。
const CASES = [
  ['S01', '365.5px 24px 292.391px 24px 292.406px 24px 219.312px'],
  ['S17', 'minmax(210px, 3fr) 16px 9fr'],
  ['S33', '1fr 1px 1fr'],
  ['S07', '5fr 1px 7fr'],
];
const naive = (v) => v.split(/\s+/).filter((t) => t && t !== 'none');
function bracket(v) {
  const out = []; let depth = 0, cur = '';
  for (const ch of v) {
    if (ch === '(') { depth++; cur += ch; continue; }
    if (ch === ')') { depth--; cur += ch; continue; }
    if (/\s/.test(ch) && depth === 0) { if (cur.trim()) out.push(cur.trim()); cur = ''; continue; }
    cur += ch;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}
console.log('案   轨道值                                                朴素切分  括号切分  差');
for (const [id, v] of CASES) {
  const a = naive(v), b = bracket(v);
  console.log(id.padEnd(4), v.slice(0, 52).padEnd(54), String(a.length).padStart(6), String(b.length).padStart(8),
    a.length !== b.length ? `  ← 差 ${b.length - a.length}` : '    相同');
}
