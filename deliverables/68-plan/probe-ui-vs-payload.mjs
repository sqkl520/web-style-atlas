// Probe 8: split _selection's lint FAILs into UI source vs spec payload.
// The guard must lint the UI, not the describing-the-30-schemes text.
import { execFileSync } from 'node:child_process';

const LINT = 'tools/taste-skill/skills/taste-skill/scripts/lint.mjs';
const UI = ['prototypes/_selection/index.html', 'prototypes/_selection/wizard.html',
  'prototypes/_selection/style.css', 'prototypes/_selection/wizard.css', 'prototypes/_selection/app.js',
  'prototypes/_selection/wizard.js'];
// data.js + prompts.js + prompt-copy.js are generated/edited SPEC PAYLOAD: prose describing 30 schemes.
const PAYLOAD = ['prototypes/_selection/data.js', 'prototypes/_selection/prompts.js',
  'prototypes/_selection/prompt-copy.js'];

function run(files) {
  let out;
  try { out = execFileSync(process.execPath, [LINT, ...files, '--json'], { encoding: 'utf8', maxBuffer: 1 << 28 }); }
  catch (e) { out = e.stdout; }
  const j = JSON.parse(out);
  const fails = j.findings.filter((f) => f.level === 'FAIL');
  const warns = j.findings.filter((f) => f.level === 'WARN');
  const byId = {};
  for (const f of fails) byId[f.id] = (byId[f.id] || 0) + 1;
  return { files: j.files, fails: fails.length, warns: warns.length, byId, findings: j.findings };
}

const ui = run(UI);
const pl = run(PAYLOAD);
const all = run([...UI, ...PAYLOAD]);

console.log('=== UI source only (6 files: html/css/js that build the interface) ===');
console.log(`  files=${ui.files}  FAIL=${ui.fails}  WARN=${ui.warns}`);
console.log('  ' + Object.entries(ui.byId).map(([k, v]) => `${k}=${v}`).join('  '));

console.log('\n=== spec payload only (3 files: prose describing the 30 schemes) ===');
console.log(`  files=${pl.files}  FAIL=${pl.fails}  WARN=${pl.warns}`);
console.log('  ' + Object.entries(pl.byId).map(([k, v]) => `${k}=${v}`).join('  '));

console.log('\n=== whole _selection dir (what a naive "lint the product" does) ===');
console.log(`  files=${all.files}  FAIL=${all.fails}  WARN=${all.warns}`);
console.log(`  payload share of FAILs: ${pl.fails}/${all.fails} = ${(100 * pl.fails / all.fails).toFixed(1)}%`);

// how many of the UI-only hits are emoji in comments?
const emojiUI = ui.findings.filter((f) => f.id === 'emoji');
console.log(`\n=== UI emoji hits: ${emojiUI.length} (all inside /* */ or <!-- --> per probe-comment-state.mjs) ===`);

// templates split: same question — is style.css real CSS or spec text?
const tpl = run(['templates']);
const tplByFile = {};
for (const f of tpl.findings.filter((x) => x.level === 'FAIL')) tplByFile[f.file] = (tplByFile[f.file] || 0) + 1;
console.log('\n=== templates FAIL by file ===');
for (const [k, v] of Object.entries(tplByFile).sort((a, b) => b[1] - a[1])) console.log(`  ${String(v).padStart(3)}  ${k}`);
console.log(`  total FAIL=${tpl.fails} WARN=${tpl.warns}`);
