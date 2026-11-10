// 裁决 4 实现代价：配色行加「（主色）」「（按钮字用白/黑）」会不会撑高
import { resolve } from 'node:path';
import { Browser, sleep } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { startServer } from './_v_srv.mjs';

const probe = () => {
  const rows = [...document.querySelectorAll('#d-body .field')];
  const paletteRow = rows.find((el) => (el.querySelector('dt') || {}).textContent === '当前有效配色');
  const d = document.getElementById('detail');
  return {
    paletteH: paletteRow ? +paletteRow.getBoundingClientRect().height.toFixed(1) : null,
    paletteText: paletteRow ? paletteRow.querySelector('dd').textContent : '',
    contentH: d.scrollHeight,
  };
};

// 变体 A：加（主色）；变体 B：加（主色）+（按钮字…）
const annotate = (mode) => {
  const lum2 = (hex) => {
    const c = hex.replace('#', '');
    const v = [0, 2, 4].map((i) => parseInt(c.slice(i, i + 2), 16) / 255)
      .map((x) => (x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4)));
    return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2];
  };
  const cr2 = (a, b) => {
    const L1 = lum2(a), L2 = lum2(b);
    const hi = Math.max(L1, L2), lo = Math.min(L1, L2);
    return (hi + 0.05) / (lo + 0.05);
  };
  const rows = [...document.querySelectorAll('#d-body .field')];
  const el = rows.find((x) => (x.querySelector('dt') || {}).textContent === '当前有效配色');
  if (!el) return false;
  const dd = el.querySelector('dd');
  const S = window.SCHEMES.find((s) => s.palette && dd.textContent.indexOf(s.palette[0]) >= 0);
  if (!S) return false;
  const pal = S.palette || [];
  let html = pal.map((h) => (h === pal[1] ? h + '（主色）' : h)).join('　') + '　（底色 ' + S.bg;
  if (mode === 'b') {
    const white = cr2(pal[1], '#FFFFFF');
    const black = cr2(pal[1], '#111111');
    html += '；主色上的按钮字用' + (white >= black ? '白' : '黑') + '字';
  }
  html += '）';
  dd.textContent = html;
  return true;
};

const srv = await startServer({ root: resolve('.') });
const browser = await Browser.launch();
const R = [];
try {
  for (const sid of ['S01', 'S08', 'S13', 'S15', 'S24', 'S26', 'S30']) {
    for (const mode of ['base', 'a', 'b']) {
      const page = await browser.newPage({ width: 1440, height: 900, dsf: 1 });
      await page.goto(srv.origin + '/prototypes/_selection/index.html', { settleMs: 900 });
      await page.eval((id) => { const r = document.querySelector('.row[data-id="' + id + '"]'); if (r) r.click(); }, sid);
      await sleep(600);
      if (mode !== 'base') { await page.eval(annotate, mode); await sleep(250); }
      const m = await page.eval(probe);
      R.push({ sid, mode, ...m });
      console.log(`${sid} ${mode.padEnd(4)} paletteH=${String(m.paletteH).padStart(6)} contentH=${m.contentH}`);
      await page.close();
    }
  }
} finally { await browser.close(); await srv.close(); }

console.log('\n=== 汇总 ===');
for (const mode of ['base', 'a', 'b']) {
  const g = R.filter((x) => x.mode === mode);
  const hs = g.map((x) => x.paletteH);
  const cs = g.map((x) => x.contentH);
  console.log(`${mode.padEnd(4)} paletteH min/max ${Math.min(...hs)}/${Math.max(...hs)}  contentH min/max ${Math.min(...cs)}/${Math.max(...cs)}`);
}
console.log('\nS15 配色行原文:');
console.log(' base:', R.find((x) => x.sid === 'S15' && x.mode === 'base').paletteText);
console.log(' b   :', R.find((x) => x.sid === 'S15' && x.mode === 'b').paletteText);
