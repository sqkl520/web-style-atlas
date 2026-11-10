// _probe-directions.mjs — 三件事：
//  1) 作者样式能否让「关闭态 <details>」的 body 在桌面档照常显示（这样同一份 DOM 可以两档两态）
//  2) 片段深链 ./#tpl-exit 落到关闭的 details 内部时，Chrome 会不会自动展开
//  3) 768×1024 档现状：是不是也 0 卡（决定改动收在 620 还是 980 断点）
import { Browser } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const PAGE = 'file:///' + join(ROOT, 'prototypes', '_selection', 'index.html').replace(/\\/g, '/');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await Browser.launch({ width: 1440, height: 900 });
const res = {};

// ── 1) 关闭态 details 能否被作者样式掀开 ─────────────────────────────────
{
  const p = await browser.newPage({ width: 1440, height: 900 });
  await p.goto(PAGE, { settleMs: 1500 });
  res.revealClosedDetails = await p.eval(() => {
    const d = document.createElement('details');
    d.innerHTML = '<summary id="s1">S</summary><div id="b1" style="height:40px">body</div>';
    document.body.appendChild(d);
    const st = document.createElement('style');
    st.textContent = 'details.reveal > .x, details.reveal > #b1 { display: block; }';
    document.head.appendChild(st);
    d.className = 'reveal';
    const h0 = document.getElementById('b1').getBoundingClientRect().height;
    // 试法 A：直接给 body 写 display:block
    document.getElementById('b1').style.display = 'block';
    const hA = document.getElementById('b1').getBoundingClientRect().height;
    // 试法 B：给 details 自己写 content-visibility / 用 ::details-content
    const cv = CSS.supports('selector(::details-content)');
    // 试法 C：把 body 设为 position:absolute 看是否仍在渲染树
    document.getElementById('b1').style.position = 'relative';
    const hC = document.getElementById('b1').getBoundingClientRect().height;
    const out = { open: d.open, h0, hA, hC, supportsDetailsContent: cv, chromeUA: navigator.userAgent };
    d.remove();
    return out;
  });
  // 再试 ::details-content 的 content-visibility
  res.detailsContentTrick = await p.eval(() => {
    const d = document.createElement('details');
    d.innerHTML = '<summary>S</summary><div id="b2" style="height:40px">body</div>';
    document.body.appendChild(d);
    const st = document.createElement('style');
    st.textContent = 'details::details-content { content-visibility: visible !important; }';
    document.head.appendChild(st);
    const h = document.getElementById('b2').getBoundingClientRect().height;
    const visible = document.getElementById('b2').checkVisibility ? document.getElementById('b2').checkVisibility() : null;
    d.remove();
    return { h, visible, hasPseudo: CSS.supports('selector(details::details-content)') };
  });

  // ── 2) 片段导航能否自动展开 ────────────────────────────────────────────
  const deep = PAGE + '#tpl-exit';
  await p.goto(deep, { settleMs: 1200 });
  res.fragAutoOpen = await p.eval(() => {
    // 现在 DOM 里 #tpl-exit 还不在 details 里。造一个真场景：把它塞进关闭的 details，
    // 再在同一页面内做一次 location.hash 跳转。
    const exit = document.getElementById('tpl-exit');
    const d = document.createElement('details');
    d.id = 'probe-fold';
    const s = document.createElement('summary'); s.textContent = 'fold';
    exit.parentNode.insertBefore(d, exit);
    d.appendChild(s); d.appendChild(exit);
    d.open = false;
    const before = d.open;
    location.hash = '';
    location.hash = '#tpl-exit';
    return { before, after: d.open, scrollY: Math.round(window.scrollY), exitTop: +exit.getBoundingClientRect().top.toFixed(1) };
  });
  await sleep(600);
  res.fragAutoOpenSettled = await p.eval(() => {
    const d = document.getElementById('probe-fold');
    const exit = document.getElementById('tpl-exit');
    return { open: d.open, exitTop: +exit.getBoundingClientRect().top.toFixed(1), hash: location.hash };
  });

  // ── 2b) 键盘 Tab 能否进入关闭 details 内部（应该不能，除非 open）───────────
  res.focusInsideClosed = await p.eval(() => {
    const d = document.getElementById('probe-fold');
    d.open = false;
    const a = document.querySelector('#probe-fold a');
    a.focus();
    return { activeIsLink: document.activeElement === a, openAfterFocus: d.open };
  });
  await p.close();
}

