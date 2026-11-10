import { readFileSync, existsSync, readdirSync } from 'node:fs';

const css = readFileSync('prototypes/_selection/style.css', 'utf8');
const header = css.split('*/')[0];

console.log('=== 自述清单原文（style.css L1-11）===');
console.log(header);
console.log('\n=== 关键措辞 ===');
for (const kw of ['过闸门', '不受那 30 条规则约束', '没必要去踩同一批坑']) {
  const i = header.indexOf(kw);
  console.log(`  "${kw}" : ${i >= 0 ? '存在 @' + i : '不存在'}`);
}

// 这 7 条逐条可核对性
console.log('\n=== 7 条自述 vs 实现 的可核对点 ===');
const checks = [
  ['1 三级文字对比度 4.2:1 → 5.6:1', '--ink-3', /--ink-3:\s*(#[0-9a-fA-F]{6})/],
  ['2 小字下限 13px', 'font-size<13px 声明数', null],
  ['3 大标题 3.8vw → 5.2vw', '--s-h1', /--s-h1:\s*([^;]+);/],
  ['4 头部标签 全大写11px → 14px句首大写', '.mast-kicker', /\.mast-kicker\s*\{([^}]*)\}/],
  ['5 行分隔线 1px → 2px', '1px border 数', null],
  ['6 截图缩略图不再用 1px 描边框', '.shot border', null],
  ['7 工具条不再 sticky', 'sticky 数', null],
];
for (const [label, probe, re] of checks) {
  if (re) {
    const m = re.exec(css);
    console.log(`  ${label}\n      → ${m ? JSON.stringify(m[1].trim().slice(0, 80)) : '未匹配'}`);
  } else {
    console.log(`  ${label}  → 需单独统计`);
  }
}

// 1px 与 2px 的精确统计（剥掉注释）
const noComment = css.replace(/\/\*[\s\S]*?\*\//g, '');
const c1 = [...noComment.matchAll(/border(?:-(?:top|bottom|left|right))?\s*:\s*([0-9.]+)px/g)].map(m => m[1]);
const tally = {};
for (const v of c1) tally[v] = (tally[v] || 0) + 1;
console.log('\n=== style.css 实际 border 宽度分布（剥注释后）===');
console.log(' ', JSON.stringify(tally));

// sticky 统计
console.log('\n=== sticky 出现处 ===');
noComment.split('\n').forEach((l, i) => { if (/sticky/.test(l)) console.log(`  L${i + 1}: ${l.trim().slice(0, 90)}`); });

// _selection 是否被任何 report.json 覆盖
console.log('\n=== _selection 有没有自己的闸门报告 ===');
console.log('  prototypes/_selection/.inspect exists?', existsSync('prototypes/_selection/.inspect'));
console.log('  prototypes/_selection/report.json exists?', existsSync('prototypes/_selection/report.json'));
