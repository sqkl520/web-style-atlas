#!/usr/bin/env node
// REDTEAM probe: pull the handful of measured metrics that decide P4 (which render rules
// apply to a tool UI) out of an inspect report, per viewport.
//   node probe-metrics.mjs <report.json>
// Read-only.
import { readFileSync } from 'node:fs';

const r = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const rows = r.viewports.map((v) => {
  const m = v.metrics;
  return {
    width: v.width,
    screens: v.screens,
    pageHeight: m.page.height,
    realPictures: m.page.realPictures,
    uiPictures: m.page.uiPictures,
    uiFragments: m.page.uiFragments,
    heroSizePx: m.hero?.size ?? null,
    heroVw: m.hero?.vw ?? null,
    heroMediaRatio: m.heroMedia?.[0]?.ratio ?? 0,
    focalNeedsVw: 4.5,
    focalOk: (m.hero?.vw ?? 0) >= 4.5 || (m.heroMedia?.[0]?.ratio ?? 0) >= 0.3 || m.page.uiFragments > 0,
    fewPicturesOk: m.page.realPictures + m.page.uiPictures >= 4,
    bodyPx: m.type.body?.size ?? null,
    hairlineCount: m.surfaces.hairlines,
    shadowStatic: m.surfaces.shadowStatic,
    gradients: m.surfaces.gradients,
    motionElements: v.motion?.elements ?? null,
    filledMin: Math.min(...v.filled.filter((x) => typeof x === 'number')),
    emptyScreens: v.filled.filter((x) => typeof x === 'number' && x < 0.2).length,
    consoleErrors: (v.consoleErrors || []).length,
  };
});
console.log(JSON.stringify({ url: r.url, at: r.at, findings: r.findings.map((f) => ({ level: f.level, id: f.id, width: f.width, alsoAt: f.alsoAt, message: f.message })), perViewport: rows }, null, 1));
