// p-analyze.mjs — 把 data-typography.json 压成可引用的汇总表（避免 PowerShell 读 UTF-8 JSON 时的乱码）
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const raw = JSON.parse(readFileSync(join(HERE, 'data-typography.json'), 'utf8'));
const IDS = Object.keys(raw.data).sort();
const VN = Object.keys(raw.variants);

const avg = (a) => a.reduce((x, y) => x + y, 0) / a.length;
const r1 = (x) => Math.round(x * 10) / 10;

const rows = [];
for (const vn of VN) {
  const sh = IDS.map((id) => raw.data[id][vn].detail.scrollH);
  const base = IDS.map((id) => raw.data[id]['V0 现状'].detail.scrollH);
  const pct = IDS.map((id, i) => 100 * (sh[i] - base[i]) / base[i]);
  const ddW = IDS[0] && raw.data[IDS[0]][vn].dd.w;
  const cap = raw.data[IDS[0]][vn].ddMetrics[0].cap;
  const lines = IDS.map((id) => raw.data[id][vn].ddMetrics.reduce((s, x) => s + x.nLines, 0));
  const cpl = IDS.map((id) => {
    const m = raw.data[id][vn].ddMetrics;
    const chars = m.reduce((s, x) => s + x.chars, 0);
    const ln = m.reduce((s, x) => s + x.nLines, 0);
    return chars / ln;
  });
  // 单行最长占宽（汉字当量），取全部 dd 里最大的
  const maxLineEm = Math.max(...IDS.flatMap((id) => raw.data[id][vn].ddMetrics.map((x) => x.tallestLineW)));
  const ddLh = raw.data[IDS[0]][vn].dd.lhRatio;
  const fieldPad = raw.data[IDS[0]][vn].field.padT;
  const dtMb = raw.data[IDS[0]][vn].dt.mb;
  const bodyPadL = raw.data[IDS[0]][vn].body.padL;
  rows.push({
    variant: vn, lhRatio: ddLh, fieldPad, dtMb, bodyPadL, ddW, cap,
    scrollMin: Math.min(...sh), scrollMax: Math.max(...sh), scrollAvg: Math.round(avg(sh)),
    deltaAvg: Math.round(avg(sh) - avg(base)),
    pctAvg: r1(avg(pct)), pctMin: r1(Math.min(...pct)), pctMax: r1(Math.max(...pct)),
    linesAvg: r1(avg(lines)), cplAvg: r1(avg(cpl)), maxLineEm: r1(maxLineEm),
    screensMax: r1(Math.max(...IDS.map((id) => raw.data[id][vn].screens))),
  });
}

console.log('| 变体 | lh比 | field内距 | dt下距 | 面板内距 | 正文宽 | 每行容量(字) | scrollH min–max (avg) | Δpx | Δ% (avg) | Δ% 区间 | 总行数 avg | 每行实际字数 | 最长行(汉字当量) | 屏数 max |');
console.log('|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|');
for (const r of rows) {
  console.log(`| ${r.variant} | ${r.lhRatio} | ${r.fieldPad} | ${r.dtMb} | ${r.bodyPadL} | ${r.ddW} | ${r.cap} | ${r.scrollMin}–${r.scrollMax} (${r.scrollAvg}) | ${r.deltaAvg > 0 ? '+' : ''}${r.deltaAvg} | ${r.pctAvg > 0 ? '+' : ''}${r.pctAvg}% | ${r.pctMin}% … ${r.pctMax}% | ${r.linesAvg} | ${r.cplAvg} | ${r.maxLineEm} | ${r.screensMax} |`);
}

// 逐案明细（现状 vs R2 vs 我的推荐候选），供报告取 3 个代表案
const pick = ['S01', 'S14', 'S29'];
console.log('\n逐案 scrollH（代表案）:');
for (const id of pick) {
  console.log(id + ': ' + VN.map((vn) => `${vn.slice(0, 12)}=${raw.data[id][vn].detail.scrollH}`).join('  '));
}

// ── 固定开销拆解（S01，现状）──
const s1 = raw.data.S01['V0 现状'];
console.log('\nS01 现状 dd 行数:', s1.ddMetrics.map((x) => x.nLines).join(','), '合计', s1.ddMetrics.reduce((s, x) => s + x.nLines, 0));
console.log('S01 field 数:', s1.fieldCount, 'fieldsH:', s1.fields.h, 'scrollH:', s1.detail.scrollH);
const padTotal = s1.field.padT * 2 * s1.fieldCount;
console.log('字段内距合计:', padTotal, ' 字段底线合计:', s1.field.borderB * s1.fieldCount, ' dt 行高合计:', r1(21.06 * s1.fieldCount), ' dt 下距合计:', s1.dt.mb * s1.fieldCount);

// 每行字数分布（现状，全 30 案）：把"每行实际字数"按 dd 元素加权
const dist = { '<=20': 0, '21-25': 0, '26-30': 0, '31-40': 0, '>40': 0 };
for (const id of IDS) for (const m of raw.data[id]['V0 现状'].ddMetrics) {
  const c = m.avgCpl;
  if (c <= 20) dist['<=20']++; else if (c <= 25) dist['21-25']++; else if (c <= 30) dist['26-30']++; else if (c <= 40) dist['31-40']++; else dist['>40']++;
}
console.log('\n现状 每行实际字数分布（dd 元素计数，30 案）:', JSON.stringify(dist));

const dist2 = { '<=20': 0, '21-25': 0, '26-30': 0, '31-40': 0, '>40': 0 };
for (const id of IDS) for (const m of raw.data[id]['F 内宽 0 + 内距 6 + lh1.5（极限）'].ddMetrics) {
  const c = m.avgCpl;
  if (c <= 20) dist2['<=20']++; else if (c <= 25) dist2['21-25']++; else if (c <= 30) dist2['26-30']++; else if (c <= 40) dist2['31-40']++; else dist2['>40']++;
}
console.log('极限压内宽(0)后 每行实际字数分布:', JSON.stringify(dist2));

writeFileSync(join(HERE, 'data-typography-summary.json'), JSON.stringify({ rows, dist, dist2 }, null, 1));
