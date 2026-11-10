// 探针 11b：390 档一张卡 389px 到底花在哪 —— 逐子元素分解，并测「只留 1 张缩略图」等变体。
import { Browser, sleep } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const PAGE = 'file:///' + join(ROOT, 'prototypes', '_selection', 'index.html').replace(/\\/g, '/');

const DECOMP = () => {
  const r0 = document.querySelector('.row');
  const out = [];
  const walk = (el, depth) => {
    for (const c of el.children) {
      const cs = getComputedStyle(c);
      if (cs.display === 'none') continue;
      const b = c.getBoundingClientRect();
      out.push({
        tag: c.tagName.toLowerCase() + (typeof c.className === 'string' && c.className ? '.' + c.className.trim().split(/\s+/).join('.') : ''),
        h: +b.height.toFixed(1), w: +b.width.toFixed(1), depth,
        text: (c.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 28),
      });
      if (depth < 2) walk(c, depth + 1);
    }
  };
  walk(r0, 0);
  return { rowH: +r0.getBoundingClientRect().height.toFixed(1), parts: out };
};

const MEASURE = () => {
  const vh = window.innerHeight;
  const vis = Array.from(document.querySelectorAll('.row')).filter((r) => r.offsetParent !== null);
  const b0 = vis[0] ? vis[0].getBoundingClientRect() : null;
  return {
    docH: document.documentElement.scrollHeight,
    screens: +(document.documentElement.scrollHeight / vh).toFixed(2),
    firstSlack: b0 ? +(vh - b0.bottom).toFixed(1) : null,
    fullInFold: vis.filter((r) => { const b = r.getBoundingClientRect(); return b.top >= 0 && b.bottom <= vh; }).length,
    rowH: vis[0] ? +vis[0].getBoundingClientRect().height.toFixed(1) : null,
  };
};

const br = await Browser.launch({ width: 390, height: 844 });
const res = { at: new Date().toISOString() };

// 1) 分解
let p = await br.newPage({ width: 390, height: 844, dsf: 2, mobile: true });
await p.goto(PAGE, { settleMs: 2200 });
await p.eval('document.fonts.ready.then(()=>1)');
res.decomp = await p.eval(DECOMP);
console.log('=== 第一张卡 390 档分解（rowH=' + res.decomp.rowH + '）===');
for (const x of res.decomp.parts) console.log(`  ${'  '.repeat(x.depth)}${x.tag.padEnd(34)} h=${String(x.h).padStart(6)}  w=${String(x.w).padStart(5)}  「${x.text}」`);
await p.close();

// 2) 变体：只留 1 张缩略图 / 缩略图横排一行 / 折叠态
const V = {
  W1_one_shot: '.row .shots figure:not(:first-child){display:none !important}',
  W2_shot_row: '.row .shots{display:flex !important;gap:6px} .row .shots figure{flex:1;min-width:0}',
  W3_head_inline: '.row .row-head{display:flex !important;flex-wrap:wrap;align-items:baseline;gap:0 6px} .row .row-head h3{font-size:16px} .row .row-head .en{font-size:12px}',
  W4_def_2line_clamp: '.row .row-def{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}',
  W5_meta_2col: '.row .row-meta{display:grid !important;grid-template-columns:1fr 1fr;gap:0 8px}',
  W6_one_shot_def2: '.row .shots figure:not(:first-child){display:none !important} .row .row-def{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}',
  W7_all_three_shots_side: '.row .shots{display:flex !important;gap:6px} .row .shots figure{flex:1;min-width:0} .row .row-def{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden} .row .row-meta{display:none !important}',
};
res.variants = {};
for (const [name, css] of Object.entries(V)) {
  const q = await br.newPage({ width: 390, height: 844, dsf: 2, mobile: true });
  await q.goto(PAGE, { settleMs: 2200 });
  await q.eval('document.fonts.ready.then(()=>1)');
  await q.eval((c) => { const s = document.createElement('style'); s.textContent = c; document.head.appendChild(s); return 1; }, css);
  await sleep(300);
  const m = await q.eval(MEASURE);
  res.variants[name] = m;
  console.log(`${name.padEnd(22)} docH ${String(m.docH).padStart(6)}  ${String(m.screens).padStart(5)} 屏  卡高 ${String(m.rowH).padStart(6)}  首屏余量 ${String(m.firstSlack).padStart(6)}  首屏完整卡 ${m.fullInFold}`);
  await q.close();
}
writeFileSync(join(HERE, 'p5b-decomp.json'), JSON.stringify(res, null, 1), 'utf8');
await br.close();
console.log('\nwrote p5b-decomp.json');
