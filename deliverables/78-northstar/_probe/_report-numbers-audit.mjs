/* 报告数字 ↔ 实测数字 的交叉核验。
 *
 * 起因：这一轮已经因为「报告里写 8/10、实测是 10/11」返工过两次。
 * 每次都是靠人眼发现问题。这个脚本把「能被机器算出来的那部分」自动对上，
 * 剩下的才需要人看。
 *
 * 核验项：
 *   1. 判别值总数 / 命中数 —— 报告 vs _evidence-gate 的实测
 *   2. 有产物的案数 —— 报告 vs _staged/ 里实际存在的文件
 *   3. 配色唯一 hex 数 —— 报告 vs 实测
 *   4. 每份报告里出现的「N/M 全中」类断言，N 与 M 是否在合理范围
 *
 * 只报**不一致**，不重复计算过程。
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '../../..');
const BLIND = join(ROOT, 'deliverables/78-northstar/blind');
const STAGED = join(ROOT, 'deliverables/78-northstar/_probe/_staged');
const REPORTS = [
  'deliverables/78-northstar/_probe/29-prompt-truncation-bug.md',
  'deliverables/78-northstar/06-BLIND-RESULT.md',
  'deliverables/78-northstar/05-RESUME-HERE.md',
  'deliverables/78-northstar/_probe/30-artifact-validity.md',
];

/* ── 实测：判别值（与 _evidence-gate.mjs 同口径） ───────────────────── */
const tokensOf = (txt) => {
  const s = new Set();
  for (const m of txt.matchAll(/#[0-9A-Fa-f]{6}/g)) s.add(m[0].toUpperCase());
  for (const m of txt.matchAll(/\b\d+(?:\.\d+)?(?:px|vw|fr|mm|%)\b/g)) s.add(m[0]);
  return s;
};
const hitOne = (html, t) => {
  if (html.includes(t)) return true;
  const num = t.replace(/[a-z%]+$/, '');
  return new RegExp(`(^|[^\\d.])${num.replace('.', '\\.')}\\s*(px|vw|fr|mm|%)`, 'i').test(html);
};

const ids = readdirSync(BLIND, { withFileTypes: true })
  .filter((d) => d.isDirectory() && /^S\d{2}$/.test(d.name))
  .map((d) => d.name).sort();

const all = {};
for (const id of ids) {
  const p = join(BLIND, id, 'task.txt');
  if (existsSync(p)) all[id] = tokensOf(readFileSync(p, 'utf8'));
}
const disc = {};
for (const id of Object.keys(all)) {
  const others = new Set();
  for (const [o, s] of Object.entries(all)) { if (o === id) continue; for (const t of s) others.add(t); }
  disc[id] = [...all[id]].filter((t) => !others.has(t));
}
const artifactOf = (id) => {
  for (const n of [`${id}-sandbox.html`, `${id}-judge.html`]) {
    const f = join(STAGED, n);
    if (existsSync(f)) return readFileSync(f, 'utf8').toUpperCase();
  }
  return null;
};
const withArt = Object.keys(disc).filter((id) => disc[id].length && artifactOf(id));

let diagN = 0, diagH = 0, hexN = 0;
for (const id of withArt) {
  const html = artifactOf(id);
  diagN += disc[id].length;
  diagH += disc[id].filter((t) => hitOne(html, t)).length;
  hexN += disc[id].filter((t) => t.startsWith('#')).length;
}

/* 实测：_staged 里到底有几案的产物 ──────────────────────────────── */
const stagedCases = new Set();
for (const f of readdirSync(STAGED)) {
  const m = f.match(/^(S\d{2})-(?:sandbox|judge)\.html$/);
  if (m) stagedCases.add(m[1]);
}

/* 对照组：虚构风格，没有原型目录，_batch-compare 明确跳过，不进对账分母 */
const CONTROL_GROUP = ['S97', 'S98', 'S99'];
const reconN = withArt.filter((id) => !CONTROL_GROUP.includes(id)).length;

console.log('=== 实测（这一份是基准）===');
console.log(`判别值 ${diagH}/${diagN}　有产物的案 ${withArt.length}（${withArt.join(' ')}）`);
console.log(`唯一 hex ${hexN}　_staged 里出现过产物的案 ${stagedCases.size}（${[...stagedCases].sort().join(' ')}）`);

/* ── 报告里声称的数字 ─────────────────────────────────────────────── */
console.log('\n=== 报告里出现的数字断言 ===\n');
const EXPECT = [
  /* ⚠️ 「N/M 判别值」这个模式会同时匹配**单案**和**总数**：
   *   「S99 是 7/7 判别值」  ← 单案
   *   「十二案 67/67 判别值」 ← 总数
   * 第一版把两者都拿总数比，误报三条。判据：只有在断言旁边没有单案号时
   * 才按总数核；出现 S\d\d 就按该案的判别值数核。 */
  { pat: /(\d+)\s*\/\s*(\d+)\s*判别值/, name: '判别值 x/y', want: [diagH, diagN], allowPerCase: true },
  { pat: /判别值合计\s*(\d+)/, name: '判别值合计', want: [diagN] },
  { pat: /(\d+)\s*个唯一\s*hex/, name: '唯一 hex', want: [hexN] },
  { pat: /有产物的案\s*[:：]\s*(\d+)/, name: '有产物的案', want: [withArt.length] },
  /* 对账表里的「x/y」类断言。
   *
   * ⚠️ 分母不是 withArt.length。`withArt` 是「有判别值且有产物文件」= 12，
   * 但对账表的分母是「**参与**对账的案」= 11 —— S99 是对照组（虚构风格，
   * 没有原型目录），_batch-compare 会明确跳过它，所以它不进分母。
   *
   * 我第一版拿 withArt.length 当分母，报出四条假的「不一致」。
   * 这正是本仓库最老那种错：拿一个看起来对的数当基准。
   *
   * 现在的做法：显式声明哪些案是「对照组、不进对账分母」，
   * 从 withArt 里减掉。声明放在这里而不是从文件推断 —— 推断会在
   * 「哪天对照组变了」的时候悄悄给出错的分母。 */
  { pat: /配色全中\s+(\d+)\s*\/\s*(\d+)/, name: '配色全中 x/y', want: [reconN, reconN] },
  { pat: /配色未超用\s+(\d+)\s*\/\s*(\d+)/, name: '配色未超用 x/y', want: [reconN, reconN] },
  { pat: /字号比达标\s+(\d+)\s*\/\s*(\d+)/, name: '字号比达标 x/y', want: [reconN, reconN] },
  { pat: /图片数达标\s+(\d+)\s*\/\s*(\d+)/, name: '图片数达标 x/y', want: [reconN, reconN] },
];

/* 单案判别值表：{S04: {n, hit}, ...} */
const perCase = {};
for (const id of withArt) {
  const html = artifactOf(id);
  perCase[id] = { n: disc[id].length, hit: disc[id].filter((t) => hitOne(html, t)).length };
}

let problems = 0;
for (const rel of REPORTS) {
  const p = join(ROOT, rel);
  if (!existsSync(p)) { console.log(`? 缺文件 ${rel}`); continue; }
  const s = readFileSync(p, 'utf8');
  const name = rel.split('/').pop();
  const found = [];
  for (const e of EXPECT) {
    for (const m of s.matchAll(new RegExp(e.pat, 'g'))) {
      const nums = m.slice(1).map(Number);
      /* 单案语境：同一行里出现 S\d\d，且该案有实测判别值 → 按单案核 */
      const lineStart = s.lastIndexOf('\n', m.index) + 1;
      const lineEnd = s.indexOf('\n', m.index);
      const line = s.slice(lineStart, lineEnd < 0 ? undefined : lineEnd);
      const caseM = line.match(/\bS(\d{2})\b/);
      let want = e.want, kind = e.name;
      if (e.allowPerCase && caseM) {
        const id = 'S' + caseM[1];
        if (perCase[id]) {
          want = [perCase[id].hit, perCase[id].n];
          kind = e.name + `（${id} 单案）`;
        }
      }
      const ok = nums.every((n, i) => n === want[i]);
      found.push({ kind, got: nums.join('/'), want: want.join('/'), ok });
      if (!ok) problems++;
    }
  }
  if (found.length) {
    console.log(name);
    for (const f of found) {
      console.log(`  ${f.ok ? '✓' : '✗'} ${f.kind}: 报告 ${f.got}　实测 ${f.want}`);
    }
  }
}

console.log(`\n${problems === 0 ? '✓ 报告与实测一致' : `✗ ${problems} 处不一致`}`);
process.exit(problems === 0 ? 0 : 1);
