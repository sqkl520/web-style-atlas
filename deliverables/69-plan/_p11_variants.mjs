// 探针 11：E 的解法对照。**不改磁盘**，只在页面里注入 CSS/JS 变体，逐个量 docH 与首屏不变量。
// 不变量（上一轮刚挣来的）：390 档首屏必须仍有 1 张完整卡（第一卡 bottom ≤ 844）。
import { Browser, sleep } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const PAGE = 'file:///' + join(ROOT, 'prototypes', '_selection', 'index.html').replace(/\\/g, '/');

const MEASURE = () => {
  const vh = window.innerHeight;
  const rows = Array.from(document.querySelectorAll('.row'));
  const vis = rows.filter((r) => r.offsetParent !== null);
  const b0 = vis[0] ? vis[0].getBoundingClientRect() : null;
  return {
    docH: document.documentElement.scrollHeight,
    screens: +(document.documentElement.scrollHeight / vh).toFixed(2),
    visibleRows: vis.length,
    firstBottom: b0 ? +b0.bottom.toFixed(1) : null,
    firstSlack: b0 ? +(vh - b0.bottom).toFixed(1) : null,
    fullInFold: vis.filter((r) => r.getBoundingClientRect().bottom <= vh && r.getBoundingClientRect().top >= 0).length,
    // 可读性代理：卡片正文实际行数（被 clamp 的会少）
    pLines: vis[0] ? +(vis[0].querySelector('.row-def, p')?.getBoundingClientRect().height / 19).toFixed(1) : null,
  };
};

const VARIANTS = {
  V0_baseline: { css: '' },
  V1_clamp_def_3: { css: '.row p, .row .row-def { display:-webkit-box; -webkit-line-clamp:3; -webkit-box-orient:vertical; overflow:hidden; }' },
  V2_clamp_def_2: { css: '.row p, .row .row-def { display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; }' },
  V3_hide_meta: { css: '.row .row-meta { display:none !important; }' },
  V4_hide_shot: { css: '.row .shot, .row .shot-wrap { display:none !important; }' },
  V5_two_col: { css: '.ledger, #ledger, .rows { display:grid !important; grid-template-columns:1fr 1fr; gap:8px; } .row { min-width:0; }' },
  V6_tight: { css: '.row { padding-top:2px !important; padding-bottom:2px !important; } .row .row-head{margin:0 !important} .row .row-foot{margin:0 !important}' },
  V7_clamp2_plus_hidemeta: { css: '.row p, .row .row-def { display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; } .row .row-meta{display:none !important}' },
};

const br = await Browser.launch({ width: 390, height: 844 });
const res = { at: new Date().toISOString(), vh: 844, variants: {} };
for (const [name, v] of Object.entries(VARIANTS)) {
  const p = await br.newPage({ width: 390, height: 844, dsf: 2, mobile: true });
  await p.goto(PAGE, { settleMs: 2200 });
  await p.eval('document.fonts.ready.then(()=>1)');
  if (v.css) await p.eval((css) => { const s = document.createElement('style'); s.textContent = css; document.head.appendChild(s); return 1; }, v.css);
  await sleep(350);
  const m = await p.eval(MEASURE);
  res.variants[name] = m;
  console.log(`${name.padEnd(24)} docH ${String(m.docH).padStart(6)}  ${String(m.screens).padStart(5)} 屏   首卡余量 ${String(m.firstSlack).padStart(6)}  首屏完整卡 ${m.fullInFold}  卡片正文行 ${m.pLines}`);
  await p.close();
}

// V8/V9：分页与分组折叠（要 JS，单独做）
for (const [name, n] of [['V8_pager_10', 10], ['V8_pager_12', 12], ['V8_pager_15', 15]]) {
  const p = await br.newPage({ width: 390, height: 844, dsf: 2, mobile: true });
  await p.goto(PAGE, { settleMs: 2200 });
  await p.eval('document.fonts.ready.then(()=>1)');
  await p.eval((k) => {
    const rows = Array.from(document.querySelectorAll('.row'));
    rows.forEach((r, i) => { if (i >= k) r.style.display = 'none'; });
    // 追加一条"再看 N 个"的占位，估算按钮成本
    const b = document.createElement('button');
    b.textContent = '再看 ' + (rows.length - k) + ' 个 →';
    b.style.cssText = 'display:block;width:100%;padding:14px;font:inherit;margin:8px 0';
    rows[rows.length - 1].parentNode.appendChild(b);
    return 1;
  }, n);
  await sleep(300);
  const m = await p.eval(MEASURE);
  res.variants[name] = m;
  console.log(`${name.padEnd(24)} docH ${String(m.docH).padStart(6)}  ${String(m.screens).padStart(5)} 屏   首卡余量 ${String(m.firstSlack).padStart(6)}  首屏完整卡 ${m.fullInFold}`);
  await p.close();
}

writeFileSync(join(HERE, 'p5-variants.json'), JSON.stringify(res, null, 1), 'utf8');
console.log('\nwrote p5-variants.json');
await br.close();
