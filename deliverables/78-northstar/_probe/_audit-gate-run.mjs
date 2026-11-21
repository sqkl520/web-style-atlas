/* 用 rewrites.json 的 after 覆盖 SCHEMES 的副本，跑**闸门本体**的判别函数。
 *
 * 为什么不改闸门文件：任务硬性要求不动 data.js / prompt-copy.js / check-prompt-fields.mjs。
 * 闸门 _check-audit-prescription.mjs 的 PENDING 是空的，直接跑必然 35 案全红 ——
 * 那不是"改写不合格"，那是"闸门还没接上改写稿"。所以这里把闸门的判据**原样读出来**：
 * 从源文件里抠出 L1_RE / L2_QUOTE_RE / L2_PAREN_RE / L2_QUOTE_OK / BANNED_VOCAB /
 * L3_RE / AUDIT_MARK_RE 的源码文本，用 new Function 求值，保证与闸门是同一份正则，
 * 不是"我另抄一遍"（另抄一遍就会分叉，那正是本仓库记录在案的老毛病）。
 */
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(import.meta.url), '../../../../');
const GATE = join(ROOT, 'deliverables/78-northstar/_probe/_check-audit-prescription.mjs');
const RW = join(ROOT, 'deliverables/78-northstar/_probe/_audit-rewrites/rewrites.json');

const gateSrc = readFileSync(GATE, 'utf8');
const rewrites = JSON.parse(readFileSync(RW, 'utf8'));

const win = {};
new Function('window', readFileSync(join(ROOT, 'prototypes/_selection/data.js'), 'utf8'))(win);
const SCHEMES = win.SCHEMES;

/* 把闸门里的正则/词表声明逐条抠出来求值 —— 只取 `const NAME = …;` 这一种声明形态。
 * ⚠️ 必须用 String.raw：模板字符串会把 `\s` 吃成 `s`，正则静默变成 `[sS]`，
 * 于是恒为「找不到」。第一版就踩了，写在这里免得下一个人重踩。 */
function grab(name) {
  const re = new RegExp(String.raw`^const ${name} = ([\s\S]*?);[ \t]*$`, 'm');
  const m = gateSrc.match(re);
  if (!m) throw new Error(`闸门里找不到 const ${name}`);
  return new Function(`return ${m[1]}`)();
}
const L1_RE = grab('L1_RE');
const L2_QUOTE_RE = grab('L2_QUOTE_RE');
const L2_PAREN_RE = grab('L2_PAREN_RE');
const L2_QUOTE_OK = grab('L2_QUOTE_OK');
const BANNED_VOCAB = grab('BANNED_VOCAB');
const L3_RE = grab('L3_RE');
const AUDIT_MARK_RE = grab('AUDIT_MARK_RE');

/* L2b 的两条正则 + inlineBanned：闸门里是 function 声明，整段抠过来求值。 */
const fnSrc = gateSrc.match(/function inlineBanned\(text\) \{[\s\S]*?\n\}/)[0];
const inlineBanned = new Function('L2B_RE_1', 'L2B_RE_2', 'BANNED_VOCAB', 'L1_RE', `return ${fnSrc}`)(
  /不是([^，；。]{4,50}?)(?=，而是|；|。)/g,
  /([^，；。]{4,40}?)\s*而非\s*([^，；。]{4,40})/g,
  BANNED_VOCAB,
  L1_RE,
);

function judge(text) {
  const t = String(text || '');
  const L1 = [...t.matchAll(L1_RE)].map((m) => m[0].trim());
  const L2q = [...t.matchAll(L2_QUOTE_RE)].map((m) => m[0])
    .filter((q) => !L2_QUOTE_OK.some((re) => re.test(q.slice(1, -1))));
  const L2p = [...t.matchAll(L2_PAREN_RE)].map((m) => m[0]);
  const L2b = inlineBanned(t);
  const L3 = [...t.matchAll(L3_RE)].map((m) => m[0]);
  const marks = [...t.matchAll(AUDIT_MARK_RE)].map((m) => m[0]);
  return { L1, L2: [...L2q, ...L2p], L2b, L3, marks,
    fail: L1.length > 0 || L2q.length + L2p.length > 0 || L2b.length > 0 || marks.length > 0 };
}

