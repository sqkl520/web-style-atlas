// 探针 8：A 的关键事实 —— 起点到底是不是 0/30。
// 检查 deliverables/99-scratch 里那次 S19 手工验证的三个物证：
//   prompt-s19.md（手工模板） / prompt-test/index.html（照它实现的页面） / verify-landing-prompt.mjs
// 判据：手工模板里的色值是否出现在 buildPrompt('S19') 里；若不在，则验证链路 ≠ 线上链路。
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { loadCtx, ROOT, out } from './_lib.mjs';

const w = loadCtx();
const bp = w.buildStylePrompt;

const hexes = (t) => [...new Set((t.match(/#[0-9A-Fa-f]{6}\b/g) || []).map((x) => x.toUpperCase()))];

const files = {
  'prompt-s19.md': join(ROOT, 'deliverables/99-scratch/prompt-s19.md'),
  'prompt-test/index.html': join(ROOT, 'deliverables/99-scratch/prompt-test/index.html'),
  'T-FINAL.md': join(ROOT, 'deliverables/99-scratch/T-FINAL.md'),
  'template-S19-v11.md': join(ROOT, 'deliverables/99-scratch/template-S19-v11.md'),
};
out('=== 那次手工验证的物证（现状） ===');
for (const [n, p] of Object.entries(files)) {
  if (!existsSync(p)) { out(`  ${n}: 不存在`); continue; }
  const t = readFileSync(p, 'utf8');
  out(`  ${n}: ${t.length} 字  ${t.split(/\r?\n/).length} 行  含#4A5C3A=${t.includes('#4A5C3A')}  色值=[${hexes(t).join(' ')}]`);
}

const live = bp('S19', { biz: '', action: '' });
out('\n=== 线上 buildPrompt("S19") ===');
out(`  ${live.length} 字  ${live.split('\n').length} 行`);
out(`  色值 = [${hexes(live).join(' ')}]`);
out(`  含 #4A5C3A = ${live.includes('#4A5C3A')}`);
const liveSet = new Set(hexes(live));
const histSet = new Set(hexes(readFileSync(files['prompt-s19.md'], 'utf8')));
out(`  手工模板色值 ∩ 线上色值 = [${[...histSet].filter((h) => liveSet.has(h)).join(' ')}]  （${[...histSet].filter((h) => liveSet.has(h)).length}/${histSet.size}）`);
out(`  ⚠️ 结论：那次验证用的提示词与线上提示词是同名不同物。`);

out('\n=== 那次验证的 5 项判据 vs 本轮的机械化能力 ===');
out('  色值      可机械（hex 比对）');
out('  字体      可机械（computed fontFamily / CSS.getPlatformFontsForNode）');
out('  圆角      可机械（computed borderRadius）');
out('  阴影      可机械（computed boxShadow）');
out('  "编号三处一致" 半机械（要人先指认哪三处）');

out('\n=== 仓库里有没有现成的 A 级复用件 ===');
const candidates = [
  'deliverables/63-test/replica',
  'deliverables/62-verify/impl',
  'deliverables/62-verify/prompts',
  'deliverables/99-scratch/prompt-test',
];
for (const c of candidates) {
  const p = join(ROOT, c);
  if (!existsSync(p)) { out(`  ${c}: 不存在`); continue; }
  const { readdirSync, statSync } = await import('node:fs');
  const fs2 = readdirSync(p).slice(0, 8);
  out(`  ${c}: ${fs2.length} 项  ${fs2.join(' ')}`);
}
