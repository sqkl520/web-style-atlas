// 任务 C + D：色板对账与裁决。
//
// 三向对账：
//   (1) 提示词声称的色（dna-clean.json 的 palette，来源是 CSS :root 变量名+注释）
//   (2) 实测量到的色（colors-30.json：元素级声明 + 像素级绘制）
//   (3) 规格里明写的色（_specs/Sxx.md 的十六进制字面量）
//
// 关键分辨（这是本任务的核心）：
//   - 若某「集合外色」在 _specs 里**明写** → 提示词漏了规格里已有的信息 → 数据抽取 bug
//     （clean-dna.mjs 只看 :root，规格正文里出现在字段 3 的色不会被收）。
//   - 若不在规格里、面积又显著 → 原型自己超出了规格 → 改原型。
//   - 若面积可忽略且只在亚像素/AA 上 → 不改。
//
// 另外必须区分「否定提及」：规格里写 `禁止 #6366F1` 与「使用 #6366F1」完全不同。
// 上一轮的 LEAD-reconcile30.mjs 用正则抓所有 hex 会把禁用色当成声称色，这是错的。
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { hexToRgb, srgbToLab, dE76 } from './png.mjs';

const ROOT = 'D:/Web/style';
const HERE = 'D:/Web/style/deliverables/70-audit/measure';
const colors = JSON.parse(readFileSync(join(HERE, 'colors-30.json'), 'utf8'));
const dna = JSON.parse(readFileSync(join(ROOT, 'prototypes/_prompts/dna-clean.json'), 'utf8'));

const dnaById = {};
for (const k of Object.keys(dna)) dnaById[dna[k].id] = dna[k];

// ---------- 规格文本解析 ----------
// 必须把「否定语境」和「肯定语境」分开：
//   否定：禁止/不要/不得/反的是/避开/不用/绝不/而不是 … 后面紧跟的 hex
//   肯定：其余
const NEG_WORDS = /(禁止|不要|不得|不是|而非|而不是|反的是|反 |避开|不用|绝不|严禁|避免|禁用|不再|不许|改成|旧|替换|而非)/;
function parseSpec(id) {
  const p = join(ROOT, 'prototypes/_specs', id + '.md');
  if (!existsSync(p)) return null;
  const text = readFileSync(p, 'utf8');
  const positive = new Set(), negative = new Set(), all = [];
  // 逐行扫，按 hex 前 40 字符的窗口判语气
  const lines = text.split(/\n/);
  for (let li = 0; li < lines.length; li++) {
    const line = lines[li];
    const re = /#[0-9A-Fa-f]{6}\b/g;
    let m;
    while ((m = re.exec(line))) {
      const hex = m[0].toUpperCase();
      const before = line.slice(Math.max(0, m.index - 40), m.index);
      const after = line.slice(m.index + hex.length, m.index + hex.length + 24);
      all[index(hex)] = all[index(hex)] || { hex, lines: [], negLines: [] };
      all[index(hex)].lines.push(li + 1);
      // 「禁用色」典型写法：#6366F1 靛蓝 —— 它出现在「反的是…」句里
      if (NEG_WORDS.test(before)) { negative.add(hex); all[index(hex)].negLines.push(li + 1); }
      else positive.add(hex);
    }
  }
  // 一段里同时出现正负时，以「整段是否在讲禁用」为准：如果该 hex 的所有出现都在否定语境，则归否定
  const pos = [...positive].filter((h) => !negative.has(h));
  const neg = [...negative].filter((h) => !positive.has(h) || negative.has(h));
  return { positive: pos, negative: [...negative], all: all.filter(Boolean) };
}
function index(hex) { return hex; }

// 规格里的「旧值/被替换值」：形如 `#8A5A2B`（旧 `#8A5A2B`）或 `（旧 #XXXXXX）`
function specOldValues(id) {
  const p = join(ROOT, 'prototypes/_specs', id + '.md');
  const cv = join(ROOT, 'prototypes/_specs/_CURRENT-VALUES.md');
  const out = new Set();
  for (const f of [p, cv]) {
    if (!existsSync(f)) continue;
    const t = readFileSync(f, 'utf8');
    for (const m of t.matchAll(/旧\s*`?(#[0-9A-Fa-f]{6})`?/g)) out.add(m[1].toUpperCase());
    for (const m of t.matchAll(/`(#[0-9A-Fa-f]{6})`\s*（旧/g)) out.add(m[1].toUpperCase());
  }
  return out;
}

