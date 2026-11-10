// Q3 第一项的可行性判定：从 CSS 能不能可靠抽出「比例」这一行？
// 判据：抽出的句子与 _specs 字段 5 的原文，说的是不是同一件事。
import { parse } from './_extract-v2.mjs';
import { splitTracks } from './_track-split.mjs';
import { readFileSync } from 'node:fs';

// 人工核对样本：抽 4 案，把「合成结果」与「规格原文」并排放
const CASES = ['S17', 'S23', 'S25', 'S01'];

for (const id of CASES) {
  const dir = (await import("node:fs")).readdirSync('node:fs').readdirSync("prototypes").find(d => d.startsWith(id + '-'));
  const decls = parse(`prototypes/${dir}/style.css`);
  const spec = readFileSync(`prototypes/_specs/${id}.md`, 'utf8');
  const field5 = (spec.match(/\*\*5\. 布局与网格\*\*\n([\s\S]*?)(?=\n\*\*)/) || [])[1] || '（未取到）';

  // 合成：所有显式 grid 容器的 fr 序列
  const all = decls.filter(x => x.prop === 'grid-template-columns' && !x.media);
  console.log(`\n${'='.repeat(70)}`);
  console.log(`${id} — CSS 里所有显式 grid 容器：`);
  for (const a of all) {
    const tracks = splitTracks(a.val);
    const frs = tracks.map(t => {
      const m = t.match(/minmax\([^,]+,\s*([\d.]+)fr\)/) || t.match(/^([\d.]+)fr$/);
      return m ? parseFloat(m[1]) : null;
    }).filter(v => v !== null);
    console.log(`  L${a.line} ${a.sel.padEnd(16)} ${a.val.slice(0, 44).padEnd(46)} fr=[${frs.join(',')}]`);
  }
  console.log(`${id} — 规格字段 5 原文（前 200 字）：`);
  console.log('  ' + field5.replace(/\s+/g, ' ').slice(0, 200) + '…');
}
