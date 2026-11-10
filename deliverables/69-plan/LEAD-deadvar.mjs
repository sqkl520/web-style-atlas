import { readFileSync, readdirSync } from 'node:fs';

const targets = { S09: '#8A4B24', S10: '#6E7076', S17: '#DFD6BF', S18: '#278F43', S22: '#6B6558', S28: '#07080C' };

console.log('=== 死变量核实：提示词声称的色值在 CSS 里存在但从未被引用 ===\n');
for (const [id, hex] of Object.entries(targets)) {
  const dirs = readdirSync('prototypes').filter(d => d.startsWith(id + '-'));
  if (!dirs.length) continue;
  const css = readFileSync(`prototypes/${dirs[0]}/style.css`, 'utf8');
  const noComment = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const lines = noComment.split('\n');

  // 找该 hex 出现在哪些行
  const hits = [];
  lines.forEach((l, i) => { if (l.toUpperCase().includes(hex.toUpperCase())) hits.push({ n: i + 1, t: l.trim() }); });

  // 判断是 :root 定义还是被引用
  const defs = hits.filter(h => /--[\w-]+\s*:\s*[^;]*#/i.test(h.t));
  const uses = hits.filter(h => /var\(--/.test(h.t) || (!/--[\w-]+\s*:/.test(h.t) && /(color|background|border|fill|stroke)/i.test(h.t)));

  console.log(`${id}  ${hex}`);
  for (const h of hits) console.log(`   L${h.n}: ${h.t.slice(0, 100)}`);
  // 提取变量名，看它有没有被 var() 引用
  const varNames = [];
  for (const d of defs) {
    const m = /--([\w-]+)\s*:/.exec(d.t);
    if (m) varNames.push(m[1]);
  }
  if (varNames.length) {
    for (const v of varNames) {
      const useCount = (noComment.match(new RegExp(`var\\(--${v}\\)`, 'g')) || []).length;
      console.log(`   变量 --${v} 被 var() 引用 ${useCount} 次 ${useCount === 0 ? '← 死变量！' : ''}`);
    }
  }
  console.log();
}
