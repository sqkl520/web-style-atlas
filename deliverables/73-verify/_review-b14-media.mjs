/* B14 补测：check-texture 的**漏检面**。
 *
 * 判据正则（check-texture.mjs:53）是
 *     /(^|\})\s*([^{}]+?)\s*\{([^{}]*)\}/g
 * 要求选择器前是「行首」或「}`」。而 `@media (max-width: 767px) { body { … } }`
 * 里 body 前面是 `{`（@media 的），所以**整块跳过**。
 *
 * 本仓库实测：31 个 style.css 里 `body` 选择器出现 67 次，其中 **7 次在 @media 内**
 * （S21:827、S24:315/336、S26、S29…）。所以这不是假设的边角情况。
 *
 * 三个变异：
 *   X1  @media 里挂 body 背景图  → 应当红（契约 §9.2 只说 body，没说只是顶层 body）
 *   X2  顶层 body 挂图（对照组）  → 必须红（证明闸门本身工作）
 *   X3  @media 里挂 body 背景简写 gradient → 应当红
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const ROOT = 'D:/Web/style';
const CSS = `${ROOT}/prototypes/S24-cyanotype-rainforest-path/style.css`;
const orig = readFileSync(CSS, 'utf8');
const restore = () => writeFileSync(CSS, orig, 'utf8');

const run = () => {
  try { return { code: 0, out: execSync('node prototypes/_build/check-texture.mjs', { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }) }; }
  catch (e) { return { code: e.status, out: String(e.stdout || '') }; }
};

console.log('═══ 基线 ═══');
restore();
let r = run();
console.log(`  exit=${r.code}`);

const T = (name, mut) => {
  restore();
  const next = mut(orig);
  if (next === orig) { console.log(`?  锚点未找到：${name}`); return; }
  writeFileSync(CSS, next, 'utf8');
  const res = run();
  const caught = res.code === 1 && /T[12]-body/.test(res.out);
  console.log(`${caught ? '✓ 抓到' : '✗ 漏检'}  ${name}   (exit=${res.code})`);
  restore();
};

console.log('');
T('X2 对照组：顶层 `body{background-image:url(…)}` → 期望抓到',
  (s) => s.replace('body{\n  margin:0;padding-top:104px;', 'body{\n  background-image:url("assets/x.png");\n  margin:0;padding-top:104px;'));

T('X1 `@media (max-width:767px)` 里给 body 挂背景图 → 期望抓到',
  (s) => s.replace('@media (max-width:767px){\n  body{padding-top:118px}',
    '@media (max-width:767px){\n  body{padding-top:118px;background-image:url("assets/x.png")}'));

T('X3 嵌套 `@media`（min+max）里 body 挂 gradient → 期望抓到',
  (s) => s.replace('@media (min-width:768px) and (max-width:1023px){\n  body{padding-top:112px}',
    '@media (min-width:768px) and (max-width:1023px){\n  body{padding-top:112px;background:linear-gradient(#fff,#000)}'));

restore();
console.log(`\n恢复后: exit=${run().code}`);
