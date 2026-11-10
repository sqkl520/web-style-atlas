#!/usr/bin/env node
// 63-test · step 7: merge every variant run into one verdict dataset.
//
// Variants
//   orig             the prototype as shipped
//   swap             CJK + digits + Latin all replaced with fruit nonsense  (the real test)
//   swap-cjk         CJK replaced, digits & Latin verbatim                 (control A)
//   swap-inset       CJK replaced with THIS page's own glyphs              (control B:
//                    guarantees the case's hand-subsetted webfont covers every char)
//
// Control logic
//   If A and B reproduce the original layout exactly and only `swap` drifts, the drift is
//   an artefact of my Latin/digit substitution (source-credit lines changing wrap), not a
//   property of the case's mechanism.
//   If A still drifts, the drift is real behaviour of replacing the CJK copy itself.
import { readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve('D:/Web/style');
const DATA = join(ROOT, 'deliverables', '63-test', 'data');
const W = [1440, 768, 390];
const load = (f) => { try { return JSON.parse(readFileSync(join(DATA, f), 'utf8')); } catch { return {}; } };

const runs = { '': load('render-all-3v.json'), inset: load('render-all-inset.json') };
const cases = Object.keys(runs['']).length ? Object.keys(runs['']) : Object.keys(runs.inset);

const merged = {};
for (const c of cases) {
  const views = {};
  for (const r of Object.values(runs)) {
    if (!r[c]) continue;
    for (const [k, v] of Object.entries(r[c].views)) views[k] = v;
  }
  merged[c] = { keys: (runs[''][c] || runs.inset[c]).keys, views };
}

const cmp = (c, variant) => {
  const v = merged[c].views;
  const rows = [];
  for (const w of W) {
    const o = v['orig@' + w], s = v[variant + '@' + w];
    if (!o || !s) continue;
    const kd = Object.keys(o.keys).map((sel) => {
      const a = o.keys[sel], b = s.keys[sel];
      if (!a || !b) return { sel, missing: true };
      return { sel, dTop: +(b.top - a.top).toFixed(1), dW: +(b.w - a.w).toFixed(1), dH: +(b.h - a.h).toFixed(1), o: a, s: b };
    });
    rows.push({
      w, vh: o.vp.h,
      docH: [o.docH, s.docH], docPct: +((s.docH - o.docH) / o.docH * 100).toFixed(3),
      hOv: [o.hOverflow, s.hOverflow],
      textOv: [o.textOverflow.n, s.textOverflow.n],
      ellipsis: [o.ellipsisClips.n, s.ellipsisClips.n],
      ovl: [o.overlaps.n, s.overlaps.n],
      holes: [o.holes.total, s.holes.total],
      broken: [o.brokenImgs.length, s.brokenImgs.length],
      rules: [o.rules, s.rules],
      maxShift: kd.reduce((m, k) => Math.max(m, Math.abs(k.dTop || 0), Math.abs(k.dW || 0), Math.abs(k.dH || 0)), 0),
      keys: kd,
    });
  }
  return rows;
};

const SUMMARY = {};
const L = [];
for (const c of cases) {
  const res = {};
  for (const variant of ['swap', 'swap-cjk', 'swap-inset']) res[variant] = cmp(c, variant);
  const agg = (variant) => {
    const r = res[variant];
    if (!r.length) return null;
    return {
      docPct: Math.max(...r.map((x) => Math.abs(x.docPct))),
      shift: Math.max(...r.map((x) => x.maxShift)),
      ovlDelta: Math.max(...r.map((x) => Math.abs(x.ovl[1] - x.ovl[0]))),
      holesDelta: Math.max(...r.map((x) => Math.abs(x.holes[1] - x.holes[0]))),
      textOv: Math.max(...r.map((x) => x.textOv[1])),
      hOv: Math.max(...r.map((x) => x.hOv[1])),
      brokenImgs: Math.max(...r.map((x) => x.broken[1])),
      rulesOk: r.every((x) => x.rules[0] === x.rules[1]),
    };
  };
  SUMMARY[c] = { swap: agg('swap'), cjk: agg('swap-cjk'), inset: agg('swap-inset'), per: res };

  const s = SUMMARY[c];
  L.push(`\n########## ${c}`);
  for (const variant of ['swap', 'swap-cjk', 'swap-inset']) {
    const a = s[variant === 'swap' ? 'swap' : variant === 'swap-cjk' ? 'cjk' : 'inset'];
    if (!a) { L.push(`  ${variant}: (no data)`); continue; }
    L.push(`  ${variant.padEnd(12)} |docH|<=${a.docPct}%  keyShift<=${a.shift}px  ovlDelta=${a.ovlDelta}  holesDelta=${a.holesDelta}px  textOv=${a.textOv}  hOv=${a.hOv}  brokenImgs=${a.brokenImgs}  rulesMatch=${a.rulesOk}`);
  }
  L.push('  detail (swap):');
  for (const p of res.swap) {
    L.push(`   @${p.w}x${p.vh} docH ${p.docH[0]}->${p.docH[1]} (${p.docPct >= 0 ? '+' : ''}${p.docPct}%)  hOv ${p.hOv.join('->')}  textOv ${p.textOv.join('->')}  ellipsis ${p.ellipsis.join('->')}  ovl ${p.ovl.join('->')}  holes ${p.holes.join('->')}  shift<=${p.maxShift}px`);
    for (const k of p.keys) {
      if (k.missing) { L.push(`      ${k.sel}: MISSING`); continue; }
      if (Math.abs(k.dTop) < 0.5 && Math.abs(k.dW) < 0.5 && Math.abs(k.dH) < 0.5) { L.push(`      ${k.sel.padEnd(24)} identical (h ${k.o.h}, top ${k.o.top}, w ${k.o.w})`); continue; }
      L.push(`      ${k.sel.padEnd(24)} h ${k.o.h}->${k.s.h} (${k.dH >= 0 ? '+' : ''}${k.dH})  top ${k.o.top}->${k.s.top} (${k.dTop >= 0 ? '+' : ''}${k.dTop})  w ${k.o.w}->${k.s.w}`);
    }
  }
}
writeFileSync(join(DATA, 'verdict-data.json'), JSON.stringify(SUMMARY, null, 1));
writeFileSync(join(DATA, 'verdict.txt'), L.join('\n'));
console.log(L.join('\n'));

const T = ['case,swap_docPct,cjk_docPct,inset_docPct,swap_shiftPx,cjk_shiftPx,inset_shiftPx,swap_keysIdentical'];
for (const [c, s] of Object.entries(SUMMARY)) {
  const allIdentical = s.per.swap.every((p) => p.keys.every((k) => !k.missing && Math.abs(k.dTop) < 0.5 && Math.abs(k.dW) < 0.5 && Math.abs(k.dH) < 0.5));
  T.push([c, s.swap.docPct, s.cjk.docPct, s.inset.docPct, s.swap.shift, s.cjk.shift, s.inset.shift, allIdentical].join(','));
}
writeFileSync(join(DATA, 'verdict-inputs.csv'), T.join('\n'));
console.log('\n' + T.join('\n'));
