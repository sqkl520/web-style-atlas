/* 新问题⑤：palette 的**内容**还驱动着选型向导的「安静度」轴，
 * 而这条轴的结论写进了 README，被 check-docs 的 i18n/facts 断言守着。
 *
 * wizard.js:32-36 loudnessOf(palette) = max(饱和度)；:54-64 用全库 min/max 线性归一到 0..2。
 * README-EN.md 声称「only 2 schemes are 'very quiet'」，README.md 有对应中文句。
 *
 * 于是：改 data.js 的 palette（哪怕只改内容不改长度）会**移动整条轴的归一化端点**，
 * 进而改变向导的排序结果 —— 这是 P3「改一条链会不会连带影响」的一个具体答案。
 *
 *   node deliverables/71-plan/redteam/rt-x5-axis.mjs
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, h1, h2 } from './rt-lib.mjs';

const git = (a) => execFileSync('git', a, { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
const HEAD = git(['rev-parse', 'HEAD']).trim();
const show = (p) => git(['show', `${HEAD}:${p}`]);
const evalWin = (src) => { const w = {}; new Function('window', src)(w); return w; };

const data = evalWin(show('prototypes/_selection/data.js')).SCHEMES;
const prompts = evalWin(show('prototypes/_selection/prompts.js')).STYLE_PROMPTS.schemes;

/* 与 wizard.js:24-36 逐字一致 */
function satOf(hex) {
  const h = String(hex).replace('#', '');
  if (h.length !== 6) return 0;
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
  if (mx === mn) return 0;
  const l = (mx + mn) / 2;
  return l > 0.5 ? (mx - mn) / (2 - mx - mn) : (mx - mn) / (mx + mn);
}
function loudnessOf(palette) {
  let best = 0;
  for (const h of (palette || [])) { const s = satOf(h); if (s > best) best = s; }
  return best;
}
const hexes = (s) => [...String(s).matchAll(/#([0-9A-Fa-f]{6})(?![0-9A-Fa-f])/g)].map((m) => m[0].toUpperCase());

function axis(cases) {
  const raw = cases.map((c) => loudnessOf(c.palette));
  const mn = Math.min(...raw), mx = Math.max(...raw);
  const norm = raw.map((v) => (mx === mn ? 1 : (v - mn) / (mx - mn) * 2));
  return { raw, norm, mn, mx };
}

const A = axis(data.map((s) => ({ id: s.id, palette: s.palette })));
const B = axis(prompts.map((s) => ({ id: s.id, palette: hexes((s.dna || {}).palette) })));

h1('「安静度」轴：数据源换一条链，结论会不会变？');
console.log('口径来自 wizard.js:32-36 + :54-64（max 饱和度，全库 min/max 线性归一到 0..2）\n');

const ids = data.map((s) => s.id);
console.log('案     data.js loud → norm   prompts loud → norm   norm 变化');
console.log('─'.repeat(78));
const moved = [];
for (let i = 0; i < ids.length; i++) {
  const dn = A.norm[i], pn = B.norm[i];
  const d = pn - dn;
  if (Math.abs(d) > 0.05) moved.push({ id: ids[i], dn, pn, d });
  console.log(`${ids[i]}   ${A.raw[i].toFixed(4)} → ${dn.toFixed(3)}      ${B.raw[i].toFixed(4)} → ${pn.toFixed(3)}      ${d >= 0 ? '+' : ''}${d.toFixed(3)}`);
}

h2('「very quiet」= norm < 0.2（README-EN 声称 only 2）');
const qa = ids.filter((_, i) => A.norm[i] < 0.2);
const qb = ids.filter((_, i) => B.norm[i] < 0.2);
console.log(`data.js 口径 : ${qa.length} 案  ${qa.join(' ')}`);
console.log(`prompts 口径 : ${qb.length} 案  ${qb.join(' ')}`);
console.log(`一致？${JSON.stringify(qa) === JSON.stringify(qb) ? 'YES' : 'NO'}`);

h2('归一化端点（换数据源后端点的位置会动）');
console.log(`data.js : min=${A.mn.toFixed(4)}  max=${A.mx.toFixed(4)}`);
console.log(`prompts : min=${B.mn.toFixed(4)}  max=${B.mx.toFixed(4)}`);
const argminA = ids[A.raw.indexOf(A.mn)], argminB = ids[B.raw.indexOf(B.mn)];
const argmaxA = ids[A.raw.indexOf(A.mx)], argmaxB = ids[B.raw.indexOf(B.mx)];
console.log(`最小值案  data=${argminA}  prompts=${argminB}`);
console.log(`最大值案  data=${argmaxA}  prompts=${argmaxB}`);

h2('判定（实测推翻了我的假设）');
console.log(`norm 移动 >0.05 的案：${moved.length}/30 —— ${moved.length ? moved.map((m) => m.id).join(' ') : '无'}`);
console.log(`「very quiet 2 案」两条链口径一致：${JSON.stringify(qa) === JSON.stringify(qb) ? 'YES' : 'NO'}（都是 ${qa.join(' ')}）`);
console.log('');
console.log('结论是**否定**的：换 palette 数据源**不会**推翻 README 的「only 2 schemes are very quiet」。');
console.log('原因：loudness 取 max 饱和度，而 7 色是 4 色的超集，max 几乎不变；');
console.log('最小端点 S15(0.1169) 与最大端点(1.0000 vs 0.9608) 都贴近 0/1，归一化对端点不敏感。');
console.log('');
console.log('⇒ 这条**不是** P3 依赖图上的断裂边。我原本假设"改 palette 会连带改 README 数字"，');
console.log('   30 案实测不支持这个假设，撤回。');
