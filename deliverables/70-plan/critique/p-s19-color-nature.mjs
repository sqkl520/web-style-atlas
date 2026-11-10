// 探针：S19 的 12 种"集合外颜色"到底是什么性质？
// 判定 Q2 的关键：规格字段 3 只给了 4 个色 + 面积比，提示词给了 7 个色（全在规格派生自
// :root 的集合里），页面画了 12 个。多出来的 5 个是不是"设计意图内的合法派生"？
// 方法：对每个集合外颜色，在 style.css 里找出它出现的位置和用途分类。
import { readFileSync } from 'node:fs';

const CSS = 'D:/Web/style/prototypes/S19-copperplate-herbarium-cabinet/style.css';
const src = readFileSync(CSS, 'utf8');
const lines = src.split('\n');

// 提示词声明的 7 色（来自 dna-clean.json S19.palette）
const claimed = ['#4A5C3A', '#E4DECD', '#D8CFB6', '#E9E3D2', '#2A241C', '#3A3227', '#7C7460'];

// 上一轮像素采样报出的集合外色
const outside = ['#5E5443', '#534C3E', '#A79C82', '#24201A'];

const norm = (h) => h.toUpperCase();
const claimedSet = new Set(claimed.map(norm));

for (const hex of outside) {
  console.log(`\n=== ${hex} ${claimedSet.has(norm(hex)) ? '(已声明)' : '(未声明)'} ===`);
  let n = 0;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].toUpperCase().includes(hex)) {
      n++;
      if (n <= 6) console.log(`  L${i + 1}: ${lines[i].trim().slice(0, 150)}`);
    }
  }
  console.log(`  合计出现行数: ${n}`);
}

// 关键判定：这些集合外色是不是由已声明色「算出来」的？
// #534C3E 自述是 #7C7460 与 #2A241C 的中点 —— 验证
const mid = (a, b) => {
  const p = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const [x, y] = [p(a), p(b)];
  return '#' + x.map((v, i) => Math.round((v + y[i]) / 2).toString(16).padStart(2, '0')).join('').toUpperCase();
};
console.log('\n=== 派生关系验证 ===');
console.log(`#7C7460 与 #2A241C 的中点 = ${mid('#7C7460', '#2A241C')}（自述 #534C3E）`);
console.log(`#5E5443 是否 = 某两色的中点？试 #2A241C/#7C7460 → ${mid('#2A241C', '#7C7460')}`);

// 正文色的真实用途：统计 #5E5443 是否落在 color: 上
let asColor = 0, asBg = 0;
for (const l of lines) {
  if (!l.toUpperCase().includes('#5E5443')) continue;
  if (/color\s*:/.test(l)) asColor++;
  if (/background/.test(l)) asBg++;
}
console.log(`\n#5E5443 作为 color: ${asColor} 处，作为 background: ${asBg} 处`);
