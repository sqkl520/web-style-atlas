// p-ink.mjs — 用 canvas TextMetrics 量 Noto Sans SC 汉字墨迹高度，
// 算出「行高 1.62 / 1.5 / 1.45 / 1.4」下两行墨迹之间的真实空白（不是盒间距，是看得见的空隙）
import { Browser } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const PAGE = 'file:///' + join(ROOT, 'prototypes', '_selection', 'index.html').replace(/\\/g, '/');

const browser = await Browser.launch({ width: 1440, height: 900 });
const p = await browser.newPage({ width: 390, height: 844, dsf: 2, mobile: true });
await p.goto(PAGE, { settleMs: 1800 });
// 详情面板默认是 hidden，必须先点开一行才有 .field dd
await p.eval(() => { document.querySelector('.row[data-id="S01"]').click(); });
await new Promise((r) => setTimeout(r, 400));

const r = await p.eval(() => {
  const cv = document.createElement('canvas');
  const ctx = cv.getContext('2d');
  ctx.font = '16px "Noto Sans SC", sans-serif';
  const samples = ['国', '△', '永', '警', '簿', '墨'];
  const m = samples.map((ch) => {
    const t = ctx.measureText(ch);
    return {
      ch,
      asc: +t.actualBoundingBoxAscent.toFixed(3),
      desc: +t.actualBoundingBoxDescent.toFixed(3),
      inkH: +(t.actualBoundingBoxAscent + t.actualBoundingBoxDescent).toFixed(3),
      w: +t.width.toFixed(3),
    };
  });
  // 字体本身的度量
  const fm = ctx.measureText('国');
  const fontAsc = fm.fontBoundingBoxAscent, fontDesc = fm.fontBoundingBoxDescent;
  const inkMax = Math.max(...m.map((x) => x.inkH));
  const inkAvg = m.reduce((s, x) => s + x.inkH, 0) / m.length;
  const out = { font: '16px "Noto Sans SC"', fontAsc, fontDesc, inkMax: +inkMax.toFixed(3), inkAvg: +inkAvg.toFixed(3), samples: m, perLh: {} };
  // 行高 → 行盒 → 墨迹之间看得见的空白 = lineHeight - 墨迹高
  for (const lh of [1.4, 1.45, 1.5, 1.55, 1.6, 1.62, 1.7, 1.75]) {
    const box = 16 * lh;
    out.perLh[lh] = {
      box: +box.toFixed(2),
      gapMaxInk: +(box - inkMax).toFixed(2),
      gapAvgInk: +(box - inkAvg).toFixed(2),
      // 与字号之比（clreq 的「行距」口径 = 行高 − 字号，占字号百分比）
      clreqGapPct: +(((box - 16) / 16) * 100).toFixed(1),
      gapOverFontSize: +((box - inkMax) / 16).toFixed(2),
    };
  }
  // 实际渲染的元素：取一个 dd，量它的 line box 与字号
  const dd = document.querySelector('#d-body .fields .field dd');
  const cs = getComputedStyle(dd);
  out.rendered = { fs: cs.fontSize, lh: cs.lineHeight, family: cs.fontFamily };
  return out;
});

console.log(JSON.stringify(r, null, 1));
writeFileSync(join(HERE, 'data-ink.json'), JSON.stringify(r, null, 1));
await p.close();
await browser.close();
