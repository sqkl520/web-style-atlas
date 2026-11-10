// _p3_claims.mjs — 核实审计报告里哪些结论在 HEAD 已经过期
import { Browser } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const PAGE = 'file:///' + join(ROOT, 'prototypes', '_selection', 'index.html').replace(/\\/g, '/');
const out = {};

const browser = await Browser.launch({ width: 1440, height: 900 });

// ── 1. 390 档：mast-exit 链接高、焦点进面板、Esc 行为、11px 文本 ──
{
  const p = await browser.newPage({ width: 390, height: 844, dsf: 2, mobile: true });
  await p.goto(PAGE, { settleMs: 1500 });
  out.links390 = await p.eval(() => {
    const as = Array.from(document.querySelectorAll('.mast-exit a'));
    return as.map((a) => { const b = a.getBoundingClientRect(); return { text: a.textContent.trim(), h: +b.height.toFixed(1), w: +b.width.toFixed(1), top: +b.top.toFixed(1) }; });
  });
  // 24px 圆间距豁免：圆心距离
  out.linkGap390 = await p.eval(() => {
    const as = Array.from(document.querySelectorAll('.mast-exit a'));
    const c = as.map((a) => { const b = a.getBoundingClientRect(); return { cx: b.left + b.width / 2, cy: b.top + b.height / 2 }; });
    const pairs = [];
    for (let i = 0; i < c.length; i++) for (let j = i + 1; j < c.length; j++) {
      pairs.push(+Math.hypot(c[i].cx - c[j].cx, c[i].cy - c[j].cy).toFixed(1));
    }
    return pairs;
  });
  // 点击打开详情后焦点在哪
  await p.eval(() => { document.querySelector('.row[data-id="S01"]').click(); });
  await new Promise((r) => setTimeout(r, 400));
  out.focusAfterOpen = await p.eval(() => ({
    tag: document.activeElement.tagName,
    cls: document.activeElement.className,
    isHead: document.activeElement === document.querySelector('.detail-head'),
    headHasTabindex: document.querySelector('.detail-head').getAttribute('tabindex'),
  }));
  // 11px 及以下的实际渲染元素数量
  out.smallText390 = await p.eval(() => {
    const res = [];
    document.querySelectorAll('*').forEach((e) => {
      if (!e.childNodes.length) return;
      const hasText = Array.from(e.childNodes).some((n) => n.nodeType === 3 && n.textContent.trim());
      if (!hasText) return;
      const fs = parseFloat(getComputedStyle(e).fontSize);
      if (fs <= 11.5) { const b = e.getBoundingClientRect(); if (b.height > 0) res.push({ tag: e.tagName, cls: (e.className || '').toString().slice(0, 30), fs, txt: e.textContent.replace(/\s+/g, ' ').trim().slice(0, 22) }); }
    });
    return res;
  });
  // Tab 到面板第一个控件要几次（真实键盘）
  await p.eval(() => { document.getElementById('d-close').blur(); document.body.focus(); });
  await p.close();
}

// ── 2. Tab 计数（新进程，干净态，不打开面板）──
{
  const p = await browser.newPage({ width: 390, height: 844, dsf: 2, mobile: true });
  await p.goto(PAGE, { settleMs: 1500 });
  let n = 0, hit = null, firstSummary = null;
  for (let i = 0; i < 220; i++) {
    await p.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9, nativeVirtualKeyCode: 9 });
    await p.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9, nativeVirtualKeyCode: 9 });
    n++;
    const st = await p.eval(() => {
      const a = document.activeElement;
      const inDetail = !!a.closest('#detail');
      return { tag: a.tagName, cls: (a.className || '').toString(), inDetail, isSummary: a.tagName === 'SUMMARY', id: a.id };
    });
    if (st.inDetail && hit === null) hit = { n, ...st };
    if (st.isSummary && firstSummary === null) firstSummary = { n, ...st };
    if (hit && firstSummary) break;
  }
  out.tab390 = { firstInDetail: hit, firstSummary };
  await p.close();
}

// ── 3. 1440 档回归：A5 会不会伤桌面 ──
{
  const p = await browser.newPage({ width: 1440, height: 900, dsf: 1, mobile: false });
  await p.goto(PAGE, { settleMs: 1500 });
  out.desktop = await p.eval(() => {
    const g = (s) => { const e = document.querySelector(s); return e ? +e.getBoundingClientRect().height.toFixed(1) : null; };
    const rows = Array.from(document.querySelectorAll('#ledger .row'));
    const first = rows[0].getBoundingClientRect();
    return {
      mastH: g('.mast'), railW: document.querySelector('.rail').getBoundingClientRect().width,
      barH: g('.bar'), firstTop: +first.top.toFixed(1), firstH: +first.height.toFixed(1),
      complete: rows.filter((r) => { const b = r.getBoundingClientRect(); return b.top >= 0 && b.bottom <= innerHeight; }).length,
      rowHeights: [...new Set(rows.map((r) => +r.getBoundingClientRect().height.toFixed(1)))],
      shotsImgH: (() => { const i = document.querySelector('.row .shots .shot:first-child img'); return i ? +i.getBoundingClientRect().height.toFixed(1) : null; })(),
      // 关键：390 档才生效的规则不能外溢到 1440
      mqActive: matchMedia('(max-width: 620px)').matches,
    };
  });
  await p.close();
}

// ── 4. 首屏「有没有任何方案线索」——首屏内可见的行内元素 ──
{
  const p = await browser.newPage({ width: 390, height: 844, dsf: 2, mobile: true });
  await p.goto(PAGE, { settleMs: 1500 });
  out.firstScreen390 = await p.eval(() => {
    const vh = innerHeight;
    const vis = (e) => { const b = e.getBoundingClientRect(); return b.top < vh && b.bottom > 0 && b.height > 0; };
    const rowEls = Array.from(document.querySelectorAll('#ledger .row *')).filter(vis);
    return {
      vh,
      ledgerTop: +document.querySelector('#ledger').getBoundingClientRect().top.toFixed(1),
      tplStripHidden: document.querySelector('#tpl-strip').hidden,
      emptyHidden: document.querySelector('#empty').hidden,
      anyRowPixelVisible: rowEls.length,
      railVisible: vis(document.querySelector('.rail')),
      railInnerScrollH: document.querySelector('.rail').scrollHeight,
      railClientH: document.querySelector('.rail').clientHeight,
      barVisible: vis(document.querySelector('.bar')),
      searchVisible: vis(document.querySelector('#q')),
    };
  });
  await p.close();
}

writeFileSync(join(HERE, '_p3_claims.json'), JSON.stringify(out, null, 1));
console.log(JSON.stringify(out, null, 1));
await browser.close();
