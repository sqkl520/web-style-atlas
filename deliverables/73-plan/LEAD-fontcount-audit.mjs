/* S08 的两条 FAIL 是「闸门与规格冲突」还是「S08 真超标」？
 *
 * 判据：把 30 案的 report.json 全读出来，看
 *   ① 「字体数」这条规则在多少案上报警，以及报警的案规格里到底声明了几款
 *   ② 「terracotta」这类反套路色名规则，有没有在别的案上误伤规格指定的主色
 */
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const P = 'D:/Web/style/prototypes';

const cases = readdirSync(P, { withFileTypes: true })
  .filter((d) => d.isDirectory() && /^S\d{2}-/.test(d.name))
  .map((d) => d.name)
  .sort();

console.log('═══ ① 30 案的闸门 FAIL 分布 ═══\n');
const rows = [];
for (const dir of cases) {
  const rp = join(P, dir, '.inspect', 'report.json');
  if (!existsSync(rp)) { rows.push({ id: dir.slice(0, 3), dir, fail: '?', ids: [] }); continue; }
  const j = JSON.parse(readFileSync(rp, 'utf8'));
  rows.push({ id: dir.slice(0, 3), dir, fail: j.gate?.fail ?? j.fail ?? '?', ids: j.gate?.failIds || [] });
}
for (const r of rows) if (r.fail !== 0) console.log(`  ${r.id}  FAIL=${r.fail}  [${r.ids.join(', ')}]`);
console.log(`  合计 FAIL>0 的案: ${rows.filter((r) => r.fail !== 0).length}/30`);

console.log('\n═══ ② 「font-count」规则在哪些案上报警 ═══');
const fontFail = rows.filter((r) => r.ids.includes('font-count'));
console.log('  报警的案:', fontFail.length ? fontFail.map((r) => r.id).join(', ') : '（无）');

/* 各案实际用了几款字族：从 report.json 的 metrics 或字体字段读 */
console.log('\n═══ ③ 每案实际字族数与规格声明数 ═══\n');
console.log('案    闸门报警  规格字段4 声明几款');
console.log('─'.repeat(58));
for (const dir of cases) {
  const id = dir.slice(0, 3);
  const rp = join(P, dir, '.inspect', 'report.json');
  let flagged = '—';
  if (existsSync(rp)) {
    const j = JSON.parse(readFileSync(rp, 'utf8'));
    const f = (j.findings || []).find((x) => (x.rule || x.id) === 'font-count');
    flagged = f ? '⚠' : 'ok';
  }
  let specFaces = '?';
  const sp = join(P, '_specs', id + '.md');
  if (existsSync(sp)) {
    const t = readFileSync(sp, 'utf8');
    const i = t.indexOf('字体策略');
    if (i >= 0) {
      const seg = t.slice(i, i + 700);
      const m = seg.match(/分工[：:]/);
      const tail = m ? seg.slice(m.index, m.index + 160) : seg.slice(0, 160);
      const fams = new Set();
      for (const x of tail.matchAll(/(Gloock|Source Serif 4|Noto Serif SC|IBM Plex Mono|京华老宋体|Archivo[^，。；、]*|Oswald|Space Mono|Martian Mono|JetBrains Mono)/g)) fams.add(x[1].trim());
      specFaces = fams.size ? `${fams.size} 款 [${[...fams].join('/')}]` : '解析失败';
    }
  }
  console.log(`${id}   ${flagged.padEnd(6)}   ${specFaces}`);
}
