/**
 * p5-fix-sim.mjs —— 三种修法对 30 条提示词的**影响面与体积**，全部在内存里模拟，不写任何 tracked 文件。
 *
 * 为什么必须先模拟再动手：改动点都在生成链上，而生成链一跑就会重写
 * `dna-raw.json` / `dna-clean.json` / `prompts.js` 三个 tracked 文件（实测见 p4-repro.mjs）。
 * 所以"这个修法会让提示词变长多少、会动几条"必须在不落盘的前提下先算出来，
 * 否则计划里的成本估算就是猜的。
 *
 * 模拟的三个修法（对应计划 §3 的方案 A/B/C）：
 *   A  调色板：把 p3 判出的 MISSING 骨架色补进 palette（上限从 7 放宽到 9），其余不动
 *   B  字号：把 h1Size 从死分支挪到硬约束段，改成「h1 桌面实测值 + h1/正文比」两句
 *   C  配比：给 palette 每色附上 p1 实测的墨迹/像素占比，写成「谁多谁少」
 *
 * 对每个修法输出：影响案数、总字数 delta（min/median/max）、是否越 README 承诺的 1639–1998 区间。
 *
 * 用法：node deliverables/70-plan/probes/p5-fix-sim.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '../../..');
const SEL = join(ROOT, 'prototypes/_selection');

const p1 = JSON.parse(readFileSync(join(HERE, 'p1-all30.json'), 'utf8'));
const p2 = JSON.parse(readFileSync(join(HERE, 'p2-all30.json'), 'utf8'));
const p3 = JSON.parse(readFileSync(join(HERE, 'p3-deltae.json'), 'utf8'));

/* 与 check-docs.mjs:376-395 完全同一条装载路径 */
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
const build = sb.window.buildStylePrompt;
const P = sb.window.STYLE_PROMPTS;

const ids = P.schemes.map(x => x.id);
const base = Object.fromEntries(ids.map(id => [id, build(id).length]));

const med = (a) => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
const stat = (lens) => ({ min: Math.min(...lens), max: Math.max(...lens), median: med(lens) });

console.log('=== 现状基线（与 check-docs nums/prompt-len 同口径）===');
const b = stat(Object.values(base));
console.log(`  提示词长度 ${b.min}–${b.max}，中位 ${b.median}`);

/* ── 方案 A：补骨架色进 palette ─────────────────────────────────────────── */
const A_affected = [];
for (const r of p3.rows) {
  if (!r.missing.length) continue;
  const sch = P.schemes.find(s => s.id === r.id);
  const before = sch.dna.palette;
  const extra = r.missing.map(m => m.hex).filter(h => !before.includes(h));
  sch.dna.palette = before + extra.map(h => '、' + h).join('');
  A_affected.push({ id: r.id, added: extra.length, delta: build(r.id).length - base[r.id] });
}
const aLens = ids.map(id => build(id).length);
const a = stat(aLens);
console.log('\n=== 方案 A：把 MISSING 骨架色补进调色板 ===');
console.log(`  影响 ${A_affected.length} 案：${A_affected.map(x => x.id + '(+' + x.added + '色/+' + x.delta + '字)').join(' ')}`);
console.log(`  长度 ${a.min}–${a.max}，中位 ${a.median}（Δ中位 ${a.median - b.median}，Δmax ${a.max - b.max}）`);

/* ── 方案 B：字号进硬约束段 ───────────────────────────────────────────── */
/* 模拟的是 buildStylePrompt 里新增一句、以及把 h1Size 从死分支解救出来的效果。
 * 这里用字符串后处理模拟（等价于在 prompt-copy.js 的硬约束段插一行），因为
 * 真实改动要动 prompt-copy.js，本轮只读、不能改。 */
const typeOf = Object.fromEntries(p2.rows.map(r => [r.id, r]));
const simB = (prompt, id) => {
  const t = typeOf[id];
  if (!t) return prompt;
  const line = `\n6. 字号层级：首屏主标题桌面端 ${t.h1fs}px，正文 ${t.bodyFs}px（标题是正文的 ${(t.h1fs / t.bodyFs).toFixed(1)} 倍）；全站只用 ${t.tierN} 档字号，不要自创第四档。`;
  return prompt.replace('5. 线宽只用这几级：', line.trim() + '\n5. 线宽只用这几级：');
};
const B_affected = ids.map(id => ({ id, delta: simB(build(id), id).length - base[id] }));
const bLens = ids.map(id => base[id] + B_affected.find(x => x.id === id).delta);
const bb = stat(bLens);
console.log('\n=== 方案 B：字号层级进硬约束（h1 实测 px + 倍率 + 档数）===');
console.log(`  影响 ${B_affected.length}/30 案，每条 +${Math.min(...B_affected.map(x => x.delta))}–${Math.max(...B_affected.map(x => x.delta))} 字`);
console.log(`  长度 ${bb.min}–${bb.max}，中位 ${bb.median}（Δ中位 ${bb.median - b.median}，Δmax ${bb.max - b.max}）`);

