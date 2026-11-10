/* 决定性取证：check-texture.mjs 的选择器正则
 *   /(^|\})\s*([^{}]+?)\s*\{([^{}]*)\}/g
 * 会**吞掉前一条规则的 `}`**，导致「连续规则只匹配上隔一条」。
 *
 * 本脚本做两件事：
 *   ① 统计每个 style.css 里 body/html 规则被闸门看到几条 vs 实际几条
 *   ② 在 S24 **真实的顶层 body 规则**里注入 background-image，直接跑闸门
 *      —— 若仍 exit 0，则「31 个 style.css 全部合规」这个结论不可信。
 */
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { join } from 'node:path';

const ROOT = 'D:/Web/style';
const P = `${ROOT}/prototypes`;

const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '');

/* 闸门的正则 */
function gateCount(css) {
  const re = /(^|\})\s*([^{}]+?)\s*\{([^{}]*)\}/g;
  let m, n = 0;
  const sels = [];
  while ((m = re.exec(css))) {
    const parts = m[2].trim().split(',').map((s) => s.trim());
    if (parts.some((s) => s === 'body' || s === 'html')) { n++; sels.push(m[2].trim()); }
  }
  return { n, sels };
}

/* 真实全量：枚举每个 `{` 前的选择器（含 @media 内） */
function trueCount(css) {
  let cur = '', n = 0;
  const sels = [];
  for (let i = 0; i < css.length; i++) {
    const c = css[i];
    if (c === '{') {
      const s = cur.trim();
      if (s.split(',').map((x) => x.trim()).some((p) => p === 'body' || p === 'html')) { n++; sels.push(s.slice(0, 40)); }
      cur = '';
    } else if (c === '}') cur = '';
    else cur += c;
  }
  return { n, sels };
}

const dirs = readdirSync(P, { withFileTypes: true })
  .filter((d) => d.isDirectory() && /^S\d{2}-/.test(d.name)).map((d) => d.name).sort();
const files = dirs.map((d) => join(P, d, 'style.css')).concat([join(P, '_selection', 'style.css')]);

console.log('═══ ① 闸门看到几条 vs 实际有几条 ═══');
let seen = 0, real = 0;
for (const f of files) {
  if (!existsSync(f)) continue;
  const css = strip(readFileSync(f, 'utf8'));
  const g = gateCount(css);
  const t = trueCount(css);
  seen += g.n; real += t.n;
  if (g.n !== t.n) console.log(`  ${f.split(/[\\/]/).slice(-2)[0].padEnd(34)} 闸门 ${String(g.n).padStart(2)} / 实际 ${String(t.n).padStart(2)}  ← 漏 ${t.n - g.n}`);
}
console.log(`  合计：闸门看到 ${seen} 条，实际 ${real} 条，漏检 ${real - seen} 条`);

console.log('\n═══ ② 在 S24 的**真实顶层 body 规则**里注入背景图 ═══');
const CSS = join(P, 'S24-cyanotype-rainforest-path', 'style.css');
const orig = readFileSync(CSS, 'utf8');
const run = () => {
  try { return { code: 0, out: execSync('node prototypes/_build/check-texture.mjs', { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }) }; }
  catch (e) { return { code: e.status, out: String(e.stdout || '') }; }
};
const restore = () => writeFileSync(CSS, orig, 'utf8');

const ANCHOR = 'body{\n  margin:0;padding-top:104px;';
console.log(`  锚点存在：${orig.includes(ANCHOR)}`);
const injected = orig.replace(ANCHOR, 'body{\n  background-image:url("assets/tex.png");\n  margin:0;padding-top:104px;');
console.log(`  注入生效：${injected !== orig}`);
writeFileSync(CSS, injected, 'utf8');

const res = run();
console.log(`  注入后 check-texture: exit=${res.code}`);
console.log(`  输出片段：`);
for (const l of res.out.split('\n').filter((l) => /合计|✗|违规|已检查|body\/html/.test(l))) console.log('    ' + l.trim());
console.log(res.code === 0
  ? '  ⇒ **闸门漏检**：一个真实的顶层 body 挂了 background-image，闸门仍报全绿'
  : '  ⇒ 闸门抓到了');

restore();
console.log(`\n  恢复后 exit=${run().code}`);
