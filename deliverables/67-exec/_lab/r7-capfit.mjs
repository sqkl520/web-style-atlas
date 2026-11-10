// r7-capfit.mjs — 390 档 .row-meta 的行内排布账：cap 12→13 到底把哪一项挤到下一行、差多少 px
import { Browser } from '../../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..', '..');
const PAGE = 'file:///' + join(ROOT, 'prototypes', '_selection', 'index.html').replace(/\\/g, '/');

const PROBE = `
(function () {
  var px = function (v) { return Math.round(v * 100) / 100; };
  var meta = document.querySelector('#ledger .row .row-meta');
  var mr = meta.getBoundingClientRect();
  var cs = getComputedStyle(meta);
  var items = Array.prototype.map.call(meta.children, function (k) {
    var b = k.getBoundingClientRect();
    return { cls: (k.className || '').trim(), w: px(b.width), h: px(b.height), top: px(b.top - mr.top), left: px(b.left - mr.left), fs: cs.fontSize };
  });
  return JSON.stringify({
    metaW: px(mr.width), metaH: px(mr.height), colGap: cs.columnGap, rowGap: cs.rowGap,
    items: items,
    // 每行总宽（用来算"还差多少"）
    lines: items.reduce(function (acc, it) {
      var key = it.top;
      acc[key] = acc[key] || { sum: 0, n: 0, items: [] };
      acc[key].sum = px(acc[key].sum + it.w); acc[key].n++; acc[key].items.push(it.cls);
      return acc;
    }, {}),
    rowH: px(document.querySelector('#ledger .row').getBoundingClientRect().height)
  }, null, 1);
})()
`;

const VS = [
  { name: 'baseline(cap12)', css: '' },
  { name: 'cap13', css: '.cap{font-size:var(--s-13)}' },
  { name: 'cap13+colgap8', css: '.cap{font-size:var(--s-13)} .row-meta{column-gap:8px}' },
  { name: 'cap13+colgap6', css: '.cap{font-size:var(--s-13)} .row-meta{column-gap:6px}' },
  { name: 'cap13+colgap8+gap2', css: '.cap{font-size:var(--s-13)} .row-meta{column-gap:8px;row-gap:2px}' },
  { name: 'cap13+pad7', css: '.cap{font-size:var(--s-13)} .row{padding:7px 0}' },
  { name: 'cap13+colgap8+shot172', css: '.cap{font-size:var(--s-13)} .row-meta{column-gap:8px} .shots .shot:first-child{max-width:172px}' },
];

const browser = await Browser.launch();
try {
  const page = await browser.newPage({ width: 390, height: 844, mobile: true });
  await page.setViewport({ width: 390, height: 844, mobile: true });
  await page.goto(PAGE, { settleMs: 1200 });
  await page.eval(`(async () => { if (document.fonts && document.fonts.ready) { try { await document.fonts.ready; } catch (e) {} } return 1; })()`);
  for (const v of VS) {
    await page.eval(`(function(){
      var s=document.getElementById('__r7'); if(!s){s=document.createElement('style');s.id='__r7';document.head.appendChild(s);}
      s.textContent=${JSON.stringify(v.css)}; return 1;})()`);
    await new Promise((r) => setTimeout(r, 250));
    const m = JSON.parse(await page.eval(PROBE));
    const rows = Object.entries(m.lines).map(([t, l]) => `${t}px:n=${l.n}/Σ${l.sum}`).join('  ');
    console.log(`\n--- ${v.name} ---  metaH=${m.metaH} rowH=${m.rowH} metaW=${m.metaW} colGap=${m.colGap}`);
    console.log('   ' + rows);
    console.log('   ' + m.items.map((i) => `${i.cls}@${i.top} w${i.w}`).join('  '));
  }
  await page.close();
} finally { await browser.close(); }
