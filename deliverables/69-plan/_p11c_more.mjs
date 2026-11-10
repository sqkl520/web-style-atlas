// 探针 11c：E 的第 4/5 个方案 —— 分组折叠（按结构类型 F/R/S…）与「跳转索引条」。
// 都不改磁盘，只在页面注入。
import { Browser, sleep } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const PAGE = 'file:///' + join(ROOT, 'prototypes', '_selection', 'index.html').replace(/\\/g, '/');

const MEASURE = () => {
  const vh = window.innerHeight;
  const vis = Array.from(document.querySelectorAll('.row')).filter((r) => r.offsetParent !== null);
  const b0 = vis[0] ? vis[0].getBoundingClientRect() : null;
  return {
    docH: document.documentElement.scrollHeight,
    screens: +(document.documentElement.scrollHeight / vh).toFixed(2),
    visibleRows: vis.length,
    firstSlack: b0 ? +(vh - b0.bottom).toFixed(1) : null,
    fullInFold: vis.filter((r) => { const b = r.getBoundingClientRect(); return b.top >= 0 && b.bottom <= vh; }).length,
  };
};

const br = await Browser.launch({ width: 390, height: 844 });
const res = { at: new Date().toISOString(), variants: {} };
const run = async (name, fn, arg) => {
  const p = await br.newPage({ width: 390, height: 844, dsf: 2, mobile: true });
  await p.goto(PAGE, { settleMs: 2200 });
  await p.eval('document.fonts.ready.then(()=>1)');
  await p.eval(fn, arg);
  await sleep(350);
  const m = await p.eval(MEASURE);
  res.variants[name] = m;
  console.log(`${name.padEnd(26)} docH ${String(m.docH).padStart(6)}  ${String(m.screens).padStart(5)} 屏  可见行 ${String(m.visibleRows).padStart(2)}  首屏余量 ${String(m.firstSlack).padStart(7)}  首屏完整卡 ${m.fullInFold}`);
  await p.close();
  return m;
};

// E1 分组折叠：按「结构类型」（F/R/S…，来自 .tag-fr 的文本）分成 <details>，默认全收起
await run('E1_group_fold_FRS', () => {
  const ledger = document.getElementById('ledger');
  const rows = Array.from(ledger.querySelectorAll('.row'));
  const key = (r) => {
    const t = r.querySelector('.tag-fr');
    const m = (t ? t.textContent : '').match(/([A-Z])\s*型/);
    return m ? m[1] : '其他';
  };
  const groups = new Map();
  for (const r of rows) { const k = key(r); groups.set(k, (groups.get(k) || []).concat(r)); }
  ledger.innerHTML = '';
  for (const [k, arr] of groups) {
    const d = document.createElement('details');
    d.innerHTML = '<summary style="padding:14px 0;font:inherit;font-size:16px">' + k + ' 型 · ' + arr.length + ' 个方案 →</summary>';
    for (const r of arr) d.appendChild(r);
    ledger.appendChild(d);
  }
  return 1;
});

// E2 跳转索引条：顶部加一条 A–Z / 01–30 的锚点条（不折叠任何卡片，只给定位）
await run('E2_jump_bar_only', () => {
  const ledger = document.getElementById('ledger');
  const rows = Array.from(ledger.querySelectorAll('.row'));
  const bar = document.createElement('div');
  bar.style.cssText = 'display:flex;flex-wrap:wrap;gap:4px;padding:8px 0';
  for (const r of rows) {
    const id = r.getAttribute('data-id');
    const a = document.createElement('a');
    a.href = '#' + id; a.textContent = id.slice(1);
    a.style.cssText = 'font:12px/1 monospace;padding:6px 4px;min-width:28px;text-align:center;border:1px solid currentColor;text-decoration:none;color:inherit';
    a.onclick = (e) => { e.preventDefault(); r.scrollIntoView({ block: 'start' }); };
    bar.appendChild(a);
  }
  ledger.parentNode.insertBefore(bar, ledger);
  return 1;
});

// E3 两段式：前 8 个平铺 + 其余收进一个 details（默认收起）
await run('E3_first8_then_fold', () => {
  const ledger = document.getElementById('ledger');
  const rows = Array.from(ledger.querySelectorAll('.row'));
  const d = document.createElement('details');
  d.innerHTML = '<summary style="padding:16px 0;font:inherit;font-size:16px">其余 ' + (rows.length - 8) + ' 个方案 →</summary>';
  for (const r of rows.slice(8)) d.appendChild(r);
  ledger.appendChild(d);
  return 1;
});

// E4 虚拟化（等价效果：只渲染 8 个）—— 用隐藏模拟"渲染窗口"，测最小 docH
await run('E4_keep_only_8', () => {
  const rows = Array.from(document.querySelectorAll('.row'));
  rows.forEach((r, i) => { if (i >= 8) r.style.display = 'none'; });
  return 1;
});
await br.close();
writeFileSync(join(HERE, 'p5c-more.json'), JSON.stringify(res, null, 1), 'utf8');
