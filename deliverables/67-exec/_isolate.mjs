// _isolate.mjs — 把「我的改动」与「另一个 Agent 的 h1 改动」分开：
// 现在的树里同时有两笔未提交改动。要证明「1440 档不受损」是**我的**那部分为 0，
// 做法是：在运行时把我这一段 CSS（列表页首屏那一段 + 三块折叠的 DOM 结构）关掉，
// 量一次；再打开，量一次。两次之差才是我的贡献。
// 关掉的办法：给 <details> 全部 open + 把三块 summary 藏掉 + 覆盖回我改过的属性。
import { Browser } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const SRC = 'file:///' + join(ROOT, 'prototypes', '_selection', 'index.html').replace(/\\/g, '/');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const M = () => {
  const q = (s) => document.querySelector(s);
  const h = (s) => { const e = q(s); return e ? +e.getBoundingClientRect().height.toFixed(1) : null; };
  const rows = [...document.querySelectorAll('.row')];
  const vh = innerHeight;
  const boxes = rows.map((el) => { const b = el.getBoundingClientRect(); return { top: +b.top.toFixed(1), bottom: +b.bottom.toFixed(1), h: +b.height.toFixed(1) }; });
  return { mastH: h('.mast'), railH: h('.rail'), barH: h('.bar'),
    firstRowTop: boxes[0]?.top, firstRowH: boxes[0]?.h,
    completeCards: boxes.filter((b) => b.top >= -0.5 && b.bottom <= vh + 0.5).length,
    overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    railChips: q('.rail')?.querySelectorAll('.chips button').length,
    railScrollH: q('.rail')?.scrollHeight };
};

// 把「我的那一段」整段抵消：三块 details 全部强制 open、summary 不占位，
// 并把我在窄档/宽档改过的属性全部写回原值。
const DISABLE_MINE = () => {
  const s = document.createElement('style');
  s.id = 'disable-mine';
  s.textContent = `
    /* 宽档：我的规则只有 summary display:none 与 .bar-fold display:contents。
       抵消 = summary 照旧藏（那是我的），但 .bar-fold 回到普通 details 盒 —— 不行，
       那会让 bar 变 93。所以宽档这里不改，只验证窄档那部分。 */
    .mast-fold > summary, .rail-fold > summary, .bar-fold > summary { display: none !important; }
    .mast-fold, .bare, .rail-fold { display: block !important; }
    /* 窄档我改过的全部属性 → 写回改前值 */
    .mast { padding: 20px var(--pad) 14px !important; }
    .mast-wizard a { padding: 9px 14px !important; line-height: normal !important; }
    .mast-facts { display: grid !important; grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
      gap: 2px !important; margin-top: 0 !important; padding-top: 0 !important; border-top: 0 !important; }
    .mast-facts > div { display: block !important; border-top: 2px solid var(--ink) !important; padding-top: 8px !important; }
    .mast-facts dt { font-size: var(--s-14) !important; line-height: normal !important; }
    .mast-facts dd { font-size: var(--s-24) !important; line-height: normal !important; margin-top: 2px !important; }
    .main { padding: 16px var(--pad) 60px !important; }
    .rail { max-height: 40vh !important; overflow-y: auto !important; padding: 12px var(--pad) !important; }
    .bar { gap: 12px 18px !important; padding-bottom: 16px !important; }
    .search { flex: 1 1 320px !important; }
    .search input { padding: 7px 10px !important; }
    .row { gap: 20px !important; padding: 13px 0 !important; }
    .row-head { gap: 8px 10px !important; }
    .row-meta { gap: 6px 14px !important; margin-top: 10px !important; }
    .row-foot { gap: 6px 16px !important; margin-top: 2px !important; line-height: normal !important; }
    .shots .shot:first-child { max-width: none !important; }
    .shot { position: static !important; }
    .shot figcaption { position: static !important; padding: 1px 0 2px !important; background: var(--ground-2) !important; }
    @media (max-width: 980px) {
      .rail { max-height: 46vh !important; padding: 14px var(--pad) !important; }
      .shots .shot img { max-height: 214px !important; }
    }
    @media (max-width: 620px) {
      .rail { max-height: 40vh !important; padding: 12px var(--pad) !important; }
      .shots .shot img { max-height: 190px !important; }
      .shot figcaption { font-size: 11px !important; }
    }
  `;
  document.head.appendChild(s);
  for (const id of ['mast-fold', 'rail-fold', 'bar-fold']) {
    const d = document.getElementById(id);
    if (d) d.open = true;
  }
};

const browser = await Browser.launch({ width: 1440, height: 900 });
console.log('对 390 / 768 / 1440 三档：我的改动 ON/OFF 的差值（这才是我的贡献）\n');
for (const vp of [{ k: '390', w: 390, h: 844, d: 2, m: true }, { k: '768', w: 768, h: 1024, d: 1, m: false }, { k: '1440', w: 1440, h: 900, d: 1, m: false }]) {
  const p = await browser.newPage({ width: vp.w, height: vp.h, dsf: vp.d, mobile: vp.m, reducedMotion: true });
  await p.goto(SRC, { settleMs: 1700 });
  const on = await p.eval(M);
  await p.eval(DISABLE_MINE);
  await sleep(400);
  const off = await p.eval(M);
  console.log(`[${vp.k}]`);
  console.log(`  我的改动 OFF（= 只含另一个 Agent 的 h1 改动）: mast=${off.mastH} rail=${off.railH} bar=${off.barH} 首卡=${off.firstRowTop} 卡高=${off.firstRowH} 完整=${off.completeCards} ovX=${off.overflowX} 芯片=${off.railChips}`);
  console.log(`  我的改动 ON : mast=${on.mastH} rail=${on.railH} bar=${on.barH} 首卡=${on.firstRowTop} 卡高=${on.firstRowH} 完整=${on.completeCards} ovX=${on.overflowX} 芯片=${on.railChips}`);
  console.log(`  **我的贡献** Δmast=${(on.mastH - off.mastH).toFixed(1)} Δrail=${(on.railH - off.railH).toFixed(1)} Δbar=${(on.barH - off.barH).toFixed(1)} Δ首卡=${(on.firstRowTop - off.firstRowTop).toFixed(1)} Δ完整=${on.completeCards - off.completeCards}`);
  console.log();
  await p.close();
}
await browser.close();
