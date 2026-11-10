// 探针 27：Lead 的 A4 方案「scenesNo 进搜索 + 行卡反标」会重演已修的那个反向信号 bug 吗？
// 用真实 data.js 复算：若把 scenesNo 加进搜索索引，哪些查询会变成「命中但全是否定」。
import { loadData } from './_rt_lib.mjs';

const D = loadData();
const terms = ['政务', '金融', '医疗', '电商', '餐饮', '教育', '母婴', '儿童', '促销', '游戏', 'B 端', 'B端'];

const hayYes = (r) => [r.id, r.cn, r.en, r.family, r.fonts, r.def, r.tone, r.structure, r.errorCode,
  r.threshold, r.layout, r.visuals, r.quirk, r.scenesYes].join(' ').toLowerCase();
const hayBoth = (r) => hayYes(r) + ' ' + String(r.scenesNo || '').toLowerCase();

console.log('═══ 现状（只索引 scenesYes）vs Lead 的 A4（scenesYes + scenesNo 一起进索引）═══');
console.log('查询词    现状命中   A4 命中   新增命中里「只在否定句里出现」的案数   新增命中率');
let totalNew = 0, totalNegOnly = 0;
for (const t of terms) {
  const q = t.toLowerCase();
  const now = D.filter((r) => hayYes(r).includes(q));
  const a4 = D.filter((r) => hayBoth(r).includes(q));
  const newly = a4.filter((r) => !now.includes(r));
  const negOnly = newly.filter((r) => !hayYes(r).includes(q));
  totalNew += newly.length; totalNegOnly += negOnly.length;
  console.log(`${t.padEnd(8)}  ${String(now.length).padStart(6)}  ${String(a4.length).padStart(7)}   ${String(negOnly.length).padStart(28)}   ${newly.length ? (negOnly.length / newly.length * 100).toFixed(0) + '%' : '—'}`);
}
console.log('');
console.log(`合计：A4 新增命中 ${totalNew} 行，其中 ${totalNegOnly} 行是「只在否定句里出现」= ${(totalNegOnly / totalNew * 100).toFixed(1)}%`);

console.log('');
console.log('═══ 逐案看：这些新增命中在界面上会印出什么？═══');
for (const t of ['政务', '金融']) {
  const q = t.toLowerCase();
  const negOnly = D.filter((r) => hayBoth(r).includes(q) && !hayYes(r).includes(q));
  console.log(`搜「${t}」→ 新增 ${negOnly.length} 行：`);
  for (const r of negOnly) {
    const i = (r.scenesNo || '').toLowerCase().indexOf(q);
    console.log(`   ${r.id}  scenesNo 片段：「…${(r.scenesNo || '').slice(Math.max(0, i - 12), i + 12)}…」`);
  }
  console.log(`   ⇒ 这 ${negOnly.length} 行没有一行写着「适合${t}」。用户看到 ${negOnly.length} 个结果，全是「不适合${t}」。`);
  console.log('');
}
console.log('═══ 这正是 app.js:140-145 与 collect-schemes.mjs:461-479 记录的同一个 bug ═══');
console.log('  app.js 原注释：「实测搜"政务"命中 7 行，7/7 全部只出现在"不适合"从句里」');
console.log('  Lead 的 A4 声称「接到搜索/筛选，不接到详情正文」+「行卡反标」');
console.log('  但行卡反标**只解决"看起来诚实"，不解决"搜到了但没用"**：');
console.log('  用户搜「政务」的意图是「我要能用政务的方案」，A4 给他 7 个写着「不适合政务」的行。');
console.log('  ⇒ 这不是可发现性修复，是把一个已经被红队抓过、已修掉的错误重新装回去，');
console.log('     只是这次多贴了一张"我是在否定"的标签。');
