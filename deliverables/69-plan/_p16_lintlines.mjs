// 探针 16：把 lint.mjs 的每条 finding 精确对回源码行（用 Node 自己读，避免 PowerShell 编码差异），
// 并**直接测那条正则是否真的命中该行** —— 判断静态 lint 的红是"真缺陷"还是"注释/误伤"。
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { ROOT, out } from './_lib.mjs';

const NODE = process.execPath;
const LINT = join(ROOT, 'tools/taste-skill/skills/taste-skill/scripts/lint.mjs');
let j = {};
try {
  j = JSON.parse(execFileSync(NODE, [LINT, join(ROOT, 'prototypes/S13-blind-debossed-dispatch'), '--json'],
    { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'] }));
} catch (e) { j = JSON.parse(e.stdout || '{"findings":[]}'); }

// 从 lint.mjs 里把 R 表原文抽出来，逐条重建正则（保证与工具一致）
const lintSrc = readFileSync(LINT, 'utf8');
const R = [];
for (const m of lintSrc.matchAll(/\['(FAIL|WARN)',\s*'([a-z-]+)',\s*\/(.+?)\/([a-z]*),\s*'([^']*)'\]/g)) {
  try { R.push({ level: m[1], id: m[2], re: new RegExp(m[3], m[4]), msg: m[5] }); } catch { /* skip */ }
}
out(`重建规则 ${R.length} 条（lint.mjs 里共 ${(lintSrc.match(/\['(FAIL|WARN)', /g) || []).length} 条）`);

const cache = {};
const lines = (f) => (cache[f] = cache[f] || readFileSync(f, 'utf8').split(/\r?\n/));

out('\n=== S13 每条静态 finding 的原文与命中的是哪个子模式 ===');
for (const f of j.findings || []) {
  const L = (lines(f.file)[f.line - 1] ?? '');
  const rule = R.find((r) => r.id === f.id);
  out(`  L${f.line} [${f.level} ${f.id}]`);
  out(`    源码: ${JSON.stringify(L.slice(0, 150))}`);
  if (rule) {
    // 找命中的具体片段
    const m = L.match(rule.re);
    out(`    正则命中: ${m ? JSON.stringify(m[0].slice(0, 80)) : '(该行不命中！)'}`);
    // 判断这一行是否在块注释内：向上找最近的 /* 与 */ 谁更近
    const all = lines(f.file);
    let inComment = false;
    for (let i = 0; i <= f.line - 1; i++) {
      const s = all[i] || '';
      // 简化状态机：逐行扫描 /* 与 */
      let p = 0;
      while (p < s.length) {
        const open = s.indexOf('/*', p), close = s.indexOf('*/', p);
        if (open < 0 && close < 0) break;
        if (open >= 0 && (close < 0 || open < close)) { inComment = true; p = open + 2; }
        else { inComment = false; p = close + 2; }
      }
      if (i === f.line - 1) break;
    }
    out(`    是否在 CSS 块注释内: ${inComment ? 'YES ← 误伤（注释不渲染）' : 'no'}`);
  }
}
