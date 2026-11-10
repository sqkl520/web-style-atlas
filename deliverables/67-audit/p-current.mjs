// p-current.mjs — 针对**当前树**（2026-10-28 01:17 已实现长字段折叠）重测基线，
// 并回答：「在已经折好的前提下，还需要 R2 那套排版收紧吗？」
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

const R2 = '#detail .field{padding:8px 0}#detail .field dd{line-height:1.5}'
  + '#detail .field dt{margin-bottom:2px}#d-body{padding-left:10px;padding-right:10px}';
const VARIANTS = {
  'C0 当前树（折叠已实现，排版未动）': '',
  'C1 当前树 + R2 排版收紧': 'addStyle(R2);',
};

const PROBE = () => {
  const d = document.getElementById('detail');
  const body = document.getElementById('d-body');
  const dl = body.querySelector('.fields');
  const cs = getComputedStyle;
  const dTop = d.getBoundingClientRect().top;

  const measure = (el) => {
    const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    let chars = 0; const nodes = [];
    while (w.nextNode()) { const t = w.currentNode.nodeValue || ''; const n = t.replace(/\s+/g, '').length; if (n) { chars += n; nodes.push(w.currentNode); } }
    const rg = document.createRange(); const lines = [];
    for (const n of nodes) { rg.selectNodeContents(n); for (const rc of rg.getClientRects()) { if (rc.height < 1) continue; const hit = lines.find((l) => Math.abs(l.top - rc.top) < 2); if (hit) hit.w += rc.width; else lines.push({ top: rc.top, w: rc.width }); } }
    return { chars, nLines: lines.length, maxEm: lines.length ? +(Math.max(...lines.map((l) => l.w)) / 16).toFixed(1) : 0 };
  };

  // 当前树里正文有两个载体：平铺字段的 dd + 折叠字段的 p.fold-body
  const dds = Array.from(dl.querySelectorAll('.field:not(.field-fold) dd, .field:not(.field-fold) .fold-body'));
  const foldBodies = Array.from(dl.querySelectorAll('.fold-body'));
  const summaries = Array.from(dl.querySelectorAll('summary'));
  let chars = 0, lines = 0, maxEm = 0;
  for (const e of [...dds, ...foldBodies]) { const m = measure(e); chars += m.chars; lines += m.nLines; maxEm = Math.max(maxEm, m.maxEm); }

  const sampleDd = dl.querySelector('.field:not(.field-fold) dd');
  const sampleFb = foldBodies[0] || null;
  const sampleSum = summaries[0] || null;
  const r = (e) => e ? e.getBoundingClientRect() : null;

  const kids = Array.from(body.children).map((el) => {
    const b = r(el); const s = cs(el);
    return { cls: el.className || el.tagName, top: +(b.top - dTop).toFixed(1), h: +b.height.toFixed(1), mt: parseFloat(s.marginTop), mb: parseFloat(s.marginBottom) };
  });

  const head = d.querySelector('.detail-head');
  const headNo = d.querySelector('.detail-no');
  const ddLeft = sampleDd ? +r(sampleDd).left.toFixed(1) : (sampleFb ? +r(sampleFb).left.toFixed(1) : null);
  const fbLeft = sampleFb ? +r(sampleFb).left.toFixed(1) : null;

  return {
    scrollH: d.scrollHeight, screens: +(d.scrollHeight / d.clientHeight).toFixed(2),
    detailCounts: {
      fieldTotal: dl.children.length,
      folded: dl.querySelectorAll('.field-long').length,
      flat: dl.querySelectorAll('.field:not(.field-fold)').length,
      auditFold: dl.querySelectorAll('.field-fold:not(.field-long)').length,
      detailsInDbody: d.querySelectorAll('#d-body details').length,
      allDd: dl.querySelectorAll('dd').length,
      allFoldBody: foldBodies.length,
      summaries: summaries.length,
    },
    dd: sampleDd ? {
      fs: cs(sampleDd).fontSize, lh: cs(sampleDd).lineHeight,
      lhRatio: +(parseFloat(cs(sampleDd).lineHeight) / parseFloat(cs(sampleDd).fontSize)).toFixed(3),
      w: +r(sampleDd).width.toFixed(1), ls: cs(sampleDd).letterSpacing,
    } : null,
    foldBody: sampleFb ? {
      fs: cs(sampleFb).fontSize, lh: cs(sampleFb).lineHeight,
      lhRatio: +(parseFloat(cs(sampleFb).lineHeight) / parseFloat(cs(sampleFb).fontSize)).toFixed(3),
      w: +r(sampleFb).width.toFixed(1), ls: cs(sampleFb).letterSpacing,
    } : null,
    summary: sampleSum ? {
      fs: cs(sampleSum).fontSize, lh: cs(sampleSum).lineHeight,
      h: +r(sampleSum).height.toFixed(1),
      padT: parseFloat(cs(sampleSum).paddingTop), padB: parseFloat(cs(sampleSum).paddingBottom),
      // WCAG 2.2 AA 2.5.8 目标尺寸
      target24: +r(sampleSum).height.toFixed(1) >= 24,
    } : null,
    field: (() => { const f = dl.querySelector('.field:not(.field-fold)'); const s = cs(f); return { padT: parseFloat(s.paddingTop), padB: parseFloat(s.paddingBottom), borderB: parseFloat(s.borderBottomWidth) }; })(),
    dtMb: (() => { const t = dl.querySelector('.field:not(.field-fold) dt'); return t ? parseFloat(cs(t).marginBottom) : null; })(),
    bodyPad: { l: parseFloat(cs(body).paddingLeft), r: parseFloat(cs(body).paddingRight), b: parseFloat(cs(body).paddingBottom) },
    align: {
      headPadL: parseFloat(cs(head).paddingLeft),
      headNo: headNo ? +r(headNo).left.toFixed(1) : null,
      headTitle: (() => { const t = d.querySelector('.detail-title h2'); return t ? +r(t).left.toFixed(1) : null; })(),
      ddLeft, foldBodyLeft: fbLeft,
      summaryLeft: sampleSum ? +r(sampleSum).left.toFixed(1) : null,
    },
    text: { chars, lines, maxEm },
    kids, kidsSum: +(kids.reduce((s, x) => s + x.h + x.mt + x.mb, 0)).toFixed(1),
    overX: d.scrollWidth - d.clientWidth,
  };
};

