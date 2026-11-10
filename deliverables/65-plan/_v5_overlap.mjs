// 裁决 1 关键：audit 的「正面动作」是不是已经被提示词的「视觉硬约束」说过一遍了？
import { readFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import vm from 'node:vm';

const SEL = resolve('prototypes/_selection');
function loadCtx() {
  const stubEl = () => ({ style: {}, classList: { add() {}, remove() {} }, addEventListener() {}, appendChild() {},
    querySelector: () => null, querySelectorAll: () => [], children: [], textContent: '', innerHTML: '' });
  const doc = { createElement: () => stubEl(), getElementById: () => stubEl(), querySelector: () => stubEl(),
    querySelectorAll: () => [], addEventListener() {}, body: stubEl() };
  const ctx = { window: {}, document: doc, console, navigator: { clipboard: { writeText: async () => {} } } };
  ctx.window = ctx; ctx.globalThis = ctx;
  vm.createContext(ctx);
  for (const f of ['data.js', 'prompts.js', 'prompt-copy.js']) {
    try { vm.runInContext(readFileSync(join(SEL, f), 'utf8'), ctx, { filename: f }); } catch {}
  }
  return ctx;
}
const ctx = loadCtx();
const SCHEMES = ctx.window.SCHEMES;
const build = ctx.window.buildStylePrompt;
const PL = JSON.parse(readFileSync(resolve('deliverables/65-plan/_v_out/promptlen.json'), 'utf8'));
const prompts = PL.prompts;

// audit 每条拆成「反 X」（元+禁令）与「而是/跳脱」（正面动作）
const splitItems = (a) => {
  if (/[①②③④⑤⑥⑦⑧]/.test(a)) return a.split(/(?=[①②③④⑤⑥⑦⑧])/).map(s=>s.replace(/^[①②③④⑤⑥⑦⑧]\s*/,'').trim()).filter(Boolean);
  if (/（\d）/.test(a)) return a.split(/(?=（\d）)/).map(s=>s.replace(/^（\d）\s*/,'').trim()).filter(Boolean);
  if (/第[一二三四五六]，/.test(a)) return a.split(/(?=第[一二三四五六]，)/).map(s=>s.replace(/^第[一二三四五六]，\s*/,'').trim()).filter(Boolean);
  return [a];
};

// 提示词「视觉硬约束」已覆盖的三件事的关键词
const COVER = [
  { k: 'radius', re: /圆角|border-radius|直角|方角/ },
  { k: 'shadow', re: /投影|阴影|shadow|浮起/ },
  { k: 'palette', re: /#(?:[0-9A-Fa-f]{6})|配色|底色|纯色/ },
  { k: 'font', re: /字体|衬线|字号|字重|font/ },
];

let totItems = 0, covItems = 0;
const perKey = { radius: 0, shadow: 0, palette: 0, font: 0 };
const auditTotalChars = 0;
let negChars = 0, posChars = 0;
for (const r of SCHEMES) {
  for (const it of splitItems(r.audit || '')) {
    totItems++;
    let hit = false;
    for (const { k, re } of COVER) if (re.test(it)) { perKey[k]++; hit = true; }
    if (hit) covItems++;
    // 分「反 X」与「而是/跳脱」
    const m = it.match(/(?:——|：|→|:)\s*(.*)$/s);
    if (m) { negChars += it.length - m[1].length; posChars += m[1].length; }
    else { negChars += it.length; }
  }
}
console.log('=== audit 条目数 / 与提示词「视觉硬约束」同话题的比例 ===');
console.log('条目总数:', totItems);
console.log('涉及圆角/阴影/配色/字体任一:', covItems, `(${(covItems/totItems*100).toFixed(1)}%)`);
for (const k of Object.keys(perKey)) console.log(`  ${k.padEnd(8)} ${perKey[k]} 条 (${(perKey[k]/totItems*100).toFixed(1)}%)`);
console.log('\n「反 X」前缀字符合计:', negChars, '｜「而是/跳脱」正面动作字符合计:', posChars, `(正面占 ${(posChars/(negChars+posChars)*100).toFixed(1)}%)`);

// 逐案：提示词里 radius/shadow 行的原文 vs audit 里同话题句
console.log('\n=== 逐案对照：提示词已说的 vs audit 重说的（3 案）===');
for (const id of ['S01','S13','S28']) {
  const r = SCHEMES.find(x=>x.id===id);
  const p = prompts[id];
  const l3 = p.split('\n').find((x)=>x.startsWith('3. 圆角'));
  const l4 = p.split('\n').find((x)=>x.startsWith('4. 阴影'));
  const l1 = p.split('\n').find((x)=>x.startsWith('1. 配色'));
  console.log(`\n[${id}]`);
  console.log('  提示词 1: ' + l1);
  console.log('  提示词 3: ' + l3);
  console.log('  提示词 4: ' + l4);
  const rad = splitItems(r.audit).find((it)=>/圆角|直角|投影|阴影/.test(it));
  console.log('  audit 同话题: ' + (rad||'（无）').slice(0,120));
}

// 去重后新增信息：把 audit 里与「视觉硬约束」同话题的条目全部剔除，剩多少
console.log('\n=== 若剔除「圆角/阴影/配色/字体」同话题条目，audit 还剩多少 ===');
let kept = 0, keptNonEmpty = 0;
const keptVals = [];
for (const r of SCHEMES) {
  const items = splitItems(r.audit || '').filter((it) => !COVER.some(({re})=>re.test(it)));
  const v = items.join('；');
  kept += v.length;
  if (v) keptNonEmpty++;
  keptVals.push(v.length);
}
console.log('保留案数:', keptNonEmpty, '/30  合计字数:', kept, '← 原', 10539, `（减少 ${(100-kept/10539*100).toFixed(1)}%）`);
const pl = PL.lens;
const proj = keptVals.map((v,i)=>pl[i]+16+v);
console.log('剔除后投影提示词: min', Math.min(...proj), 'max', Math.max(...proj), 'avg', Math.round(proj.reduce((a,b)=>a+b,0)/30), '超1905', proj.filter(x=>x>1905).length, '/30');
