/* 回退链完整度：不写 @font-face 到底会不会出问题？
 *
 * 【为什么换这个问题】
 * §六十五 的结论是：「加约束有没有提高概率」这个问题要每组 40 份样本才能回答，
 * 按 61% 的跑批成功率那是 130 次尝试 —— 不划算，而且可能永远拿不到确定值。
 *
 * 所以换一个**确定性**的问题：
 *   产物的 font-family 写了多长的回退链？
 *
 * 这个问题不需要概率。跑一份产物就能判。而它才是真正决定
 * 「换台机器会不会换字」的东西：
 *
 *   只写一个族名           → 用户机器上没有就换字
 *   写了 4 个族的完整链     → 顺着链一定能拿到字形
 *
 * 也就是说：`@font-face` / CDN 是**手段**，「回退链够不够长」是**目的**。
 * 手段层的效果要靠统计，目的层不用。
 *
 * 【判据】
 *   链长 = 一条 font-family 声明里有几个族名（去掉通用族如 serif/monospace，
 *   它们不算兜底，因为任何机器都有）。
 *
 *   合格线取 3：这是提示词第③条自己写的榜样
 *   （`"Noto Serif SC", Georgia, Songti SC, serif` —— 三个实名族 + 一个通用族）。
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const BT = join(resolve(HERE, '..'), '_blindtest');

const GENERIC = new Set(['serif', 'sans-serif', 'monospace', 'cursive', 'fantasy',
  'system-ui', 'ui-monospace', 'ui-serif', 'ui-sans-serif', 'inherit', 'initial']);

const dirs = readdirSync(BT, { withFileTypes: true })
  .filter((d) => d.isDirectory() && /^S\d{2}(-r\d+)?$/.test(d.name))
  .map((d) => d.name).sort();

/* 展开 CSS 变量 —— 不展开的话 `font-family: var(--f)` 一条链都数不到。
 * （这个坑在 _repeatability.mjs 里已经踩过两次，见那里的注释。） */
function expand(html) {
  const vars = {};
  for (const m of html.matchAll(/(--[\w-]+)\s*:\s*([^;}]+)/g)) vars[m[1]] = m[2];
  const go = (s, d = 0) => {
    if (d > 5) return s;
    return s.replace(/var\(\s*(--[\w-]+)\s*(?:,[^)]*)?\)/g,
      (_, n) => (vars[n] !== undefined ? go(vars[n], d + 1) : ''));
  };
  return { expand: go };
}

const rows = [];
for (const id of dirs) {
  const hp = join(BT, id, 'index.html');
  if (!existsSync(hp)) continue;
  const html = readFileSync(hp, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  const { expand: go } = expand(html);
  const chains = [];
  for (const m of html.matchAll(/font-family\s*:\s*([^;}]+)/g)) {
    const parts = go(m[1]).split(',')
      .map((x) => x.trim().replace(/^["']|["']$/g, '').trim())
      .filter((x) => x && !GENERIC.has(x.toLowerCase()) && !x.startsWith('var('));
    chains.push({ raw: m[1].trim().slice(0, 60), len: parts.length, fams: parts });
  }
  if (!chains.length) continue;
  const minLen = Math.min(...chains.map((c) => c.len));
  const maxLen = Math.max(...chains.map((c) => c.len));
  const worst = chains.find((c) => c.len === minLen);
  rows.push({ id, n: chains.length, minLen, maxLen, worst });
}

console.log(`回退链完整度：${rows.length} 份产物\n`);
console.log('合格线 = 3 个实名族（提示词第③条自己举的例子是 3 实名 + 1 通用）\n');
console.log('案          声明数  最短链  最长链  判定');
console.log('─'.repeat(56));

const bad = [];
for (const r of rows) {
  const pass = r.minLen >= 3;
  if (!pass) bad.push(r);
  console.log(`${r.id.padEnd(11)} ${String(r.n).padStart(5)} ${String(r.minLen).padStart(6)} ${String(r.maxLen).padStart(7)}  ${pass ? '✓' : '✗'}`);
}
console.log('─'.repeat(56));

const passN = rows.length - bad.length;
const rate = Math.round((passN / rows.length) * 100);
console.log(`最短链 ≥3 的：${passN}/${rows.length} = ${rate}%`);

if (bad.length) {
  console.log('\n最短链不足 3 的产物（这些在用户机器上最可能换字）：');
  for (const r of bad) {
    console.log(`  ${r.id}  最短 ${r.minLen}：${r.worst.fams.join(' → ') || '（空）'}`);
  }
}

/* 和 fontSrc 交叉一下：这两件事相关性如何？
 *
 * 如果「有 CDN」和「链够长」高度相关，说明模型做对了会用两种手段一起做；
 * 如果无关，说明它们是两件独立的事，可以分开修。 */
const withSrc = rows.filter((r) => {
  const html = readFileSync(join(BT, r.id, 'index.html'), 'utf8');
  return /@import\s+url\([^)]*fonts|fonts\.googleapis|<link[^>]+\.css|@font-face/i.test(html);
});
const srcPass = withSrc.filter((r) => r.minLen >= 3).length;
const noSrc = rows.filter((r) => !withSrc.includes(r));
const noSrcPass = noSrc.filter((r) => r.minLen >= 3).length;

console.log('\n对照：有没有写来源 vs 链够不够长');
console.log(`  写了来源 ${withSrc.length} 份，其中链 ≥3 的 ${srcPass} 份（${withSrc.length ? Math.round(srcPass / withSrc.length * 100) : 0}%）`);
console.log(`  没写来源 ${noSrc.length} 份，其中链 ≥3 的 ${noSrcPass} 份（${noSrc.length ? Math.round(noSrcPass / noSrc.length * 100) : 0}%）`);
console.log('');
console.log('  ⇒ 如果两组比例接近，说明「写来源」和「链够长」是两件独立的事 ——');
console.log('    那么该修的是链长（确定性、可判），而不是来源（概率性、测不出）。');

/* 这条判据只报不判：阈值 3 取自提示词自己的例子，但个别案可能真的只有 2 个族可用
 * （比如只指定一款中文族 + 一款拉丁族）。红了要人看，不是自动 FAIL。 */
process.exit(0);
