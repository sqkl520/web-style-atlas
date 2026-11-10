// 裁决 1 实测：提示词真实长度 + audit 与「防退化8条 / risk / reuse」的重叠度
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
import vm from 'node:vm';

const SEL = resolve('prototypes/_selection');
const OUT = resolve('deliverables/65-plan/_v_out');
mkdirSync(OUT, { recursive: true });

function loadCtx() {
  const stubEl = () => ({
    style: {}, classList: { add() {}, remove() {}, toggle() {} },
    addEventListener() {}, appendChild() {}, setAttribute() {}, removeChild() {},
    querySelector: () => null, querySelectorAll: () => [], insertAdjacentHTML() {},
    children: [], textContent: '', innerHTML: '', value: '',
  });
  const doc = {
    createElement: () => stubEl(),
    getElementById: () => stubEl(),
    querySelector: () => stubEl(),
    querySelectorAll: () => [],
    addEventListener() {},
    body: stubEl(),
    documentElement: stubEl(),
    execCommand: () => true,
    fonts: { ready: Promise.resolve() },
  };
  const ctx = { window: {}, document: doc, console, navigator: { clipboard: { writeText: async () => {} } }, setTimeout, clearTimeout };
  ctx.window = ctx;
  ctx.globalThis = ctx;
  vm.createContext(ctx);
  for (const f of ['data.js', 'prompts.js', 'prompt-copy.js']) {
    try {
      vm.runInContext(readFileSync(join(SEL, f), 'utf8'), ctx, { filename: f });
    } catch (e) {
      console.log(`(warn) ${f} 加载时抛错，已忽略尾部 UI 挂载: ${e.message}`);
    }
  }
  return ctx;
}
const ctx = loadCtx();
const SCHEMES = ctx.window.SCHEMES;
const P = ctx.window.STYLE_PROMPTS;
const build = ctx.window.buildStylePrompt;

const prompts = {};
for (const r of SCHEMES) {
  // 与页面同一条调用路径：prompt-copy.js 内部会自己查 window.SCHEMES 取 tone
  prompts[r.id] = build(r.id);
}
const lens = SCHEMES.map((r) => prompts[r.id].length);
console.log('=== 现状提示词长度（buildStylePrompt 真跑）===');
console.log('min', Math.min(...lens), 'max', Math.max(...lens), 'median', lens.slice().sort((a, b) => a - b)[15], 'avg', Math.round(lens.reduce((a, b) => a + b, 0) / 30), 'sum', lens.reduce((a, b) => a + b, 0));

// 投影：在 risk 段之后插入 audit
const riskLine = (d, a) => '';
let proj = {};
const modes = {
  'audit完整': () => (r) => r.audit,
  'audit截220': () => (r) => (r.audit.length > 220 ? r.audit.slice(0, 220) + '…' : r.audit),
  'audit截160': () => (r) => (r.audit.length > 160 ? r.audit.slice(0, 160) + '…' : r.audit),
  'audit截120': () => (r) => (r.audit.length > 120 ? r.audit.slice(0, 120) + '…' : r.audit),
};
const intro = '这一案作者自己交代的「它故意反了什么」（原话）：';
for (const [name, f] of Object.entries(modes)) {
  const sel = f();
  const L = SCHEMES.map((r) => prompts[r.id].length + intro.length + sel(r).length + 1);
  const over = L.filter((x) => x > 1905).length;
  console.log(`${name.padEnd(12)} min=${Math.min(...L)} max=${Math.max(...L)} avg=${Math.round(L.reduce((a,b)=>a+b,0)/30)} 超1905=${over}/30`);
}

// 「跳脱之处」句单独加
const tiao = {};
for (const r of SCHEMES) {
  const m = (r.audit || '').match(/跳脱之处[^。]{0,80}?[。]/);
  tiao[r.id] = m ? m[0] : '';
}
const tLen = Object.values(tiao).filter(Boolean).map((s) => s.length);
console.log('\n=== 「跳脱之处」句 ===');
console.log('有该句的案:', tLen.length, '/30  长度 min', Math.min(...tLen), 'max', Math.max(...tLen), 'avg', Math.round(tLen.reduce((a, b) => a + b, 0) / tLen.length), '合计', tLen.reduce((a, b) => a + b, 0));
const Lt = SCHEMES.map((r) => prompts[r.id].length + (tiao[r.id] ? tiao[r.id].length + 16 : 0));
console.log('加跳脱句后 min', Math.min(...Lt), 'max', Math.max(...Lt), '超1905=', Lt.filter((x) => x > 1905).length, '/30');

