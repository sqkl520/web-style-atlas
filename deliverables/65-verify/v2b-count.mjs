// V2b：独立复核 summary 里的 N 是否等于内容里真实有几条
// 不复用 app.js 的 countPoints；而是把每案的 audit 正文按编号符切开，人工可读地列出来
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const HERE = dirname(fileURLToPath(import.meta.url));
const SEL = join(HERE, '..', '..', 'prototypes', '_selection');
const sb = { window: {} };
vm.createContext(sb);
vm.runInContext(readFileSync(join(SEL, 'data.js'), 'utf8'), sb, { filename: 'data.js' });
const SCHEMES = sb.window.SCHEMES;

const CIRCLED = '①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳';
const CN = { 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10 };

// 复刻 app.js countPoints（读 frozen 现版 app.js 里的实现不好抽，这里按文档描述重写并打印中间量）
function runLength(nums) {
  const set = new Set(nums); let n = 1;
  while (set.has(n)) n++;
  return n - 1;
}
function countPoints(t) {
  const circ = [];
  for (const ch of t) { const k = CIRCLED.indexOf(ch); if (k >= 0 && !circ.includes(k + 1)) circ.push(k + 1); }
  const di = [];
  for (const m of t.matchAll(/第([一二三四五六七八九十])[，,、]/g)) { const v = CN[m[1]]; if (!di.includes(v)) di.push(v); }
  const num = [];
  for (const m of t.matchAll(/[（(](\d{1,2})[）)]/g)) { const v = +m[1]; if (!num.includes(v)) num.push(v); }
  return { n: Math.max(runLength(circ), runLength(di), runLength(num)),
    circ: runLength(circ), di: runLength(di), num: runLength(num),
    rawNum: num.slice().sort((a, b) => a - b), rawCirc: circ.slice().sort((a, b) => a - b), rawDi: di.slice().sort((a, b) => a - b) };
}

const rows = SCHEMES.map((s) => {
  const audit = s.audit || '';
  const cutMark = '反套路改造三指标';
  const idx = audit.indexOf(cutMark);
  const shown = s.id === 'S13' && idx > 0 ? audit.slice(0, idx) : audit;
  const c = countPoints(shown);
  return { id: s.id, n: c.n, detail: c, len: shown.length };
});

console.log('=== N 逐案（circ=①②③ / di=第一，/ num=（1） 三法取最大）===');
for (const r of rows) {
  const d = r.detail;
  console.log(`  ${r.id}  N=${r.n}   circ=${d.circ}${JSON.stringify(d.rawCirc)}  di=${d.di}${JSON.stringify(d.rawDi)}  num=${d.num}${JSON.stringify(d.rawNum)}`);
}

// 独立口径：真实编号序列的最大值（连续从 1 起）+ 检查是否有 steps(N) 污染
console.log('\n=== 潜在污染：正文里出现 (数字) 但不在编号序列表述里的位置 ===');
for (const s of SCHEMES) {
  const audit = s.audit || '';
  const idx = audit.indexOf('反套路改造三指标');
  const shown = s.id === 'S13' && idx > 0 ? audit.slice(0, idx) : audit;
  const hits = [...shown.matchAll(/.{0,14}[（(](\d{1,2})[）)].{0,10}/g)].map((m) => m[0].replace(/\n/g, ' '));
  const suspicious = hits.filter((h) => /steps|px|em|列|栏|grid|font|weight|line|viewport|\.|阶/i.test(h));
  if (suspicious.length) console.log(`  ${s.id}: ${suspicious.map((x) => `「${x.trim()}」`).join('  ')}`);
}
