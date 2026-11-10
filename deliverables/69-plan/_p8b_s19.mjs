// 探针 8b：Lead 说「buildPrompt('S19') 的调色板里没有 #4A5C3A」——我实测整份含它。
// 关键区别：它出现在**配色第 1 条**，还是出现在别处（比如防退化禁令里的 #6366F1 就是禁令色）？
import { loadCtx, out } from './_lib.mjs';

const w = loadCtx();
const bp = w.buildStylePrompt;
const live = bp('S19', { biz: '', action: '' });
out('=== buildPrompt("S19") 全文 ===');
out(live);
out('\n=== #4A5C3A 出现在哪一行 ===');
live.split('\n').forEach((l, i) => { if (l.includes('#4A5C3A')) out(`  L${i + 1}: ${l}`); });
out('\n=== #6366F1 出现在哪一行（对照：它是禁令色）===');
live.split('\n').forEach((l, i) => { if (l.includes('#6366F1')) out(`  L${i + 1}: ${l}`); });
