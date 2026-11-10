// 探针 13b：62-verify 那三个 impl 到底是"哪一版提示词"的复刻，差多少行？
// 逐行 diff 存档 prompts vs 线上 buildPrompt。若差异只在开头两行，则这 3 个 impl 的
// 约束段与线上**完全一致**，可以作为 3/30 的现成证据（省掉重新生成的半天/案）。
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadCtx, ROOT, out } from './_lib.mjs';

const w = loadCtx();
const bp = w.buildStylePrompt;

for (const id of ['S07', 'S23', 'S30']) {
  const saved = readFileSync(join(ROOT, `deliverables/62-verify/prompts/${id}.txt`), 'utf8').replace(/^\uFEFF/, '').trim().split(/\r?\n/);
  const live = bp(id, { biz: '', action: '' }).trim().split(/\r?\n/);
  out(`=== ${id}  存档 ${saved.length} 行 / 线上 ${live.length} 行 ===`);
  const n = Math.max(saved.length, live.length);
  let diffs = 0;
  for (let i = 0; i < n; i++) {
    if ((saved[i] || '') === (live[i] || '')) continue;
    diffs++;
    if (diffs <= 8) out(`  L${i + 1}\n    存档: ${(saved[i] || '(缺)').slice(0, 130)}\n    线上: ${(live[i] || '(缺)').slice(0, 130)}`);
  }
  out(`  不同行数 = ${diffs}/${n}`);
  // 关键约束行是否逐字相同
  const keyPat = /^1\. 配色只用这几个值|^2\. 字体|^3\. 圆角|^4\. 阴影|^5\. 线宽只用这几级|^1\. 这个版式设计时排了|^4\. 版式里至少要|^防退化/;
  const keySaved = saved.filter((l) => keyPat.test(l));
  const keyLive = live.filter((l) => keyPat.test(l));
  out(`  关键约束行：存档 ${keySaved.length} 条 / 线上 ${keyLive.length} 条  逐字全同 = ${JSON.stringify(keySaved) === JSON.stringify(keyLive)}`);
  out('');
}

out('=== 这三个 impl 实际用的字体（检查提示词说的字体有没有落地）===');
for (const id of ['S07', 'S23', 'S30']) {
  const h = readFileSync(join(ROOT, `deliverables/62-verify/impl/${id}.html`), 'utf8');
  const fam = [...new Set((h.match(/font-family\s*:\s*([^;}]+)/g) || []).map((x) => x.replace(/font-family\s*:\s*/, '').trim()))];
  out(`  ${id}: ${fam.slice(0, 6).join(' | ')}`);
  out(`     声明 @font-face 的族 = ${[...new Set((h.match(/font-family\s*:\s*["']?([^;"'}]+)/g) || []).map((x) => x.split(':')[1].trim().replace(/["']/g, '')))].join(', ')}`);
}
