// A1b: dump buildPrompt('S19') verbatim, and compare it constraint-by-constraint with the
// hand-written prompt that was actually verified (deliverables/99-scratch/prompt-s19.md).
import { readFileSync, writeFileSync } from 'node:fs';
import { makeCtx } from './lib.mjs';

const win = makeCtx();
const cur = win.buildStylePrompt('S19');
const old = readFileSync('D:\\Web\\style\\deliverables\\99-scratch\\prompt-s19.md', 'utf8');

// The verified prompt = the fenced body of prompt-s19.md (between the first '---' and the
// '## 实测记录' heading), minus its markdown wrapper.
const bodyStart = old.indexOf('我经营山隅咖啡');
const bodyEnd = old.indexOf('## 实测记录');
const oldBody = old.slice(bodyStart, bodyEnd).trim();

const probes = [
  { name: 'business line', re: /我经营[^\n。]*/ },
  { name: 'style name', re: /S19[^\n。]{0,20}风格[^\n。]*/ },
  { name: 'palette list', re: /#[0-9A-F]{6}/g },
  { name: 'Spectral', re: /Spectral/ },
  { name: 'Noto Serif SC', re: /Noto Serif SC/ },
  { name: 'IBM Plex Mono', re: /IBM Plex Mono/ },
  { name: 'radius 0', re: /border-radius:\s*0|全站[^\n。]*0/ },
  { name: 'inset only', re: /inset/ },
  { name: '0.4px', re: /0\.4px/ },
  { name: '0.8px', re: /0\.8px/ },
  { name: '24px pull', re: /24px/ },
  { name: '5 drawers 3+2', re: /3\+2|5 个/ },
  { name: 'B-01-001', re: /B-0\d-001/ },
  { name: 'no emoji', re: /emoji/i },
  { name: 'no #6366F1', re: /#6366F1/ },
  { name: 'single file HTML', re: /DOCTYPE html|单文件/ },
  { name: 'no React/Vue/Tailwind', re: /React|Tailwind/ },
  { name: 'acceptance 3 questions', re: /验收三问/ },
  { name: '3-bean collapse rule', re: /只有 3 个|3 个豆/ },
];

const cmp = probes.map((p) => {
  const g = (s) => (p.re.global ? (s.match(p.re) || []) : (p.re.test(s) ? [(s.match(p.re) || [''])[0]] : []));
  const a = g(cur), b = g(oldBody);
  return { probe: p.name, inCurrent: a.length > 0, inVerified: b.length > 0, current: a.slice(0, 6), verified: b.slice(0, 6) };
});

writeFileSync('D:\\Web\\style\\deliverables\\69-plan\\redteam\\a1b-prompt-S19.txt',
  '=== CURRENT buildPrompt("S19") ===\n' + cur +
  '\n\n\n=== VERIFIED (99-scratch/prompt-s19.md body) ===\n' + oldBody + '\n');
writeFileSync('D:\\Web\\style\\deliverables\\69-plan\\redteam\\a1b-compare.json',
  JSON.stringify({ curLen: [...cur].length, oldLen: [...oldBody].length, has4A5C3A_cur: cur.includes('#4A5C3A'), has4A5C3A_old: oldBody.includes('#4A5C3A'), cmp }, null, 1));

console.log('current chars', [...cur].length, ' verified chars', [...oldBody].length);
console.log('has #4A5C3A  current:', cur.includes('#4A5C3A'), ' verified:', oldBody.includes('#4A5C3A'));
console.log('\nprobe | inCurrent | inVerified');
for (const c of cmp) console.log((c.probe + '').padEnd(26), String(c.inCurrent).padEnd(10), String(c.inVerified).padEnd(10), c.inCurrent !== c.inVerified ? '  <== DIVERGES' : '');
const both = cmp.filter((c) => c.inCurrent && c.inVerified).length;
const eitherOnly = cmp.filter((c) => c.inCurrent !== c.inVerified).length;
console.log('\nprobes present in BOTH:', both, '/', cmp.length, '  divergent:', eitherOnly);
