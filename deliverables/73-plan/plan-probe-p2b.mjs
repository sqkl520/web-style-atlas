/* plan-probe-p2b.mjs — 只读：用 git 里的 HEAD 版本做**真正的**改名前后对比。
 *
 * 上一版 plan-probe-p2.mjs 里那句「对照：改名前应为 11232」是**我写死的常量**，
 * 不是实测 —— 那等于自己跟自己比。这里改成从 `git show HEAD:…` 取旧版，
 * 用**同一套正则、同一个度量**算两遍。
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

const head = execFileSync('git', ['show', 'HEAD:prototypes/_selection/data.js'], {
  cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024,
});
const now = readFileSync(join(ROOT, 'prototypes/_selection/data.js'), 'utf8');

/* 同一套度量：raw 匹配长度（不解转义），分别对旧键名与新键名 */
const measure = (src, key) => {
  const re = new RegExp('\\n(\\s*)"' + key + '":\\s*"((?:[^"\\\\]|\\\\.)*)"', 'g');
  const lens = [...src.matchAll(re)].map((m) => m[2].length);
  return { n: lens.length, lens, sum: lens.reduce((a, b) => a + b, 0), min: Math.min(...lens), max: Math.max(...lens) };
};

const before = measure(head, 'fonts');
const after = measure(now, 'fontsSpec');
const leftover = measure(now, 'fonts');

console.log('═══ P2 · 改名前后逐案字节对比（git HEAD vs 工作区）═══\n');
console.log(`  HEAD :prototypes/_selection/data.js  "fonts":     ${before.n} 处，合计 ${before.sum} 字符，min=${before.min} max=${before.max}`);
console.log(`  工作区                                 "fontsSpec": ${after.n} 处，合计 ${after.sum} 字符，min=${after.min} max=${after.max}`);
console.log(`  工作区                                 "fonts":     ${leftover.n} 处（必须为 0）`);

const same = before.n === after.n && before.sum === after.sum
  && before.min === after.min && before.max === after.max;
console.log(`\n  ⇒ ${same ? '✓ 逐案合计、极值全同 ⇒ 改名确实是纯符号搬家，未丢字节' : '✗ 有差异 —— 改名同时改了内容'}`);

if (before.n === after.n) {
  const diffs = before.lens.map((l, i) => (l === after.lens[i] ? null : `#${i + 1} ${l}→${after.lens[i]}`)).filter(Boolean);
  console.log(`  逐案（按出现顺序）长度不同的：${diffs.length ? diffs.join('  ') : '无'}`);
}

/* 附带：prompts.js 侧的 dna.fonts 是不是 30 个对象（P2 的"另一种形状"） */
const pj = readFileSync(join(ROOT, 'prototypes/_selection/prompts.js'), 'utf8');
const obj = [...pj.matchAll(/"fonts":\s*\{/g)].length;
const arr = [...pj.matchAll(/"fonts":\s*\[/g)].length;
console.log(`\n  prompts.js 的 dna.fonts：对象 ${obj} 处 / 数组 ${arr} 处` +
  `　⇒ ${obj === 30 && arr === 0 ? '30/30 全是对象，"数组兜底分支"确实是死代码' : '有数组形态，需复查'}`);
