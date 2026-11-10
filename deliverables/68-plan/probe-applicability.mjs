// Probe 9: rule applicability on the three product surfaces.
// Reads the reports already produced by inspect.mjs runs in probe-out/ and answers,
// per rule, whether it fired on _selection / wizard / the three templates.
import { readFileSync, existsSync } from 'node:fs';

const TARGETS = [
  ['_selection/index.html', 'probe-out/sel/report.json'],
  ['_selection/wizard.html', 'probe-out/wizard/report.json'],
  ['templates/M01', 'probe-out/M01-clean-corporate/report.json'],
  ['templates/M02', 'probe-out/M02-warm-local/report.json'],
  ['templates/M03', 'probe-out/M03-bold-creator/report.json'],
];

const WATCH = ['focal-point', 'few-pictures', 'still-page', 'empty-screens', 'body-size', 'hairline', 'eyebrow', 'contrast'];

const data = TARGETS.map(([label, p]) => {
  const full = 'deliverables/68-plan/' + p;
  if (!existsSync(full)) return { label, missing: true };
  const j = JSON.parse(readFileSync(full, 'utf8'));
  const fired = new Set(j.findings.map((f) => f.id + ':' + f.level));
  const d = j.viewports.find((v) => v.width === 1440) || j.viewports[0];
  return {
    label,
    allow: j.allow || [],
    hero: d.metrics.hero,
    realPictures: d.metrics.page.realPictures,
    uiPictures: d.metrics.page.uiPictures,
    uiFragments: d.metrics.page.uiFragments,
    bodySize: d.metrics.type.body?.size,
    motion: d.motion ? d.motion.elements : null,
    fired,
  };
});

console.log('=== per-surface measurements @1440 ===');
for (const d of data) {
  if (d.missing) { console.log(`${d.label}: NO REPORT`); continue; }
  console.log(`\n${d.label}`);
  console.log(`  allow=[${d.allow.join(',')}]  hero="${String(d.hero?.text).slice(0, 30)}" ${d.hero?.size}px (${d.hero?.vw}vw)`);
  console.log(`  realPictures=${d.realPictures}  uiPictures=${d.uiPictures}  uiFragments=${d.uiFragments}  body=${d.bodySize}px  motionElements=${d.motion}`);
}

console.log('\n=== does each watched rule fire? (FAIL/WARN/-) ===');
const pad = (s) => String(s).padEnd(14);
console.log(pad('rule') + data.map((d) => pad(d.label.split('/')[1] || d.label)).join(''));
for (const rule of WATCH) {
  const cells = data.map((d) => {
    if (d.missing) return pad('?');
    if (d.fired.has(rule + ':FAIL')) return pad('FAIL');
    if (d.fired.has(rule + ':WARN')) return pad('WARN');
    return pad('-');
  });
  console.log(pad(rule) + cells.join(''));
}

console.log('\n=== verdict: which need a scope decision ===');
for (const rule of ['focal-point', 'few-pictures', 'still-page']) {
  const hit = data.filter((d) => !d.missing && (d.fired.has(rule + ':FAIL') || d.fired.has(rule + ':WARN'))).map((d) => d.label);
  const pass = data.filter((d) => !d.missing && !d.fired.has(rule + ':FAIL') && !d.fired.has(rule + ':WARN')).map((d) => d.label);
  console.log(`  ${rule}: fires on [${hit.join(', ') || 'none'}]  passes [${pass.join(', ') || 'none'}]`);
}
