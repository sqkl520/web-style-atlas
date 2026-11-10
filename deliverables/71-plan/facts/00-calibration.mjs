/**
 * 00 · 校准：先证明「读取手段」本身可靠，再看数据。
 *
 * 这个仓库前几轮的错，根因都是「工具口径比被测数据窄」。所以每个测量手段都要有对照实验：
 *
 *   C1  沙箱求值 vs 纯 JSON.parse —— data.js / prompts.js 都是 `window.X = <JSON>;` 形态，
 *       把 `=` 右边那段切出来直接 JSON.parse，应当与 new Function 的结果**逐字段相等**。
 *       若不等，说明求值器吞/改了东西，后面所有数字作废。
 *   C2  沙箱求值是否靠 stub 才跑通（记录它到底引用了哪些全局）。
 *   C3  dna-clean.json → prompts.js 是不是纯搬运：若四字段 30/30 相等，
 *       说明 prompts.js 的分歧**不来自** build-prompts，而来自更上游（clean-dna）。
 *   C4  data.js 里 palette 的构造不变量：palette[0]===bg、primary===palette[1]。
 *       这是 app.js:945 注释里声称的，要独立复核。
 *   C5  规格切段器自证：三种书写惯例各抽一案（S01/A、S11/B、S21/C），
 *       字段数与字段名应与 collect-schemes 的 FIELDS 一致，且行号能回指原文。
 *
 * 运行：node deliverables/71-plan/facts/00-calibration.mjs
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  ROOT, PROTO, IDS, loadData, loadPrompts, loadDnaClean, parseSpec, writeJson, mdTable, stripCopyTail,
} from './lib.mjs';

const out = { at: new Date().toISOString(), checks: [] };
const say = (s) => console.log(s);

/* ── C1 求值器 vs JSON.parse ─────────────────────────────────────── */
function jsonPartOf(src, globalName) {
  const i = src.indexOf('window.' + globalName + ' =');
  if (i < 0) throw new Error('no assignment for ' + globalName);
  let s = src.slice(i + ('window.' + globalName + ' =').length).trim();
  // 去掉末尾的 `;` 与任何尾随注释
  s = s.replace(/;\s*$/, '');
  return s;
}

const dataJs = readFileSync(join(PROTO, '_selection', 'data.js'), 'utf8');
const promptsJs = readFileSync(join(PROTO, '_selection', 'prompts.js'), 'utf8');
const api = loadData();
const pr = loadPrompts();

let c1a = null, c1b = null;
try {
  const parsed = JSON.parse(jsonPartOf(dataJs, 'SCHEMES'));
  c1a = JSON.stringify(parsed) === JSON.stringify(api.rows);
  out.checks.push({ id: 'C1a', what: 'data.js: new Function 求值 === JSON.parse(赋值的右侧)', pass: c1a, n: api.rows.length });
} catch (e) {
  out.checks.push({ id: 'C1a', what: 'data.js JSON.parse 对照', pass: false, err: String(e).slice(0, 200) });
}
try {
  const parsed = JSON.parse(jsonPartOf(promptsJs, 'STYLE_PROMPTS'));
  c1b = JSON.stringify(parsed) === JSON.stringify(pr.doc);
  out.checks.push({ id: 'C1b', what: 'prompts.js: new Function 求值 === JSON.parse(赋值的右侧)', pass: c1b, n: pr.doc.schemes.length });
} catch (e) {
  out.checks.push({ id: 'C1b', what: 'prompts.js JSON.parse 对照', pass: false, err: String(e).slice(0, 200) });
}

/* ── C2 stub 依赖 ─────────────────────────────────────────────── */
out.checks.push({ id: 'C2', what: '求值需要哪些全局 stub（空数组＝纯数据，自包含）', dataJsStubs: api.meta.used, promptsJsStubs: pr.meta.used });

/* ── 覆盖率：30 案齐不齐 ───────────────────────────────────────── */
const dna = loadDnaClean();
const dataById = Object.fromEntries(api.rows.map((r) => [r.id, r]));
const cov = {
  data: api.rows.length, prompts: pr.doc.schemes.length, dna: dna.rows.length,
  dataIds: api.rows.map((r) => r.id).join(','),
  promptsIds: pr.doc.schemes.map((r) => r.id).join(','),
  dnaIds: dna.rows.map((r) => r.id).join(','),
};
out.checks.push({ id: 'C2b', what: '三层案号集合是否完全一致 30/30', pass: cov.data === 30 && cov.prompts === 30 && cov.dna === 30, ...cov });

