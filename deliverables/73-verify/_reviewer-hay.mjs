/* 最硬的搜索测试：不重写字段表，而是从 app.js 源码里**原样抠出** hay 那一行表达式，
 * 用 Function 在 30 个真实记录上求值。这样测的是"app.js 的真实代码"，
 * 而不是我对 app.js 的理解（后者正是交付方脚本的弱点：它自己重写了一遍字段表）。
 */
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const ROOT = 'D:/Web/style';
const SEL = ROOT + '/prototypes/_selection';
const app = readFileSync(SEL + '/app.js', 'utf8');
const now = JSON.parse(readFileSync(SEL + '/data.js', 'utf8').match(/window\.SCHEMES\s*=\s*(\[[\s\S]*\])\s*;/)[1]);

/* 抠出 `var hay = [ ... ].join(' ').toLowerCase();` —— 允许跨行，从 var hay 到 toLowerCase() */
const m = app.match(/var hay = \[[\s\S]*?\.join\(' '\)\.toLowerCase\(\);/);
if (!m) { console.error('抠不到 hay 表达式'); process.exit(1); }
const exprSrc = m[0];
console.log('═══ 从 app.js 原样抠出的 hay 表达式（' + exprSrc.split('\n').length + ' 行）═══');
console.log(exprSrc.split('\n').map((l) => '  ' + l.trim()).join('\n'));
console.log('  含 fontsSpec:', /fontsSpec/.test(exprSrc), '| 含裸 r.fonts 回退:', /\|\|\s*r\.fonts\b/.test(exprSrc));

const evalHay = new Function('r', 'ax', exprSrc.replace(/^var hay =/, 'return '));
let ok = 0; const bad = [], viaFallback = [];
for (const r of now) {
  const ax = r.axes || {};
  const hay = evalHay(r, ax);
  const spec = String(r.fontsSpec || '');
  if (spec && hay.includes(spec.toLowerCase())) ok++;
  else bad.push(r.id);
  /* 兜底有没有被真正用到？把它抽掉再算一次，结果应完全相同 */
  const alt = evalHay({ ...r, fonts: undefined }, ax);
  if (alt !== hay) viaFallback.push(r.id);
}
console.log('\n═══ 真实代码求值结果 ═══');
console.log(`  fontsSpec 整串进入 hay: ${ok}/30`);
if (bad.length) console.log('  失败:', bad.join(' '));
console.log(`  去掉兜底后 hay 发生变化的案: ${viaFallback.length}  ⇒ 兜底当前${viaFallback.length ? '有' : '无'}作用`);

/* 反向：把 data.js 的记录改名回 fonts，看真实代码还能不能索引到（证明兜底在工作） */
const legacy = now.map((r) => { const c = { ...r }; c.fonts = c.fontsSpec; delete c.fontsSpec; return c; });
let legacyOk = 0;
for (const r of legacy) if (evalHay(r, r.axes || {}).includes(String(r.fonts).toLowerCase())) legacyOk++;
console.log(`  旧键名数据（只有 fonts）下仍能索引: ${legacyOk}/30  ⇒ 兜底${legacyOk === 30 ? '确实兜住了' : '没兜住'}`);

/* 再检：把兜底删掉后，旧键名数据是否静默失效（这是"兜底必要性"的量化） */
const noFb = exprSrc.replace(/\s*\|\|\s*r\.fonts\b/, '');
const evalNoFb = new Function('r', 'ax', noFb.replace(/^var hay =/, 'return '));
let noFbOk = 0;
for (const r of legacy) if (evalNoFb(r, r.axes || {}).includes(String(r.fonts).toLowerCase())) noFbOk++;
console.log(`  同一旧数据、去掉兜底后能索引: ${noFbOk}/30  ⇒ 兜底价值 = 多救 ${legacyOk - noFbOk} 案`);
/* 新数据 + 去掉兜底 */
let newNoFb = 0;
for (const r of now) if (evalNoFb(r, r.axes || {}).includes(String(r.fontsSpec).toLowerCase())) newNoFb++;
console.log(`  当前新数据、去掉兜底后能索引: ${newNoFb}/30  ⇒ 今天删兜底的收益/风险差 = ${30 - newNoFb} 案回退`);
