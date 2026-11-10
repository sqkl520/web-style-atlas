/* 链 B 的真身到底是谁：prompts.js 的 palette 是否 == dna-clean.json 的 palette？
 * 若相等，则链 B 的权威读数就是 dna-clean.json（tracked、且被 check-stale 检新鲜），
 * 不需要在探针里复刻 clean-dna.mjs —— 复刻是证据的敌人。
 *
 *   node deliverables/71-plan/redteam/rt-p0-identity.mjs
 */
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, P, loadPrompts, loadDnaClean, hexes6, h1, h2 } from './rt-lib.mjs';

const prompts = loadPrompts();
const dnaClean = loadDnaClean();
const byId = new Map(dnaClean.map((r) => [r.id, r]));

h1('链 B 身份核对：prompts.js ↔ dna-clean.json ↔ clean-dna.mjs');
console.log('clean-dna.mjs 的产出路径：prototypes/_prompts/dna-clean.json（无条件覆写，无 --check）');
console.log('dna-clean.json 是否 tracked：', existsSync(join(P, '_prompts', 'dna-clean.json')) ? 'yes(file)' : 'no');

let mismatch = 0;
for (const s of prompts) {
  const pRaw = s.dna?.palette;
  const pArr = Array.isArray(pRaw) ? pRaw : String(pRaw || '').split(/[\n,]/);
  const pHex = pArr.flatMap((x) => hexes6(x));
  const cHex = ((byId.get(s.id) || {}).palette || []).map((x) => String(x).split(/\s+/)[0].toUpperCase());
  if (JSON.stringify(pHex) !== JSON.stringify(cHex)) {
    mismatch++;
    console.log(`  ✗ ${s.id}\n     prompts: ${pHex.join(' ')}\n     clean  : ${cHex.join(' ')}`);
  }
}
h2('结论');
console.log(`prompts.js 的 palette 与 dna-clean.json 逐案逐序一致：${30 - mismatch}/30`);
console.log(mismatch === 0
  ? '✓ 链 B 的权威读数 = dna-clean.json，后续探针直接用 tracked 产物，不复刻 clean-dna.mjs。'
  : '⚠ 两者不一致，链 B 内部还有一层转换，需另查 build-prompts.mjs。');

/* build-prompts.mjs 是否再加工 palette？ */
h2('build-prompts.mjs 对 palette 做了什么');
const bp = readFileSync(join(P, '_prompts', 'build-prompts.mjs'), 'utf8');
const lines = bp.split('\n');
lines.forEach((l, i) => {
  if (/palette/.test(l)) console.log(`  ${String(i + 1).padStart(4)}: ${l.trim().slice(0, 150)}`);
});
