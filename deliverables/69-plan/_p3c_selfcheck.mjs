// 探针 3c：选项 d（提示词自洽性）到底有多"能判"？把全部可机械取值的约束做一遍，
// 每个约束给出「提示词声称值 / 原型 CSS 实际值 / 是否一致」，并统计三类判据的信息量：
//   强判据 = 可能不一致（有真值可比、有结构自由度）
//   弱判据 = 由生成器从 CSS 反向抽出，必然一致（自证）
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { loadCtx, ROOT, out } from './_lib.mjs';

const w = loadCtx();
const P = w.STYLE_PROMPTS;
const bp = w.buildStylePrompt;

const stats = {};
const bump = (k, ok) => { stats[k] = stats[k] || { ok: 0, no: 0, details: [] }; ok ? stats[k].ok++ : (stats[k].no++, stats[k].details.push(true)); };

const rows = [];
for (const s of P.schemes) {
  const css = readFileSync(join(ROOT, 'prototypes', s.dir, 'style.css'), 'utf8');
  const html = existsSync(join(ROOT, 'prototypes', s.dir, 'index.html')) ? readFileSync(join(ROOT, 'prototypes', s.dir, 'index.html'), 'utf8') : '';
  const t = bp(s.id, { biz: '', action: '' });
  const L = t.split('\n');
  const get = (re) => (L.find((x) => re.test(x)) || '');

  // 1 圆角
  const radClaim = get(/^3\. 圆角/);
  const claimsZero = /全站一律 0/.test(radClaim);
  const cssRadii = [...css.matchAll(/border-radius\s*:\s*([^;}]+)/g)].map((m) => m[1].trim());
  const nonZero = cssRadii.filter((v) => !/^0(px)?$/.test(v) && v !== '0 0 0 0');
  bump('radius', claimsZero ? nonZero.length === 0 : nonZero.length > 0);

  // 2 阴影
  const shClaim = get(/^4\. 阴影/);
  const cssBoxShadow = [...css.matchAll(/box-shadow\s*:\s*([^;}]+)/g)].map((m) => m[1].trim()).filter((v) => !/^none$/.test(v));
  const outer = cssBoxShadow.filter((v) => !/inset/.test(v));
  const claimsOnlyInset = /只用 inset/.test(shClaim);
  const claimsNone = /^4\. 阴影：无阴影/.test(shClaim);
  bump('shadow', claimsNone ? cssBoxShadow.length === 0 : claimsOnlyInset ? outer.length === 0 : true);

  // 3 线宽
  const lwClaim = (get(/^5\. 线宽只用这几级/) || '').match(/([^：]+)，不要自创/);
  const claimedW = lwClaim ? [...new Set((lwClaim[1].match(/[\d.]+px/g) || []))] : [];
  const cssW = [...new Set([...css.matchAll(/border(?:-[a-z]+)?-width\s*:\s*([\d.]+px)/g)].map((m) => m[1]))];
  const extra = cssW.filter((v) => !claimedW.includes(v));
  bump('lineWidths', extra.length === 0);

  // 4 字体：提示词声称的标题族，是否在 css 里声明
  const fClaim = get(/^2\. 字体/);
  const firstFont = ((fClaim.match(/标题按这个顺序取第一个可用的：([^（]+)/) || [])[1] || (fClaim.match(/标题用 ([^。]+)。/) || [])[1] || (fClaim.match(/全站只用一款字体：([^（]+)/) || [])[1] || '').split('→')[0].trim();
  bump('fontFirst', firstFont ? (css.includes(firstFont) || html.includes(firstFont)) : false);

  // 5 N（minItems）
  const nClaim = +(get(/^1\. 这个版式设计时排了/).match(/排了\s*(\d+)\s*个/) || [])[1];
  bump('count', nClaim === s.minItems);

  // 6 图片数
  const pClaim = +(get(/^4\. 版式里至少要/).match(/至少要\s*(\d+)\s*个/) || [])[1];
  bump('minPics', pClaim === s.minPics);

  // 7 h1 字号（26/30 有该句）
  const h1Claim = (get(/首屏主标题取/) || '').match(/取\s*([^ ]+)\s*这一档/);
  const h1InMech = h1Claim ? h1Claim[1] : null;
  bump('h1Size', h1InMech ? (css.includes(h1InMech.replace(/[()]/g, '')) || css.includes('--fs-h1')) : true);

  rows.push({ id: s.id, radClaim: claimsZero, nonZero: nonZero.length, shClaim: shClaim.slice(0, 30), outer, lwExtra: extra, firstFont, nClaim, minItems: s.minItems });
}
out('=== 选项 d（提示词自洽性）逐类判据的一致率 ===');
for (const [k, v] of Object.entries(stats)) {
  const tot = v.ok + v.no;
  out(`  ${k.padEnd(12)} ${String(v.ok).padStart(2)}/${String(tot).padStart(2)} = ${(v.ok / tot * 100).toFixed(0)}%`);
}
out('\n=== 不一致的案（若有）===');
for (const r of rows) {
  const bad = [];
  if (r.nonZero > 0 && r.radClaim) bad.push(`圆角：声称 0，css 有 ${r.nonZero} 处非零`);
  if (r.outer.length) bad.push(`阴影：css 有 ${r.outer.length} 处非 inset`);
  if (r.lwExtra.length) bad.push(`线宽：css 多出 ${r.lwExtra.join(',')}`);
  if (r.nClaim !== r.minItems) bad.push(`N：提示词 ${r.nClaim} vs minItems ${r.minItems}`);
  if (bad.length) out(`  ${r.id}: ${bad.join('；')}`);
}
out('\n  ⚠️ 关键：这些"一致"之所以成立，是因为**提示词的值本来就是从同一份 CSS 抽出来的**');
out('     （_prompts/extract-dna.mjs 读 style.css，clean-dna.mjs 归一化，build-prompts.mjs 组句）。');
out('     所以选项 d 是**自证**：它只能抓住"抽取器与渲染器不同步"，抓不住"AI 照提示词会做成什么样"。');
