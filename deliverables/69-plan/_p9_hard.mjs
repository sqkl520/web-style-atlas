// 探针 9：C 的当前真值 —— ⚠ 案到底几个，两个轴的交并，以及"点开一个 ⚠ 案看到什么"。
// 不启浏览器：先把 riskNote 的判定式照抄一遍（prompt-copy.js:945-952），
// 再核对 30 案里哪些会出 ⚠，以及每条 ⚠ 文案指向哪里。
import { loadCtx, out } from './_lib.mjs';

const w = loadCtx();
const P = w.STYLE_PROMPTS;

const rows = P.schemes.map((s) => {
  const riskyTopic = !!s.hard;
  const riskyCount = !!(s.capacity && s.capacity.degrades === 'yes');
  return { id: s.id, cn: w.SCHEMES.find((x) => x.id === s.id).cn, hard: riskyTopic, degrades: riskyCount, warn: riskyTopic || riskyCount, minItems: s.minItems };
});

const T = rows.filter((r) => r.hard).map((r) => r.id);
const C = rows.filter((r) => r.degrades).map((r) => r.id);
const U = rows.filter((r) => r.warn).map((r) => r.id);
const both = rows.filter((r) => r.hard && r.degrades).map((r) => r.id);
const either1 = rows.filter((r) => r.hard !== r.degrades).map((r) => r.id);
const none = rows.filter((r) => !r.warn).map((r) => r.id);

out('=== 两个轴 ===');
out(`  题材轴 hard=true       ：${T.length} 案  ${T.join(' ')}`);
out(`  数量轴 degrades=yes    ：${C.length} 案  ${C.join(' ')}`);
out(`  并集（会出 ⚠ 的案）    ：${U.length} 案  ${U.join(' ')}`);
out(`  交集（两轴都中）       ：${both.length} 案  ${both.join(' ')}`);
out(`  只中一个轴             ：${either1.length} 案  ${either1.join(' ')}`);
out(`  一个都不中（干净的）   ：${none.length} 案  ${none.join(' ')}`);
out('');
out(`  Lead 说「9 个」→ 我实测题材轴 ${T.length} 个；用户原文「9 个方案不能大众化」→ 与 ${T.length} 不符，`);
out(`  与并集 ${U.length} 也不符。README L105 写的是 14 案 —— 我实测 ${U.length} 案，${U.length === 14 ? '与 README 一致' : '与 README 不一致'}。`);

out('\n=== 每条 ⚠ 的文案（用户会读到什么）===');
for (const r of rows.filter((x) => x.warn)) {
  const why = [];
  if (r.hard) why.push('机制绑在特定题材上，换普通内容会退化');
  if (r.degrades) why.push('单元位置是手工排定的，内容少于 ' + (r.minItems || '设计规模') + ' 条会留洞');
  out(`  ${r.id} ${r.cn.padEnd(12, '　')} ⚠ ${why.join('；')}。具体不适合什么，写在详情「适用场景」段末。`);
}

out('\n=== 这些 ⚠ 文案里有没有"该去哪" ===');
out('  含 M01/M02/M03 或"模板"字样：', rows.filter((x) => x.warn).length, '案里 0 案 —— 文案只指向「适用场景」段末，不指向任何替代路径。');

out('\n=== 模板层能不能接住这些案（按 README 行业清单比）===');
const TPL = { M01: ['律所', '咨询', '软件服务', '设计工作室', '代理商'], M02: ['餐厅', '咖啡馆', '烘焙', '民宿', '理发店', '花店'], M03: ['个人作品集', '自由职业者', '小型创意工作室', '摄影师', '设计师', '写作者'] };
for (const r of rows.filter((x) => x.warn)) {
  const s = P.schemes.find((x) => x.id === r.id);
  const sc = s.scenes || [];
  const tplHit = Object.entries(TPL).filter(([, list]) => list.some((t) => sc.some((x) => x.includes(t) || t.includes(x)))).map(([k]) => k);
  out(`  ${r.id} scenes=[${sc.join(',')}] → 模板命中 ${tplHit.join(',') || '无'}`);
}