/* ── 方案 C：配比进调色板 ─────────────────────────────────────────────── */
const shareOf = Object.fromEntries(p1.rows.map(r => [r.id, Object.fromEntries(r.detail.map(d => [d.hex, { px: d.exactShare, ink: d.inkShare }]))]));
const simC = (prompt, id) => {
  // 把「配色只用这几个值：A、B、C」改成带占比的写法，只对占比 ≥3% 的色标注
  const sh = shareOf[id] || {};
  return prompt.replace(/(1\. 配色只用这几个值：)([^。]+)(。)/, (all, pre, list, post) => {
    const parts = list.split('、').map(s => {
      const hex = (s.match(/#[0-9A-Fa-f]{6}/) || [''])[0].toUpperCase();
      const v = sh[hex];
      if (!v) return s;
      const pct = Math.max(v.px, v.ink);
      return pct >= 3 ? `${s} 约 ${Math.round(pct)}%` : s;
    });
    return pre + parts.join('、') + post;
  });
};
const C_affected = ids.map(id => ({ id, delta: simC(build(id), id).length - base[id] }));
const cLens = ids.map(id => base[id] + C_affected.find(x => x.id === id).delta);
const cc = stat(cLens);
console.log('\n=== 方案 C：调色板附实测占比 ===');
console.log(`  影响 ${C_affected.length}/30 案，每条 +${Math.min(...C_affected.map(x => x.delta))}–${Math.max(...C_affected.map(x => x.delta))} 字`);
console.log(`  长度 ${cc.min}–${cc.max}，中位 ${cc.median}（Δ中位 ${cc.median - b.median}，Δmax ${cc.max - b.max}）`);

/* ── A+B+C 合并 ──────────────────────────────────────────────────────── */
const comboLens = ids.map(id => simB(build(id), id).length + (A_affected.find(x => x.id === id)?.delta || 0) + (C_affected.find(x => x.id === id)?.delta || 0));
const cd = stat(comboLens);
console.log('\n=== A+B+C 合并 ===');
console.log(`  长度 ${cd.min}–${cd.max}，中位 ${cd.median}（Δ中位 ${cd.median - b.median}，Δmax ${cd.max - b.max}）`);

/* ── 越界判定：README 承诺 1639–1998（check-docs DRIFT=3%）────────────── */
const DOC = { min: 1639, max: 1998, median: 1829 };
const near = (doc, act) => Math.abs(doc - act) / act <= 0.03;
const judge = (label, s) => {
  const out = [];
  if (!near(DOC.min, s.min)) out.push(`下限 ${DOC.min}→${s.min} (${((s.min - DOC.min) / DOC.min * 100).toFixed(1)}%)`);
  if (!near(DOC.max, s.max)) out.push(`上限 ${DOC.max}→${s.max} (${((s.max - DOC.max) / DOC.max * 100).toFixed(1)}%)`);
  if (!near(DOC.median, s.median)) out.push(`中位 ${DOC.median}→${s.median} (${((s.median - DOC.median) / DOC.median * 100).toFixed(1)}%)`);
  console.log(`  ${label}: ${out.length ? 'README 需同步改 —— ' + out.join('；') : 'README 仍成立 ✅'}`);
};
console.log('\n=== README「1639–1998 字（中位 1829）」是否还成立（容差 3%）===');
judge('方案 A  ', a); judge('方案 B  ', bb); judge('方案 C  ', cc); judge('A+B+C  ', cd);

writeFileSync(join(HERE, 'p5-fix-sim.json'), JSON.stringify({
  generatedAt: new Date().toISOString(),
  baseline: { ...b, perCase: base },
  A: { ...a, affected: A_affected }, B: { ...bb, affected: B_affected }, C: { ...cc, affected: C_affected },
  combo: cd, docClaim: DOC,
}, null, 1), 'utf8');
console.log('\n写到 deliverables/70-plan/probes/p5-fix-sim.json');
