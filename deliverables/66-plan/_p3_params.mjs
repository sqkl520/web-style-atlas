// P3：buildPrompt 读了哪些 opts 字段、谁传了值（含 o.mood / o.count / o.unit / o.tone）
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { SEL, ROOT } from './_lib.mjs';

const src = readFileSync(join(SEL, 'prompt-copy.js'), 'utf8');
const lines = src.split(/\r?\n/);

// buildPrompt 函数体边界：从 `function buildPrompt(` 到行首两个空格的 `}` 收尾（函数声明在 IIFE 内缩进 2）
const start = lines.findIndex((l) => /function buildPrompt\(/.test(l));
let end = -1, depth = 0;
for (let i = start; i < lines.length; i++) {
  const l = lines[i];
  depth += (l.match(/\{/g) || []).length - (l.match(/\}/g) || []).length;
  if (depth === 0 && i > start) { end = i; break; }
}
const body = lines.slice(start, end + 1);
console.log('buildPrompt 行号 %d–%d（含）  共 %d 行', start + 1, end + 1, body.length);

// 注释要剥掉：本文件里注释大量引用 o.xxx 来讲历史，不剥会把"文档"当"读取"
const stripComment = (s) => s.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:"])\/\/[^\n]*/g, '$1 ');
const codeOnly = body.map(stripComment).join('\n');

const reads = [...new Set([...codeOnly.matchAll(/\bo\.([A-Za-z_]\w*)/g)].map((m) => m[1]))].sort();
console.log('\n== 代码（剥注释）里出现的 o.* 字段 ==');
console.log(reads.join(', '));

// 逐个字段：是否真的被"取值使用"（出现在 o.X 且不是只出现在注释里）
console.log('\n== 逐字段：给不给默认值 / 谁在传 ==');
const callers = [];
for (const f of ['prompt-copy.js', 'app.js', 'wizard.js']) {
  const t = readFileSync(join(SEL, f), 'utf8');
  t.split(/\r?\n/).forEach((l, i) => {
    if (/buildPrompt\s*\(|buildStylePrompt\s*\(/.test(l)) callers.push(`${f}:${i + 1}: ${l.trim().slice(0, 140)}`);
  });
}
console.log('\n-- 仓库里所有 buildPrompt / buildStylePrompt 调用点 --');
callers.forEach((c) => console.log('   ' + c));

// 每个 opts 字段在"调用点"里是否作为对象字面量的键出现
const callerText = callers.join('\n');
console.log('\n-- 每个字段是否出现在任何调用点的实参里 --');
for (const f of reads) {
  const inCaller = new RegExp('\\b' + f + '\\s*:').test(callerText);
  const passThrough = new RegExp('\\b' + f + '\\s*:').test(
    readFileSync(join(SEL, 'prompt-copy.js'), 'utf8')
      .split(/\r?\n/).filter((l) => /copyPrompt|readFields|buildPrompt\(id,/.test(l)).join('\n')
  );
  console.log(`  o.${f.padEnd(8)} 调用点直接给值=${inCaller ? 'YES' : 'no '}  文件内中转=${passThrough ? 'YES' : 'no'}`);
}

// 读一遍 copyPrompt 的签名与实参
const cp = lines.findIndex((l) => /function copyPrompt/.test(l));
console.log('\n-- copyPrompt 定义行 %d --', cp + 1);
lines.slice(cp, cp + 8).forEach((l, i) => console.log('   ' + (cp + 1 + i) + ': ' + l));
