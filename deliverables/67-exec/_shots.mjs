// _shots.mjs — 改前/改后截图：390 与 1440 各 3 张
// 改前 = 把源码里的三块 details 在运行时还原成「没有折叠结构」的旧 DOM，
//        并且撤掉新增的 CSS。做法：直接加载 _before/index.html 不可行（相对路径会断），
//        所以改用「加载源码 → 反做三处 DOM 改动」。
// 为了截图可信，改前那张必须与改前实测的数值（390 首卡 954 / 1440 首卡 387.9）对上，脚本会打印核对值。
import { Browser } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const SRC = 'file:///' + join(ROOT, 'prototypes', '_selection', 'index.html').replace(/\\/g, '/');
const OUT = join(HERE, 'shots-list');
mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const UNFOLD = () => {
  // 反做：把 details 拆掉，子节点按原顺序放回父节点；然后把新增的 CSS 屏蔽掉
  for (const id of ['mast-fold', 'rail-fold', 'bar-fold']) {
    const d = document.getElementById(id);
    if (!d) continue;
    const parent = d.parentNode;
    const kids = [d.querySelector('summary'), ...(id === 'rail-fold' ? [...d.querySelector('.rail-fold-body').children] : [...d.children].filter((c) => c.tagName !== 'SUMMARY'))];
    for (const k of kids) { if (!k) continue; parent.insertBefore(k, d); }
    d.remove();
  }
  // 把 style.css 里我加的那两段（980/620 窄档 + 改后规则）整段屏蔽：
  // 做法是给 <style> 里塞一条同优先级的还原规则不现实 —— 直接删掉规则所在的 styleSheet 不可行
  // （它和详情面板的规则在同一张表里）。
  // 因此这里改为：把 body 上的类去掉 + 用 !important 覆写所有我改过的属性回原值。
  const s = document.createElement('style');
  s.textContent = `
    .mast { padding: 20px var(--pad) 14px !important; }
    .mast-wizard { margin-top: 10px !important; }
    .mast-wizard a { padding: 9px 14px !important; line-height: normal !important; }
    .mast-facts { display: grid !important; grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
      gap: 2px !important; margin-top: 0 !important; padding-top: 0 !important; border-top: 0 !important; }
    .mast-facts > div { display: block !important; border-top: 2px solid var(--ink) !important; padding-top: 8px !important; }
    .mast-facts dt { font-size: var(--s-14) !important; line-height: normal !important; }
    .mast-facts dd { font-size: var(--s-24) !important; line-height: normal !important; margin-top: 2px !important; }
    .rail { max-height: 40vh !important; overflow-y: auto !important; padding: 12px var(--pad) !important; }
    .bar { gap: 12px 18px !important; padding-bottom: 16px !important; }
    .search { flex: 1 1 320px !important; }
    .search input { padding: 7px 10px !important; }
    .shots .shot:first-child { max-width: none !important; }
    .shot { position: static !important; }
    .shot figcaption { position: static !important; right: auto !important; bottom: auto !important;
      padding: 1px 0 2px !important; background: var(--ground-2) !important; }
    .row { gap: 20px !important; padding: 13px 0 !important; }
    .row-head { gap: 8px 10px !important; }
    .row-meta { gap: 6px 14px !important; margin-top: 10px !important; }
    .row-foot { gap: 6px 16px !important; margin-top: 2px !important; line-height: normal !important; }
    @media (max-width: 980px) {
      .rail { max-height: 46vh !important; padding: 14px var(--pad) !important; }
      .shots .shot img { max-height: 214px !important; }
      .row-foot { grid-column: 2 / -1 !important; }
    }
    @media (max-width: 620px) {
      .main { padding: 16px var(--pad) 60px !important; }
      .mast { padding: 20px var(--pad) 14px !important; }
      .rail { max-height: 40vh !important; padding: 12px var(--pad) !important; }
      .shots .shot img { max-height: 190px !important; }
      .shot figcaption { font-size: 11px !important; }
    }
  `;
  document.head.appendChild(s);
};

const M = () => {
  const rows = [...document.querySelectorAll('.row')];
  const vh = innerHeight;
  const boxes = rows.map((el) => { const b = el.getBoundingClientRect(); return { top: b.top, bottom: b.bottom, h: b.height }; });
  return { firstRowTop: +boxes[0].top.toFixed(1), firstRowH: +boxes[0].h.toFixed(1),
    completeCards: boxes.filter((b) => b.top >= -0.5 && b.bottom <= vh + 0.5).length,
    overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth };
};

const browser = await Browser.launch({ width: 1440, height: 900 });
for (const vp of [{ k: '390', w: 390, h: 844, d: 2, m: true }, { k: '1440', w: 1440, h: 900, d: 1, m: false }]) {
  const p = await browser.newPage({ width: vp.w, height: vp.h, dsf: vp.d, mobile: vp.m, reducedMotion: true });
  // 改前
  await p.goto(SRC, { settleMs: 1700 });
  await p.eval(UNFOLD);
  await sleep(400);
  const before = await p.eval(M);
  await p.screenshot({ path: join(OUT, `before-${vp.k}-1-firstscreen.png`), format: 'png' });
  await p.eval(() => window.scrollTo(0, 0));
  await sleep(200);
  await p.screenshot({ path: join(OUT, `before-${vp.k}-2-top.png`), format: 'png' });
  // 改前：滚到首卡
  await p.eval(() => { const r = document.querySelector('.row'); window.scrollTo(0, r.getBoundingClientRect().top + scrollY - 8); });
  await sleep(300);
  await p.screenshot({ path: join(OUT, `before-${vp.k}-3-firstcard.png`), format: 'png' });
  // 改后
  await p.goto(SRC, { settleMs: 1700 });
  const after = await p.eval(M);
  await p.screenshot({ path: join(OUT, `after-${vp.k}-1-firstscreen.png`), format: 'png' });
  // 改后：三块折叠条展开（证明内容在）
  await p.eval(() => { for (const id of ['mast-fold', 'rail-fold', 'bar-fold']) { const d = document.getElementById(id); if (d) d.open = true; } });
  await sleep(400);
  await p.eval(() => window.scrollTo(0, 0));
  await sleep(250);
  const expanded = await p.eval(M);
  await p.screenshot({ path: join(OUT, `after-${vp.k}-2-expanded.png`), format: 'png' });
  // 改后：滚到首卡
  await p.eval(() => { for (const id of ['mast-fold', 'rail-fold', 'bar-fold']) { const d = document.getElementById(id); if (d) d.open = false; } });
  await sleep(300);
  await p.eval(() => { const r = document.querySelector('.row'); window.scrollTo(0, r.getBoundingClientRect().top + scrollY - 8); });
  await sleep(300);
  await p.screenshot({ path: join(OUT, `after-${vp.k}-3-firstcard.png`), format: 'png' });
  console.log(`[${vp.k}] 改前 首卡=${before.firstRowTop} 卡高=${before.firstRowH} 完整=${before.completeCards} ovX=${before.overflowX}`);
  console.log(`[${vp.k}] 改后 首卡=${after.firstRowTop} 卡高=${after.firstRowH} 完整=${after.completeCards} ovX=${after.overflowX}`);
  console.log(`[${vp.k}] 展开后 首卡=${expanded.firstRowTop} 完整=${expanded.completeCards} ovX=${expanded.overflowX}`);
  await p.close();
}
await browser.close();
console.log('shots written to', OUT);
