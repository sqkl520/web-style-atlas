/* plan-probe-p2.mjs — 只读：核 P2 改名的**当前状态**（另一个 agent 已在 02:2x 动过）
 * 不依赖猜测，直接数。
 */
import { readFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const rd = (f) => readFileSync(join(ROOT, f), 'utf8');
const count = (s, re) => (s.match(re) || []).length;

const data = rd('prototypes/_selection/data.js');
const app = rd('prototypes/_selection/app.js');
const coll = rd('prototypes/_build/collect-schemes.mjs');
const chk = rd('prototypes/_build/check-docs.mjs');
const tw = rd('prototypes/_build/check-twolines.mjs');

console.log('═══ P2 · 改名的当前落地状态 ═══\n');
console.log('  data.js   "fonts":      ', count(data, /"fonts":/g));
console.log('  data.js   "fontsSpec":  ', count(data, /"fontsSpec":/g));
console.log('  app.js    r.fonts       ', count(app, /r\.fonts\b/g));
console.log('  app.js    r.fontsSpec   ', count(app, /r\.fontsSpec\b/g));
console.log('  collect   fonts:        ', count(coll, /\bfonts:/g));
console.log('  collect   fontsSpec:    ', count(coll, /\bfontsSpec:/g));
console.log('  check-docs .fonts        ', count(chk, /\.fonts\b/g));
console.log('  check-twolines .fonts    ', count(tw, /\.fonts\b/g));

console.log('\n  ── 兼容兜底的两处（`|| r.fonts`）──');
for (const f of ['prototypes/_selection/app.js', 'prototypes/_selection/collect-schemes.mjs']) {
  const src = f.includes('collect') ? coll : app;
  src.split(/\r?\n/).forEach((L, i) => {
    if (/fontsSpec\s*\|\|\s*[^|]*fonts\b/.test(L)) console.log(`     ${f.replace(/\\/g,'/')}:${i + 1}  ${L.trim().slice(0, 120)}`);
  });
}

console.log('\n  ── 30 案的字体策略字段是否还完整（改名不能丢字节）──');
const lens = [...data.matchAll(/"fontsSpec":\s*"((?:[^"\\]|\\.)*)"/g)].map((m) => m[1].length);
console.log(`     命中 ${lens.length} 处；字符数 min=${Math.min(...lens)} max=${Math.max(...lens)} 合计 ${lens.reduce((a,b)=>a+b,0)}`);
console.log(`     对照：改名前的读数应同为 30 处 / min=228 max=520 / 合计 11232`);
console.log(`     ${lens.length === 30 && lens.reduce((a,b)=>a+b,0) === 11232 ? '✓ 一致（改名是纯符号搬家，未丢字节）' : '✗ 不一致 —— 有字节被改了'}`);

console.log('\n  ── 兜底分支的子句：它现在隐藏了什么 ──');
console.log('     app.js:239   `r.fontsSpec || r.fonts`   ⇒ 若 data.js 退回旧键名，UI 仍能显示 → **不会红**');
console.log('     app.js:1357  `r.fontsSpec || r.fonts`   ⇒ 同上');
console.log('     后果：如果只改了 collect-schemes 又只改了 app.js 的一半，两处兜底会把"改名没做完"变成静默可用。');
console.log('     这正是本次改名要消灭的"同名不同形状"的镜像：现在是"两个名字都活着"。');
