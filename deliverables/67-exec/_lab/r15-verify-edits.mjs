// r15-verify-edits.mjs — 确认本轮 4 条编辑在当前工作区仍然成立（并发 Agent 可能覆盖）
// 注意：判定一律在**剥离注释后**的源码上做。理由：本轮为每处改动都写了长注释，
// 注释里会引述旧值（`font-size: 11px`）和旧符号（⚠），裸 grep 会把注释当成代码 ——
// 这正是本仓库反复踩过的"注释里的话被当成实现"的坑，检查脚本自己也不该踩。
import { readFileSync } from 'node:fs';

const CSS_RAW = readFileSync('prototypes/_selection/style.css', 'utf8');
const APP_RAW = readFileSync('prototypes/_selection/app.js', 'utf8');

// 剥 /* ... */（跨行）与 // 行注释。CSS 只有块注释；JS 两种都要。
const stripCss = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '');
const stripJs = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"\\])\/\/[^\n]*/g, '$1');

const CSS = stripCss(CSS_RAW);
const APP = stripJs(APP_RAW);

const checks = [];
const add = (name, ok, detail = '') => checks.push({ name, ok, detail });

add('style.css: .mast h1 用 var(--s-h1)',
  /\.mast h1\s*\{[^}]*font-size:\s*var\(--s-h1\);/.test(CSS));
add('style.css: --s-h1 定义仍在 clamp(34px, 5.2vw, 74px)',
  /--s-h1:\s*clamp\(34px,\s*5\.2vw,\s*74px\);/.test(CSS));
add('style.css: 旧的 clamp(30px, 4vw, 56px) 已不存在',
  !/clamp\(30px,\s*4vw,\s*56px\)/.test(CSS));
add('style.css: 620 档 font-size:11px 覆盖已删（注释已剥离）',
  !/\.shot figcaption\s*\{\s*font-size:\s*11px/.test(CSS));
add('style.css: .cap 用 var(--s-13)',
  /\.cap\s*\{[^}]*font-size:\s*var\(--s-13\);/.test(CSS));
add('style.css: .scene-tpl 用 var(--s-13)',
  /\.scene-tpl\s*\{[^}]*font-size:\s*var\(--s-13\);/.test(CSS));

// app.js: cap-warn 渲染串（剥注释后）
const capWarn = APP.match(/if \(cap\.degrades === 'yes'\) \{[\s\S]{0,1200}?\n    \}/);
add('app.js: 找到 cap-warn 分支', !!capWarn);
if (capWarn) {
  add('app.js: cap-warn 代码里无 ⚠', !/⚠/.test(capWarn[0]));
  add('app.js: cap-warn 仍输出「内容少于 N 条会留空位」',
    /'内容少于 ' \+ cap\.minItems \+ ' 条会留空位/.test(capWarn[0]));
  add('app.js: cap-warn 仍带 title 解释',
    /title="这个版式的单元位置是写死的/.test(capWarn[0]));
}

// 剥注释后，全文件所有 font-size 声明里不得有 <13px
const fsDecls = [...CSS.matchAll(/font-size:\s*([^;}]+)/g)].map((m) => m[1].trim());
const pxDecls = fsDecls.map((v) => v.match(/^([\d.]+)px$/)).filter(Boolean).map((m) => parseFloat(m[1]));
const tiny = pxDecls.filter((n) => n < 13);
add('style.css: 剥注释后 font-size 字面量无 <13px',
  tiny.length === 0, `共 ${pxDecls.length} 条 px 字号，其中 <13px 的 ${tiny.length} 条${tiny.length ? '：' + tiny.join(', ') : ''}`);

let fail = 0;
for (const c of checks) {
  if (!c.ok) fail++;
  console.log(`${c.ok ? 'PASS' : 'FAIL'}  ${c.name}${c.detail ? '  — ' + c.detail : ''}`);
}
console.log(`\n${checks.length - fail}/${checks.length} 通过`);
process.exit(fail ? 1 : 0);