// ── 3) 768×1024 现状 + 组合方案 ──────────────────────────────────────────
{
  const p = await browser.newPage({ width: 768, height: 1024, dsf: 1, mobile: false });
  await p.goto(PAGE, { settleMs: 1600 });
  const M = () => {
    const rows = [...document.querySelectorAll('.row')];
    const vh = innerHeight;
    const boxes = rows.map((el) => { const b = el.getBoundingClientRect(); return { top: +b.top.toFixed(1), bottom: +b.bottom.toFixed(1), h: +b.height.toFixed(1) }; });
    const g = (s) => { const e = document.querySelector(s); return e ? +e.getBoundingClientRect().height.toFixed(1) : null; };
    const de = document.documentElement;
    return { mastH: g('.mast'), railH: g('.rail'), railScrollH: document.querySelector('.rail')?.scrollHeight, barH: g('.bar'),
      firstRowTop: boxes[0]?.top, firstRowH: boxes[0]?.h,
      completeCards: boxes.filter((b) => b.top >= -0.5 && b.bottom <= vh + 0.5).length,
      overflowX: de.scrollWidth - de.clientWidth, docH: de.scrollHeight };
  };
  const v0 = await p.eval(M);

  // 768 用 980 断点的那套（rail 限高 46vh）已生效；看看折起来能到哪
  const combo = `
    var claim = document.querySelector('.mast-claim');
    var exit  = document.querySelector('.mast-exit');
    var wiz   = document.querySelector('.mast-wizard');
    var d = document.createElement('details');
    var s = document.createElement('summary'); s.textContent = 'fold';
    s.style.cssText = 'min-height:44px;display:flex;align-items:center;font-size:14px;padding:8px 0;cursor:pointer';
    claim.parentNode.insertBefore(d, claim);
    d.appendChild(s); d.appendChild(claim); d.appendChild(wiz); d.appendChild(exit);
    d.open = false;
    var st = document.createElement('style');
    st.textContent = '.mast-facts{display:flex;gap:10px;margin-top:12px}.mast-facts>div{flex:1 1 0;border-top:1px solid var(--ink);padding-top:4px;min-width:0}'
      + '.mast-facts dt{font-size:11px}.mast-facts dd{font-size:16px;margin-top:0}';
    document.head.appendChild(st);
    var rail = document.querySelector('.rail');
    var rd = document.createElement('details'); var rs = document.createElement('summary');
    rs.textContent = '筛选';
    rs.style.cssText = 'min-height:48px;display:flex;align-items:center;font-size:14px;font-weight:600;cursor:pointer';
    var rb = document.createElement('div');
    while (rail.firstChild) rb.appendChild(rail.firstChild);
    rail.appendChild(rd); rd.appendChild(rs); rd.appendChild(rb); rd.open = false;
    rail.style.maxHeight = 'none'; rail.style.overflow = 'visible';
    var bar = document.querySelector('.bar');
    var bd = document.createElement('details'); var bs = document.createElement('summary');
    bs.textContent = '排序与清空';
    bs.style.cssText = 'min-height:36px;display:flex;align-items:center;font-size:13px;padding:6px 8px;border:1px solid var(--rule-2);cursor:pointer';
    bar.appendChild(bd); bd.appendChild(bs);
    bd.appendChild(document.querySelector('.sort')); bd.appendChild(document.querySelector('#reset')); bd.open = false;
    var st2 = document.createElement('style');
    st2.textContent = '.search{flex:1 1 100%}.bar{gap:8px 10px;padding-bottom:12px}';
    document.head.appendChild(st2);
  `;
  await p.eval((code) => { new Function(code)(); }, combo);
  await sleep(300);
  const vCombo = await p.eval(M);
  res.vp768 = { v0, vCombo };
  await p.close();
}

writeFileSync(join(HERE, 'data-67-probe.json'), JSON.stringify(res, null, 1));
await browser.close();
console.log(JSON.stringify(res, null, 1));