const browser = await Browser.launch({ width: 1440, height: 900 });
const p = await browser.newPage({ width: 390, height: 844, dsf: 2, mobile: true });
await p.goto(PAGE, { settleMs: 1600 });
const out = { measuredAt: new Date().toISOString(), gitDescribe: 'working-tree @ 2026-10-28T01:17', data: {} };

// 每个变体前先 goto 重载，彻底消除状态泄漏（上一轮 p-recommend 的教训）
for (const id of IDS) {
  out.data[id] = {};
  for (const [name, code] of Object.entries(VARIANTS)) {
    await p.goto(PAGE, { settleMs: 900 });
    await p.eval((sid) => { document.querySelector('.row[data-id="' + sid + '"]').click(); document.getElementById('detail').scrollTop = 0; }, id);
    await new Promise((r) => setTimeout(r, 130));
    if (code) { await p.eval((x) => { new Function('R2', 'return (function(){function addStyle(c){var s=document.createElement("style");s.setAttribute("data-lab","1");s.textContent=c;document.head.appendChild(s);}' + x.c + '})()')(x.r2); }, { c: code, r2: R2 }); await new Promise((r) => setTimeout(r, 110)); }
    out.data[id][name] = await p.eval(PROBE);
  }
  const a = out.data[id]['C0 当前树（折叠已实现，排版未动）'], b = out.data[id]['C1 当前树 + R2 排版收紧'];
  console.log(`${id} C0=${String(a.scrollH).padStart(5)} C1=${String(b.scrollH).padStart(5)} Δ=${String(b.scrollH - a.scrollH).padStart(5)} | 字=${a.text.chars} 行=${a.text.lines} 最长行=${a.text.maxEm}`);
}

// 展开态：4 条全展开后是否仍保留全部文字
await p.goto(PAGE, { settleMs: 1200 });
const expanded = {};
for (const id of ['S01', 'S13', 'S26', 'S29']) {
  await p.eval((sid) => { document.querySelector('.row[data-id="' + sid + '"]').click(); document.getElementById('detail').scrollTop = 0; }, id);
  await new Promise((r) => setTimeout(r, 150));
  const closed = await p.eval(() => ({ h: document.getElementById('detail').scrollHeight, chars: Array.from(document.querySelectorAll('#d-body dd, #d-body .fold-body')).reduce((s, e) => s + e.textContent.replace(/\s+/g, '').length, 0) }));
  await p.eval(() => { document.querySelectorAll('#d-body details').forEach((d) => { d.open = true; }); });
  await new Promise((r) => setTimeout(r, 260));
  const open = await p.eval(() => ({ h: document.getElementById('detail').scrollHeight, chars: Array.from(document.querySelectorAll('#d-body dd, #d-body .fold-body')).reduce((s, e) => s + e.textContent.replace(/\s+/g, '').length, 0) }));
  expanded[id] = { closedH: closed.h, openH: open.h, closedChars: closed.chars, openChars: open.chars };
  console.log(`展开 ${id}: ${closed.h} → ${open.h} | 字数 ${closed.chars} → ${open.chars} | 一致=${closed.chars === open.chars}`);
}
out.expanded = expanded;

// 截图
const snap = await browser.newPage({ width: 390, height: 844, dsf: 2, mobile: true });
await snap.goto(PAGE, { settleMs: 1200 });
await snap.eval(() => { document.querySelector('.row[data-id="S01"]').click(); document.getElementById('detail').scrollTop = 0; });
await new Promise((r) => setTimeout(r, 300));
await snap.screenshot({ path: join(SHOTS, 'current-folded-top.png'), format: 'png' });
await snap.eval(() => {
  const t = Array.from(document.querySelectorAll('#d-body .fields > *')).find((f) => (f.textContent || '').indexOf('布局与网格') === 0);
  if (t) document.getElementById('detail').scrollTop = t.offsetTop - 8;
});
await new Promise((r) => setTimeout(r, 250));
await snap.screenshot({ path: join(SHOTS, 'current-folded-fields.png'), format: 'png' });
await snap.close();
await p.close();
writeFileSync(join(HERE, 'data-current.json'), JSON.stringify(out, null, 1));
await browser.close();
console.log('\nwritten data-current.json');
