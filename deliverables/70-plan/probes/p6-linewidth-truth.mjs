/**
 * p6-linewidth-truth.mjs —— 缺陷 4 的根因量化：提示词给的线宽 vs 原型真实画的线宽。
 *
 * 已知（69-audit/PATCH-linewidth.md）：lineWidthVerdict() 只读 style.css，读不到
 * index.html 内联的 SVG `stroke-width="1"`。本探针把这条**量化**，并回答两个新问题：
 *   ① 有多少案，提示词给的档位集合与 CSS+HTML 的真实集合不等？
 *   ② 有多少案，提示词一边说「只用这几级，不要自创第三级」、一边自己给了 >3 档？
 *      （这是自相矛盾，与线宽抽没抽全无关，属于措辞逻辑错误）
 *
 * 只用正则读源文件，不起浏览器 —— 这条判据是纯静态的，复算成本 0.2 秒。
 *
 * 用法：node deliverables/70-plan/probes/p6-linewidth-truth.mjs
 */
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '../../..');
const SEL = join(ROOT, 'prototypes/_selection');

function load() {
  const noop = () => {};
  const stubEl = () => ({ addEventListener: noop, removeEventListener: noop, classList: { add: noop, remove: noop, toggle: noop, contains: () => false }, style: {}, setAttribute: noop, getAttribute: () => null, appendChild: noop, querySelector: () => null, querySelectorAll: () => [], focus: noop, click: noop });
  const s = {
    window: {}, console,
    document: { readyState: 'complete', addEventListener: noop, removeEventListener: noop, querySelector: () => null, querySelectorAll: () => [], getElementById: () => null, createElement: stubEl, body: stubEl(), documentElement: stubEl() },
    navigator: { clipboard: { writeText: async () => {} } }, location: { href: 'http://localhost/' },
    localStorage: { getItem: () => null, setItem: noop, removeItem: noop }, setTimeout, clearTimeout,
  };
  s.globalThis = s; s.window = s;
  const c = vm.createContext(s);
  for (const f of ['data.js', 'prompts.js', 'prompt-copy.js']) vm.runInContext(readFileSync(join(SEL, f), 'utf8'), c, { filename: f });
  return s;
}
const sb = load();
const P = sb.window.STYLE_PROMPTS;
const build = sb.window.buildStylePrompt;

/* 与 clean-dna.mjs:452-502 同口径的档位收窄（<1px 全留，≥1px 按 0.5 去重） */
const narrow = (nums) => {
  const list = [...new Set(nums)].sort((a, b) => a - b);
  const fine = list.filter(w => w < 1);
  const coarse = [];
  for (const w of list.filter(w => w >= 1)) if (!coarse.some(c => Math.abs(c - w) < 0.5)) coarse.push(w);
  return fine.concat(coarse).sort((a, b) => a - b);
};

