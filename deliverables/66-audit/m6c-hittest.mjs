// m6c-hittest.mjs — 真实命中测试：每个可点元素用 elementFromPoint 校验它是否真的能点到
// 这是唯一能区分「矩形相交但被 overflow 裁掉」与「真的被别的元素盖住」的办法。
import { Browser } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const PAGE = 'file:///' + join(ROOT, 'prototypes', '_selection', 'index.html').replace(/\\/g, '/');

const HIT = () => {
  const sel = 'a[href], button, input, select, textarea, summary, [tabindex]:not([tabindex="-1"])';
  const detail = document.getElementById('detail');
  const detailOpen = detail && !detail.hidden;
  const res = [];
  document.querySelectorAll(sel).forEach((el) => {
    const b = el.getBoundingClientRect();
    if (!(b.width > 0 && b.height > 0)) return;
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') return;
    const inDetail = detailOpen && detail.contains(el);
    // 视口内才测命中（视口外无法点，自然算“不可点”，但那是滚动而非遮挡）
    const cx = Math.min(Math.max(b.left + b.width / 2, 0), window.innerWidth - 1);
    const cy = Math.min(Math.max(b.top + b.height / 2, 0), window.innerHeight - 1);
    const inViewport = b.top >= 0 && b.bottom <= window.innerHeight && b.left >= 0 && b.right <= window.innerWidth;
    let hit = null, ok = null;
    if (inViewport) {
      hit = document.elementFromPoint(cx, cy);
      ok = !!hit && (hit === el || el.contains(hit) || hit.contains(el));
    }
    // 是否被 overflow 容器裁剪（矩形在滚动容器可视框之外）
    let clipped = false;
    let p = el.parentElement;
    while (p && p !== document.body) {
      const pcs = getComputedStyle(p);
      if (/(auto|scroll|hidden)/.test(pcs.overflowY + pcs.overflowX)) {
        const pb = p.getBoundingClientRect();
        if (b.bottom < pb.top || b.top > pb.bottom) { clipped = true; break; }
      }
      p = p.parentElement;
    }
    res.push({
      tag: el.tagName.toLowerCase(), inDetail,
      cls: (el.className || '').toString().slice(0, 30),
      text: (el.textContent || el.placeholder || '').replace(/\s+/g, ' ').trim().slice(0, 22),
      w: +b.width.toFixed(1), h: +b.height.toFixed(1), top: +b.top.toFixed(1),
      inViewport, hitOk: ok, hitTag: hit ? hit.tagName.toLowerCase() + '.' + (hit.className || '').toString().slice(0, 20) : null,
      clipped,
    });
  });
  const inVp = res.filter((x) => x.inViewport);
  return {
    all: res.length,
    inViewport: inVp.length,
    blocked: inVp.filter((x) => x.hitOk === false),
    clippedCount: res.filter((x) => x.clipped).length,
    // 真正的目标尺寸表：仅当前可见区域内可点的
    tappable: inVp.filter((x) => x.hitOk !== false),
  };
};

const browser = await Browser.launch({ width: 1440, height: 900 });
const out = { measuredAt: new Date().toISOString(), vps: {} };
for (const vp of [{ k: '390', w: 390, h: 844, m: true }, { k: '1440', w: 1440, h: 900, m: false }]) {
  const p = await browser.newPage({ width: vp.w, height: vp.h, dsf: 2, mobile: vp.m });
  await p.goto(PAGE, { settleMs: 1600 });
  out.vps[vp.k] = { list: await p.eval(HIT) };
  await p.eval(() => { const r = document.querySelector('.row[data-id="S01"]'); if (r) r.click(); document.getElementById('detail').scrollTop = 0; });
  await new Promise((r) => setTimeout(r, 300));
  out.vps[vp.k].detail = await p.eval(HIT);
  for (const k of ['list', 'detail']) {
    const o = out.vps[vp.k][k];
    console.log(`[${vp.k}/${k}] 总数=${o.all} 视口内=${o.inViewport} 被遮挡=${o.blocked.length} 被裁剪=${o.clippedCount} 可点=${o.tappable.length}`);
    if (o.blocked.length) console.log('   blocked:', JSON.stringify(o.blocked.map((b) => b.tag + ':"' + b.text + '" by ' + b.hitTag).slice(0, 6)));
  }
  await p.close();
}
writeFileSync(join(HERE, 'data-m6c-hittest.json'), JSON.stringify(out, null, 1));
await browser.close();
console.log('written data-m6c-hittest.json');
