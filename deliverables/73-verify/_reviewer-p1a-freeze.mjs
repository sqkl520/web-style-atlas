/* P1a 验收：冻结式取证。每次运行前后都记录 sha256，用来对抗「审查期间被审查对象仍在变动」。
 * 只读，不修改任何文件。
 */
import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';

const ROOT = 'D:/Web/style';
const FILES = {
  gate: 'prototypes/_build/check-contract.mjs',
  contract: 'prototypes/_CONTRACT.md',
  s08: 'prototypes/S08-amber-overprint-lightbox/.inspect/report.json',
  rules: 'tools/taste-skill/skills/taste-skill/scripts/lib/rules.mjs',
  readmeEN: 'README-EN.md',
  readme: 'README.md',
};
const sha = (p) => (existsSync(`${ROOT}/${p}`) ? createHash('sha256').update(readFileSync(`${ROOT}/${p}`)).digest('hex').slice(0, 16) : 'MISSING');
const size = (p) => (existsSync(`${ROOT}/${p}`) ? readFileSync(`${ROOT}/${p}`).length : 0);
const snap = () => Object.fromEntries(Object.entries(FILES).map(([k, p]) => [k, `${sha(p)}/${size(p)}B`]));

const runNode = (arg) => {
  const r = spawnSync(process.execPath, [arg], { cwd: ROOT, encoding: 'utf8' });
  return { code: r.status, out: String(r.stdout || '') + String(r.stderr || '') };
};

console.log('=== BEFORE ===');
const before = snap();
for (const [k, v] of Object.entries(before)) console.log(`  ${k.padEnd(10)} ${v}`);

const gate = runNode('prototypes/_build/check-contract.mjs');
console.log('\n=== gate (default) exit=' + gate.code + ' ===');
console.log(gate.out.trimEnd());

const gateJson = runNode('prototypes/_build/check-contract.mjs --json');
let parsed = null;
try { parsed = JSON.parse(gateJson.out); } catch { /* ignore */ }
console.log('\n=== gate --json exit=' + gateJson.code + ' ===');
console.log('  stats=' + JSON.stringify(parsed?.stats));
console.log('  levels=' + JSON.stringify(parsed?.findings.map((f) => `${f.level}:${f.rule}`)));

const ab = runNode('deliverables/73-verify/ab-contract.mjs');
console.log('\n=== ab-contract.mjs (v1) exit=' + ab.code + ' ===');
console.log(ab.out.trimEnd());

const ab2 = runNode('deliverables/73-verify/ab-contract2.mjs');
console.log('\n=== ab-contract2.mjs (v2) exit=' + ab2.code + ' ===');
console.log(ab2.out.trimEnd());

console.log('\n=== AFTER ===');
const after = snap();
let drifted = false;
for (const [k, v] of Object.entries(after)) {
  const mark = v !== before[k] ? '  ← 变了！' : '';
  if (v !== before[k]) drifted = true;
  console.log(`  ${k.padEnd(10)} ${v}${mark}`);
}
console.log('\n审查期间文件漂移: ' + (drifted ? '有（见上）' : '无'));

console.log('\n=== 报告.json 缩进格式（inspect.mjs 用 1 空格） ===');
for (const p of ['prototypes/S08-amber-overprint-lightbox/.inspect/report.json', 'prototypes/_selection/.inspect/report.json']) {
  const s = readFileSync(`${ROOT}/${p}`, 'utf8');
  const m = /^\{\r?\n( +)"/.exec(s);
  console.log(`  ${p}  首行缩进=${m ? m[1].length : '?'} 空格`);
}