/* ── 三道断言 ─────────────────────────────────────────────────────────── */
const fails = [];
const stats = { L1: 0, L2: 0, L2b: 0, L3: 0, marks: 0 };

/* ① before 逐字等于 data.js */
for (const s of SCHEMES) {
  const r = rewrites[s.id];
  if (!r) { fails.push({ id: s.id, why: '没有改写稿' }); continue; }
  if (r.before !== s.audit) {
    let i = 0; while (i < Math.max(r.before.length, s.audit.length) && r.before[i] === s.audit[i]) i++;
    fails.push({ id: s.id, why: `before 与 data.js 不逐字相等 @${i}: data=${JSON.stringify(s.audit.slice(i, i + 20))} json=${JSON.stringify(r.before.slice(i, i + 20))}` });
  }
}

/* ② after 过闸门判据 */
for (const [id, r] of Object.entries(rewrites)) {
  const j = judge(r.after);
  stats.L1 += j.L1.length; stats.L2 += j.L2.length; stats.L2b += j.L2b.length;
  stats.L3 += j.L3.length; stats.marks += j.marks.length;
  if (j.fail) fails.push({ id, why: 'after 未过闸门', ...j });
  if (!r.after || r.after.length < 60) fails.push({ id, why: `after 过短：${(r.after || '').length} 字` });
}

/* ③ 空位 token（闸门里那条硬断言的实体）在 after 里还在 */
const VOID_TOKENS = ['故意留空', '空抽屉', '空白卡', '空白行', '永久留'];
for (const s of SCHEMES) {
  const other = Object.keys(s).filter((k) => k !== 'audit').map((k) => {
    const v = s[k];
    if (typeof v === 'string') return v;
    if (v && typeof v === 'object') return Object.values(v).filter((x) => typeof x === 'string').join('\n');
    return '';
  }).join('\n');
  const only = VOID_TOKENS.filter((t) => String(s.audit).includes(t) && !other.includes(t));
  const after = (rewrites[s.id] || {}).after || '';
  const lost = only.filter((t) => !after.includes(t));
  if (lost.length) fails.push({ id: s.id, why: `空位 token 丢失：${lost.join(',')}（原文只有 audit 里有，丢了提示词就少一条约束）` });
}

const verbose = process.argv.includes('--verbose');
if (verbose) {
  for (const s of SCHEMES) {
    const j = judge((rewrites[s.id] || {}).after || '');
    console.log(`  ${s.id}  字 ${s.audit.length} → ${((rewrites[s.id] || {}).after || '').length}  L1:${j.L1.length} L2:${j.L2.length} L2b:${j.L2b.length} L3:${j.L3.length} 标记:${j.marks.length}`);
  }
  console.log('');
}

if (fails.length) {
  console.log(`FAIL  35 案改写：${fails.length} 处不合格`);
  for (const f of fails) {
    console.log(`  ${f.id}  ${f.why}`);
    if (f.L1 && f.L1.length) console.log(`      L1: ${f.L1.join(' ')}`);
    if (f.L2 && f.L2.length) console.log(`      L2: ${f.L2.join(' ')}`);
    if (f.L2b && f.L2b.length) console.log(`      L2b: ${f.L2b.join(' | ')}`);
    if (f.marks && f.marks.length) console.log(`      标记: ${f.marks.join(' ')}`);
  }
  process.exitCode = 1;
} else {
  console.log(`PASS  35 案：${Object.keys(rewrites).length} 段改写稿，before 逐字相等，after 0 条款编号 / 0 被禁做法名 / 0 评审标记`);
  console.log(`      L3 事实陈述（"零 X"）合计 ${stats.L3} 处 —— 按闸门设计只报不判，是设计事实不是缺陷`);
}
