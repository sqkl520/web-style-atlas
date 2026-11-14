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

/* ── 逐案行数 / 字节数断言 ──────────────────────────────────────────
 * 「S31 399 行」「S97 466 行」这类句子散在多份报告里。
 * 行数与字节数都能从 _staged 实测，没有理由靠人眼对。 */
const sizeOf = {};
for (const id of stagedCases) {
  for (const n of [`${id}-sandbox.html`, `${id}-judge.html`]) {
    const f = join(STAGED, n);
    if (!existsSync(f)) continue;
    const buf = readFileSync(f);
    /* `wc -l` 数的是换行符；用同一口径才能和报告里的数对上 */
    let lines = 0;
    for (const b of buf) if (b === 0x0a) lines++;
    sizeOf[id] = { lines, bytes: buf.length, file: n };
    break;
  }
}

/* 有哪些「历史值」是**已经被明确记录为历史**的，不该再报。
 * 每一条都必须能在报告里找到一句说明它为什么不同 —— 否则就是真漂移。 */
const KNOWN_HISTORY = [
  { id: 'S29', kind: '字节', value: 59861,
    why: '06-BLIND-RESULT.md:156 与 :254 都写了：59861 是那次 TIMEOUT 边缘救回来的版本，' +
         '之后重跑变成 41371。两处叙述一致，且 §156 明列「三处字节变化」。' },
];

/* 报告里常见的两种写法：
 *   「S31 399 行」
 *   「S97 466 行，20853 字节」
 * 只在同一行里同时出现案号与数字时才核 —— 否则「399 行」也是别的案。 */
const SIZE_CHECKS = [];
for (const [id, v] of Object.entries(sizeOf)) {
  SIZE_CHECKS.push({ id, kind: '行数', value: v.lines, pat: new RegExp(`\\b${id}\\b[^\\n]{0,40}?(\\d{2,4})\\s*行`, 'g') });
  SIZE_CHECKS.push({ id, kind: '字节', value: v.bytes, pat: new RegExp(`\\b${id}\\b[^\\n]{0,80}?(\\d{4,6})\\s*字节`, 'g') });
  /* 对账表里的字节数是**裸数字**（`S21 fixed ... 27557`），没有「字节」二字。
   * 第一版漏了这种，实测把 27557 改成 99999 也照样全绿 —— 那是个真遗漏。
   *
   * 不用 `.*(\d{4,6})\s*$` 这种写法：贪婪的 `.*` 会吞掉所有数字，
   * 回溯后 `\d{4,6}` 只能匹配到 `9999` 而 `\s*$` 前还剩一个 `9`，于是 0 匹配。
   * 改成「抓整行、在行内取最后一个 4–6 位数」，语义清楚也不受回溯影响。 */
  SIZE_CHECKS.push({ id, kind: '字节(表末列)', value: v.bytes, tableRow: true });
}

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

  /* 逐案行数 / 字节数
   *
   * ⚠️ 必须排除两类会误报的行：
   *   ① 历史记录「S29 59861→41371」—— 那个 59861 是被取代的旧值，是对的记录
   *   ② 别的数字碰巧挨着案号 —— 如「S99 ... 1070 行」可能是某个列表的行数
   * 判据：同一行里出现 `→` 时跳过（那是"从 A 变到 B"的叙述）；
   *       并且只在「行」或「字节」**紧跟**在那个数字后面时才认。 */
  const sizeHits = [];
  for (const c of SIZE_CHECKS) {
    if (c.tableRow) {
      /* 对账表：找所有以该案号开头的行，取行内最后一个 4–6 位数当字节数 */
      for (const line of s.split('\n')) {
        if (!new RegExp(`^\\s*${c.id}\\s`).test(line)) continue;
        const nums = [...line.matchAll(/\b(\d{4,6})\b/g)].map((m) => Number(m[1]));
        if (!nums.length) continue;
        /* 排除年份（20xx）：实测有「S31 · 2026-11-14 重跑…」这种行，
         * 末位 4 位数是年份而不是字节数，会产生假的不一致。 */
        const plausible = nums.filter((n) => !(n >= 2000 && n <= 2099));
        if (!plausible.length) continue;
        const claimed = plausible[plausible.length - 1];
        const ok = claimed === c.value;
        sizeHits.push({ kind: `${c.id} ${c.kind}`, got: claimed, want: c.value, ok, line: line.trim().slice(0, 70) });
        if (!ok) problems++;
      }
      continue;
    }
    for (const m of s.matchAll(c.pat)) {
      const lineStart = s.lastIndexOf('\n', m.index) + 1;
      const lineEnd = s.indexOf('\n', m.index);
      const line = s.slice(lineStart, lineEnd < 0 ? undefined : lineEnd);
      if (line.includes('→')) continue;              // 历史变更叙述，不是当前断言
      /* 还要排除「stream 第 N 行」这类：那是日志行号，不是产物行数。
       * 实测误报三条：「在 S99 stream 全长 61070 行里搜」「读 S99 stream 第 62 行」。 */
      if (/stream|第\s*\d+\s*行|全长/.test(line)) continue;
      const claimed = Number(m[1]);
      /* 已被明确记录为历史的旧值 → 豁免，但在输出里标注，不静默吞掉 */
      const hist = KNOWN_HISTORY.find((h) => h.id === c.id && h.kind === c.kind && h.value === claimed);
      if (hist) {
        sizeHits.push({ kind: `${c.id} ${c.kind}`, got: claimed, want: c.value, ok: true, hist: hist.why });
        continue;
      }
      const ok = claimed === c.value;
      sizeHits.push({ kind: `${c.id} ${c.kind}`, got: claimed, want: c.value, ok, line: line.trim().slice(0, 70) });
      if (!ok) problems++;
    }
  }
  if (sizeHits.length) {
    console.log(`${name}（行数/字节）`);
    for (const f of sizeHits) {
      const mark = f.hist ? '·' : (f.ok ? '✓' : '✗');
      console.log(`  ${mark} ${f.kind}: 报告 ${f.got}　实测 ${f.want}`);
      if (f.hist) console.log(`      （已记为历史值，豁免）${f.hist.slice(0, 70)}`);
      else if (!f.ok) console.log(`      出处: ${f.line}`);
    }
  }
}

console.log(`\n${problems === 0 ? '✓ 报告与实测一致' : `✗ ${problems} 处不一致`}`);
process.exit(problems === 0 ? 0 : 1);
