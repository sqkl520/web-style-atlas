/* 复算 prompts.js banner 里的三条颜色断言。
 *
 * 这份脚本存在的理由：banner 曾有三句话全过时，其中一句**说反了**
 * （「palette[0] 是纸色/底色，不是强调色」——实测 0/9 成立，palette[0] 恰恰是强调色）。
 * 而 banner 正是写给「下一个改配色逻辑的人」看的。
 * 所以给它配一个能随时重跑的复算脚本，别再靠人记。
 *
 * 用法：node deliverables/78-northstar/_probe/_banner-check.mjs
 */
import { readFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');

const load = (rel, key) => {
  const c = { window: {} };
  vm.createContext(c);
  vm.runInContext(readFileSync(join(ROOT, rel), 'utf8'), c);
  const v = c.window[key];
  if (v === undefined) throw new Error(`${rel} 里没有 window.${key}`);
  return v;
};

const P = load('prototypes/_selection/prompts.js', 'STYLE_PROMPTS').schemes;
const W = load('prototypes/_selection/data.js', 'SCHEMES');

let bad = 0;
const check = (label, claimed, actual, ok) => {
  const mark = ok ? '✓' : '✗';
  console.log(`  ${mark} ${label}`);
  console.log(`      声称 ${claimed}  |  实测 ${actual}`);
  if (!ok) bad++;
};

console.log('prompts.js banner 的三条断言复算\n');

/* ① 最多几色 */
const counts = P.map((s) => ((s.dna.palette || '').split('、').filter(Boolean).length));
const maxColors = Math.max(...counts);
check('① palette 最多 9 色', '9', String(maxColors), maxColors === 9);

/* ② 案数 */
check('② 全部 35 案', '35', String(P.length), P.length === 35);

/* ③ palette[0] 与底色是否相同 —— 这条 banner 曾**说反过**，是重点。
 *
 * 真相分两段：
 *   · 旧 30 案（S01–S30）：0 案相同，palette[0] 都是强调色
 *   · Q2 新建 5 案：4 案相同（S32 S33 S34 S35），只有 S31 不同
 * 所以不能一概而论成「一律是强调色」或「一律是底色」。
 * banner 现在按这两段分别写，这个脚本就按这两段分别验。 */
const sameAsBg = new Set();
for (const s of P) {
  const w = W.find((x) => x.id === s.id);
  if (!w) continue;
  const m = (s.dna.palette || '').match(/#[0-9A-Fa-f]{6}/);
  if (!m) continue;
  if (w.bg && m[0].toUpperCase() === String(w.bg).toUpperCase()) sameAsBg.add(s.id);
}
const old30 = P.filter((s) => /^S([0-2]\d|30)$/.test(s.id)).map((s) => s.id);
const new5 = P.filter((s) => /^S3[1-5]$/.test(s.id)).map((s) => s.id);
const oldHits = old30.filter((id) => sameAsBg.has(id));
const newHits = new5.filter((id) => sameAsBg.has(id));

check(
  '③a 旧 30 案 palette[0] 都是强调色（与底色不同）',
  '0 案与底色相同',
  `${oldHits.length} 案相同${oldHits.length ? '（' + oldHits.join(' ') + '）' : ''}`,
  oldHits.length === 0
);
check(
  '③b Q2 新 5 案里有 4 案 palette[0] 等于底色',
  '4 案（S32 S33 S34 S35）',
  `${newHits.length} 案（${newHits.join(' ') || '无'}）`,
  newHits.length === 4 && newHits.sort().join(' ') === 'S32 S33 S34 S35'
);

/* 附加：dna.fonts 是否 35/35 有 display+body（banner 另一句） */
const fontOk = P.filter((s) => s.dna?.fonts?.display && s.dna?.fonts?.body).length;
check('[附] dna.fonts 35/35 有 display+body', '35', String(fontOk), fontOk === 35);

console.log(bad === 0 ? '\n全部通过 —— banner 与实测一致。' : `\n${bad} 条不一致 —— banner 需要更新。`);
process.exit(bad === 0 ? 0 : 1);
