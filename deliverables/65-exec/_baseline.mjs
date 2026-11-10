/* 基线：记录**改动前**的 30 案提示词全文与长度，供改动后逐案 diff。
 * 产出 _baseline.json（不入交付物，只是我的对照组）。
 */
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadPromptCopy } from './_harness.mjs';

const ROOT = decodeURIComponent(new URL('../..', import.meta.url).pathname).replace(/^\/([A-Za-z]:)/, '$1');
const { build, schemes } = loadPromptCopy();
const out = {};
for (const id of schemes) out[id] = build(id);
writeFileSync(join(ROOT, 'deliverables/65-exec/_baseline.json'), JSON.stringify(out, null, 1), 'utf8');

const lens = schemes.map((id) => out[id].length);
console.log('案数：' + schemes.length);
console.log('长度：min=' + Math.min(...lens) + ' max=' + Math.max(...lens));
console.log('首行（S01 / S16 / S30）：');
for (const id of ['S01', 'S16', 'S30']) console.log('  ' + id + ' | ' + out[id].split('\n')[0]);
