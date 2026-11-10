#!/usr/bin/env node
// REDTEAM probe: aggregate the 30 committed .inspect/report.json files.
// Answers: which render rules actually fire on the 30-page corpus, and how often?
// Used to test P4's claim that the 12 render rules are calibrated on the corpus.
// Read-only.
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const P = 'D:/Web/style/prototypes';
const dirs = readdirSync(P, { withFileTypes: true }).filter((d) => d.isDirectory() && /^S\d{2}-/.test(d.name)).map((d) => d.name).sort();

const failCount = new Map();
const warnCount = new Map();
const rows = [];
let totalFail = 0;
let totalWarn = 0;
const clean = [];

for (const d of dirs) {
  const p = join(P, d, '.inspect', 'report.json');
  if (!existsSync(p)) { rows.push({ id: d.slice(0, 3), note: 'no report' }); continue; }
  let j;
  try { j = JSON.parse(readFileSync(p, 'utf8').replace(/^\uFEFF/, '')); } catch { rows.push({ id: d.slice(0, 3), note: 'unparseable' }); continue; }
  const f = (j.findings || []).filter((x) => x.level === 'FAIL');
  const w = (j.findings || []).filter((x) => x.level === 'WARN');
  totalFail += f.length; totalWarn += w.length;
  for (const x of f) failCount.set(x.id, (failCount.get(x.id) || 0) + 1);
  for (const x of w) warnCount.set(x.id, (warnCount.get(x.id) || 0) + 1);
  rows.push({ id: d.slice(0, 3), at: j.at, FAIL: f.length, WARN: w.length, failIds: [...new Set(f.map((x) => x.id))], warnIds: [...new Set(w.map((x) => x.id))] });
  if (!f.length) clean.push(d.slice(0, 3));
}

const v = [...failCount.entries()].sort((a, b) => b[1] - a[1]);
const vw = [...warnCount.entries()].sort((a, b) => b[1] - a[1]);
console.log(JSON.stringify({
  reports: rows.filter((r) => r.FAIL !== undefined).length,
  totalFail, totalWarn,
  cleanCases: clean.length,
  cleanIds: clean,
  failRuleFrequency: Object.fromEntries(v),
  warnRuleFrequency: Object.fromEntries(vw),
  // the rules the plan wants to add as a render gate on the product: how often do they ALREADY
  // fire on the 30 pages that are supposed to be the calibration set?
  renderGateOnCorpus: Object.fromEntries(['focal-point', 'few-pictures', 'no-footage', 'still-page', 'empty-screens', 'hairline', 'measure', 'body-size', 'font-count', 'headline-lines'].map((id) => [id, { FAIL: failCount.get(id) || 0, WARN: warnCount.get(id) || 0 }])),
}, null, 1));
