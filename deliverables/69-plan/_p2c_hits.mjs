// 探针 2c：逐词算「用户搜这个词会看到几行」。
// 判据逐字照抄 prototypes/_selection/app.js 的 match() 里的 hay（见 _p2b 输出）：
//   hay = [id,cn,en,family,fonts,def,tone,structure,errorCode,threshold,layout,visuals,quirk,scenesYes,
//          axes.ground,axes.band,axes.load,axes.loud, palette.join(' ')].join(' ').toLowerCase()
// 然后 hay.indexOf(q)>=0。中文不受 toLowerCase 影响。
import { loadCtx, out } from './_lib.mjs';

const w = loadCtx();
const S = w.SCHEMES;
const P = w.STYLE_PROMPTS;
const terms = Object.keys(P.sceneIndex);
const uns = P.unsupported || [];

function hay(r) {
  const ax = r.axes || {};
  return [r.id, r.cn, r.en, r.family, r.fonts, r.def, r.tone, r.structure,
    r.errorCode, r.threshold, r.layout, r.visuals, r.quirk,
    r.scenesYes,
    ax.ground, ax.band, ax.load, ax.loud,
    (r.palette || []).join(' ')].join(' ').toLowerCase();
}
const H = new Map(S.map((r) => [r.id, hay(r)]));
const hits = (q) => S.filter((r) => H.get(r.id).includes(String(q).toLowerCase())).map((r) => r.id);

out('=== 44 个索引词，纯搜索命中数（不点芯片） ===');
const rows44 = terms.map((t) => [t, hits(t), (P.sceneIndex[t].direct || []).length]);
out('  0 命中:', rows44.filter((r) => !r[1].length).map((r) => r[0]).join('、') || '(无)');
out('  有命中:', rows44.filter((r) => r[1].length).length, '/44');
out('  有直连的 16 词命中数:', rows44.filter((r) => r[2]).map((r) => `${r[0]}=${r[1].length}`).join(' '));

out('\n=== 29 个 unsupported 词，纯搜索命中数 ===');
const rows29 = uns.map((t) => [t, hits(t)]);
out('  0 命中:', rows29.filter((r) => !r[1].length).map((r) => r[0]).join('、'));
out('  >0 命中（搜索能碰到，只是没直连方案）:');
for (const [t, h] of rows29.filter((r) => r[1].length)) out(`    ${t}  ${h.length} 行  ${h.join(' ')}`);

out('\n=== 28 个只有近似的词，纯搜索命中数 ===');
for (const t of terms.filter((t) => !(P.sceneIndex[t].direct || []).length)) {
  const h = hits(t);
  out(`  ${t.padEnd(6, '　')} ${String(h.length).padStart(2)} 行  ${h.join(' ')}`);
}

out('\n=== 芯片路径（点了左侧行业芯片）= state.sceneIds = direct ∪ near ===');
const chipZero = terms.filter((t) => {
  const ids = [...(P.sceneIndex[t].direct || []), ...(P.sceneIndex[t].near || [])];
  return ids.length === 0;
});
out('  芯片点了仍是 0 行的词:', chipZero.join('、') || '(无)');
out('  direct∪near 小于 2 个案的词:', terms.filter((t) => ((P.sceneIndex[t].direct || []).length + (P.sceneIndex[t].near || []).length) < 2).join('、') || '(无)');

out('\n=== 「先搜后点芯片」= 交叠（q 与 sceneIds 取交集）===');
for (const t of ['餐厅', '咖啡店', '花店', '民宿', '律师', '诊所', '电商', '服装']) {
  const ids = [...(P.sceneIndex[t]?.direct || []), ...(P.sceneIndex[t]?.near || [])];
  const h = hits(t);
  const inter = ids.filter((id) => h.includes(id));
  out(`  ${t.padEnd(4, '　')} q命中 ${h.length}，芯片 ${ids.length}，交集 ${inter.length}  → ${inter.join(' ') || '0 行'}`);
}
