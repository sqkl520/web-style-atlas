// 分析 3：题材聚类 —— 若补 N 个新方案，能覆盖几个词。口径必须写清。
import fs from 'node:fs';

const cov = JSON.parse(fs.readFileSync('D:/Web/style/deliverables/69-audit/coverage.json', 'utf8'));
const probe44 = JSON.parse(fs.readFileSync('D:/Web/style/deliverables/69-audit/probe-44-raw.json', 'utf8'));
const probe29 = JSON.parse(fs.readFileSync('D:/Web/style/deliverables/69-audit/probe-29-raw.json', 'utf8'));
const zero = [...probe44, ...probe29].filter(r => r.rows === 0).map(r => r.term);

// 聚类：只按「一个案子能不能同时当这几门生意的方案」这个标准切，不按语义相似度切。
// 判据：同簇的词共用同一套页面结构（同一批 section、同一批内容字段）。
const CLUSTERS = [
  { id: 'C1 本地门店', terms: ['餐厅', '咖啡店', '茶饮', '花店', '甜品', '小吃店', '酒吧', '民宿', '修鞋理发', '美甲'],
    why: '7 个词共用一套结构：主视觉＋菜单价目＋营业时间地址＋环境图＋评价＋订位。M02 的 README 已把其中 4 个写进承诺清单。',
    fix: '补 0 个：M02 已覆盖（exact 4 个 / adjacent 3 个）。真缺口是 M02 没被推到搜索零命中的人面前。',
    tpl: 'M02' },
  { id: 'C2 专业服务', terms: ['律师', '会计', '诊所', '招聘'],
    why: '律所/会计/诊所共用「服务项＋团队资历＋流程＋预约/联系」；招聘不同（要职位列表），只共享外框。',
    fix: '补 0–1 个：M01 覆盖律师（exact），会计/诊所只是相邻；招聘要职位列表，M01 没有。',
    tpl: 'M01' },
  { id: 'C3 电商/零售', terms: ['电商', '网店', '服装', '时尚', '美妆', '数码', '家居'],
    why: '7 个词要同一批东西：商品网格、筛选、详情、购物车、结算。三个模板全都没有。这一簇是**真**缺口。',
    fix: '补 1 个「商品目录站」也不能算覆盖：没有购物车/支付的商品站是残缺的电商。要么补一个带静态购物车（localStorage）的方案，要么明说这一层不做电商。',
    tpl: '—' },
  { id: 'C4 活动/展演', terms: ['婚礼', '展会', '文化节', '市集'],
    why: '共用「日期地点＋节目表/日程＋票务/报名＋交通」。S27 的 scenesYes 只写了戏剧/影展/文化节，婚礼与展会不在。',
    fix: '补 1 个「活动日程页」能覆盖 4 个词（婚礼是同一结构的私人版）。',
    tpl: '—' },
  { id: 'C5 个人/创作者', terms: ['摄影', '个人主页', '简历', '独立开发者', '乐队'],
    why: '共用「我是谁＋作品/项目列表＋联系方式」。M03 覆盖摄影（adjacent），但个人主页/简历/独立开发者不在它的承诺清单里。',
    fix: '补 0–1 个：M03 已能接摄影；简历要时间轴与技能表，M03 没有。',
    tpl: 'M03' },
  { id: 'C6 机构/公共', terms: ['政务', '医疗', '金融', '地产', '非营利', '社团', '捐款', '培训', '家教', '儿童', '母婴'],
    why: '这一簇**不是**一个题材：政务要办事指南与公示，医疗要科室与挂号，金融要产品与合规披露，捐款要项目进度与收据。硬并成一个方案等于做一个什么都不是的通用页。',
    fix: '补 3 个也只能各覆盖 1–2 个词，且每一个都要真实业务字段。这是「不该补」的一簇。',
    tpl: '—' },
  { id: 'C7 其他', terms: ['书店', '健身', '宠物', '旅游', '汽车', '农业', '物流', '演出?'],
    why: '混合：书店/健身/宠物是本地门店的变体（M02 结构能用但 README 没承诺）；旅游/汽车/物流/农业是行业站，各不相同。',
    fix: '书店/健身/宠物可并入 C1（靠 M02）；其余各自独立。',
    tpl: 'M02' },
];

// 清洗：只保留真的在 zero 里的词
const zeroSet = new Set(zero);
for (const c of CLUSTERS) c.terms = c.terms.filter(t => zeroSet.has(t));
const assigned = new Set(CLUSTERS.flatMap(c => c.terms));
const unassigned = zero.filter(t => !assigned.has(t));

console.log('=== 45 个零命中词的题材聚类 ===');
let acc = 0;
for (const c of CLUSTERS) {
  acc += c.terms.length;
  console.log(`\n${c.id}（${c.terms.length} 词）: ${c.terms.join(' ')}`);
  console.log('  结构共性: ' + c.why);
  console.log('  处置: ' + c.fix + '   [模板: ' + c.tpl + ']');
}
console.log('\n未归类:', unassigned.join(' ') || '（无）');
console.log('已归类合计:', acc, '/', zero.length);

// 覆盖估算：用「现有 30 案单案 scenesYes 覆盖词数的实测分布」当基准
const dist = cov.cov.map(c => c.n).sort((a, b) => a - b);
const med = dist[Math.floor(dist.length / 2)], max = dist[dist.length - 1];
console.log(`\n=== 补 N 个新方案的覆盖估算 ===`);
console.log(`基准（实测，30 案）：单案 scenesYes 覆盖词表中位数 ${med} 词、最多 ${max} 词、均值 ${(dist.reduce((a,b)=>a+b,0)/dist.length).toFixed(2)}`);
for (const n of [1, 2, 3, 5]) {
  console.log(`  +${n} 案：按中位数 ≈ ${n * med} 词；按较好水平（4 词）≈ ${n * 4} 词；按实测最好（${max} 词）≈ ${n * max} 词`);
}
console.log('\n但**真正**的估算法是按簇算，不是按案算（一个新案只能落进一个簇）：');
for (const c of CLUSTERS) {
  if (c.tpl !== '—') continue;
  console.log(`  ${c.id}: 补 1 案最多覆盖 ${c.terms.length} 词（${c.terms.slice(0,4).join('、')}${c.terms.length>4?'…':''}），且需要该簇共有的业务字段`);
}
fs.writeFileSync('D:/Web/style/deliverables/69-audit/clusters.json', JSON.stringify({ CLUSTERS, zero, unassigned, dist }, null, 1));
