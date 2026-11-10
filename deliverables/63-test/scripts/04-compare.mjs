#!/usr/bin/env node
// 63-test · step 4 (v2): comparison table over the three variants.
//   orig      — the prototype as shipped
//   swap      — CJK + digits + Latin all replaced (the strict "unrelated content" test)
//   swap-cjk  — CJK only replaced (control: isolates MY Latin/digit substitution)
// The control is what makes the verdict defensible: if swap-cjk is pixel-identical and
// swap drifts by 20px only in credit lines, the drift is an artefact, not a mechanism.
import { readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve('D:/Web/style');
const DATA = join(ROOT, 'deliverables', '63-test', 'data');
const all = JSON.parse(readFileSync(join(DATA, process.env.SRC || 'render-all.json'), 'utf8'));
const W = [1440, 768, 390];

const out = {};
const L = [];
const rows = [];

for (const c of Object.keys(all)) {
  const r = all[c];
  const variants = Object.keys(r.views).reduce((acc, k) => {
    const [v, w] = k.split('@'); (acc[v] = acc[v] || {})[w] = r.views[k]; return acc;
  }, {});
  const per = {};
  for (const v of ['swap', 'swap-cjk']) {
    if (!variants[v]) continue;
    per[v] = [];
    for (const w of W) {
      const o = variants.orig[w], s = variants[v][w];
      if (!o || !s) continue;
      const kd = [];
      for (const sel of Object.keys(o.keys)) {
        const a = o.keys[sel], b = s.keys[sel];
        if (!a || !b) { kd.push({ sel, missing: true }); continue; }
        kd.push({ sel, dTop: +(b.top - a.top).toFixed(1), dW: +(b.w - a.w).toFixed(1), dH: +(b.h - a.h).toFixed(1), o: a, s: b });
      }
      per[v].push({
        w, h: o.vp.h,
        docH: { o: o.docH, s: s.docH, d: s.docH - o.docH, pct: +((s.docH - o.docH) / o.docH * 100).toFixed(3) },
        hOverflow: [o.hOverflow, s.hOverflow],
        textOverflow: [o.textOverflow.n, s.textOverflow.n],
        ellipsis: [o.ellipsisClips.n, s.ellipsisClips.n],
        overlaps: [o.overlaps.n, s.overlaps.n],
        holes: [o.holes.total, s.holes.total],
        maxShift: kd.reduce((m, k) => Math.max(m, Math.abs(k.dTop || 0), Math.abs(k.dW || 0), Math.abs(k.dH || 0)), 0),
        keys: kd,
        broken: [o.brokenImgs.length, s.brokenImgs.length],
        rules: [o.rules, s.rules],
      });
    }
  }
  out[c] = { keys: r.keys, meta: r.meta, per };
  const worst = (v, f) => per[v] ? Math.max(...per[v].map(f)) : 0;
  const sum = {
    docPct_swap: worst('swap', (p) => Math.abs(p.docH.pct)),
    docPct_cjk: worst('swap-cjk', (p) => Math.abs(p.docH.pct)),
    shift_swap: worst('swap', (p) => p.maxShift),
    shift_cjk: worst('swap-cjk', (p) => p.maxShift),
    ovlDelta_swap: worst('swap', (p) => Math.abs(p.overlaps[1] - p.overlaps[0])),
    ovlDelta_cjk: worst('swap-cjk', (p) => Math.abs(p.overlaps[1] - p.overlaps[0])),
    holesDelta_swap: worst('swap', (p) => Math.abs(p.holes[1] - p.holes[0])),
    holesDelta_cjk: worst('swap-cjk', (p) => Math.abs(p.holes[1] - p.holes[0])),
    textOv_swap: worst('swap', (p) => p.textOverflow[1]),
    hOv_swap: worst('swap', (p) => p.hOverflow[1]),
  };
  out[c].summary = sum;
  rows.push({ c, ...sum });
}

writeFileSync(join(DATA, process.env.OUT || 'compare.json'), JSON.stringify(out, null, 1));

for (const [c, d] of Object.entries(out)) {
  L.push(`\n########## ${c}`);
  L.push(`  keys: ${d.keys.join(' | ')}`);
  for (const v of ['swap', 'swap-cjk']) {
    if (!d.per[v]) continue;
    L.push(`  --- ${v}`);
    for (const p of d.per[v]) {
      L.push(`   @${p.w}x${p.h}  docH ${p.docH.o}->${p.docH.s} (${p.docH.pct >= 0 ? '+' : ''}${p.docH.pct}%)  hOv ${p.hOverflow.join('->')}  textOv ${p.textOverflow.join('->')}  ellipsis ${p.ellipsis.join('->')}  overlap ${p.overlaps.join('->')}  holes ${p.holes.join('->')}  maxShift ${p.maxShift}px  rules ${p.rules.join('/')}`);
      for (const k of p.keys) {
        const flag = (Math.abs(k.dTop) > 0.5 || Math.abs(k.dW) > 0.5 || Math.abs(k.dH) > 0.5) ? ' <<' : '';
        L.push(`      ${k.sel.padEnd(24)} h ${k.o.h}->${k.s.h} (${k.dH >= 0 ? '+' : ''}${k.dH})  top ${k.o.top}->${k.s.top} (${k.dTop >= 0 ? '+' : ''}${k.dTop})  w ${k.o.w}->${k.s.w}${flag}`);
      }
    }
  }
  const s = d.summary;
  L.push(`  >> WORST swap: docH ${s.docPct_swap}%  keyShift ${s.shift_swap}px  ovlDelta ${s.ovlDelta_swap}  holesDelta ${s.holesDelta_swap}px`);
  L.push(`  >> WORST ctrl: docH ${s.docPct_cjk}%  keyShift ${s.shift_cjk}px  ovlDelta ${s.ovlDelta_cjk}  holesDelta ${s.holesDelta_cjk}px`);
}
writeFileSync(join(DATA, process.env.TXT || 'compare.txt'), L.join('\n'));
console.log(L.join('\n'));

const T = ['case,docPct_swap,docPct_ctrl,shift_swap,shift_ctrl,ovlDelta_swap,ovlDelta_ctrl,holesDelta_swap,holesDelta_ctrl,textOv_swap,hOv_swap'];
for (const r of rows) T.push([r.c, r.docPct_swap, r.docPct_cjk, r.shift_swap, r.shift_cjk, r.ovlDelta_swap, r.ovlDelta_cjk, r.holesDelta_swap, r.holesDelta_cjk, r.textOv_swap, r.hOv_swap].join(','));
writeFileSync(join(DATA, 'verdict-inputs.csv'), T.join('\n'));
console.log('\n' + T.join('\n'));
