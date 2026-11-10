// 裁决 1 终局：「跳脱之处」 vs 已有机制句的 3-gram 重合率（中文短句适用的近似）
import { readFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import vm from 'node:vm';
const SEL = resolve('prototypes/_selection');
function loadCtx() {
  const stub = () => ({ style: {}, classList: { add() {}, remove() {} }, addEventListener() {}, appendChild() {},
    querySelector: () => null, querySelectorAll: () => [], children: [], textContent: '', innerHTML: '' });
  const doc = { createElement: () => stub(), getElementById: () => stub(), querySelector: () => stub(),
    querySelectorAll: () => [], addEventListener() {}, body: stub() };
  const ctx = { window: {}, document: doc, console, navigator: { clipboard: { writeText: async () => {} } } };
  ctx.window = ctx; ctx.globalThis = ctx; vm.createContext(ctx);
  for (const f of ['data.js', 'prompts.js', 'prompt-copy.js']) { try { vm.runInContext(readFileSync(join(SEL, f), 'utf8'), ctx, { filename: f }); } catch {} }
  return ctx;
}
const ctx = loadCtx();
const J = ctx.window.STYLE_PROMPTS, S = ctx.window.SCHEMES;
const getTiao = (a) => { const m = a.match(/跳脱之处(?:是|在于)?[：:]?\s*([^。]{4,60}?)。/); return m ? m[1].trim() : ''; };

// 内容词表：把「语义单元」抽出来（中文 2-gram + 数字/单位 + ASCII 词）
const toks = (s) => {
  const t = new Set();
  const clean = String(s).toLowerCase();
  for (const m of clean.matchAll(/[a-z][a-z0-9.:%-]{1,}|#?[0-9]+(?:\.[0-9]+)?(?:px|°|%|mm|ms|em)?/g)) t.add(m[0]);
  // 中文 2-gram（跳过标点）
  const zh = clean.replace(/[^\u4e00-\u9fa5]/g, '');
  for (let i = 0; i + 2 <= zh.length; i++) t.add(zh.slice(i, i + 2));
  return t;
};
const jac = (a, b) => { const A = toks(a), B = toks(b); let inter = 0; for (const x of A) if (B.has(x)) inter++; return { j: inter / (A.size + B.size - inter), inter, na: A.size, nb: B.size }; };

console.log('=== 跳脱句 vs 机制句：2-gram Jaccard ===');
const rows = [];
for (const r of S) {
  const s = J.schemes.find((x) => x.id === r.id);
  const mech = (s.dna && s.dna.mechanism) || '';
  const t = getTiao(r.audit || '');
  if (!t) continue;
  const { j, inter } = jac(t, mech);
  rows.push({ id: r.id, j, inter, t, mech });
}
rows.sort((a, b) => b.j - a.j);
for (const x of rows) console.log(`  ${x.id} J=${x.j.toFixed(3)} 共享${x.j >= 0.25 ? '★' : ' '}`);
const js = rows.map((x) => x.j);
console.log(`\nJaccard: min ${Math.min(...js).toFixed(3)} p50 ${js[Math.floor(js.length/2)].toFixed(3)} max ${Math.max(...js).toFixed(3)} mean ${(js.reduce((a,b)=>a+b,0)/js.length).toFixed(3)}`);
console.log(`J>=0.25 的案: ${js.filter((x) => x >= 0.25).length}/${rows.length}`);
console.log(`J>=0.15 的案: ${js.filter((x) => x >= 0.15).length}/${rows.length}`);

// 对照基线：两个不相干的中文句子 Jaccard 是多少？
const c1 = '这个版式的硬前提是任何没有多版本信息的项目套上去三层就变成无意义的装饰';
const c2 = '字符编码必须使用 UTF-8 并且不要引入任何外部依赖';
console.log(`\n对照（无关句）J=${jac(c1, c2).j.toFixed(3)}`);
const c3 = '一块实色多边形以 11° 切入 4 栏版心，阅读顺序由角度与越界量决定';
const c4 = '阅读起点由红色楔形切出来，用户第一眼看的是被压住的那 3 行';
console.log(`对照（S01 机制 vs S01 跳脱）J=${jac(c3, c4).j.toFixed(3)}`);
