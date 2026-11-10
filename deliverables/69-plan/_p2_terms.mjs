// 探针 2：行业词覆盖率全账。44 词 / direct / near / unsupported 的关系，逐词算一遍。
import { loadCtx, out } from './_lib.mjs';

const w = loadCtx();
const P = w.STYLE_PROMPTS;
const idx = P.sceneIndex;
const terms = Object.keys(idx);
const uns = P.unsupported || [];

const direct = {}, nearOnly = {}, empty = {};
for (const t of terms) {
  const d = (idx[t].direct || []), n = (idx[t].near || []);
  if (d.length) direct[t] = d;
  else if (n.length) nearOnly[t] = n;
  else empty[t] = true;
}
out('sceneIndex 词 =', terms.length);
out('  有直连 =', Object.keys(direct).length);
out('  只有近似 =', Object.keys(nearOnly).length);
out('  两者皆空 =', Object.keys(empty).length, Object.keys(empty).join(' '));
out('unsupported 词 =', uns.length);
out('unsupported ∩ sceneIndex =', uns.filter((t) => t in idx).join(' ') || '(空)');
out('nearOnly ∩ unsupported =', Object.keys(nearOnly).filter((t) => uns.includes(t)).join(' ') || '(空)');
out('direct ∩ unsupported =', Object.keys(direct).filter((t) => uns.includes(t)).join(' ') || '(空)');
out('\n44 词里「点了没用/零命中」的定义有三种，分别算：');
out('  A 严格：direct 为空  →', terms.length - Object.keys(direct).length, '词');
out('  B 用户口径：不在 unsupported 且 direct 为空 →',
  terms.filter((t) => !uns.includes(t) && !(idx[t].direct || []).length).length, '词');
out('  C 全词表：44 sceneIndex + 29 unsupported =', terms.length + uns.length, '（重叠',
  uns.filter((t) => t in idx).length, '）→ 去重', new Set([...terms, ...uns]).size, '词');

out('\n--- 有直连的 16 词 ---');
for (const t of Object.keys(direct)) out(`  ${t}  →  ${direct[t].join(' ')}`);

out('\n--- 29 个 unsupported 词 ---');
out('  ' + uns.join('、'));

out('\n--- 只有近似的 28 词（每个 2 个近似案）---');
for (const t of Object.keys(nearOnly)) out(`  ${t}  →  ${nearOnly[t].join(' ')}`);

// 覆盖一个词需要多少案：按「direct 命中」算，一个案覆盖几个词？
const byCase = {};
for (const t of terms) for (const id of (idx[t].direct || [])) (byCase[id] = byCase[id] || []).push(t);
out('\n--- 每个案被当作直连答案的行业词数 ---');
out(Object.entries(byCase).sort((a, b) => b[1].length - a[1].length)
  .map(([id, ts]) => `${id}:${ts.length}`).join('  '));
out('没有任何直连词的案 =', w.SCHEMES.map((s) => s.id).filter((id) => !byCase[id]).join(' '));

// 模板层的 3 个 README 行业清单，与 29 个零命中词的差集
const TPL = { M01: ['律所', '咨询', '软件服务', '设计工作室', '代理商'], M02: ['餐厅', '咖啡馆', '烘焙', '民宿', '理发店', '花店'], M03: ['个人作品集', '自由职业者', '小型创意工作室', '摄影师', '设计师', '写作者'] };
const tplAll = [...new Set(Object.values(TPL).flat())];
out('\n模板 README 行业词 =', tplAll.length, '：' + tplAll.join('、'));
out('模板词 ∩ 29 零命中 =', tplAll.filter((t) => uns.includes(t)).join('、') || '(空)');
out('模板词 ∩ 44 索引词 =', tplAll.filter((t) => t in idx).map((t) => `${t}(${(idx[t].direct || []).length ? 'direct' : 'near'})`).join('、') || '(空)');
