// Diff data-before.json vs data-after.json and print the tables the report needs.
import { readFileSync, writeFileSync } from 'node:fs';

const B = JSON.parse(readFileSync('deliverables/69-exec/_bce/data-before.json', 'utf8'));
const A = JSON.parse(readFileSync('deliverables/69-exec/_bce/data-after.json', 'utf8'));
const out = [];
const P = (s) => { out.push(s); console.log(s); };
const f1 = (n) => (n === null || n === undefined ? '—' : (typeof n === 'number' ? (Math.round(n * 10) / 10).toFixed(1) : String(n)));

let regressions = 0;
const reg = (msg) => { regressions++; P('  !! REGRESSION: ' + msg); };

P('=== TABLE 1: 8 breakpoints x 5 sorts — first card ===');
P('');
P('| 视口 | 排序 | 首卡 | 首卡top 前→后 | 卡高 | 余量 前→后 | 完整卡 前→后 | 文档高 前→后 | 溢出 |');
P('|---|---|---|---|---|---|---|---|---|');
for (let i = 0; i < B.matrix.length; i++) {
  const b = B.matrix[i], a = A.matrix[i];
  for (const k of ['n', 'fr', 'thr', 'gate', 'built']) {
    const x = b.perSort[k], y = a.perSort[k];
    const changed = x.firstTop !== y.firstTop || x.slack !== y.slack || x.full !== y.full || x.sh !== y.sh || x.firstH !== y.firstH;
    P(`| ${b.label} | ${k} | ${y.firstId} | ${f1(x.firstTop)} → ${f1(y.firstTop)} | ${f1(y.firstH)} | ${f1(x.slack)} → ${f1(y.slack)} | ${x.full} → ${y.full} | ${x.sh} → ${y.sh} | ${y.overflowX} |${changed ? ' ←' : ''}`);
    if (y.full < x.full) reg(`${b.label}/${k} full ${x.full}→${y.full}`);
    if (y.slack < x.slack - 0.05) reg(`${b.label}/${k} slack ${x.slack}→${y.slack}`);
    if (y.overflowX !== 0) reg(`${b.label}/${k} overflowX ${y.overflowX}`);
  }
}
P('');
P('=== gate tier (390x844) hard constraint ===');
{
  const b = B.matrix.find((m) => m.label === '390x844').perSort.gate;
  const a = A.matrix.find((m) => m.label === '390x844').perSort.gate;
  P(`390x844 gate: full ${b.full} → ${a.full}, slack ${f1(b.slack)} → ${f1(a.slack)}, firstTop ${f1(b.firstTop)} → ${f1(a.firstTop)}`);
  if (!(b.full === 1 && a.full === 1)) reg('gate tier full cards changed');
}
P('');
P('=== TABLE 2: 咖啡店 chip path (real CDP mouse click) ===');
P('');
P('| 视口 | 行数 | 首卡 前 | 首卡 后 | 首卡屏 前→后 | 完整卡 前→后 | 整页屏 前→后 | railOpen 前→后 | railH 前→后 |');
P('|---|---|---|---|---|---|---|---|---|');
for (const label of Object.keys(B.coffee)) {
  const b = B.coffee[label], a = A.coffee[label];
  P(`| ${label} | ${a.measured.rows} | ${f1(b.measured.firstTop)} | ${f1(a.measured.firstTop)} | ${f1(b.firstTopScreens)} → ${f1(a.firstTopScreens)} | ${b.measured.full} → ${a.measured.full} | ${f1(b.screens)} → ${f1(a.screens)} | ${b.railOpen} → ${a.railOpen} | ${f1(b.railH)} → ${f1(a.railH)} |`);
  const narrow = b.narrow;
  if (a.measured.full < b.measured.full) reg(`coffee ${label} full ${b.measured.full}→${a.measured.full}`);
  if (narrow && a.railOpen) reg(`coffee ${label} rail still open in narrow tier`);
  if (!narrow && !a.railOpen) reg(`coffee ${label} rail collapsed in WIDE tier (feature loss)`);
  if (a.screens > b.screens + 0.01) reg(`coffee ${label} doc got longer ${b.screens}→${a.screens}`);
}
P('');
P('=== TABLE 3: empty state — inline template link y position ===');
P('');
P('| 词@视口 | 行数 | head 高 前→后 | #empty-tpl 高 前→后 | inline 链接 top | 首屏内? | 打开Mxx top | 文档高 前→后 |');
P('|---|---|---|---|---|---|---|---|');
for (const key of Object.keys(B.empty)) {
  const b = B.empty[key], a = A.empty[key];
  const inl = a.inlineLink ? a.inlineLink.top : null;
  const vis = inl === null ? '—' : (inl < a.vh ? `✓ (${f1(inl)} < ${a.vh})` : `✗ (${f1(inl)} ≥ ${a.vh})`);
  P(`| ${key} | ${a.rows} | ${f1(b.head && b.head.h)} → ${f1(a.head && a.head.h)} | ${f1(b.emptyTpl && b.emptyTpl.h)} → ${f1(a.emptyTpl && a.emptyTpl.h)} | ${f1(inl)} | ${vis} | ${f1(a.openLink && a.openLink.top)} | ${b.sh} → ${a.sh} |`);
  if (a.sh < b.sh) reg(`empty ${key} doc H shrank (content lost?) ${b.sh}→${a.sh}`);
  if (inl !== null && inl >= a.vh) reg(`empty ${key} inline link below fold`);
}
P('');
P('=== TABLE 4: template strip (#tpl-strip) collapsed ===');
P('');
P('| 视口 | 标签 | 高度 前→后 | 展开? | 首行 前→后 | 首行首屏可见 前→后 | 文档高 前→后 |');
P('|---|---|---|---|---|---|---|');
for (let i = 0; i < B.tplStrip.length; i++) {
  const b = B.tplStrip[i], a = A.tplStrip[i];
  P(`| ${b.label} | ${b.stripHidden ? 'hidden' : b.stripTag || 'SECTION'} → ${a.stripHidden ? 'hidden' : a.stripTag} | ${f1(b.strip && b.strip.h)} → ${f1(a.strip && a.strip.h)} | ${a.stripOpen} | ${f1(b.firstRow && b.firstRow.top)} → ${f1(a.firstRow && a.firstRow.top)} | ${f1(b.firstRow && b.firstRow.visible)} → ${f1(a.firstRow && a.firstRow.visible)} | ${b.sh} → ${a.sh} |`);
}
P('');
P('=== TABLE 5: detail panel riskNote height (fixed layer) ===');
P('');
P('| 案@视口 | hint 高 前→后 | Δ | 面板 scrollH 前→后 | 适用场景 y 前→后 | 面板内模板链接 | 列表首卡 前→后 |');
P('|---|---|---|---|---|---|---|');
for (const key of Object.keys(B.detail)) {
  const b = B.detail[key], a = A.detail[key];
  const d = (a.hintH - b.hintH);
  P(`| ${key} | ${f1(b.hintH)} → ${f1(a.hintH)} | ${d >= 0 ? '+' : ''}${f1(d)} | ${b.detScrollH} → ${a.detScrollH} | ${f1(b.scenesAt && b.scenesAt.top)} → ${f1(a.scenesAt && a.scenesAt.top)} | ${a.tplLinks} | ${f1(b.firstRowTop)} → ${f1(a.firstRowTop)} |`);
  if (a.firstRowTop !== null && b.firstRowTop !== null && Math.abs(a.firstRowTop - b.firstRowTop) > 0.05) reg(`detail ${key} moved the list first row ${b.firstRowTop}→${a.firstRowTop}`);
}
P('');
P('=== TABLE 6: clear/reset still works ===');
P('');
for (const label of Object.keys(B.clearReset)) {
  const b = B.clearReset[label], a = A.clearReset[label];
  P(`${label}: afterChip rows ${b.afterChip.rows}→${a.afterChip.rows} · afterReset rows ${b.afterReset.rows}→${a.afterReset.rows} · count "${a.consistency.count}" · pressedScenes ${a.consistency.pressedScenes} · pressedChips ${a.consistency.pressedChips} · q "${a.consistency.q}" · parked ${a.consistency.parked}`);
  if (a.afterReset.rows !== b.afterReset.rows) reg(`reset ${label} rows ${b.afterReset.rows}→${a.afterReset.rows}`);
  if (a.consistency.pressedScenes !== 0 || a.consistency.pressedChips !== 0 || a.consistency.q !== '') reg(`reset ${label} inconsistent state`);
}
P('');
P(`REGRESSIONS: ${regressions}`);
writeFileSync(`deliverables/69-exec/_bce/compare-${A.tag}.md`, out.join('\n') + '\n', 'utf8');