// _CURRENT-VALUES.md 里每案的「当前背景色 / 当前主色」
function currentValues() {
  const t = readFileSync(join(ROOT, 'prototypes/_specs/_CURRENT-VALUES.md'), 'utf8');
  const out = {};
  for (const line of t.split(/\n/)) {
    const m = line.match(/^\|\s*\*\*(S\d\d)\*\*/);
    if (!m) continue;
    const cells = line.split('|').map((s) => s.trim());
    const hexes = [...line.matchAll(/#[0-9A-Fa-f]{6}/g)].map((x) => x[0].toUpperCase());
    out[m[1]] = { row: line, cells, hexes };
  }
  return out;
}

const cv = currentValues();

// ---------- 裁决 ----------
const near = (hex, set, tol = 6) => {
  const a = hexToRgb(hex), la = srgbToLab(...a);
  for (const h of set) {
    const b = hexToRgb(h), lb = srgbToLab(...b);
    if (Math.hypot(a[0]-b[0], a[1]-b[1], a[2]-b[2]) <= tol) return h;
  }
  return null;
};

const report = {};
const table = [];

for (const id of Object.keys(colors).sort()) {
  const c = colors[id];
  const d = dnaById[id] || {};
  const claimed = (d.palette || []).map((s) => {
    const m = s.match(/#[0-9A-Fa-f]{6}/);
    const role = s.replace(/#[0-9A-Fa-f]{6}/, '').trim();
    return m ? { hex: m[0].toUpperCase(), role } : null;
  }).filter(Boolean);
  const claimedSet = new Set(claimed.map((x) => x.hex));
  const prim = new Set((d.primary || []).map((h) => h.toUpperCase()));

  const spec = parseSpec(id) || { positive: [], negative: [], all: [] };
  const specSet = new Set(spec.positive);
  const specNeg = new Set(spec.negative);
  const oldVals = specOldValues(id);

  // 实测色：元素级里，按「面积占比」或「用于正文」筛出有意义的
  const totalArea = c.docSize.w * c.docSize.h;
  const measured = c.colors.map((x) => {
    const share = x.area / totalArea;
    const pxShare = c.pixel.counted ? x.paintedPx / c.pixel.counted : 0;
    return {
      hex: x.hex, count: x.count, area: x.area, share: +share.toFixed(5), pxShare: +pxShare.toFixed(5),
      paintedPx: x.paintedPx, onBodyText: x.onBodyText,
      props: x.props, tags: x.tags, roles: x.roles, samples: x.samples,
      inClaim: claimedSet.has(x.hex),
      inSpec: specSet.has(x.hex),
      inSpecNeg: specNeg.has(x.hex),
      isOld: oldVals.has(x.hex),
    };
  });

  const outside = measured.filter((m) => !m.inClaim);
  // 重要性门槛。
  // 【口径修正】第一版用「元素级面积占比 ≥1%」判定重要性，但元素级面积在嵌套元素上
  // 会重复累加 —— 实测能算出 239% 的「面积占比」（S29 的 #1A1A17），那个数字只是
  // 「有多少元素声明了它、各自多大」，不是屏幕上占多少。用它当阈值会把
  // 「1 个 20px 的小徽标被 200 个父容器继承」误判成重要。
  // 现在以**像素占比**为准（像素不重叠，是屏幕真相），元素级面积只作为辅助证据保留。
  const important = outside.filter((m) => m.pxShare >= 0.01 || m.onBodyText > 0);
  const minor = outside.filter((m) => !important.includes(m) && m.pxShare >= 0.001);
  const negligible = outside.filter((m) => !important.includes(m) && !minor.includes(m));

  // 逐色裁决
  const verdicts = outside.map((m) => {
    let verdict, why, action;
    if (m.inSpecNeg) {
      verdict = 'NOISE-否定提及'; why = '只出现在规格的禁用/否定句里，不是声称色'; action = '不计';
    } else if (m.isOld) {
      verdict = 'STALE-旧值'; why = '规格/当前值表里标为「旧」，已被替换'; action = '原型需清掉旧值';
    } else if (m.inSpec) {
      verdict = 'DATA-规格有但提示词漏'; why = '规格字段 3 明写了这个 hex，但 palette 没收录';
      action = '改 clean-dna.mjs 抽取逻辑';
    } else if (near(m.hex, specSet, 3)) {
      verdict = 'DATA-规格近似值'; why = '与规格某色 RGB 距离 ≤3（取整/舍入差异）'; action = '改 clean-dna.mjs 或视为同色';
    } else if (m.pxShare < 0.001 && m.onBodyText === 0) {
      verdict = 'IGNORE-可忽略'; why = '像素占比 < 0.1% 且不承载正文'; action = '不改';
    } else if (m.onBodyText > 0) {
      // 承载正文/标签文字的集合外色：几乎全是「二级文字色」（figcaption、ref、meta、hud）。
      // 这类色面积必然小（文字只占几万像素），但**视觉上重要**，且它是"色板里没有
      // 一个二级文字色"的缺口 —— 属于数据层该补的，不是原型写错。
      verdict = 'DATA-缺二级文字色';
      why = '用于正文/标签文字（' + m.onBodyText + ' 处），但 palette 只收了主文字色';
      action = '改 clean-dna.mjs：palette 应包含二级文字色';
    } else if (m.pxShare >= 0.01) {
      verdict = 'PROTO-原型超出规格'; why = '规格未写、屏幕占比 ≥1%，且非文字色'; action = '改原型（评估风险）';
    } else {
      verdict = 'IGNORE-次要'; why = '像素占比 0.1%–1%，非正文'; action = '可不改';
    }
    return { hex: m.hex, share: m.share, pxShare: m.pxShare, count: m.count, onBodyText: m.onBodyText,
             props: Object.keys(m.props), samples: m.samples.slice(0, 2), verdict, why, action };
  });

  // 案级裁决：取最严重的
  const rank = { 'PROTO-原型超出规格': 6, 'DATA-规格有但提示词漏': 5, 'DATA-缺二级文字色': 4,
                 'DATA-规格近似值': 3, 'STALE-旧值': 3, 'IGNORE-次要': 2, 'IGNORE-可忽略': 1, 'NOISE-否定提及': 0 };
  const worst = verdicts.slice().sort((a, b) => (rank[b.verdict] || 0) - (rank[a.verdict] || 0))[0];

  const rec = {
    id, dir: c.dir,
    claimed: claimed.map((x) => ({ hex: x.hex, role: x.role, primary: prim.has(x.hex) })),
    specPositive: spec.positive, specNegative: spec.negative,
    measuredCount: measured.length,
    outsideCount: outside.length,
    measured, outside, verdicts,
    importantOutside: important.map((m) => m.hex),
    negligibleOutside: negligible.map((m) => m.hex),
    pixelIsolatedShare: c.pixel.counted ? +(c.pixel.kinds.isolated / c.pixel.counted).toFixed(4) : null,
    caseVerdict: worst ? worst.verdict : 'CLEAN-无集合外色',
    caseAction: worst ? worst.action : '不改',
    hasCurrentValuesRow: !!cv[id],
  };
  report[id] = rec;

  table.push({
    id,
    claimed: claimed.length,
    measured: measured.length,
    outside: outside.length,
    important: important.length,
    verdict: rec.caseVerdict,
    action: rec.caseAction,
    isoPct: rec.pixelIsolatedShare === null ? '-' : (rec.pixelIsolatedShare * 100).toFixed(2) + '%',
    detail: verdicts.filter((v) => v.verdict !== 'NOISE-否定提及').slice(0, 3)
      .map((v) => v.hex + '(' + (v.share * 100).toFixed(2) + '%)').join(' '),
  });
}

writeFileSync(join(HERE, 'palette-reconcile-30.json'), JSON.stringify(report, null, 1), 'utf8');

// ---------- 人读表 ----------
const lines = [];
lines.push('# 任务 C/D 色板对账（自动生成，勿手改）');
lines.push('');
lines.push('生成时间：' + new Date().toISOString());
lines.push('口径：`面积占比` = 元素级面积 / 文档面积；`孤立像素` = 像素级判为「不在色板且非两色混合」的比例。');
lines.push('');
lines.push('| 案 | 声称 | 实测 | 集合外 | 重要 | 像素孤立 | 案级裁决 | 主要集合外色 |');
lines.push('| --- | --- | --- | --- | --- | --- | --- | --- |');
for (const t of table) {
  lines.push(`| ${t.id} | ${t.claimed} | ${t.measured} | ${t.outside} | ${t.important} | ${t.isoPct} | ${t.verdict} | ${t.detail} |`);
}
lines.push('');
lines.push('## 逐案明细');
for (const id of Object.keys(report).sort()) {
  const r = report[id];
  lines.push('');
  lines.push(`### ${id} — ${r.caseVerdict}`);
  lines.push(`声称 ${r.claimed.length}：` + r.claimed.map((x) => x.hex + (x.primary ? '*' : '')).join(' '));
  lines.push(`集合外 ${r.outsideCount}（重要 ${r.importantOutside.length}）`);
  for (const v of r.verdicts.filter((x) => x.verdict !== 'NOISE-否定提及')) {
    lines.push(`  - ${v.hex} 面积 ${(v.share * 100).toFixed(2)}% / 像素 ${(v.pxShare * 100).toFixed(2)}% / ${v.count} 元素${v.onBodyText ? ' / **正文字色**' : ''} → ${v.verdict}（${v.action}）`);
    if (v.samples.length) lines.push(`      样本：${v.samples.join(' ; ').slice(0, 150)}`);
  }
}
writeFileSync(join(HERE, 'palette-reconcile-table.md'), lines.join('\n'), 'utf8');

// ---------- 汇总 ----------
console.log('| 案 | 声称 | 实测 | 集合外 | 重要 | 孤立% | 裁决 |');
console.log('| --- | --- | --- | --- | --- | --- | --- |');
for (const t of table) console.log(`| ${t.id} | ${t.claimed} | ${t.measured} | ${t.outside} | ${t.important} | ${t.isoPct} | ${t.verdict} |`);
console.log('\n案级裁决分布：');
const dist = {};
for (const t of table) dist[t.verdict] = (dist[t.verdict] || 0) + 1;
for (const [k, v] of Object.entries(dist).sort((a, b) => b[1] - a[1])) console.log(`  ${k}: ${v}`);
const withImportant = table.filter((t) => t.important > 0);
console.log(`\n有重要集合外色的案：${withImportant.length} / 30 → ${withImportant.map((t) => t.id).join(' ')}`);
