// 67-exec 详情面板实验的公共库（2026-10-28）。
// 只读页面、只在本进程的 DOM 上注入 <style> / 改 DOM，源码一个字不碰 ——
// 五种方案全都先在浏览器里量完，再决定改哪一版源码。
import { Browser } from '../../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

export const HERE = dirname(fileURLToPath(import.meta.url));
export const ROOT = join(HERE, '..', '..', '..');
export const PAGE = 'file:///' + join(ROOT, 'prototypes', '_selection', 'index.html').replace(/\\/g, '/');
export const IDS = Array.from({ length: 30 }, (_, i) => 'S' + String(i + 1).padStart(2, '0'));

// 详情面板的内容坐标：面板是 position:fixed 的滚动容器，scrollTop=0 时
// 子元素的 rect.top 减去面板 rect.top 就是"内容里第几 px"，与审计口径一致。
export const COLLECT = () => {
  const d = document.getElementById('detail');
  const bodyEl = document.getElementById('d-body');
  const dTop = d.getBoundingClientRect().top;
  const vh = d.clientHeight;
  const bx = (el) => {
    const r = el.getBoundingClientRect();
    return { top: +(r.top - dTop).toFixed(1), h: +r.height.toFixed(1), w: +r.width.toFixed(1) };
  };
  // 文本行数：一个文本节点的 getClientRects 每行一个矩形。
  const lines = (el) => {
    const t = el.firstChild;
    if (!t || t.nodeType !== 3) return el ? Math.round(el.getBoundingClientRect().height) : 0;
    const rg = document.createRange();
    rg.selectNodeContents(el);
    const tops = {};
    for (const r of rg.getClientRects()) if (r.height > 1) tops[Math.round(r.top)] = 1;
    return Object.keys(tops).length;
  };
  const cs = (el) => getComputedStyle(el);

  const kids = [...bodyEl.children].map((el) => {
    const b = bx(el);
    return {
      cls: el.className || el.tagName.toLowerCase(),
      tag: el.tagName.toLowerCase(),
      top: b.top, h: b.h,
    };
  });

  // 体例：.prompt-cta 是 mountPromptButton 插到 #d-body 最前面的，所以它在 fields 之前。
  const fields = [...bodyEl.querySelectorAll('.fields > .field')].map((f) => {
    const dt = f.querySelector(':scope > dt');
    const dd = f.querySelector(':scope > dd');
    const su = f.querySelector(':scope > details > summary') || f.querySelector(':scope > summary');
    const foldBody = f.querySelector(':scope > details > .fold-body');
    const b = bx(f);
    const fcs = cs(f);
    const inner = (el) => (el ? +el.getBoundingClientRect().height.toFixed(1) : 0);
    const ddEl = dd || foldBody;
    return {
      label: (dt || su || { textContent: '?' }).textContent.trim(),
      folded: !!su && !dt,
      open: !!(f.querySelector(':scope > details') && f.querySelector(':scope > details').open),
      top: b.top, h: b.h,
      padT: +parseFloat(fcs.paddingTop).toFixed(1),
      padB: +parseFloat(fcs.paddingBottom).toFixed(1),
      dtH: inner(dt) || inner(su),
      ddH: inner(ddEl),
      chars: ddEl ? ddEl.textContent.trim().length : 0,
      lines: ddEl ? lines(ddEl) : 0,
      fs: ddEl ? cs(ddEl).fontSize : null,
      lh: ddEl ? cs(ddEl).lineHeight : null,
      textW: ddEl ? +ddEl.getBoundingClientRect().width.toFixed(1) : null,
    };
  });

  const dl = bodyEl.querySelector('.fields');
  const firstDd = bodyEl.querySelector('.fields .field dd');
  return {
    vh,
    scrollH: d.scrollHeight,
    screens: +(d.scrollHeight / vh).toFixed(2),
    contentH: +(d.scrollHeight - vh).toFixed(1), // 需要滚多少
    firstFieldTop: fields.length ? fields[0].top : null,
    fieldsH: dl ? +dl.getBoundingClientRect().height.toFixed(1) : null,
    fieldsCount: fields.length,
    fieldsFully: fields.filter((f) => f.top >= 0 && f.top + f.h <= vh).length,
    fs: firstDd ? cs(firstDd).fontSize : null,
    lh: firstDd ? cs(firstDd).lineHeight : null,
    textW: firstDd ? +firstDd.getBoundingClientRect().width.toFixed(1) : null,
    hOv: d.scrollWidth - d.clientWidth,
    detailsCount: bodyEl.querySelectorAll('details').length,
    openDetails: bodyEl.querySelectorAll('details[open]').length,
    kids, fields,
  };
};

export async function openCase(p, id) {
  await p.eval((sid) => {
    document.querySelectorAll('style[data-lab]').forEach((s) => s.remove());
    document.querySelectorAll('[data-lab-el]').forEach((x) => { const par = x.parentNode; while (x.firstChild) par.insertBefore(x.firstChild, x); par.removeChild(x); });
    const row = document.querySelector('.row[data-id="' + sid + '"]');
    row.click();
    document.getElementById('detail').scrollTop = 0;
  }, id);
  await sleep(120);
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// 注入样式，统一打 data-lab 标记，收尾时按标记清掉。
export const APPLY_CSS = (css) => {
  const s = document.createElement('style');
  s.setAttribute('data-lab', '1');
  s.textContent = css;
  document.head.appendChild(s);
};

export const RESET = () => {
  document.querySelectorAll('style[data-lab]').forEach((s) => s.remove());
};

export async function measureAll(p, variant, viewport) {
  const out = [];
  for (const id of IDS) {
    await openCase(p, id);
    if (variant && variant.apply) {
      await p.eval(new Function('return (' + variant.apply.toString() + ')()'));
      await sleep(90);
    }
    const m = await p.eval(COLLECT);
    m.id = id;
    m.vp = viewport;
    m.variant = variant ? variant.name : 'V0';
    out.push(m);
  }
  return out;
}

export function summary(rows, th = 3800) {
  const sh = rows.map((r) => r.scrollH).sort((a, b) => a - b);
  const avg = Math.round(sh.reduce((a, b) => a + b, 0) / sh.length);
  return {
    min: sh[0], max: sh[sh.length - 1], med: sh[Math.floor(sh.length / 2)], avg,
    over: sh.filter((x) => x > th).length,
    screensMax: +(sh[sh.length - 1] / rows[0].vh).toFixed(2),
    firstFieldMin: Math.min(...rows.map((r) => r.firstFieldTop || 1e9)),
    firstFieldMax: Math.max(...rows.map((r) => r.firstFieldTop || 0)),
    fieldsFully: +(rows.reduce((a, b) => a + b.fieldsFully, 0) / rows.length).toFixed(1),
    fs: rows[0].fs, lh: rows[0].lh, textW: rows[0].textW,
    details: rows[0].detailsCount,
    hOvMax: Math.max(...rows.map((r) => r.hOv)),
  };
}
