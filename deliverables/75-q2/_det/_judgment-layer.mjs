import { readFileSync } from 'node:fs';
import vm from 'node:vm';
const ctx = { window: {} }; vm.createContext(ctx);
vm.runInContext(readFileSync('prototypes/_selection/data.js', 'utf8'), ctx);
const S = ctx.window.SCHEMES;

// 详情面板实际渲染的 12 段（app.js:1380-1432 的渲染顺序）
const ORDER = [
  ['def', '一句话视觉定义'], ['family', '美学家族与参考'], ['palette', '当前有效配色'],
  ['fontsSpec', '字体策略'], ['layout', '布局与网格'], ['landing', '可落地要点'],
  ['visuals', '关键视觉元素'], ['motion', '动效与交互'], ['audit', '去 AI 味审查点'],
  ['risk', '反 AI 味风险与规避'], ['scenes', '适用场景'], ['scenesNo', '不适合的场景'],
  ['quirk', '设计师签名式怪癖'],
];
const val = (r, k) => (k === 'palette' ? (r.palette || []).join(' ') : (r[k] || ''));
const len = (r, k) => val(r, k).length;

console.log('=== 12 段各自长度（30 案）===');
console.log('段名              最短  中位  最长   累计中位');
let acc = 0;
const meds = {};
for (const [k, name] of ORDER) {
  const L = S.map((r) => len(r, k)).sort((a, b) => a - b);
  meds[k] = L[15]; acc += L[15];
  console.log(name.padEnd(16), String(L[0]).padStart(5), String(L[15]).padStart(5), String(L[29]).padStart(5), String(acc).padStart(9));
}
console.log('\n12 段合计中位:', acc, '字');

// 「这是不是我的店」需要的段：def（是什么）+ scenes（适合谁）+ scenesNo（不适合谁）+ risk（照抄会踩什么）
const JUDGE = ['def', 'scenes', 'scenesNo', 'risk'];
console.log('\n=== 候选判决层组合 ===');
const combos = [
  ['def + scenes + scenesNo', ['def', 'scenes', 'scenesNo']],
  ['def + scenes + scenesNo + risk', JUDGE],
  ['def + scenes', ['def', 'scenes']],
  ['def + scenes + scenesNo + quirk', ['def', 'scenes', 'scenesNo', 'quirk']],
];
for (const [name, keys] of combos) {
  const t = S.map((r) => keys.reduce((a, k) => a + len(r, k), 0)).sort((a, b) => a - b);
  const over180 = t.filter((v) => v > 180).length;
  console.log(name.padEnd(34), '最短', String(t[0]).padStart(4), '中位', String(t[15]).padStart(4), '最长', String(t[29]).padStart(4), ' 超180字:', over180 + '/30');
}

// 「≤180 字」这个预算到底能装下什么
console.log('\n=== ≤180 字预算能装下哪几段（以中位计）===');
let sum = 0; const fits = [];
for (const [k, name] of ORDER) { if (sum + meds[k] <= 180) { sum += meds[k]; fits.push(name + '(' + meds[k] + ')'); } }
console.log(fits.join(' + '), '=', sum, '字');

// 首屏：判决层要能在面板里不滚动就看见。面板视口 900px，一屏约多少字？
console.log('\n=== 180 字在面板里占多少高度（估）===');
console.log('按 15px/1.75 行高 = 26.25px/行，面板宽 517px ≈ 每行 34 个汉字 → 180 字 ≈ 5.3 行 ≈ 139px');
console.log('加上段标题与 padding（每段约 24px）→ 约 190–210px。面板视口 900px，够。');

// 「这是不是我的店」这个问题的判定信息量：def 讲形态、scenes 讲行业、scenesNo 讲反向
console.log('\n=== 判决层能否回答「这是不是我的店」===');
console.log('- def 回答「长什么样」（71–115 字）');
console.log('- scenes 回答「哪个行当能用」（60–174 字）');
console.log('- scenesNo 回答「哪个行当不能用」（负向，比正向更硬）');
console.log('- risk 回答「照抄会踩什么」（124–331 字，施工向，不是判决向）');
const d3 = S.map((r) => len(r, 'def') + len(r, 'scenes') + len(r, 'scenesNo'));
console.log('→ def+scenes+scenesNo 三段的 30 案区间:', Math.min(...d3), '–', Math.max(...d3), '字，中位', d3.sort((a,b)=>a-b)[15]);
