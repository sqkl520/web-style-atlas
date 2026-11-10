// Which cases show riskNote (hard || degrades==='yes'), and do any of them have a non-empty
// intersection between scenesYes and a template's README industries?
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const src = readFileSync('prototypes/_selection/prompts.js', 'utf8');
const sandbox = { window: {}, document: { readyState: 'complete', addEventListener() {}, querySelector() { return null; } }, console };
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
vm.runInContext(src, sandbox, { filename: 'prompts.js' });
const P = sandbox.window.STYLE_PROMPTS || sandbox.STYLE_PROMPTS;
if (!P) { console.log('keys', Object.keys(sandbox)); process.exit(1); }

const TEMPLATES = [
  { id: 'M01', scenes: ['律所', '咨询', '软件服务', '设计工作室', '代理商'] },
  { id: 'M02', scenes: ['餐厅', '咖啡馆', '烘焙', '民宿', '理发店', '花店'] },
  { id: 'M03', scenes: ['个人作品集', '自由职业者', '小型创意工作室', '摄影师', '设计师', '写作者'] },
];

// figure out the case list
const keys = Object.keys(P);
console.log('P keys:', keys.join(', '));
const arr = P.schemes || P.cases || P.list || null;
const cases = Array.isArray(arr) ? arr : null;
if (!cases) {
  for (const k of keys) if (Array.isArray(P[k]) && P[k].length > 20) console.log('candidate array:', k, P[k].length, JSON.stringify(P[k][0]).slice(0, 300));
  process.exit(0);
}
console.log('cases', cases.length, 'first keys', Object.keys(cases[0]).join(','));
const rows = [];
for (const c of cases) {
  const riskyTopic = !!c.hard;
  const riskyCount = !!(c.capacity && c.capacity.degrades === 'yes');
  const shows = riskyTopic || riskyCount;
  const yes = c.scenesYes || c.scenes || [];
  let hit = [];
  for (const t of TEMPLATES) {
    const inter = yes.filter((s) => t.scenes.some((x) => String(s).includes(x) || String(x).includes(s)));
    if (inter.length) hit.push(t.id + ':' + inter.join('/'));
  }
  rows.push({ id: c.id, hard: riskyTopic, degrades: riskyCount, showsRiskNote: shows, scenesYes: yes, tplHit: hit });
}
console.log('\n=== riskNote cases with template intersection ===');
for (const r of rows) if (r.showsRiskNote && r.tplHit.length) console.log('CONFLICT', r.id, 'yes=', r.scenesYes.join('|'), '→', r.tplHit.join(' '));
console.log('\n=== all riskNote cases ===');
for (const r of rows) if (r.showsRiskNote) console.log((r.hard ? 'H' : '-') + (r.degrades ? 'D' : '-'), r.id.padEnd(4), 'tpl=' + (r.tplHit.join(' ') || '∅'), ' yes=', r.scenesYes.join(' / '));
console.log('\nriskNote count:', rows.filter((r) => r.showsRiskNote).length);
