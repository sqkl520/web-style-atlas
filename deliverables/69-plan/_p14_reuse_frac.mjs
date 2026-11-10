// 探针 14：62-verify 那 3 案（S07 S23 S30）的端到端复刻，对**当前**线上提示词还算不算证据？
// 做法：把线上提示词的每一条"约束行"逐条在存档提示词里找 verbatim；算出保留率与新增率。
// 这决定了 A 的起点到底是 0/30 还是 3/30（前者=从零，后者=只需补 27 案 + 重跑 3 案）。
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { loadCtx, ROOT, out } from './_lib.mjs';

const w = loadCtx();
const bp = w.buildStylePrompt;

const isConstraint = (l) =>
  /^1\. 配色只用这几个值|^2\. 字体：|^3\. 圆角：|^4\. 阴影：|^5\. 线宽只用这几级|^1\. 这个版式设计时排了|^2\. 用你自己的真实数量排|^3\. 但这个版式的位置|^3\. 这个版式是自动流|^4\. 版式里至少要|^5\. 首屏不要轮播图|^6\. 这个版式的硬前提|^[①②③④⑤⑥⑦⑧] |^视觉硬约束|^结构约束|^防退化|^验收三问|^输出要求|^不引 React|^图片位置写成|^移动端单列|^这个风格的签名动作|^这个案子的调性是|^请把整页做成这个风格/.test(l);

const rows = [];
for (const id of ['S07', 'S23', 'S30']) {
  const saved = readFileSync(join(ROOT, `deliverables/62-verify/prompts/${id}.txt`), 'utf8').replace(/^\uFEFF/, '').split(/\r?\n/).map((x) => x.trim()).filter(Boolean);
  const live = bp(id, { biz: '', action: '' }).split(/\r?\n/).map((x) => x.trim()).filter(Boolean);
  const savedSet = new Set(saved);
  const liveC = live.filter(isConstraint);
  const kept = liveC.filter((l) => savedSet.has(l));
  const dropped = liveC.filter((l) => !savedSet.has(l));
  const extra = saved.filter(isConstraint).filter((l) => !new Set(live).has(l));
  // 归一化比对（去括号内易变项）
  const norm = (l) => l.replace(/\s+/g, '').replace(/[（(][^）)]*[）)]/g, '');
  const keptN = liveC.filter((l) => saved.some((s) => norm(s) === norm(l)));
  rows.push({ id, savedLines: saved.length, liveLines: live.length, liveConstraints: liveC.length, keptExact: kept.length, keptNorm: keptN.length, dropped: dropped.map((l) => l.slice(0, 90)), extra: extra.map((l) => l.slice(0, 90)) });
  out(`=== ${id} ===`);
  out(`  线上约束行 ${liveC.length} 条；存档里**逐字**存在 ${kept.length} 条；归一化后存在 ${keptN.length} 条`);
  out(`  线上有、存档缺（= 这 3 案没验过的新约束）：`);
  for (const d of dropped) out(`    − ${d.slice(0, 120)}`);
  out(`  存档有、线上已删/改（= 旧约束，别拿它当证据）：${extra.length} 条`);
  for (const e of extra.slice(0, 4)) out(`    + ${e.slice(0, 110)}`);
  out('');
}
out('=== 汇总：62-verify 的 3 个复刻对当前提示词的覆盖率 ===');
const tot = rows.reduce((a, r) => a + r.liveConstraints, 0);
const kn = rows.reduce((a, r) => a + r.keptNorm, 0);
out(`  约束行级覆盖率 = ${kn}/${tot} = ${(kn / tot * 100).toFixed(1)}%`);
out('  逐案：' + rows.map((r) => `${r.id} ${r.keptNorm}/${r.liveConstraints}`).join('  '));
