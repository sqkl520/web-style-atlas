// m4-row.mjs — 390 档单卡解剖：一行卡 578px 由什么组成 + 卡内可压缩空间实测
import { Browser } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const PAGE = 'file:///' + join(ROOT, 'prototypes', '_selection', 'index.html').replace(/\\/g, '/');
const SHOTS = join(HERE, 'shots-mobile');

const ANATOMY = () => {
  const row = document.querySelector('.row');
  const rel = (el) => {
    if (!el) return null;
    const b = el.getBoundingClientRect();
    const rb = row.getBoundingClientRect();
    return { top: +(b.top - rb.top).toFixed(1), h: +b.height.toFixed(1), w: +b.width.toFixed(1) };
  };
  const cs = getComputedStyle(row);
  return {
    rowH: +row.getBoundingClientRect().height.toFixed(1),
    rowPad: cs.padding, rowGap: cs.gap, rowCols: cs.gridTemplateColumns,
    parts: {
      no: rel(row.querySelector('.no')),
      head: rel(row.querySelector('.row-head')),
      title: rel(row.querySelector('.row-head h3')),
      def: rel(row.querySelector('.row-def')),
      meta: rel(row.querySelector('.row-meta')),
      family: rel(row.querySelector('.row-family')),
      swatches: rel(row.querySelector('.swatches')),
      shots: rel(row.querySelector('.shots')),
      shotImg: rel(row.querySelector('.shots .shot:first-child img')),
      shotCap: rel(row.querySelector('.shot figcaption')),
      foot: rel(row.querySelector('.row-foot')),
    },
    mono: { def: getComputedStyle(row.querySelector('.row-def')).webkitLineClamp, fam: getComputedStyle(row.querySelector('.row-family')).webkitLineClamp },
    defText: (row.querySelector('.row-def') || {}).textContent,
    defChars: ((row.querySelector('.row-def') || {}).textContent || '').length,
    famText: ((row.querySelector('.row-family') || {}).textContent || '').length,
  };
};

// 压缩实验：每项都是页面内函数
const EXPERIMENTS = [
  { key: 'R0', label: '现状', fn: () => {} },
  { key: 'R1', label: 'def 从 3 行压到 2 行', fn: () => { document.querySelectorAll('.row-def').forEach((e) => { e.style.webkitLineClamp = '2'; }); } },
  { key: 'R2', label: 'R1 + family 收到 1 行', fn: () => {
    document.querySelectorAll('.row-def').forEach((e) => { e.style.webkitLineClamp = '2'; });
    document.querySelectorAll('.row-family').forEach((e) => { e.style.webkitLineClamp = '1'; });
  } },
  { key: 'R3', label: 'R2 + 缩略图 190→120 高', fn: () => {
    document.querySelectorAll('.row-def').forEach((e) => { e.style.webkitLineClamp = '2'; });
    document.querySelectorAll('.row-family').forEach((e) => { e.style.webkitLineClamp = '1'; });
    const st = document.createElement('style'); st.textContent = '.shots .shot img{max-height:120px}'; document.head.appendChild(st);
  } },
  { key: 'R4', label: 'R3 + 图注移到图上（叠字，不占行）', fn: () => {
    document.querySelectorAll('.row-def').forEach((e) => { e.style.webkitLineClamp = '2'; });
    document.querySelectorAll('.row-family').forEach((e) => { e.style.webkitLineClamp = '1'; });
    const st = document.createElement('style');
    st.textContent = '.shots .shot img{max-height:120px}.shot{position:relative}.shot figcaption{position:absolute;right:0;bottom:0;font-size:10px;padding:1px 4px;background:rgba(220,220,214,.92)}';
    document.head.appendChild(st);
  } },
  { key: 'R5', label: 'R4 + meta 只留一行（色块+错误码，家族已在 family 行）', fn: () => {
    document.querySelectorAll('.row-def').forEach((e) => { e.style.webkitLineClamp = '2'; });
    document.querySelectorAll('.row-family').forEach((e) => { e.style.webkitLineClamp = '1'; });
    const st = document.createElement('style');
    st.textContent = '.shots .shot img{max-height:120px}.shot{position:relative}.shot figcaption{position:absolute;right:0;bottom:0;font-size:10px;padding:1px 4px;background:rgba(220,220,214,.92)}.row-meta{display:none}';
    document.head.appendChild(st);
  } },
];

const browser = await Browser.launch({ width: 1440, height: 900 });
const out = { measuredAt: new Date().toISOString(), vps: {} };

for (const vp of [{ name: '390', w: 390, h: 844, mobile: true }, { name: '414', w: 414, h: 896, mobile: true }]) {
  const p = await browser.newPage({ width: vp.w, height: vp.h, dsf: 2, mobile: vp.mobile });
  await p.goto(PAGE, { settleMs: 1600 });
  const anatomy = await p.eval(ANATOMY);
  out.vps[vp.name] = { anatomy, exps: [] };
  console.log(`[${vp.name}] rowH=${anatomy.rowH} pad=${anatomy.rowPad} gap=${anatomy.rowGap} cols=${anatomy.rowCols}`);
  for (const [k, v] of Object.entries(anatomy.parts)) if (v) console.log(`   ${k.padEnd(10)} top=${String(v.top).padStart(6)} h=${v.h}`);
  console.log('   defChars', anatomy.defChars, 'famChars', anatomy.famText);

  for (const ex of EXPERIMENTS) {
    const p2 = await browser.newPage({ width: vp.w, height: vp.h, dsf: 2, mobile: vp.mobile });
    await p2.goto(PAGE, { settleMs: 1500 });
    await p2.eval((fn) => { (new Function('return (' + fn + ')')())(); }, ex.fn.toString());
    await new Promise((r) => setTimeout(r, 280));
    const m = await p2.eval(() => {
      const rows = Array.from(document.querySelectorAll('.row'));
      const vh = window.innerHeight;
      const infos = rows.map((el) => { const b = el.getBoundingClientRect(); return { top: b.top, bottom: b.bottom, h: b.height }; });
      return {
        firstRowTop: +infos[0].top.toFixed(1),
        firstRowH: +infos[0].h.toFixed(1),
        complete: infos.filter((x) => x.top >= 0 && x.bottom <= vh).length,
        partial: infos.filter((x) => x.top < vh && x.bottom > vh).length,
        rowAvgH: +(infos.reduce((a, b) => a + b.h, 0) / infos.length).toFixed(1),
        overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      };
    });
    m.key = ex.key; m.label = ex.label;
    out.vps[vp.name].exps.push(m);
    console.log(`   ${ex.key} ${ex.label.padEnd(46)} rowH=${m.firstRowH} complete=${m.complete} partial=${m.partial} ovX=${m.overflowX}`);
    if (vp.name === '390' && ex.key !== 'R0') {
      await p2.eval(() => window.scrollTo(0, 0));
      await new Promise((r) => setTimeout(r, 200));
      await p2.screenshot({ path: join(SHOTS, `row-${ex.key}-390.png`), format: 'png' });
    }
    await p2.close();
  }
  await p.close();
}

writeFileSync(join(HERE, 'data-m4-row.json'), JSON.stringify(out, null, 1));
await browser.close();
console.log('written data-m4-row.json');
