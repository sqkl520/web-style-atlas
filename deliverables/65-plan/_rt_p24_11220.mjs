// 探针 24：Lead 自查后的「11,220」到底对应哪个口径？逐口径验证。
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { PROTO } from './_rt_lib.mjs';

const SPECS = join(PROTO, '_specs');
const ids = readdirSync(PROTO, { withFileTypes: true })
  .filter((d) => d.isDirectory() && /^S\d{2}-/.test(d.name)).map((d) => d.name.slice(0, 3)).sort();
const dec = (s) => s.replace(/\*\*/g, '').replace(/`/g, '').replace(/\s+/g, ' ').trim();

function block(md) {
  const re = /^[ \t]*(?:\*\*)?[ \t]*8[ \t]*\.[ \t]*[^\n]*$/gm;
  const m = re.exec(md); if (!m) return null;
  const nextRe = /^[ \t]*(?:\*\*)?[ \t]*9[ \t]*\.[ \t]*/gm;
  nextRe.lastIndex = m.index + m[0].length;
  const n = nextRe.exec(md);
  return { full: md.slice(m.index, n ? n.index : md.length), body: md.slice(m.index + m[0].length, n ? n.index : md.length) };
}

let A = 0, B = 0, C = 0, Dd = 0, E = 0;
const per = [];
for (const id of ids) {
  const b = block(readFileSync(join(SPECS, id + '.md'), 'utf8'));
  if (!b) continue;
  const v = {
    id,
    fullTrim: b.full.trim().length,
    fullRaw: b.full.length,
    bodyTrim: b.body.trim().length,
    decFull: dec(b.full).length,
    decBody: dec(b.body).length,
  };
  A += v.fullTrim; B += v.fullRaw; C += v.bodyTrim; Dd += v.decFull; E += v.decBody;
  per.push(v);
}
console.log('口径                         30 案合计   vs 11,220   vs 26,096');
const show = (name, val) => console.log(name.padEnd(28) + String(val).padStart(8) + '   ' + String(val - 11220).padStart(9) + '   ' + String(val - 26096).padStart(10));
show('full.trim().length', A);
show('full.length（含尾空行）', B);
show('body.trim().length', C);
show('dec(full).length', Dd);
show('dec(body).length', E);
console.log('');
console.log('★ 精确命中 11,220 的口径：' + [[ 'full.trim()', A ], [ 'full', B ], [ 'body.trim()', C ], [ 'dec(full)', Dd ], [ 'dec(body)', E ]].filter(([, v]) => v === 11220).map(([k]) => k).join(', ') || '无');
console.log('★ 精确命中 26,096 的口径：无（_rt_p5 / _rt_p13 已穷举 11 种）');
console.log('');
console.log('最接近 11,220 的：' + [['full.trim()', A], ['full', B], ['body.trim()', C], ['dec(full)', Dd], ['dec(body)', E]]
  .sort((a, b) => Math.abs(a[1] - 11220) - Math.abs(b[1] - 11220))
  .slice(0, 3).map(([k, v]) => `${k}=${v}（差 ${v - 11220}）`).join('｜'));
console.log('');
console.log('逐案 full.trim() vs Lead 张1：');
const lead = { S01:315,S02:362,S03:319,S04:299,S05:303,S06:315,S07:336,S08:311,S09:314,S10:297,S11:401,S12:314,S13:828,S14:363,S15:337,S16:340,S17:325,S18:386,S19:345,S20:370,S21:350,S22:390,S23:320,S24:436,S25:382,S26:416,S27:421,S28:422,S29:436,S30:467 };
let mismatch = [];
for (const v of per) { const L = lead[v.id]; if (L !== v.fullTrim) mismatch.push(`${v.id} lead=${L} actual=${v.fullTrim}`); }
console.log(mismatch.length ? mismatch.join('\n') : '  逐案全部吻合 ⇒ Lead 的「11,220」口径 = **字段 8 原文块（含标题行、trim 掉尾空行），未做 dec()**');
