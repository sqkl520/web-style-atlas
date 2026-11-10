// _r11_smalltext.mjs — A5 的「一行卡收紧」引入了 10px 图注，撞上仓库自己的 small-text 判据吗？
// rules.mjs:120 `if (m.type.smallText > 3) add('FAIL','small-text',…)` —— Nothing meant to be read below 13px
import { Browser, sleep } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const PAGE = 'file:///' + join(ROOT, 'prototypes', '_selection', 'index.html').replace(/\\/g, '/');

const A5JS = `
  var ROWFIX='.shots .shot img{max-height:100px}.shot{position:relative}'
    +'.shot figcaption{position:absolute;right:0;bottom:0;font-size:10px;padding:1px 4px;background:rgba(220,220,214,.92)}'
    +'.row-family{-webkit-line-clamp:1}.row{padding:9px 0;gap:14px}';
  window.__ROW = function(){ var s=document.createElement('style');s.setAttribute('data-lab','1');s.textContent=ROWFIX;document.head.appendChild(s); return 1; };
`;

// 复刻 probe.mjs 的 smallText 口径：可见、有文字的块，字号 <13
const SMALL = () => {
  const out = [];
  document.querySelectorAll('body *').forEach((el) => {
    if (el.children.length > 0) return;                    // 只看叶子块
    const txt = (el.textContent || '').trim();
    if (txt.length < 2) return;
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) return;
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') return;
    const fs = parseFloat(cs.fontSize);
    if (fs < 13) out.push({ fs, txt: txt.slice(0, 24), cls: el.className || el.tagName });
  });
  return { count: out.length, items: out.slice(0, 15) };
};

const br = await Browser.launch({ width: 1440, height: 900 });
const out = {};
for (const [t, w, h, m] of [['390', 390, 844, true], ['1440', 1440, 900, false]]) {
  let p = await br.newPage({ width: w, height: h, dsf: 2, mobile: m });
  await p.goto(PAGE, { settleMs: 1700 });
  await p.eval('document.fonts.ready.then(()=>1)');
  const base = await p.eval(SMALL);
  await p.close();
  const p2 = await br.newPage({ width: w, height: h, dsf: 2, mobile: m });
  await p2.goto(PAGE, { settleMs: 1700 });
  await p2.eval('document.fonts.ready.then(()=>1)');
  await p2.eval(A5JS); await p2.eval('window.__ROW()'); await sleep(300);
  const a5 = await p2.eval(SMALL);
  const capH = await p2.eval(() => { const c = document.querySelector('.shot figcaption'); return c ? { fs: getComputedStyle(c).fontSize, h: +c.getBoundingClientRect().height.toFixed(1), txt: c.textContent.trim().slice(0, 30) } : null; });
  await p2.close();
  out[t] = { base, a5, capH };
  console.log('===', t, '=== base<13px:', base.count, ' | A5<13px:', a5.count, ' | figcaption', JSON.stringify(capH));
  console.log('   base:', base.items.map((x) => x.fs + 'px "' + x.txt + '"').join(' ; '));
  console.log('   a5  :', a5.items.map((x) => x.fs + 'px "' + x.txt + '"').join(' ; '));
}
await br.close();
writeFileSync(join(HERE, '_r11_smalltext.json'), JSON.stringify(out, null, 1), 'utf8');
