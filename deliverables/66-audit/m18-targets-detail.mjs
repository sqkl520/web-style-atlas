// m18-targets-detail.mjs — 触控目标逐项 + WCAG 2.2 2.5.8「间距例外」判定
import { Browser } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const PAGE = 'file:///' + join(ROOT, 'prototypes', '_selection', 'index.html').replace(/\\/g, '/');

const browser = await Browser.launch({ width: 1440, height: 900 });
const out = {};
for (const vp of [{ k: '390', w: 390, h: 844, m: true }, { k: '1440', w: 1440, h: 900, m: false }]) {
  const p = await browser.newPage({ width: vp.w, height: vp.h, dsf: 2, mobile: vp.m });
  await p.goto(PAGE, { settleMs: 1600 });
  out[vp.k] = {};

  // 列表页：每类控件的实测尺寸 + 最近邻间距
  out[vp.k].list = await p.eval(() => {
    const q = (s) => Array.from(document.querySelectorAll(s)).filter((e) => e.getBoundingClientRect().height > 0);
    const dims = (els, name) => els.map((e) => {
      const b = e.getBoundingClientRect();
      return { name, text: (e.textContent || e.placeholder || '').replace(/\s+/g, ' ').trim().slice(0, 20), w: +b.width.toFixed(1), h: +b.height.toFixed(1) };
    });
    const chips = dims(q('.chips button'), 'chip');
    const rows = dims(q('.row'), 'row');
    const sceneChips = dims(q('.scene-chip'), 'scene-chip');
    const h = chips.map((c) => c.h), hs = sceneChips.map((c) => c.h);
    // 芯片间距（同一 .chips 容器内相邻芯片的垂直/水平 gap）
    const chipsEl = document.querySelector('.chips');
    const gap = chipsEl ? getComputedStyle(chipsEl).gap : null;
    return {
      chipCount: chips.length, chipH: { min: Math.min(...h), max: Math.max(...h) },
      sceneChipCount: sceneChips.length, sceneChipH: { min: Math.min(...hs), max: Math.max(...hs) },
      chipsGap: gap,
      rowH: { min: Math.min(...rows.map((r) => r.h)), max: Math.max(...rows.map((r) => r.h)) },
      search: dims(q('.search input'), 'input'),
      sort: dims(q('#sort'), 'select'),
      reset: dims(q('#reset'), 'button'),
      toggle: dims(q('.scene-toggle'), 'button'),
    };
  });

  // 详情页
  await p.eval(() => { document.querySelector('.row[data-id="S01"]').click(); document.getElementById('detail').scrollTop = 0; });
  await new Promise((r) => setTimeout(r, 350));
  out[vp.k].detail = await p.eval(() => {
    const d = document.getElementById('detail');
    const b = (e) => { const r = e.getBoundingClientRect(); return { w: +r.width.toFixed(1), h: +r.height.toFixed(1), top: +r.top.toFixed(1) }; };
    const items = [];
    d.querySelectorAll('summary, button, input, a[href], select').forEach((e) => {
      const cs = getComputedStyle(e);
      if (cs.display === 'none') return;
      const r = b(e);
      if (r.h <= 0) return;
      items.push({ tag: e.tagName.toLowerCase(), cls: (e.className || '').toString().slice(0, 26), text: (e.textContent || e.placeholder || '').replace(/\s+/g, ' ').trim().slice(0, 22), ...r });
    });
    // WCAG 2.2 2.5.8 间距例外：以控件为中心画 24px 直径圆，若与任何其他目标相交则不适用豁免
    const targets = Array.from(d.querySelectorAll('summary, button, input, a[href]')).filter((e) => e.getBoundingClientRect().height > 0);
    const spacingCheck = items.map((it, idx) => {
      const el = targets[idx];
      if (!el) return null;
      const rc = el.getBoundingClientRect();
      const cx = rc.left + rc.width / 2, cy = rc.top + rc.height / 2, r = 12;
      let intersects = false, withWhat = null;
      targets.forEach((o) => {
        if (o === el) return;
        const ob = o.getBoundingClientRect();
        const nx = Math.max(ob.left, Math.min(cx, ob.right));
        const ny = Math.max(ob.top, Math.min(cy, ob.bottom));
        const dist = Math.hypot(nx - cx, ny - cy);
        if (dist < r) { intersects = true; withWhat = (o.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 18); }
      });
      return { text: it.text, tag: it.tag, h: it.h, w: it.w, spaced24: !intersects, near: withWhat };
    }).filter(Boolean);
    return { items, spacingCheck };
  });

  const dp = out[vp.k].detail;
  console.log(`\n=== ${vp.k} 详情面板可点元素（${dp.items.length} 个）`);
  dp.items.forEach((i) => console.log(`  ${i.tag.padEnd(8)} h=${String(i.h).padStart(5)} w=${String(i.w).padStart(6)}  ${i.text}`));
  console.log('  24px 间距例外判定：');
  dp.spacingCheck.filter((s) => s.h < 24 || s.w < 24).forEach((s) => console.log(`    ${s.text || s.tag} h=${s.h} w=${s.w} 24px圆无相交=${s.spaced24} 近邻=${s.near || '无'}`));
  console.log(`  列表页：chip h=${out[vp.k].list.chipH.min}–${out[vp.k].list.chipH.max} gap=${out[vp.k].list.chipsGap} sceneChip h=${out[vp.k].list.sceneChipH.min}–${out[vp.k].list.sceneChipH.max} row h=${out[vp.k].list.rowH.min}–${out[vp.k].list.rowH.max}`);
  console.log(`  searchInput h=${out[vp.k].list.search[0].h} select h=${out[vp.k].list.sort[0].h} reset h=${out[vp.k].list.reset[0].h}`);
  await p.close();
}
writeFileSync(join(HERE, 'data-m18-targets.json'), JSON.stringify(out, null, 1));
await browser.close();
