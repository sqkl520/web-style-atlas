// 探针 15：B 的取舍数据 —— 29 个零命中词能靠几个新案覆盖？
// 做法：按「大众题材族」手工归并（归并规则写死在下面，可复核），再用现有 30 案的
// scenes 值反查："如果新做一个案，它最像哪一个现有案" → 得到「一个新案能覆盖几个词」。
import { loadCtx, out } from './_lib.mjs';

const w = loadCtx();
const P = w.STYLE_PROMPTS;
const uns = P.unsupported || [];

// 题材族归并（每个族 = 一个"新案"候选）。归并依据：同一门生意/同一类页面结构。
const CLUSTERS = {
  '电商/网店（商品列表+购物车+详情）': ['电商', '网店', '数码', '家居', '母婴', '儿童', '时尚', '美妆', '服装'],
  '餐厅/酒吧（菜单+订位+营业时间）': ['酒吧'],
  '个人主页/简历（作品+履历+联系）': ['独立开发者', '个人主页', '简历'],
  '活动/展会（日程+展位+购票）': ['展会', '社团'],
  '机构/政务（信息公开+办事指南）': ['政务', '金融', '医疗', '地产'],
  '旅行/汽车（目的地+行程+参数）': ['旅游', '汽车'],
  '教育/培训（课程+师资+报名）': ['家教', '培训'],
  '非营利/募捐（项目+进展+捐赠）': ['捐款'],
  '农业/物流（产地+批次+追踪）': ['农业', '物流'],
  '乐队/演出（巡演+试听+周边）': ['乐队'],
  '甜品/烘焙零售': ['甜品', '美甲'],
};
const covered = new Set(Object.values(CLUSTERS).flat());
out('=== 29 个零命中词 → 11 个题材族 ===');
for (const [k, v] of Object.entries(CLUSTERS)) out(`  ${k.padEnd(32, '　')} ${v.length} 词：${v.join('、')}`);
out(`  归并覆盖 ${covered.size}/29 词；未归并：${uns.filter((t) => !covered.has(t)).join('、') || '(无)'}`);

out('\n=== 每个族离现有 30 案有多远（结构最接近的案）===');
// 粗判：按 scenes 关键词相似度
const sim = (words) => {
  const score = P.schemes.map((s) => {
    const blob = (s.scenes || []).join('') + s.plain;
    let hit = 0;
    for (const wd of words) for (const ch of wd) if (blob.includes(ch)) hit++;
    return { id: s.id, hit, scenes: (s.scenes || []).join(',') };
  }).sort((a, b) => b.hit - a.hit);
  return score.slice(0, 2);
};
for (const [k, v] of Object.entries(CLUSTERS)) {
  const s = sim(v);
  out(`  ${k.slice(0, 20).padEnd(22, '　')} 最近：${s.map((x) => `${x.id}(${x.scenes})`).join('  ')}`);
}

out('\n=== 补一个新案的实际成本（按仓库既有 30 案的构成）===');
out('  一个新 S 案 = _specs/Sxx.md（12 字段，8–12KB）');
out('              + index.html（18–48KB）+ style.css（12–40KB）');
out('              + assets/（16–19 张真实图片，本环境图源全不可达 → 只能程序化生成）');
out('              + 三档 .inspect/（report.json + 8–11 张截图）');
out('              + _prompts 三层生成器重跑（extract-dna → clean-dna → build-prompts）');
out('              + _selection/data.js 重新生成 + 30 案的 sceneIndex 手工补词');
out('  git 历史信号：S19 累计 6 次提交、S13 累计 11 次提交（含修 P0）');
