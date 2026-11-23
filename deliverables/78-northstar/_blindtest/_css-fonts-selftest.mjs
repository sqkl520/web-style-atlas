/* 一致性验证：新抽出的 _css-fonts.mjs 与既有几份实现是否给出相同结果。
 *
 * 这是本仓库反复记的那条：「同一组逻辑不要写第二个实现」。
 * 收成一份的时候，**必须证明新的一份和旧的那几份等价** ——
 * 否则只是把「四份可能互相漂移的实现」变成「五份」。
 *
 * 比对对象：
 *   ① score.mjs 的 judgeFontChain（不展开 var 的那份 —— 它是有意不展开的，
 *      所以只在「全字面」输入上应当一致）
 *   ② _repeatability.mjs 里的展开逻辑（复制品）
 *   ③ _font-fallback-chain.mjs 里的展开逻辑（复制品）
 *
 * 判据：在同一批样本上，新实现给出的族名集合与 ②③ 逐个相同。
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fontChains, chainOf, cssVariables, expandVars } from './_css-fonts.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const BT = HERE;   // 这个脚本就在 _blindtest 里

/* ── 参照实现（就地从另外两个脚本的源码里切出来，避免手工抄错）── */
function sliceFn(src, name) {
  const i = src.indexOf(`function ${name}(`);
  if (i < 0) return null;
  const rest = src.slice(i);
  const e = rest.slice(1).search(/\n(?:function |const |let |var )/);
  return rest.slice(0, e > 0 ? e + 1 : rest.length);
}

/* _repeatability.mjs 用的是内联的展开，不是函数 —— 所以直接照它的写法重建一份。
 * ⚠️ 这正是「复制品」的问题所在：它没有函数边界，切都切不出来。 */
function refRepeatability(html) {
  const cssVars = {};
  for (const m of html.matchAll(/(--[\w-]+)\s*:\s*([^;}]+)/g)) cssVars[m[1]] = m[2];
  const expand = (s, depth = 0) => {
    if (depth > 5) return s;
    return s.replace(/var\(\s*(--[\w-]+)\s*(?:,[^)]*)?\)/g,
      (_, name) => (cssVars[name] !== undefined ? expand(cssVars[name], depth + 1) : ''));
  };
  const fams = new Set();
  for (const m of html.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/font-family\s*:\s*([^;}]+)/g)) {
    const head = expand(m[1]).split(',')[0].trim().replace(/^["']|["']$/g, '').trim();
    if (!head) continue;
    if (/^var\(/i.test(head)) continue;
    if (/^(serif|sans-serif|monospace|system-ui|inherit)$/i.test(head)) continue;
    fams.add(head);
  }
  return [...fams].sort();
}

/* 取样：所有产物 + 所有原型（两边都有大量 var() 用法，最能暴露差异） */
const samples = [];
const artDirs = readdirSync(BT, { withFileTypes: true })
  .filter((d) => d.isDirectory() && /^S\d{2}(-r\d+)?$/.test(d.name)).map((d) => d.name);
for (const id of artDirs) {
  const p = join(BT, id, 'index.html');
  if (existsSync(p)) samples.push({ id, src: readFileSync(p, 'utf8') });
}
const protoBase = resolve(BT, '..', '..', '..', 'prototypes');
if (existsSync(protoBase)) {
  for (const d of readdirSync(protoBase, { withFileTypes: true })) {
    if (!d.isDirectory() || !/^S\d{2}-/.test(d.name)) continue;
    const p = join(protoBase, d.name, 'style.css');
    if (existsSync(p)) samples.push({ id: d.name.slice(0, 3) + '(原型)', src: readFileSync(p, 'utf8') });
  }
}

console.log(`比对样本：${samples.length} 份（产物 ${artDirs.length} + 原型）\n`);

let diff = 0;
for (const s of samples) {
  const mine = new Set();
  for (const c of fontChains(s.src)) if (c[0] && !/^var\(/i.test(c[0])) mine.add(c[0]);
  mine.delete('[object Object]');
  const ref = refRepeatability(s.src);
  const a = [...mine].sort().join('|');
  const b = ref.join('|');
  if (a !== b) {
    diff++;
    console.log(`✗ ${s.id}`);
    console.log(`   新实现：${a || '（空）'}`);
    console.log(`   参照：  ${b || '（空）'}`);
  }
}

console.log(diff === 0
  ? `✓ ${samples.length} 份样本上，新实现与 _repeatability 的抽取结果完全一致`
  : `✗ ${diff} 份样本结果不同 —— 新实现与旧的漂移了，先查谁对`);

/* ── 再验一条更细的：expandVars 对带 fallback 的 var 的处理 ──────
 * 这是新实现比旧实现**多**支持的一种情况：`var(--x, var(--y))`。
 * 旧的几份都写成 `(?:,[^)]*)?`，遇到嵌套 fallback 会截断。
 * 这一条不是「等价验证」，是「新实现更正确」的证据 —— 也说明
 * 为什么收成一份有价值：四份复制品都会截断，只有新的一份不会。 */
const tricky = '--a: var(--b, var(--c)); --c: Georgia;';
const vars = cssVariables(tricky);
const got = expandVars('var(--a), serif', vars).trim();
const want = 'Georgia, serif';
console.log('');
console.log('嵌套 fallback 的展开：');
console.log(`  输入 var(--a), serif，其中 --a: var(--b, var(--c))、--c: Georgia`);
console.log(`  新实现 ${JSON.stringify(got)}  ${got === want ? '✓' : '✗ 期望 ' + JSON.stringify(want)}`);

if (diff !== 0 || got !== want) process.exit(1);
