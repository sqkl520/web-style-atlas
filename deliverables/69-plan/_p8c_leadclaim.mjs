// 探针 8c：Lead 的核心事实核对 —— 「buildPrompt('S19') 的调色板里没有 #4A5C3A」现在还成立吗？
// 以及：那次手工验证用的 prompt-s19.md 与线上提示词，约束级覆盖率是多少？
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadCtx, ROOT, out } from './_lib.mjs';

const w = loadCtx();
const bp = w.buildStylePrompt;
const live = bp('S19', { biz: '', action: '' });
const hist = readFileSync(join(ROOT, 'deliverables/99-scratch/prompt-s19.md'), 'utf8');
const impl = readFileSync(join(ROOT, 'deliverables/99-scratch/prompt-test/index.html'), 'utf8');

out('=== 断言核对 ===');
out(`  Lead 说：「buildPrompt('S19') 的调色板里没有 #4A5C3A」`);
const palLine = live.split('\n').find((l) => /^1\. 配色只用这几个值/.test(l));
out(`  实测：配色行 = ${palLine}`);
out(`  实测：该行含 #4A5C3A = ${palLine.includes('#4A5C3A')}   → **Lead 的这句现在不成立**`);
out(`  git 溯源：cea8436「修提示词的正确性：7 个 Agent 审出的 P0，30 案圆角/字体/主色/线宽全修」+`);
out(`            a56426e「…并修掉「被反对的颜色」污染调色板」 —— 调色板在 61-plan 之后被修过。`);

out('\n=== 但「那次验证 ≠ 线上链路」这个结论仍然成立，原因换成规模 ===');
const norm = (l) => l.replace(/\s+/g, '').replace(/[（(][^）)]*[）)]/g, '');
const liveL = live.split('\n').map((x) => x.trim()).filter(Boolean);
const histL = hist.split('\n').map((x) => x.trim()).filter(Boolean);
const isC = (l) => /^1\. 配色|^2\. 字体|^3\. 圆角|^4\. 阴影|^5\. 线宽|^1\. 这个版式设计时|^2\. 用你自己的真实数量|^3\. 但?这个版式|^4\. 版式里至少要|^5\. 首屏不要轮播|^6\. 这个版式的硬前提|^[①②③④⑤⑥⑦⑧]|^验收三问|^输出要求|^不引 |^图片位置写成|^移动端单列|^这个风格的签名动作|^这个案子的调性|^请把整页做成/.test(l);
const liveC = liveL.filter(isC), histC = histL.filter(isC);
out(`  线上提示词 ${live.length} 字 / ${liveL.length} 行 / 约束行 ${liveC.length}`);
out(`  手工模板   ${hist.length} 字 / ${histL.length} 行 / 约束行 ${histC.length}`);
const histN = new Set(histL.map(norm));
const kept = liveC.filter((l) => histN.has(norm(l)));
out(`  线上约束行在手工模板里逐字（归一化）存在：${kept.length}/${liveC.length} = ${(kept.length / liveC.length * 100).toFixed(0)}%`);
out('  线上有、手工模板缺：');
for (const l of liveC.filter((x) => !histN.has(norm(x)))) out(`    − ${l.slice(0, 110)}`);

out('\n=== 那次验证的落地页面 vs 线上提示词声称值 ===');
out(`  prompt-test/index.html ${impl.length} 字；含 #4A5C3A = ${impl.includes('#4A5C3A')}`);
out(`  它含 5 个提示词色值中的：${['#4A5C3A', '#E4DECD', '#D8CFB6', '#E9E3D2', '#2A241C', '#3A3227', '#7C7460'].filter((h) => impl.includes(h)).join(' ')}`);
out(`  它的字体声明：${[...new Set((impl.match(/font-family\s*:\s*([^;}"]+)/g) || []).map((x) => x.replace(/font-family\s*:\s*/, '').trim()))].slice(0, 5).join(' | ')}`);
out(`  线上 S19 声称标题字体：${(live.match(/标题按这个顺序取第一个可用的：([^（]+)/) || [])[1]}`);
