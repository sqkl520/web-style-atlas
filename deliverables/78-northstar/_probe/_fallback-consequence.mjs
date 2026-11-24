/* 判据 A 的实际后果：链末缺通用族，到底会不会换字？
 *
 * 【为什么要单独测这个】
 * A6 做过一个受控实验，结论是「把链从 2 加到 4，渲染一像素没变」。
 * 但那个实验测的是**加长实名族**，不是**加通用族终止符**。这两件事在 CSS 里不同：
 *
 *   font-family: "A", "B"            ← 全是实名族，浏览器找不到就落到"默认字体"
 *   font-family: "A", "B", serif     ← 有终止符，浏览器按 serif 的默认映射选
 *
 * 区别在于「落到默认字体」和「落到 serif 类默认」——对中文页面，前者通常是
 * 浏览器默认无衬线（Noto Sans SC / 微软雅黑），后者是衬线（SimSun）。
 *
 * 所以：如果链末缺通用族会导致「该是衬线的地方画成无衬线」，那判据 A 就是真缺陷，
 * 而且它的后果**可测、不需要概率**。
 *
 * 【做法】
 * 拿真实的 10 份踩线产物，对每份取它的 h1 声明链，做两个臂：
 *   A 原样（链末无通用族）
 *   B 加一个正确的通用族（按链上实名族的类别推断）
 * 用 blocked 口径渲染（阻断外部字体，结果可复现），比对实际渲染的族。
 */
import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const BT = join(resolve(HERE, '..'), '_blindtest');

/* 踩线清单（来自 _font-fallback-chain.mjs 的输出） */
const OFFENDERS = [
  ['S01', 'Noto Sans SC, Source Han Sans SC'],
  ['S05', 'Glow Sans SC'],
  ['S09', 'LXGW Marker Gothic, Syne'],
  ['S09-r2', 'LXGW Marker Gothic, Syne'],
  ['S19', 'Noto Serif SC, Georgia'],
  ['S21', 'WenJin Mincho, Georgia, Songti SC, STSong'],
  ['S22-r2', 'Zhuque Fangsong, Petrona, Georgia'],
  ['S29', 'Noto Sans SC'],
  ['S31', 'Noto Serif SC, Literata, Georgia'],
  ['S34-r2', 'Noto Serif SC, Literata, Georgia'],
];

/* 按链上族的语义推断该补哪个通用族。
 *
 * ⚠️ 第一版只看**链首族**：`/serif/i.test(first)`。这错得很严重 ——
 * S21 的链是 `WenJin Mincho, Georgia, Songti SC, STSong`，首族 `WenJin Mincho`
 * （文津宋体）是**衬线**，但名字里没有 "serif" 这个词，于是被判成 sans-serif，
 * 补了等于没补，渲染当然不变。S22-r2 的 `Zhuque Fangsong`（朱雀仿宋）同理。
 *
 * 是 A5（修法反例猎手）抓出来的：真实结果是 5/10 不是 3/10，
 * 而那两份**恰好都是收益案** —— 不是「补错一份」，是「补错方向的全都是本该有收益的」。
 *
 * 修法：不只看首族，按**整条链的族名语义**判，并显式列出中文字族的类别。
 * 这个表比第一版准，但仍然不完美（见脚本末尾的说明）——
 * A4 的 V8 是按链尾族精确判定的 64/66，比这里准。 */
const SERIF_HINTS = /\b(Song|Sung|Ming|Mincho|Myeongjo|Batang|Kai|SimSun|STSong|FangSong|Zhuque|WenJin|Songti)\b/i;
const SANS_HINTS = /\b(Glow|Han Sans|YaHei|PingFang|Gothic|Hei|Jost|Inter|Barlow|Antonio|Syne|Archivo|Space Grotesk|Petrona?|Instrument|Saira|Chivo)\b/i;

function guessGeneric(chain) {
  const fams = chain.split(',').map((s) => s.trim().replace(/^["']|["']$/g, ''));
  const joined = fams.join(' ');
  /* 等宽优先 —— 这条第一版是对的 */
  if (/mono|courier|consolas/i.test(joined)) return 'monospace';
  /* 明确的无衬线提示词优先于衬线（Glow Sans SC 里有 "Sans"，比 Song 更精确） */
  if (/sans/i.test(joined)) return 'sans-serif';
  if (SANS_HINTS.test(joined) && !SERIF_HINTS.test(joined)) return 'sans-serif';
  if (SERIF_HINTS.test(joined)) return 'serif';
  if (/serif/i.test(joined)) return 'serif';
  /* 兜底：看链尾 —— A4 的 V8 用这条规则得到 64/66 */
  const last = fams[fams.length - 1] || '';
  return /serif/i.test(last) && !/sans/i.test(last) ? 'serif' : 'sans-serif';
}

/* 生成两个臂的样本 HTML。
 * 用真实产物的 h1 文本，只替换 font-family —— 与 A6 的实验同一个方法。 */
const CHROME = process.env.CHROME_PATH ||
  'C:/Program Files/Google/Chrome/Application/chrome.exe';

function makeHtml(h1Text, decl) {
  return `<!DOCTYPE html><html lang="zh-CN"><head><meta charset="utf-8">
<style>
  body { margin: 0; background: #fff; }
  h1 { font-family: ${decl}; font-size: 48px; line-height: 1.2; }
</style></head><body><h1>${h1Text}</h1></body></html>`;
}

/* 从产物里取 h1 的文本，没有就用一段固定中文 */
function h1TextOf(id) {
  const p = join(BT, id, 'index.html');
  if (!existsSync(p)) return '修鞋配钥匙';
  const h = readFileSync(p, 'utf8');
  const m = h.match(/<h1[^>]*>([\s\S]{0,200}?)<\/h1>/i);
  if (!m) return '修鞋配钥匙';
  const t = m[1].replace(/<[^>]*>/g, '').trim();
  return t || '修鞋配钥匙';
}

const OUT = join(HERE, '_fa-out');
if (!existsSync(OUT)) mkdirSync(OUT, { recursive: true });

const plan = [];
for (const [id, chain] of OFFENDERS) {
  const gen = guessGeneric(chain);
  const text = h1TextOf(id);
  const armA = makeHtml(text, chain);                    // 原样
  const armB = makeHtml(text, chain + ', ' + gen);       // 补终止符
  const fa = join(OUT, `${id}-A.html`);
  const fb = join(OUT, `${id}-B.html`);
  writeFileSync(fa, armA);
  writeFileSync(fb, armB);
  plan.push({ id, chain, gen, text: text.slice(0, 20), armA: fa, armB: fb });
}

writeFileSync(join(OUT, '_plan.json'), JSON.stringify(plan, null, 1));
console.log(`生成 ${plan.length} 组对照（每组 A=原样 / B=补终止符）`);
console.log(`输出目录：${OUT}`);
console.log('');
for (const p of plan) {
  console.log(`  ${p.id.padEnd(9)} 原链 ${p.chain}`);
  console.log(`  ${''.padEnd(9)} 补 ${p.gen}`);
}
console.log('');
console.log('下一步：用 blocked 口径渲染这些文件，比对实际渲染的族。');
console.log(`  MODE=blocked node ${join(HERE, '_fa-render.mjs')}`);
