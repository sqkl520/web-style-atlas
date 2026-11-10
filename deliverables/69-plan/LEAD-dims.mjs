// 把「字号缺失」与「色板无配比」量化成可执行判据，并算 30 案全库的缺失面
import { readFileSync, existsSync, readdirSync, writeFileSync } from 'node:fs';

const DUMP = 'deliverables/69-plan/dump';
const ids = readdirSync(DUMP).filter(f => /^S\d{2}\.txt$/.test(f)).map(f => f.slice(0, 3)).sort();

console.log('=== 30 条提示词里，哪些「可量化维度」被提到、哪些完全缺失 ===\n');

// 定义「设计规格的维度」。每个维度给一组检测正则。
const DIMS = {
  '字号层级': /字号|font-size|文字大[小]|标题\d+px/,
  '行高': /行高|line-height|leading/i,
  '字重': /字重|font-weight|粗体|medium|bold/i,
  '字距': /字距|letter-spacing|tracking/i,
  '色板值': /#[0-9a-fA-F]{6}/,
  '色板配比': /(占|配比|比例|主色|第二主色|面积|%)\s*[^\n]{0,12}(色|主|面积)|面积.{0,8}\d+%/,
  '圆角': /圆角|border-radius/i,
  '阴影': /阴影|box-shadow|inset/i,
  '线宽': /线宽|border-width|stroke-width/i,
  '间距/栏宽': /栏|基线|间距|gap|栅格|网格/i,
  '栏数': /\d+\s*栏/,
  '留白节奏': /留白|内距|外边距|padding|margin/i,
  '图片比': /宽高比|16:10|4:3|1:1|裁切|比例/,
  '动效时长': /ms|毫秒|过渡时长|transition.{0,10}\d+/i,
  '锐度/圆角例外': /圆形徽标|50%/,
};

const result = {};
for (const dim of Object.keys(DIMS)) result[dim] = { has: [], miss: [] };

for (const id of ids) {
  const p = readFileSync(`${DUMP}/${id}.txt`, 'utf8');
  for (const [dim, re] of Object.entries(DIMS)) {
    (re.test(p) ? result[dim].has : result[dim].miss).push(id);
  }
}

console.log('维度'.padEnd(14) + ' 有'.padEnd(6) + ' 缺'.padEnd(6) + ' 缺失的案');
console.log('-'.repeat(100));
for (const [dim, r] of Object.entries(result)) {
  const missStr = r.miss.length === 0 ? '(无)' : r.miss.length <= 6 ? r.miss.join(' ') : `${r.miss.length} 案`;
  console.log(`${dim.padEnd(14)} ${String(r.has.length).padEnd(6)} ${String(r.miss.length).padEnd(6)} ${missStr}`);
}

console.log('\n\n=== 关键：真正「完全缺失」的维度（0 案有）===');
for (const [dim, r] of Object.entries(result)) {
  if (r.has.length === 0) console.log(`  ✗ ${dim} —— 30 案全部缺失`);
  else if (r.has.length < 5) console.log(`  ⚠ ${dim} —— 只有 ${r.has.length} 案有（${r.has.join(' ')}）`);
}

// 对比：原型 CSS 里这些维度是否存在
console.log('\n\n=== 对照：原型 CSS 里这些维度是否存在（决定「该不该有」）===');
const protoDims = {};
for (const dim of Object.keys(DIMS)) protoDims[dim] = 0;
const protoSizes = {};
const protoColors = {};
for (const id of ids) {
  const dirs = readdirSync('prototypes').filter(d => d.startsWith(id + '-'));
  if (!dirs.length) continue;
  const css = readFileSync(`prototypes/${dirs[0]}/style.css`, 'utf8');
  const nc = css.replace(/\/\*[\s\S]*?\*\//g, '');
  // 字号档数
  const fs2 = [...nc.matchAll(/font-size\s*:\s*([0-9.]+)px/g)].map(m => m[1]);
  protoSizes[id] = [...new Set(fs2)].length;
  // 色数
  protoColors[id] = [...new Set((nc.match(/#[0-9a-fA-F]{6}/g) || []).map(x => x.toUpperCase()))].length;
}
const szArr = Object.entries(protoSizes);
console.log(`  原型 CSS 的 font-size 档数：min ${Math.min(...szArr.map(x=>x[1]))} / max ${Math.max(...szArr.map(x=>x[1]))} / 均值 ${(szArr.reduce((a,x)=>a+x[1],0)/szArr.length).toFixed(1)}`);
const ccArr = Object.entries(protoColors);
console.log(`  原型 CSS 的 hex 数：min ${Math.min(...ccArr.map(x=>x[1]))} / max ${Math.max(...ccArr.map(x=>x[1]))} / 均值 ${(ccArr.reduce((a,x)=>a+x[1],0)/ccArr.length).toFixed(1)}`);
console.log(`  → 原型平均有 ${(szArr.reduce((a,x)=>a+x[1],0)/szArr.length).toFixed(1)} 档字号、${(ccArr.reduce((a,x)=>a+x[1],0)/ccArr.length).toFixed(1)} 个颜色`);
console.log(`  → 而提示词提到字号的有 ${result['字号层级'].has.length} 案、提到色板配比的有 ${result['色板配比'].has.length} 案`);

writeFileSync('deliverables/69-plan/dims-coverage.json', JSON.stringify({ result, protoSizes, protoColors }, null, 1), 'utf8');
console.log('\n已写 deliverables/69-plan/dims-coverage.json');
