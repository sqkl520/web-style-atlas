// r20-emoji-provenance.mjs — 核实「改后 lint 报的 13 处 emoji 是否都是改前就有的」，
// 并区分三个口径：
//   A. inspect.mjs / probe.mjs —— 运行时 document.body.innerText（用户真能看到什么）
//   B. lint.mjs               —— 静态源码逐行扫描（含注释续行，:80 只跳过行首是注释符的行）
//   C. grep 全文件             —— 最宽口径（含所有注释）
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const EMO = /[\u{1F300}-\u{1FAFF}\u{2700}-\u{27BF}\u{2600}-\u{26FF}]/u;

const lintHits = (files) => {
  const r = spawnSync(process.execPath,
    ['tools/taste-skill/skills/taste-skill/scripts/lint.mjs', ...files, '--json'], { encoding: 'utf8' });
  return JSON.parse(r.stdout).findings.filter((f) => f.id === 'emoji');
};

const before = lintHits(['deliverables/67-exec/_lab/before-src/style.css', 'deliverables/67-exec/_lab/before-src/app.js']);
const after = lintHits(['prototypes/_selection/style.css', 'prototypes/_selection/app.js']);

// 把每处命中归类：是否在块注释内
const classify = (loc) => {
  const [file, lineStr] = loc.split(':');
  const line = +lineStr;
  const src = readFileSync(file, 'utf8').split(/\r?\n/);
  const upto = src.slice(0, line).join('\n');
  const inBlock = upto.lastIndexOf('/*') > upto.lastIndexOf('*/');
  const lineText = (src[line - 1] || '');
  // 该行的"有效代码"部分（剥掉块注释）
  let code = '', inC = false, j = 0;
  for (let i = 0; i < line - 1; i++) { /* 需要知道进入该行时的注释状态 */ }
  // 简化：用整文件扫描定位该行起始时的注释状态
  let state = false;
  for (let i = 0; i < line - 1; i++) {
    const l = src[i]; let k = 0;
    while (k < l.length) {
      if (state) { const e = l.indexOf('*/', k); if (e === -1) { k = l.length; } else { state = false; k = e + 2; } }
      else { const s = l.indexOf('/*', k); if (s === -1) { k = l.length; } else { state = true; k = s + 2; } }
    }
  }
  let k = 0;
  while (k < lineText.length) {
    if (state) { const e = lineText.indexOf('*/', k); if (e === -1) { k = lineText.length; } else { state = false; k = e + 2; } }
    else { const s = lineText.indexOf('/*', k); if (s === -1) { code += lineText.slice(k); k = lineText.length; } else { code += lineText.slice(k, s); state = true; k = s + 2; } }
  }
  return { file, line, inBlock, codePart: code.trim(), rendersEmoji: EMO.test(code) };
};

console.log('=== 口径 B：lint.mjs 静态命中 ===');
console.log(`改前 ${before.length} 处 → 改后 ${after.length} 处`);
console.log('\n改后逐处（判定该行是否还有"活代码"里的 emoji）:');
let codeHits = 0;
for (const f of after) {
  const c = classify(f.file + ':' + f.line);
  const verdict = c.rendersEmoji ? '代码里仍有 emoji ← 真问题' : '纯注释 ← 不渲染';
  if (c.rendersEmoji) codeHits++;
  console.log(`  ${f.file}:${f.line}  ${verdict}`);
  console.log(`      ${(c.codePart || '(本行无代码)').slice(0, 76)}`);
}
console.log(`\n改后"活代码里的 emoji"：${codeHits} 处`);
console.log(`改后"纯注释里的 emoji"：${after.length - codeHits} 处`);

// 改前那 14 处的分类，用于对比
let beforeCode = 0;
for (const f of before) { const c = classify(f.file + ':' + f.line); if (c.rendersEmoji) beforeCode++; }
console.log(`改前"活代码里的 emoji"：${beforeCode} 处（其中真正渲染到页面的：1 处 = .cap）`);
