/* 30 案「空位机制」排查的可复算脚本（交付物 66-exec/EXEC-void-mechanism.md 的机器证据）。
 *
 * 它做两件事，分开输出，因为这两件事的证据强度不一样：
 *   A. **DOM 证据**：直接读 prototypes 下每个 Sxx 目录的 index.html，找空位相关的类名/属性，
 *      并把命中行原文打出来。这是"我读过原型"的证据，不是关键词猜的。
 *   B. **检测器判据**：把 prompt-copy.js 里 hasVoidMechanism 用的那 6 个短语，
 *      在 data.js（window.SCHEMES）的**全部字符串字段**上逐案跑一遍，
 *      输出每个短语命中了哪些案 + 并集。用来证明"检测器不会把没空位的案判成有"。
 *
 * 还额外输出一个**负样本对照**：放宽成 `空` / `缺` / `disabled` 时会误判多少案 ——
 * 这是"为什么不用单字"的量化理由。
 *
 * 跑：node deliverables/66-exec/_out/void-detect.mjs
 */
import { readFileSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import vm from 'node:vm';

const ROOT = 'D:/Web/style';
const PROT = join(ROOT, 'prototypes');
const SEL = join(PROT, '_selection');
const OUT = join(ROOT, 'deliverables/66-exec/_out');
mkdirSync(OUT, { recursive: true });

const dirs = readdirSync(PROT).filter((d) => /^S\d\d-/.test(d)).sort();
const ids = dirs.map((d) => d.slice(0, 3));

/* ── A. DOM 证据 ─────────────────────────────────────────────────────────── */
const DOM_RE = /class="[^"]*(--void|is-vacant|--blank|--empty\b|slug-slot|g-void|row-gap|cell-blank|leaf--empty|tr\.qs|\bqs\b)[^"]*"|class="[^"]*\bqs\b[^"]*"|aria-disabled|data-missing/;
const dom = {};
for (const d of dirs) {
  const id = d.slice(0, 3);
  const html = readFileSync(join(PROT, d, 'index.html'), 'utf8').split('\n');
  const hits = [];
  html.forEach((line, i) => { if (DOM_RE.test(line)) hits.push({ line: i + 1, text: line.trim().replace(/\s+/g, ' ') }); });
  dom[id] = hits;
}

console.log('=== A. DOM 证据（index.html 里空位相关的类名/属性）===');
for (const id of ids) {
  console.log('\n' + id + '  (' + dom[id].length + ' 处)');
  for (const h of dom[id].slice(0, 8)) console.log('   :' + h.line + '  ' + h.text.slice(0, 150));
  if (dom[id].length > 8) console.log('   …另有 ' + (dom[id].length - 8) + ' 处');
}

/* ── B. 检测器判据 ──────────────────────────────────────────────────────── */
const win = {};
win.window = win;
const ctx = vm.createContext({ window: win, document: {}, console });
vm.runInContext(readFileSync(join(SEL, 'data.js'), 'utf8'), ctx, { filename: 'data.js' });
vm.runInContext(readFileSync(join(SEL, 'prompts.js'), 'utf8'), ctx, { filename: 'prompts.js' });

const TOKENS = ['故意留空', '空抽屉', '空白卡', '空白行', '永久留'];

function blobOf(sc) {
  let blob = '';
  for (const k in sc) {
    if (!Object.prototype.hasOwnProperty.call(sc, k)) continue;
    const v = sc[k];
    if (typeof v === 'string') blob += v + '\n';
    else if (v && typeof v === 'object') {
      for (const k2 in v) if (typeof v[k2] === 'string') blob += v[k2] + '\n';
    }
  }
  return blob;
}

console.log('\n\n=== B. 检测器判据：5 个短语在 data.js 全字段上的命中 ===');
const byToken = {};
for (const t of TOKENS) {
  byToken[t] = win.SCHEMES.filter((sc) => blobOf(sc).includes(t)).map((sc) => sc.id);
  console.log('  ' + t.padEnd(6) + ' -> ' + (byToken[t].join(' ') || '(none)'));
}
const union = win.SCHEMES.filter((sc) => TOKENS.some((t) => blobOf(sc).includes(t))).map((sc) => sc.id);
console.log('  ' + '并集'.padEnd(5) + ' -> ' + union.join(' ') + '  (' + union.length + ' 案)');

/* 字段级归属：每个命中来自哪个字段（写交付物时要用） */
console.log('\n  逐案字段归属：');
for (const id of union) {
  const sc = win.SCHEMES.find((x) => x.id === id);
  const where = [];
  for (const k in sc) {
    if (typeof sc[k] === 'string') { for (const t of TOKENS) if (sc[k].includes(t)) where.push(t + '@' + k); }
  }
  console.log('   ' + id + '  ' + where.join('  '));
}

/* ── C. 负样本：放宽判据会误判多少 ───────────────────────────────────────── */
console.log('\n\n=== C. 负样本对照（为什么不能用单字/通用属性）===');
for (const wide of ['空', '缺', 'disabled', '--empty']) {
  const who = win.SCHEMES.filter((sc) => blobOf(sc).includes(wide) || dom[sc.id].some((h) => h.text.includes(wide)));
  console.log('  「' + wide + '」会命中 ' + who.length + '/30 案：' + who.map((s) => s.id).join(' '));
}

/* ── D. 交付物用的静态结论 ──────────────────────────────────────────────── */
const INTENTIONAL = ['S01', 'S02', 'S06', 'S12', 'S19', 'S23', 'S29'];
const NOT_INTENTIONAL = ['S07', 'S10', 'S18', 'S24', 'S30'];
console.log('\n\n=== D. 人工读原型后的判定（与 B 的并集应完全一致）===');
console.log('  刻意留空（叙事证据）' + INTENTIONAL.length + ' 案：' + INTENTIONAL.join(' '));
console.log('  看着像但不是（排版/空状态）' + NOT_INTENTIONAL.length + ' 案：' + NOT_INTENTIONAL.join(' '));
const agree = JSON.stringify(union.slice().sort()) === JSON.stringify(INTENTIONAL.slice().sort());
console.log('  B 的并集 == D 的刻意留空清单：' + (agree ? '一致 ✓' : '不一致 ✗'));
if (!agree) process.exitCode = 1;

writeFileSync(join(OUT, 'void-detect.json'), JSON.stringify({ dom, byToken, union, INTENTIONAL, NOT_INTENTIONAL, agree }, null, 1), 'utf8');