// 与 risk 的重合：句子级
const splitSents = (s) => String(s || '').split(/[。；①②③④⑤⑥⑦⑧]/).map((x) => x.trim()).filter((x) => x.length >= 8);
let riskOverlapCases = 0, riskSharedSents = 0, riskTotalSents = 0;
const examples = [];
for (const r of SCHEMES) {
  const a = splitSents(r.audit);
  const b = splitSents(r.risk);
  riskTotalSents += a.length;
  let shared = 0;
  for (const s of a) {
    // 语义重合的近似判据：与 risk 某句共享 >= 12 字的最长公共子串
    for (const t of b) {
      let best = 0;
      for (let len = Math.min(s.length, t.length); len >= 12; len--) {
        let found = false;
        for (let i = 0; i + len <= s.length; i++) {
          if (t.includes(s.slice(i, i + len))) { best = len; found = true; break; }
        }
        if (found) break;
      }
      if (best >= 12) { shared++; break; }
    }
  }
  if (shared) { riskOverlapCases++; riskSharedSents += shared; }
}
console.log('\n=== audit vs risk 句级重合（LCS>=12字）===');
console.log('有重合句的案:', riskOverlapCases, '/30  重合句数:', riskSharedSents, '/ audit 总句数', riskTotalSents, `(${(riskSharedSents / riskTotalSents * 100).toFixed(1)}%)`);

// 与「防退化 8 条」的概念重合
const RULES = [
  ['紫蓝渐变/#6366F1', /紫蓝|蓝紫|#6366F1|光斑|渐变(字|标)/],
  ['圆角卡片+柔和投影', /圆角|柔和投影|shadow|投影|浮起/],
  ['居中大标题+双CTA首屏', /居中|大标题|CTA|首屏/],
  ['三条等宽feature卡片', /等宽.{0,6}卡|三张.{0,6}卡|feature|三列卡|图标.{0,4}标题/],
  ['emoji/iconfont/扁平插画', /emoji|iconfont|插画|图标/],
  ['玻璃拟态', /玻璃|毛玻璃|模糊|backdrop/],
  ['暗底发光字/霓虹/扫描线', /霓虹|发光|扫描线|glow/],
  ['自动轮播/视差/翻转', /轮播|视差|翻转|carousel|parallax/],
];
console.log('\n=== audit 与「防退化 8 条」概念重合（逐案命中数）===');
let ruleHits = 0;
const perRule = RULES.map(([n]) => 0);
for (const r of SCHEMES) {
  RULES.forEach(([n, re], i) => { if (re.test(r.audit || '')) { perRule[i]++; ruleHits++; } });
}
RULES.forEach(([n], i) => console.log(`  ${n.padEnd(24)} 命中 ${perRule[i]}/30 案`));
console.log('  合计命中(案×条):', ruleHits, '/240');
console.log('  与至少 1 条重合的案:', SCHEMES.filter((r) => RULES.some(([, re]) => re.test(r.audit || ''))).length, '/30');

// C- 编号计数
let cRefs = 0, pRefs = 0, rRefs = 0, casesWithC = 0;
for (const r of SCHEMES) {
  const c = (r.audit.match(/C-\d+\.\d+/g) || []).length;
  const p = (r.audit.match(/\bP\d{1,2}\b/g) || []).length;
  const rr = (r.audit.match(/R-\d{2}/g) || []).length;
  if (c) casesWithC++;
  cRefs += c; pRefs += p; rRefs += rr;
}
console.log('\n=== audit 里的规则编号 ===');
console.log('C-x.y 引用', cRefs, '处，覆盖', casesWithC, '/30 案｜P-n', pRefs, '处｜R-nn', rRefs, '处');

// 结构骨架：每条 audit 的开头套话占多少
let metaChars = 0;
for (const r of SCHEMES) {
  const m = r.audit.match(/(它故意反|故意反|反的是)[^—－:：]{0,30}/g);
  if (m) metaChars += m.join('').length;
}
console.log('「它故意反 C-x.y 与 C-z.w」这类元叙述前缀合计约:', metaChars, '字（占', (metaChars / 10539 * 100).toFixed(1) + '%）');

writeFileSync(join(OUT, 'promptlen.json'), JSON.stringify({ lens, prompts, tiao }, null, 2));
console.log('\nwrote _v_out/promptlen.json');
