// 裁决 1 决胜：候选「跳脱之处」句到底带来了什么新信息？
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
const t = readFileSync(resolve('prototypes/_selection/data.js'), 'utf8');
const rows = JSON.parse(t.slice(t.indexOf('= ') + 2).replace(/;\s*$/, ''));
const PL = JSON.parse(readFileSync(resolve('deliverables/65-plan/_v_out/promptlen.json'), 'utf8'));

const getTiao = (a) => {
  // 取所有「跳脱之处」句，按条取第一条
  const m = a.match(/跳脱之处(?:是|在于)?[：:]?\s*([^。]{4,60}?)。/);
  return m ? m[1].trim() : '';
};

// 主题分类
const TOPICS = [
  ['几何/构图', /栏|网格|基线|斜|对齐|居中|首屏|版心|错位|栏宽|对角线|拼贴|裁切|比例|分栏/],
  ['材料/印刷', /纸|墨|压|刻|凹|凸|印|烫|颗粒|纤维|油墨|丝网|石版|凸版/],
  ['光/影', /光|影|投影|阴影|亮|暗|反射|折射/],
  ['色', /色|#|调|饱和|对比度/],
  ['交互/动效', /滚|悬停|点击|动效|过渡|按下|切换|展开/],
  ['内容/信息', /信息|编号|索引|目录|层级|顺序|阅读/],
];
console.log('「跳脱之处」句的主题分布（27 案，可多标签）：');
const counts = TOPICS.map(() => 0);
const tiaos = [];
for (const r of rows) {
  const s = getTiao(r.audit);
  if (!s) continue;
  tiaos.push({ id: r.id, s });
  TOPICS.forEach(([, re], i) => { if (re.test(s)) counts[i]++; });
}
TOPICS.forEach(([n], i) => console.log(`  ${n.padEnd(10)} ${counts[i]}/27`));

// 其中「只谈圆角/阴影/配色」（=与提示词硬约束重复）的案
const DUP = /^(?:全站|页面)?(?:直角|无投影|没有投影|圆角|柔和投影|单一纸|只用)/;
let dupOnly = 0;
console.log('\n=== 27 条跳脱句逐条 ===');
for (const { id, s } of tiaos) {
  const geo = TOPICS[0][1].test(s);
  const mat = TOPICS[1][1].test(s);
  const mark = geo ? '几何' : (mat ? '材料' : (DUP.test(s) ? '★重复硬约束' : '其他'));
  if (!geo && !mat) dupOnly++;
  console.log(`  ${id} [${mark}] ${s}`);
}
console.log(`\n不含几何/材料关键词的（更可能只是重复硬约束）: ${dupOnly}/27`);

// 投影
const intro = '这一案不普通的地方（作者原话）：';
const proj = rows.map((r, i) => PL.lens[i] + (getTiao(r.audit) ? intro.length + getTiao(r.audit).length + 1 : 0));
console.log('\n投影: min', Math.min(...proj), 'max', Math.max(...proj), 'avg', Math.round(proj.reduce((a,b)=>a+b,0)/30),
  '超1905', proj.filter(x=>x>1905).length, '/30', '｜超现max(1905)的案:', rows.filter((r,i)=>proj[i]>1905).map(r=>r.id).join(' '));