const rows = [];
for (const sch of P.schemes) {
  const id = sch.id;
  const dir = readdirSync(join(ROOT, 'prototypes')).find(d => d.startsWith(id + '-'));
  const css = readFileSync(join(ROOT, 'prototypes', dir, 'style.css'), 'utf8');
  const html = readFileSync(join(ROOT, 'prototypes', dir, 'index.html'), 'utf8');

  /* CSS 侧：border / outline / stroke-width（含 var 展开足够用的情形由 clean-dna 负责，
   * 这里只做"HTML 内联有没有额外档位"这一条，故只取字面 px） */
  const cssW = [];
  for (const m of css.matchAll(/(?:border(?:-(?:top|right|bottom|left))?(?:-width)?|outline(?:-width)?|stroke-width)\s*:\s*([^;}]+)/g)) {
    for (const q of m[1].matchAll(/([\d.]+)px/g)) cssW.push(parseFloat(q[1]));
    if (/stroke-width/i.test(m[0])) { const bare = m[1].match(/^\s*([\d.]+)\s*$/); if (bare) cssW.push(parseFloat(bare[1])); }
  }
  /* HTML 侧：内联 stroke-width="N"（clean-dna 完全读不到） */
  const htmlW = [];
  for (const m of html.matchAll(/stroke-width\s*=\s*["']?\s*([\d.]+)/g)) htmlW.push(parseFloat(m[1]));

  const promptTiers = String(sch.dna.lineWidths).split('、').map(s => parseFloat(s));
  const cssTiers = narrow(cssW);
  const truthTiers = narrow(cssW.concat(htmlW));
  const missing = truthTiers.filter(t => !promptTiers.some(p => Math.abs(p - t) < 1e-9));
  const extra = promptTiers.filter(p => !truthTiers.some(t => Math.abs(t - p) < 1e-9));

  /* ── 未收窄口径（防「自我实现」）─────────────────────────────────────────
   * ⚠ 上面用的 narrow() 就是从 clean-dna.mjs:495-500 抄来的。用它判「提示词是否漏档」
   * 有一个结构性盲区：narrow() 会把 3.6 并进 3.5，于是「提示词写 3.5、真实有 3.6」
   * 被判成一致。**S09 正是这样被我第一版漏掉的**（style.css:402 有 stroke-width: 3.6）。
   * 所以这里再算一遍**不收敛**的原始集合，两个口径都报，取并集为准。 */
  const rawTruth = [...new Set(cssW.concat(htmlW))].sort((a, b) => a - b);
  const rawMissing = rawTruth.filter(t => !promptTiers.some(p => Math.abs(p - t) < 1e-9));

  /* ⚠ 这里刻意**不**用 narrow() 收窄 htmlW：
   * 第一版写成 narrow(htmlW).filter(...)，于是 S25 的 1.2 被并进 1、
   * "HTML 独有档位"漏报成 1/2 而不是 1/1.2/2。S25 与 S09 是同一个盲区。 */
  const htmlOnlyRaw = [...new Set(htmlW)].sort((a, b) => a - b).filter(h => !cssW.some(c => Math.abs(c - h) < 1e-9));

  /* 提示词里的三段线宽表述（机制句 / 硬约束 / 风险段），用于检测互斥。
   * ⚠ 只认**紧邻线宽词**的 px：机制句里 24px / 96px 这类是版面尺寸，不是线宽。
   * 第一版把机制句里所有 px 都当线宽，结果 18/30 "判成互斥" —— 绝大多数是误报
   * （S01 机制句 "24px" 是栏宽）。收紧成「线宽|走线|描边|stroke」前后 12 字内的 px。 */
  const prompt = build(id);
  const mechPx = (() => {
    const m = prompt.match(/这个风格的签名动作：([^\n]+)/);
    if (!m) return [];
    const text = m[1];
    const hits = [];
    for (const kw of text.matchAll(/(线宽|走线|描边|stroke)/gi)) {
      const lo = Math.max(0, kw.index - 12), hi = Math.min(text.length, kw.index + kw[0].length + 12);
      const win = text.slice(lo, hi);
      for (const q of win.matchAll(/([\d.]+)px/g)) hits.push(parseFloat(q[1]));
    }
    return [...new Set(hits)];
  })();

  rows.push({
    id, promptTiers, promptN: promptTiers.length,
    cssTiers, htmlOnlyTiers: htmlOnlyRaw,
    truthTiers, rawTruth, rawMissing,
    missingInPrompt: missing, extraInPrompt: extra,
    contradictionTiers: promptTiers.length > 3,
    mechPx, sharesMechPx: mechPx.some(x => promptTiers.some(t => Math.abs(t - x) < 1e-9)),
  });
}

console.log('=== 线宽：提示词 vs 真实（CSS+HTML）===');
console.log('案   提示词档  真实档  HTML独有档         提示词漏掉的        提示词多出的');
for (const r of rows) {
  const flag = (r.missingInPrompt.length || r.extraInPrompt.length) ? ' ⚠' : '';
  console.log(`${r.id}  ${String(r.promptN).padStart(6)}  ${String(r.truthTiers.length).padStart(5)}  ${(r.htmlOnlyTiers.join(',') || '—').padEnd(16)} ${(r.missingInPrompt.join(',') || '—').padEnd(18)} ${(r.extraInPrompt.join(',') || '—')}${flag}`);
}

const withHtml = rows.filter(r => r.htmlOnlyTiers.length);
const mismatch = rows.filter(r => r.missingInPrompt.length || r.extraInPrompt.length);
const over3 = rows.filter(r => r.contradictionTiers);
const mechConflict = rows.filter(r => r.mechPx.length && !r.sharesMechPx);

console.log(`\n① HTML 内联有 CSS 里没有的档位：${withHtml.length}/30 → ${withHtml.map(r => r.id + '(' + r.htmlOnlyTiers.join('/') + ')').join(' ')}`);
console.log(`② 提示词档位集合 ≠ 真实集合（narrow 口径，保守）：${mismatch.length}/30 → ${mismatch.map(r => r.id).join(' ')}`);
const rawMismatch = rows.filter(r => r.rawMissing.length);
console.log(`②' 提示词档位集合 ≠ 真实集合（原始未收窄口径，权威）：${rawMismatch.length}/30 →`);
for (const r of rawMismatch) console.log(`     ${r.id}  漏 ${r.rawMissing.join(',')}   提示词 ${r.promptTiers.join('/')}   真实原始 ${r.rawTruth.join('/')}`);
console.log(`③ 自己说「不要自创第三级」却给了 >3 档：${over3.length}/30 → ${over3.map(r => r.id + '(' + r.promptN + '档)').join(' ')}`);
console.log(`④ 机制句的 px 与硬约束的线宽档位**完全无交集**：${mechConflict.length}/30 → ${mechConflict.map(r => r.id + ' 机制' + JSON.stringify(r.mechPx) + ' vs 约束' + JSON.stringify(r.promptTiers)).join(' | ') || '无'}`);

writeFileSync(join(HERE, 'p6-linewidth.json'), JSON.stringify({ generatedAt: new Date().toISOString(), rows }, null, 1), 'utf8');
console.log('\n写到 deliverables/70-plan/probes/p6-linewidth.json');
