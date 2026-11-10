// 探针 31：B 的取舍算术 —— 补 N 个新案，各能覆盖几个词？
// 输入：探针 15 的 11 个题材族 + 探针 23 的 73 词实测分类（哪些词现在是「30 案没有 + 模板也没有」）。
// 输出：补 1/2/3/5 个案的边际覆盖率，以及"仍然覆盖不到"的词数。
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadCtx, ROOT, out } from './_lib.mjs';

const w = loadCtx();
const P = w.STYLE_PROMPTS;
const typed = JSON.parse(readFileSync(join(ROOT, 'deliverables/69-plan/p7-typed73.json'), 'utf8'));
const gapTerms = typed.filter((r) => r.kind === 'empty+none').map((r) => r.term);
out(`当前「30 案没有 + 模板也没有」的词：${gapTerms.length} 个`);

// 11 个题材族（与 _p15 同一套归并，顺序 = 建议做的优先级）
const CLUSTERS = [
  ['电商/网店（商品网格＋规格＋购物车）', ['电商', '网店', '数码', '家居', '母婴', '儿童', '时尚', '美妆', '服装']],
  ['机构/政务（信息公开＋办事指南＋表单）', ['政务', '金融', '医疗', '地产']],
  ['个人主页/简历（作品＋履历＋联系方式）', ['独立开发者', '个人主页', '简历', '社团']],
  ['教育/培训（课程表＋师资＋报名）', ['家教', '培训', '展会']],
  ['旅行/汽车（目的地＋行程＋参数表）', ['旅游', '汽车']],
  ['非营利/募捐（项目进度＋捐赠）', ['捐款', '非营利', '会计']],
  ['餐饮零售（菜单＋订位＋营业时间）', ['酒吧', '甜品', '美甲', '茶饮']],
  ['农业/物流（产地批次＋追踪）', ['农业', '物流', '招聘']],
  ['演出/乐队（巡演＋试听＋周边）', ['乐队']],
  ['零售门店（营业信息＋主推＋到店）', ['书店', '花店', '婚礼', '健身', '宠物', '诊所']],
];

let covered = new Set();
out('');
out('累计覆盖（每加一个案，新增覆盖多少词）：');
for (let i = 0; i < CLUSTERS.length; i++) {
  const [name, terms] = CLUSTERS[i];
  const hit = terms.filter((t) => gapTerms.includes(t));
  const newly = hit.filter((t) => !covered.has(t));
  for (const t of newly) covered.add(t);
  out(`  +${String(i + 1).padStart(2)} ${name.padEnd(30, '　')} 该族 ${String(terms.length).padStart(2)} 词，其中当前缺口 ${String(hit.length).padStart(2)}，新增覆盖 ${String(newly.length).padStart(2)}  累计 ${covered.size}/${gapTerms.length}`);
}
out('');
out('=== 结论 ===');
const after3 = new Set();
for (let i = 0; i < 3; i++) for (const t of CLUSTERS[i][1]) if (gapTerms.includes(t)) after3.add(t);
out(`  补 3 个案（电商 / 政务机构 / 个人主页）→ 覆盖 ${after3.size}/${gapTerms.length} = ${(after3.size / gapTerms.length * 100).toFixed(0)}% 的缺口词`);
const after5 = new Set();
for (let i = 0; i < 5; i++) for (const t of CLUSTERS[i][1]) if (gapTerms.includes(t)) after5.add(t);
out(`  补 5 个案 → 覆盖 ${after5.size}/${gapTerms.length} = ${(after5.size / gapTerms.length * 100).toFixed(0)}%`);
out(`  补满 10 个案 → 覆盖 ${covered.size}/${gapTerms.length}；仍剩 ${gapTerms.filter((t) => !covered.has(t)).join('、') || '(无)'}`);
out('');
out('  ⚠️ 注意分母：73 个词里真正"30 案没有 + 模板也没有"的只有 35 个（探针 23 实测），');
out(`     不是 29，也不是 44。上面所有百分比都以 ${gapTerms.length} 为分母。`);
