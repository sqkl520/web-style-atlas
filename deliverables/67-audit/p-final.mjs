// p-final.mjs — 详情面板纵向栈的干净拆解（#d-body 直接子元素，不重复计数）+ 左边缘对齐 + 截图
import { Browser } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const PAGE = 'file:///' + join(ROOT, 'prototypes', '_selection', 'index.html').replace(/\\/g, '/');
const SHOTS = join(HERE, 'shots');
mkdirSync(SHOTS, { recursive: true });
const IDS = Array.from({ length: 30 }, (_, i) => 'S' + String(i + 1).padStart(2, '0'));

const CSS = {
  'V0 现状': '',
  'R2 审计方案': '#detail .field{padding:8px 0}#detail .field dd{line-height:1.5}'
    + '#detail .field dt{margin-bottom:2px}#d-body{padding-left:10px;padding-right:10px}',
  'J 我的推荐（排版部分）': '#detail .field{padding:10px 0}#detail .field dd{line-height:1.6}'
    + '#detail .field dt{margin-bottom:3px}#d-body{padding-left:14px;padding-right:14px}',
};

const PROBE = () => {
  const d = document.getElementById('detail');
  const body = document.getElementById('d-body');
  const cs = (e) => getComputedStyle(e);
  const dTop = d.getBoundingClientRect().top;
  // #d-body 的直接子元素 = 纵向栈，互不重叠
  const kids = Array.from(body.children).map((el) => {
    const r = el.getBoundingClientRect();
    const s = cs(el);
    return {
      cls: el.className || el.tagName,
      top: +(r.top - dTop).toFixed(1), h: +r.height.toFixed(1),
      mt: parseFloat(s.marginTop), mb: parseFloat(s.marginBottom),
    };
  });
  const sumH = kids.reduce((s, x) => s + x.h + x.mt + x.mb, 0);
  const bodyCS = cs(body);
  // 左边缘对齐：sticky 头里的标题 vs 正文
  const headTitle = d.querySelector('.detail-title h2');
  const headNo = d.querySelector('.detail-no');
  const dd = d.querySelector('#d-body .fields .field dd');
  const dt = d.querySelector('#d-body .fields .field dt');
  const dl = d.querySelector('#d-body .fields');
  const L = (e) => e ? +e.getBoundingClientRect().left.toFixed(1) : null;
  return {
    scrollH: d.scrollHeight, clientH: d.clientHeight, clientW: d.clientWidth,
    screens: +(d.scrollHeight / d.clientHeight).toFixed(2),
    bodyPad: { l: parseFloat(bodyCS.paddingLeft), r: parseFloat(bodyCS.paddingRight), t: parseFloat(bodyCS.paddingTop), b: parseFloat(bodyCS.paddingBottom) },
    kids, kidsSum: +sumH.toFixed(1),
    head: +d.querySelector('.detail-head').getBoundingClientRect().height.toFixed(1),
    headPadL: parseFloat(cs(d.querySelector('.detail-head')).paddingLeft),
    align: { headNo: L(headNo), headTitle: L(headTitle), dl: L(dl), dt: L(dt), dd: L(dd) },
    ddW: dd ? +dd.getBoundingClientRect().width.toFixed(1) : null,
    overX: d.scrollWidth - d.clientWidth,
  };
};

const browser = await Browser.launch({ width: 1440, height: 900 });
const p = await browser.newPage({ width: 390, height: 844, dsf: 2, mobile: true });
await p.goto(PAGE, { settleMs: 1600 });
const out = { data: {} };

for (const id of IDS) {
  out.data[id] = {};
  for (const [name, css] of Object.entries(CSS)) {
    await p.eval((sid) => {
      document.querySelectorAll('style[data-lab]').forEach((s) => s.remove());
      document.querySelector('.row[data-id="' + sid + '"]').click();
      document.getElementById('detail').scrollTop = 0;
    }, id);
    await new Promise((r) => setTimeout(r, 110));
    if (css) { await p.eval((c) => { const s = document.createElement('style'); s.setAttribute('data-lab', '1'); s.textContent = c; document.head.appendChild(s); }, css); await new Promise((r) => setTimeout(r, 80)); }
    out.data[id][name] = await p.eval(PROBE);
  }
}
console.log('S01 现状栈:');
for (const k of out.data.S01['V0 现状'].kids) console.log(`  ${String(k.cls).padEnd(16)} top=${String(k.top).padStart(7)} h=${String(k.h).padStart(7)} mt=${k.mt} mb=${k.mb}`);
console.log('  子元素高度和 =', out.data.S01['V0 现状'].kidsSum, ' scrollH =', out.data.S01['V0 现状'].scrollH);
console.log('  align 现状:', JSON.stringify(out.data.S01['V0 现状'].align));
console.log('  align R2  :', JSON.stringify(out.data.S01['R2 审计方案'].align));
console.log('  align J   :', JSON.stringify(out.data.S01['J 我的推荐（排版部分）'].align));

// 30 案汇总：各块的均值
const aggKids = {};
for (const name of Object.keys(CSS)) {
  const acc = {}; let n = 0;
  for (const id of IDS) {
    const k = out.data[id][name]; n++;
    for (const x of k.kids) {
      acc[x.cls] = acc[x.cls] || { h: 0, mt: 0, mb: 0 };
      acc[x.cls].h += x.h; acc[x.cls].mt += x.mt; acc[x.cls].mb += x.mb;
    }
  }
  aggKids[name] = Object.fromEntries(Object.entries(acc).map(([k, v]) => [k, { h: +(v.h / n).toFixed(1), mt: +(v.mt / n).toFixed(1), mb: +(v.mb / n).toFixed(1) }]));
}
out.aggKids = aggKids;
for (const [name, v] of Object.entries(aggKids)) {
  console.log(`\n[${name}] 30 案平均`);
  for (const [k, x] of Object.entries(v)) console.log(`  ${k.padEnd(16)} h=${String(x.h).padStart(7)} mt=${x.mt} mb=${x.mb}`);
}

// 截图：同一字段，三档行高，dsf2
const snap = await browser.newPage({ width: 390, height: 844, dsf: 2, mobile: true });
await snap.goto(PAGE, { settleMs: 1500 });
for (const [name, css, file] of [
  ['V0 现状', '', 'typo-V0.png'],
  ['R2 审计方案', CSS['R2 审计方案'], 'typo-R2.png'],
  ['J 我的推荐（排版部分）', CSS['J 我的推荐（排版部分）'], 'typo-J.png'],
]) {
  await snap.eval((c) => {
    document.querySelectorAll('style[data-lab]').forEach((s) => s.remove());
    document.querySelector('.row[data-id="S01"]').click();
    const d = document.getElementById('detail');
    if (c) { const s = document.createElement('style'); s.setAttribute('data-lab', '1'); s.textContent = c; document.head.appendChild(s); }
    const t = Array.from(document.querySelectorAll('#d-body .fields .field')).find((f) => (f.querySelector('dt') || {}).textContent === '布局与网格');
    d.scrollTop = t.offsetTop - 6;
  }, css);
  await new Promise((r) => setTimeout(r, 240));
  await snap.screenshot({ path: join(SHOTS, file), format: 'png' });
}
await snap.close();
await p.close();
writeFileSync(join(HERE, 'data-final.json'), JSON.stringify(out, null, 1));
await browser.close();
console.log('\nwritten data-final.json');
