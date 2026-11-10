// 试验：能不能从各案的 scenes 原文**机械派生** direct/near，而不手写第二份清单？
// 若能，那"芯片说 S12 是潮牌、但搜潮牌 0 行"这类矛盾从此不可能发生。
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
const ctx = { window: {} }; vm.createContext(ctx);
vm.runInContext(readFileSync('prototypes/_selection/data.js', 'utf8'), ctx);
vm.runInContext(readFileSync('prototypes/_selection/prompts.js', 'utf8'), ctx);
const S = ctx.window.SCHEMES;
const P = ctx.window.STYLE_PROMPTS;

// 正向段：剥掉「不适合：」之后的全部
const posOf = (r) => { const s = r.scenes || ''; const i = s.indexOf('不适合'); return i > 0 ? s.slice(0, i) : s; };

// 同义词表：用户会打的词 → 它在该案原文里的可能写法（正则片段）
// 这张表是**唯一手写的部分**，而且它写的是"同义"，不是"谁适合"
const SYN = {
  '咖啡店': ['咖啡'],
  '茶饮': ['茶'],
  '餐厅': ['餐饮', '餐厅'],
  '烘焙': ['烘焙'],
  '书店': ['书店', '书系'],
  '手作品牌': ['手作品牌', '手作'],
  '设计工作室': ['设计工作室', '创意工作室', '工作室'],
  '作品集': ['作品集'],
  '内容媒体': ['内容媒体', '编辑出版'],
  '博客': ['博客', '长文'],
  '播客': ['播客'],
  '独立杂志': ['独立杂志', '刊物'],
  '出版': ['出版'],
  '展览': ['展览', '展'],
  '戏剧': ['戏剧'],
  '影展': ['影展'],
  '文化节': ['文化节', '音乐节'],
  '游戏': ['游戏'],
  '潮牌': ['潮流品牌', '潮牌'],
  '快闪': ['快闪'],
  '音乐产品': ['音乐产品'],
  '音频设备': ['音频'],
  '工业设备': ['工业', '设备'],
  '说明书': ['说明书', '手册'],
  '开发者工具': ['开发者'],
  '运维': ['运维', '运维日志'],
  '数据看板': ['数据', '看板', '仪表'],
  '档案': ['档案', '索引', '目录'],
  '科普': ['科普', '自然教育'],
  '教育': ['教育'],
  '修鞋理发': ['修理', '理发'],
  '小吃店': ['餐饮', '小吃'],
  '市集': ['市集', '摊位'],
  '花店': ['花'],
  '民宿': ['民宿'],
  '婚礼': ['婚礼'],
  '摄影': ['摄影', '照片'],
  '健身': ['健身'],
  '宠物': ['宠物'],
  '诊所': ['诊所', '医疗'],
  '律师': ['律师', '法律'],
  '会计': ['会计', '财务', '对账'],
  '招聘': ['招聘'],
  '非营利': ['非营利', '公益'],
};

console.log('=== 从 scenes 原文机械派生（正向后匹配同义词）===\n');
console.log('词        派生 direct            现行 direct           一致？');
let differ = 0;
for (const [term, forms] of Object.entries(SYN)) {
  const re = new RegExp(forms.join('|'));
  const derived = S.filter((r) => re.test(posOf(r))).map((r) => r.id);
  const cur = (P.sceneIndex[term] || {}).direct || [];
  const same = JSON.stringify(derived.slice().sort()) === JSON.stringify(cur.slice().sort());
  if (!same) differ++;
  console.log(term.padEnd(9), derived.join(',').padEnd(22), (cur.join(',') || '—').padEnd(22), same ? '✓' : '✗');
}
console.log('\n不一致:', differ, '/', Object.keys(SYN).length);

console.log('\n=== 现行词表里有、但派生表里没有的词 ===');
const derivedTerms = new Set(Object.keys(SYN));
Object.keys(P.sceneIndex).forEach((t) => { if (!derivedTerms.has(t)) console.log('  ' + t); });