/* ── C3 dna-clean → prompts.js 是否纯搬运 ───────────────────────── */
const FIELDS_CMP = ['radius', 'shadow', 'lineWidths', 'h1Size', 'bodySize', 'mechanism'];
const dnaById = Object.fromEntries(dna.rows.map((r) => [r.id, r]));
const prById = Object.fromEntries(pr.doc.schemes.map((r) => [r.id, r]));

const c3 = [];
for (const f of FIELDS_CMP) {
  const same = IDS.filter((id) => String(dnaById[id][f]) === String(prById[id].dna[f]));
  c3.push({ field: f, same: same.length, of: 30, diff: IDS.filter((id) => !same.includes(id)) });
}
// palette：dna 是数组 `#HEX name`，prompts 是长串 `#HEX（name）、…`
const palSame = IDS.filter((id) => {
  const a = (dnaById[id].palette || []).map((s) => (/#[0-9A-Fa-f]{6}/.exec(s) || [])[0].toUpperCase()).join(',');
  const b = String(prById[id].dna.palette || '').split('、').map((s) => (/#[0-9A-Fa-f]{6}/.exec(s) || [])[0]).filter(Boolean).map((h) => h.toUpperCase()).join(',');
  return a === b;
});
c3.push({ field: 'palette(hex 序列)', same: palSame.length, of: 30, diff: IDS.filter((id) => !palSame.includes(id)) });
// fonts：对象逐键
const fontSame = IDS.filter((id) => JSON.stringify(dnaById[id].fonts) === JSON.stringify(prById[id].dna.fonts));
c3.push({ field: 'fonts(整对象)', same: fontSame.length, of: 30, diff: IDS.filter((id) => !fontSame.includes(id)) });
out.checks.push({ id: 'C3', what: 'dna-clean.json → prompts.js 是否纯搬运', rows: c3 });

/* ── C4 data.js 的构造不变量 ───────────────────────────────────── */
const inv0 = api.rows.filter((r) => (r.palette || [])[0] === r.bg).length;
const inv1 = api.rows.filter((r) => r.primary === (r.palette || [])[1]).length;
const invBgInPal = api.rows.filter((r) => (r.palette || []).includes(r.bg)).length;
const palLens = {};
for (const r of api.rows) palLens[(r.palette || []).length] = (palLens[(r.palette || []).length] || 0) + 1;
out.checks.push({
  id: 'C4', what: 'data.js 构造不变量（app.js:945 与 :953 的声称）',
  palette0_eq_bg: inv0, bg_in_palette: invBgInPal, primary_eq_palette1: inv1,
  paletteLengths: palLens,
  fail0: api.rows.filter((r) => (r.palette || [])[0] !== r.bg).map((r) => r.id),
  fail1: api.rows.filter((r) => r.primary !== (r.palette || [])[1]).map((r) => r.id),
});

/* ── C5 规格切段器自证 ─────────────────────────────────────────── */
const c5 = ['S01', 'S11', 'S21', 'S07', 'S13'].map((id) => {
  const s = parseSpec(id);
  return {
    id,
    fieldCount: s.fieldKeys.length,
    keys: s.fieldKeys,
    hasP3: !!s.fields['配色系统'],
    hasP4: !!s.fields['字体策略'],
    p3Line: s.fields['配色系统'] ? s.fields['配色系统'].startLine + '-' + s.fields['配色系统'].endLine : '—',
    p4Line: s.fields['字体策略'] ? s.fields['字体策略'].startLine + '-' + s.fields['字体策略'].endLine : '—',
    p3Hexes: s.fields['配色系统'] ? s.fields['配色系统'].hexes.length : 0,
  };
});
out.checks.push({ id: 'C5', what: '规格切段器（独立实现）在三种书写惯例上的自证', rows: c5 });

/* 全 30 案字段齐全度 */
const full = IDS.map((id) => {
  const s = parseSpec(id);
  return { id, n: s.fieldKeys.length, p3: !!s.fields['配色系统'], p4: !!s.fields['字体策略'], p5: !!s.fields['布局与网格'], keys: s.fieldKeys.join('/') };
});
out.specCoverage = {
  allHaveP3: full.filter((x) => x.p3).length,
  allHaveP4: full.filter((x) => x.p4).length,
  allHaveP5: full.filter((x) => x.p5).length,
  fieldCounts: full.map((x) => x.id + ':' + x.n).join(' '),
  rows: full,
};
out.checks.push({ id: 'C5b', what: '30 案字段 3/4/5 是否都能切出来', p3: out.specCoverage.allHaveP3, p4: out.specCoverage.allHaveP4, p5: out.specCoverage.allHaveP5 });

/* ── C6 与上游解析器的**交叉校验**（不是复用，是比对） ──────────────
 * 上游 collect-schemes.mjs 的 parseSpec 也切这 12 字段，并把结果写进了 data.js
 * （def/family/fonts/layout/visuals/motion/audit/risk/landing/scenes/quirk）。
 * 我的独立切段器若与它在这些字段上**逐字不同**，说明我的口径有问题 —— 反之亦然。
 * 这是本轮唯一能同时检验两条解析器的办法：两个实现、同一份 md、比结果。
 */
const CROSS_FIELD = {
  '一句话视觉定义': 'def', '美学家族与参考': 'family', '字体策略': 'fonts',
  '布局与网格': 'layout', '关键视觉元素': 'visuals', '动效与交互': 'motion',
  '去 AI 味审查点': 'audit', '反 AI 味风险与规避': 'risk', '适用场景': 'scenes',
  '可落地要点': 'landing', '设计师签名式怪癖': 'quirk',
};
const cross = [];
/* 比较前先套上游的 dec()：它去掉 `**`、反引号、折叠空白（collect-schemes.mjs:22）。
 * 不套这一步，差异里会混进纯排版噪声，把真正的切段差异淹没。
 * 另外对「适用场景」「设计师签名式怪癖」套 stripCopyTail()：文案段在规格里没有字段编号，
 * 上游把它并进了前一个字段（见 lib.mjs 里 cleanScenes 的说明）。这是**边界口径**差异，
 * 不是值差异，必须剥掉后再比，否则会把自己的口径问题记成两层的数据分歧。 */
const dec = (s) => String(s).replace(/\*\*/g, '').replace(/`/g, '').replace(/\s+/g, ' ').trim();
const COPY_TAIL_FIELDS = new Set(['适用场景', '设计师签名式怪癖']);
for (const [specKey, dataKey] of Object.entries(CROSS_FIELD)) {
  const diff = [];
  for (const id of IDS) {
    let mineRaw = (parseSpec(id).fields[specKey] || {}).text || '';
    if (COPY_TAIL_FIELDS.has(specKey)) mineRaw = stripCopyTail(mineRaw, { keepSentenceEnd: specKey === '设计师签名式怪癖' });
    const mine = dec(mineRaw);
    const theirs = dec(dataById[id][dataKey] || '');
    // S13 的 audit 被上游 cutAuditMarker() 刻意切掉，属已知差异，单独标注
    if (mine !== theirs) diff.push(id + '(' + mine.length + 'vs' + theirs.length + ')');
  }
  cross.push({ field: specKey, dataKey, same: 30 - diff.length, of: 30, diff });
}
out.checks.push({ id: 'C6', what: '独立切段器 vs 上游 collect-schemes 的字段值（逐字比对）', rows: cross });

/* ── 打印 ─────────────────────────────────────────────────────── */
say('=== 00 校准 ===');
for (const c of out.checks) {
  if (c.rows) {
    say('[' + c.id + '] ' + c.what);
    for (const r of c.rows) say('   ' + JSON.stringify(r));
  } else {
    const { id, what, ...rest } = c;
    say('[' + id + '] ' + what + '  ' + JSON.stringify(rest));
  }
}
say('');
say('字段切段覆盖：配色系统 ' + out.specCoverage.allHaveP3 + '/30 · 字体策略 ' + out.specCoverage.allHaveP4 + '/30 · 布局 ' + out.specCoverage.allHaveP5 + '/30');
say('字段数：' + out.specCoverage.fieldCounts);

writeJson('00-calibration.json', out);
say('');
say('→ deliverables/71-plan/facts/00-calibration.json');
