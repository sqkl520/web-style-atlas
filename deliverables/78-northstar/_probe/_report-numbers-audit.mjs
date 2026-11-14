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
import { execFileSync } from 'node:child_process';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '../../..');
const BLIND = join(ROOT, 'deliverables/78-northstar/blind');
const STAGED = join(ROOT, 'deliverables/78-northstar/_probe/_staged');
/* 覆盖范围：**自动抓全部报告**，不手维护列表。
 *
 * 原来写死 4 份，而 _probe/ 下有 48 份报告带可核数字。
 * 手维护的清单一定会漏 —— 这一轮就已经因为只看 4 份而漏掉了
 * 11-POSTBUG-PLAN（26 处）、09-VERIFY-PLAN（22 处）等。
 * 自动抓取的代价是多跑几十次正则，几毫秒的事。 */
const REPORT_DIRS = [
  'deliverables/78-northstar',
  'deliverables/78-northstar/_probe',
];
const REPORTS = [];
for (const d of REPORT_DIRS) {
  const abs = join(ROOT, d);
  if (!existsSync(abs)) continue;
  for (const f of readdirSync(abs)) {
    if (!f.endsWith('.md')) continue;
    /* 只要序号开头的报告；跳过 README/brief 这类杂项 */
    if (!/^\d{2}-/.test(f)) continue;
    /* 存成正斜杠形式：PRODUCT_LINE_REPORTS 里也写正斜杠。
     * 实测 Windows 上 join 产生反斜杠，直接 includes 永远 false ——
     * 于是「N 行」检查一次都没跑过，而脚本照样打印全绿。 */
    REPORTS.push(join(d, f).replace(/\\/g, '/'));
  }
}
REPORTS.sort();

/* ── 实测：判别值（与 _evidence-gate.mjs 同口径） ───────────────────── */
const tokensOf = (txt) => {
  const s = new Set();
  for (const m of txt.matchAll(/#[0-9A-Fa-f]{6}/g)) s.add(m[0].toUpperCase());
  for (const m of txt.matchAll(/\b\d+(?:\.\d+)?(?:px|vw|fr|mm|%)\b/g)) s.add(m[0]);
  return s;
};
const hitOne = (html, t) => {
  if (t.startsWith('#')) return html.includes(t);
  const num = t.replace(/[a-z%]+$/, '');
  const unit = t.slice(num.length);
  /* 单位必须一致 + 左边界不能是数字。
   * 原写法 `includes(t)` + `(px|vw|fr|mm|%)` 有两个 bug：
   *   · '160PX'.includes('60PX') → true
   *   · 60vw 会被当成 60px
   * 这个 bug 由 _discriminator-check 的 --selftest 先抓到，
   * 当时三份脚本各有一份同源实现，这里是第四份。
   * 修完之后阴性对照从 28/737 变成 24/737。 */
  return new RegExp(`(^|[^\\d.])${num.replace('.', '\\.')}\\s*${unit}`, 'i').test(html);
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

const SELFTEST = process.argv.includes('--selftest');
const SELECT_MUT = process.env.SELECT_MUT || '';
let selftestInjected = false;

/* 实测：_staged 里到底有几案的产物 ──────────────────────────────── */
const stagedCases = new Set();
for (const f of readdirSync(STAGED)) {
  const m = f.match(/^(S\d{2})-(?:sandbox|judge)\.html$/);
  if (m) stagedCases.add(m[1]);
}

/* 自测注入（磁盘类）：有些检查的对象是**磁盘状态**而不是报告文本，
 * readReport 那套注入覆盖不到它们。这里给 `_staged 产物集合` 检查
 * 一个注入点：假装 S98 的产物出现了（它被记为零产物，本不该有文件）。
 *
 * 为什么必须真的加进 Set 而不是别的做法：那条检查读的就是这个 Set，
 * 只有改它才能证明检查逻辑本身会响。 */
if (SELFTEST && process.env.SELECT_MUT === 'staged') {
  stagedCases.add('S98');
  selftestInjected = true;
}

/* 对照组：虚构风格，没有原型目录，_batch-compare 明确跳过，不进对账分母 */
const CONTROL_GROUP = ['S97', 'S98', 'S99'];
const reconN = withArt.filter((id) => !CONTROL_GROUP.includes(id)).length;

/* 机制句覆盖率：从 prompts.js 实测，不手填。
 * 判据与 D3 闸门一致 —— 机制句里必须出现 px 或「N 倍」这类可测值。 */
const mechCoverage = (() => {
  const p = join(ROOT, 'prototypes/_selection/prompts.js');
  if (!existsSync(p)) return { hit: 0, total: 0 };
  const sandbox = { window: {} };
  new Function('window', readFileSync(p, 'utf8'))(sandbox.window);
  const schemes = sandbox.window.STYLE_PROMPTS?.schemes || [];
  let hit = 0;
  for (const s of schemes) {
    const m = (s.dna && s.dna.mechanism) || '';
    if (/\d+(?:\.\d+)?\s*(?:px|倍)/.test(m)) hit++;
  }
  return { hit, total: schemes.length };
})();

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
  /* 机制句覆盖率：35 案的 dna.mechanism 必须全部含可测值（D3 闸门守这条）。
   * 实测 2026-11-14 是 35/35，而报告里曾写 33/35（修复前的数）。 */
  { pat: /机制句是\s*\**(\d+)\/(\d+)\s*案/, name: '机制句覆盖率', want: [mechCoverage.hit, mechCoverage.total] },
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

/* 哪些报告把「产物有几行 / 几字节」当作结论陈述。
 * 只有这几份里的「N 行」才算产物行数断言；其他报告里同样的字面
 * 多指任务书行数、stream 行数、计划条数。 */
const PRODUCT_LINE_REPORTS = [
  'deliverables/78-northstar/06-BLIND-RESULT.md',
  'deliverables/78-northstar/_probe/30-artifact-validity.md',
  'deliverables/78-northstar/_probe/34-s21-rerun.md',
  'deliverables/78-northstar/_probe/16-negative-control.md',
];

/* 有哪些「历史值」是**已经被明确记录为历史**的，不该再报。
 * 每一条都必须能在报告里找到一句说明它为什么不同 —— 否则就是真漂移。 */
const KNOWN_HISTORY = [
  { id: 'S29', kind: '字节', value: 59861,
    why: '06-BLIND-RESULT.md:156 与 :254 都写了：59861 是那次 TIMEOUT 边缘救回来的版本，' +
         '之后重跑变成 41371。两处叙述一致，且 §156 明列「三处字节变化」。' },
  { id: 'S08', kind: '字节(对账表)', value: 36146,
    why: '20-reproducibility.md:157 与 :177 都写了它的演进：36146 → 40074 → 39807。' +
         '12-main-thread-measure-findings.md:776 那张表是更早一轮的对账，记的是当时的 36146。' },
  { id: 'S13', kind: '字节', value: 25730,
    why: '06-BLIND-RESULT.md:156 明列「S13 25730→31256」，09-VERIFY-PLAN.md:33 也是同一组' +
         '「旧值→新值」对照。_staged 里还留着 S13-v25730.html 作证。' },
  { id: 'S13', kind: '字节(对账表)', value: 25730,
    why: '同上 —— 那是更早一轮对账表里的历史值，报告已在 §156 说明变化过程。' },
];

/* 报告里常见的两种写法：
 *   「S31 399 行」
 *   「S97 466 行，20853 字节」
 * 只在同一行里同时出现案号与数字时才核 —— 否则「399 行」也是别的案。 */
/* 按**报告**生成检查项，而不是全量生成。
 *
 * 为什么必须按报告区分：「N 行」这个字面在不同报告里指完全不同的东西 ——
 *   「S31 399 行」        产物行数（要核）
 *   「S31 任务书 40 行」   提示词行数（不是产物）
 *   「S29 stream 9813 行」 日志行数（不是产物）
 *   「S99 prompt 10 行」   提示词行数（不是产物）
 * 实测把「N 行」扩到全部 48 份报告 → 误报 30+ 条。
 * 一个天天误报的审计，下一个人第一件事就是把它关掉。
 *
 * 「对账表末列字节数」同理：曾有 78 条误报（「S31 1971 | 72 98」是任务书字节数）。
 * 现在用严格的表行形状匹配（案号 + layoutKind + 行末字节数）。 */
function checksFor(rel) {
  const out = [];
  const wantLines = PRODUCT_LINE_REPORTS.includes(rel);
  for (const [id, v] of Object.entries(sizeOf)) {
    if (wantLines) {
      /* 「N 行」这一项必须同时排除两类：
       *   ① 任务书行数（「S99 task.txt 40 行」）
       *   ② 日志行数（「S31 stream 459 行」）
       * 判据：同一行里出现 task.txt / prompt / 任务书 / stream 就跳过。
       * 实测不加这三条会误报 5 处，全是别的行数。 */
      out.push({
        id, kind: '行数', value: v.lines, skipLine: /task\.txt|prompt|任务书|stream|快照|正文/,
        /* 案号与数字之间不能再出现别的案号 —— 实测「S99 做出了一个和 S31 同量级完整的页面。
         * 它 459 行」这句里，S31 的正则会一路吃到 459，把 S99 的行数记到 S31 头上。
         * 用负向前瞻挡掉中间出现 S\d\d 的情况。 */
        pat: new RegExp(`\\b${id}\\b(?:(?!S\\d{2})[^\\n]){0,40}?(\\d{2,4})\\s*行`, 'g'),
      });
      out.push({
        id, kind: '字节', value: v.bytes, skipLine: /task\.txt|prompt|任务书|stream|快照|正文/,
        pat: new RegExp(`\\b${id}\\b(?:(?!S\\d{2})[^\\n]){0,80}?(\\d{4,6})\\s*字节`, 'g'),
      });
    }
    out.push({ id, kind: '字节(对账表)', value: v.bytes, tableRow: true });
  }
  return out;
}

/* 单案判别值表：{S04: {n, hit}, ...} */
const perCase = {};
for (const id of withArt) {
  const html = artifactOf(id);
  perCase[id] = { n: disc[id].length, hit: disc[id].filter((t) => hitOne(html, t)).length };
}

let problems = 0;

/* ── 自测注入点 ──────────────────────────────────────────────────────
 * 目标：证明这份审计**会响**，不是恒真。
 *
 * 做法：`--selftest` 时在读取报告文本这一步注入一处已知错误
 * （把某份报告的第一个数字改掉），然后断言「problems > 0」。
 *
 * 为什么在读取层注入而不是重构出 judge()：
 * 这个脚本是过程式的，五段检查各自读文件、各自加 problems。
 * 重构成纯函数要动五处、风险大于收益。在唯一的数据入口注入，
 * 能让**每一条检查**都经过被测数据 —— 这比单独测某个函数更接近真实。
 *
 * 注入什么：把 S21 的「426 行」改成「999 行」。那是个真实存在的断言，
 * 改了它，行数检查必红。 */
/* ── 多变异自测 ────────────────────────────────────────────────────
 * 一次跑一个变异，用环境变量 SELECT_MUT 指定（自测脚本会循环调用）。
 *
 * 为什么要多变异：这份审计有 **六个独立检查** —— 数字断言、案数口径、
 * _staged 集合、交接表存在性、commit 引用、行数/字节数。
 * 只测其中一个，其余五个仍然是"从没被证明会响"的状态。
 * 这与 _evidence-gate 的做法一致（它也是七条变异各测一条断言）。 */
const MUTATIONS = {
  /* ① 数字断言：把 S21 的 426 行改成 999 行 */
  number: {
    report: 'deliverables/78-northstar/_probe/30-artifact-validity.md',
    find: /S21[^\n]{0,60}?(426)(\s*行)/,
    to: 'S21 已重跑成功（999 行',
    covers: '数字/行数断言',
  },
  /* ② 案数口径：删掉 06 里那句解释口径的话，让「13 案 + 12 案」同现却无解释。
   * ⚠️ 第一版这个变异是「把十二案改成十一案」，结果自测报「没响」——
   * 查下来发现**那条检查根本不看「十二案」这个中文写法**，
   * 它只查「13 案」与「12 案」是否同现。
   * 所以变异选错了靶子，不是检查坏了。这是自测的另一半价值：
   * 它逼我确认每条变异真的落在被测判据的覆盖范围内。 */
  caliber: {
    report: 'deliverables/78-northstar/06-BLIND-RESULT.md',
    /* 只把**解释性措辞**换成中性词，保留全部数字与标题。
     *
     * ⚠️ 前三版都选错了靶子，每一版的失败原因都不同：
     *   ① 改「十二案 → 十一案」—— 检查不看中文数字，不响
     *   ② 替换整段 —— 把「13 案」一起删了，hasBoth=false，直接跳过
     *   ③ 删解释句但保留数字 —— 「两个案数口径，别混」这个**标题**里
     *      还有「口径」二字，仍被判为已解释
     * 现在：把所有解释词逐个换成中性说法，数字与结构不动。 */
    find: /两个案数口径，别混|判别法对它不适用|两个案数/,
    to: '另有说明',
    covers: '案数口径解释',
  },
  /* ③ 交接表：指向一个不存在的文件 */
  handoff: {
    report: 'deliverables/78-northstar/05-RESUME-HERE.md',
    find: /`_probe\/34-s21-rerun\.md`/,
    to: '`_probe/99-nonexistent.md`',
    covers: '交接表存在性',
  },
  /* ⑤ _staged 集合：假装 S98 的产物出现了。
   * 这条检查的对象是**磁盘状态**，不是报告文本 —— 所以注入点在
   * stagedCases 的构建处，不在这里。这里只声明元信息，
   * 让末尾的自测逻辑知道这个变异名是合法的。 */
  staged: {
    report: '',                   // 空 = 不做文本注入
    covers: '_staged 产物集合',
  },
  /* ⑥ 案数本身的数字：把「13 案有产物」改成 12（S21 重跑前的旧值） */
  casenum: {
    report: 'deliverables/78-northstar/_probe/30-artifact-validity.md',
    find: /\*\*14 个案号里，13 案有产物/,
    to: '**14 个案号里，12 案有产物',
    covers: '案数本身（是否等于实测）',
  },
  /* ⑦ commit 引用：造一个不存在的 hash */
  commit: {
    report: 'deliverables/78-northstar/06-BLIND-RESULT.md',
    find: /`(afe8b41)`/,
    to: '`deadbee`',
    covers: 'commit 引用真实性',
  },
};

function readReport(absPath) {
  const text = readFileSync(absPath, 'utf8');
  if (!SELFTEST || !SELECT_MUT) return text;
  const mut = MUTATIONS[SELECT_MUT];
  if (!mut) return text;
  /* report 为空 = 这个变异的注入点不在文本层（如 staged 那条改的是磁盘状态） */
  if (!mut.report) return text;
  const rel = absPath.replace(ROOT, '').replace(/\\/g, '/').replace(/^\//, '/');
  if (!rel.endsWith('/' + mut.report)) return text;
  if (!mut.find.test(text)) return text;
  /* ⚠️ `selftestInjected` 只用于最后报「注入成功过」，**不再阻止再次注入**。
   *
   * 第一版用 `selftestInjected` 做「只注入一次」的开关，结果 handoff 变异
   * 永远不响：`05-RESUME-HERE.md` 被读**两次** ——
   * 一次在 REPORTS 循环（案数口径检查），一次在交接表检查。
   * 第一次注入消耗掉了开关，而那次读到的内容根本不参与交接表检查。
   *
   * 正确语义：**每次读目标文件都注入**，这样无论哪一段检查读到它，
   * 看到的都是被污染的版本。 */
  selftestInjected = true;
  /* 全局替换：口径解释可能由多个词共同承载（标题里的「口径」+ 正文里的
   * 「判别法不适用」），只换第一个的话另一个仍会让检查认为「解释过了」。 */
  const g = new RegExp(mut.find.source, mut.find.flags.includes('g') ? mut.find.flags : mut.find.flags + 'g');
  return text.replace(g, mut.to);
}

for (const rel of REPORTS) {
  const p = join(ROOT, rel);
  if (!existsSync(p)) { console.log(`? 缺文件 ${rel}`); continue; }
  const s = readReport(p);
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
  for (const c of checksFor(rel)) {
    if (c.tableRow) {
      /* 对账表行的判据（严格）：案号 + 已知 layoutKind + 至少两个 x/y 分式。
       * 实测这样能把 48 份报告里的误报从 78 条降到 0 —— 那些「S31 1971 | 72 98」
       * 「S99 全长 61070 行」都不满足「有 layoutKind」这一条。 */
      const ROW_RE = new RegExp(
        `^\\s*${c.id}\\s+(?:fixed|auto-fit|no-column-layout)\\b.*?(\\d{4,6})\\s*$`
      );
      for (const line of s.split('\n')) {
        const m = line.match(ROW_RE);
        if (!m) continue;
        const claimed = Number(m[1]);
        const hist = KNOWN_HISTORY.find((h) => h.id === c.id && h.kind === c.kind && h.value === claimed);
        if (hist) {
          sizeHits.push({ kind: `${c.id} ${c.kind}`, got: claimed, want: c.value, ok: true, hist: hist.why });
          continue;
        }
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
      if (/stream|第\s*\d+\s*行|全长/.test(line)) continue;
      if (c.skipLine && c.skipLine.test(line)) continue;   // 任务书/日志语境
      /* 比较句不算断言：「和 S31 同量级完整、它 459 行」——
       * 这里的 S31 只是参照物，459 行属于主语 S99。
       * 判据：行内出现「和 Sxx 同/比 Sxx」这类比较结构就跳过。 */
      if (/(?:和|比|与)\s*S\d{2}|S\d{2}\s*(?:同量级|相比|更)/.test(line)) continue;
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

/* ── 附加核验：两个案数口径必须都能被解释 ──────────────────────────
 * 报告里并存两个不同的「N 案」，都对，但含义不同：
 *   13 案 = _staged 里有产物文件（含 S97）
 *   12 案 = 其中有判别值的（S97 通篇无数值，判别法不适用）
 * 如果不写清区别，读者会以为其中一个是错的。
 *
 * ⚠️ **只查白名单里的报告，不做全库扫描。**
 * 试过全扫，误报一个接一个，每个都不同源：
 *   · 12-main-thread：那里的「13 案」指「选错主容器的 13 案」、
 *     「12 案」指「栏数可判的 12 案」，与产物案数毫无关系
 *   · 33-truncation：「13 案会全部静默改字」是另一个语境
 * 数字相同不等于事实相同 —— 从数字本身无法区分，只能靠**声明这份报告
 * 在哪谈产物案数**。这不是偷懒：一个天天误报的检查会被关掉（这条教训
 * 我在 _fact-index.mjs 里已经栽过一次）。 */
const CALIBER_REPORTS = [
  'deliverables/78-northstar/06-BLIND-RESULT.md',
  'deliverables/78-northstar/_probe/30-artifact-validity.md',
];
{
  const stagedN = stagedCases.size;
  const discN = withArt.length;
  console.log(`\n=== 案数口径 ===`);
  console.log(`  _staged 有产物: ${stagedN} 案`);
  console.log(`  其中有判别值:   ${discN} 案`);
  let explained = 0, mentioned = 0;
  for (const rel of CALIBER_REPORTS) {
    const p = join(ROOT, rel);
    if (!existsSync(p)) continue;
    const s = readReport(p);
    /* 除了「有没有解释」，还要核**数字本身对不对**。
     * 实测 30-artifact-validity:29 写「13 案有产物」—— 那个 13 必须等于
     * _staged 的实测值。原文曾写 12（S21 重跑前的数），没人核就会一直错。 */
    const mStaged = s.match(/(\d+)\s*案有产物/);
    if (mStaged && Number(mStaged[1]) !== stagedN) {
      console.log(`  ✗ ${rel} 写「${mStaged[1]} 案有产物」，实测 ${stagedN} 案`);
      problems++;
    }
    const hasBoth = s.includes(`${stagedN} 案`) && s.includes(`${discN} 案`);
    if (!hasBoth) continue;
    mentioned++;
    const iA = s.indexOf(`${stagedN} 案`);
    const iB = s.indexOf(`${discN} 案`);
    const a = Math.min(iA, iB), b = Math.max(iA, iB);
    const gap = s.slice(Math.max(0, a - 100), Math.min(s.length, b + 100));
    /* 解释词的集合必须**只含明确指向案数口径**的说法。
     *
     * ⚠️ 原来还包含「更正 / 重跑 / 从 N 变」—— 实测这些词在 06 里出现 7 次，
     * 全在别的语境（「这是最大的缺口，要重跑」「§0.1 原来那段结论要撤回」），
     * 于是 gap 里永远能命中一个，检查永远认为「解释过了」。
     *
     * 一个关键词如果在目标文档里以**其他含义**高频出现，它就不是判据，
     * 是噪声源。现在只认这三个词。 */
    if (/两个案数|判别法.{0,6}不适用|案数口径/.test(gap)) explained++;
    else {
      console.log(`  ✗ ${rel} 同时提到 ${stagedN} 案与 ${discN} 案，但没解释区别`);
      problems++;
    }
  }
  if (mentioned === 0) console.log('  · 白名单里的报告没有同时提到这两个数（无需说明）');
  else console.log(`  ✓ ${explained}/${mentioned} 份同时提到两者的报告都写明了口径区别`);
}

/* ── 附加核验：_staged 里的产物集合必须与报告的案数一致 ────────────
 * 报告说「13 案有产物」，而 _staged 里恰好 13 个案的产物 —— 这两者
 * 必须始终相等。有人加了一份产物却没更新报告、或者删了产物却没改数字，
 * 都应该在这里红。
 *
 * 实测的另一个作用：S98 是零产物（作废），所以它不该出现在 _staged 里。
 * 如果哪天它出现了，说明有人重跑了它而没更新这套结论。 */
{
  const EXPECTED_ZERO = ['S98'];          // 已知零产物的案
  const listed = [...stagedCases].sort();
  console.log(`\n=== _staged 产物集合（${listed.length} 案）===`);
  const unexpected = listed.filter((id) => EXPECTED_ZERO.includes(id));
  if (unexpected.length) {
    console.log(`  ✗ 这些案被记为零产物，但 _staged 里有文件: ${unexpected.join(' ')}`);
    console.log('    若重跑成功，要同步更新 30-artifact-validity 与 06 的案数');
    problems += unexpected.length;
  }
  const missingControl = ['S97', 'S99'].filter((id) => !listed.includes(id));
  if (missingControl.length) {
    console.log(`  ✗ 对照组的产物不见了: ${missingControl.join(' ')}`);
    problems += missingControl.length;
  }
  if (unexpected.length === 0 && missingControl.length === 0) {
    console.log(`  ✓ ${listed.length} 案，与报告一致；对照组 S97/S99 都在；S98 按预期零产物`);
  }
}

/* ── 阴性对照的三个数字必须与实测一致 ──────────────────────────────
 * 这三个数来自 _discriminator-crosscheck 的实算，报告里反复引用。
 * 2026-11-14 修了一个 hitIn 的 bug（数值分支用子串搜索，
 * '160PX' 会命中 '60PX'），修完之后数字变了：
 *   非对角线 28/737=3.8% → 24/737=3.3%
 *   倍数     26.3×       → 30.7×
 *   干净值   60/60       → 62/62
 * 那种「修了 bug 之后报告里的数就该变」的情况，正需要这一条守着。 */
{
  const p = join(ROOT, 'deliverables/78-northstar/_probe/_discriminator-crosscheck.mjs');
  if (existsSync(p)) {
    /* 直接跑那个脚本拿实测，不重算 —— 避免又多一份同源实现。 */
    const out = (() => {
      try {
        return execFileSync(process.execPath, [p], { cwd: ROOT, encoding: 'utf8', timeout: 120000 });
      } catch (e) { return (e.stdout || '') + (e.stderr || ''); }
    })();
    const mOff = out.match(/非对角线（本案×他人）平均命中率:\s*([\d.]+)%\s*\[(\d+)\/(\d+)\]/);
    const mClean = out.match(/【干净判别值】（零份无关产物含它）:\s*(\d+)\s*个/);
    console.log(`\n=== 阴性对照（实测）===`);
    if (mOff && mClean) {
      const offPct = mOff[1], offNum = `${mOff[2]}/${mOff[3]}`, clean = mClean[1];
      console.log(`  非对角线 ${offPct}%（${offNum}）　干净判别值 ${clean} 个`);
      /* 在报告里找这几个数字，任何一个写成别的值就报 */
      /* ⚠️ 只认「实际值」，不认阈值/假设。实测两版都误报：
       *   ① `非对角线[^\n]{0,30}?([\d.]+)%` —— 命中「非对角线 < 15%」（阈值）
       *   ② 加「命中率」等词 —— 仍然命中同一行的「| 3.3% / 30.7× |」后面的
       *      「非对角线 50%」（自测变异描述，与 3.3% 同行）
       *
       * 现在：要求数字**紧跟在「非对角线」之后**（中间不超过 12 字符），
       * 且中间不能出现 `<` `>`（那是阈值写法）。
       * 一行里若同时有实际值和阈值，正则只吃紧邻的那个。 */
      const pat = new RegExp(`非对角线(?:（[^）]*）)?(?:平均)?[^\\n<>]{0,10}?([\\d.]+)%`, 'g');
      let bad = 0;
      for (const rel of REPORTS) {
        const fp = join(ROOT, rel);
        if (!existsSync(fp)) continue;
        const s = readReport(fp);
        for (const mm of s.matchAll(pat)) {
          if (mm[1] === offPct) continue;
          /* 排除「讨论变异」的行：592 行写「8 个变异（… / 非对角线 50% / …）」——
           * 那是自测用例的描述，不是实际值断言。 */
          const ls = s.lastIndexOf('\n', mm.index) + 1;
          const le = s.indexOf('\n', mm.index);
          const line = s.slice(ls, le < 0 ? undefined : le);
          if (/变异|自测|改成|假设|阈值|<=?|>=?/.test(line)) continue;
          console.log(`  ✗ ${rel.split('/').pop()} 写「${mm[1]}%」，实测 ${offPct}%`);
          console.log(`      出处: ${line.trim().slice(0, 90)}`);
          bad++;
        }
      }
      if (bad === 0) console.log(`  ✓ 报告里的非对角线命中率与实测一致`);
      else problems += bad;
    } else {
      console.log('  · 没能从 crosscheck 的输出里解析出数字（跳过）');
    }
  }
}

/* ── 四份脚本的口径必须一致 ────────────────────────────────────────
 * check / crosscheck / semantic / evidence-gate 各自有一份判别值实现。
 * 它们必须对同一批数据给出同一个总数 —— 否则「互相验证」是空话。
 *
 * 实测过这个漂移：_discriminator-semantic 的 CASES 漏了 S21，
 * 输出 64 而 check 是 67，而报告里却写着「两边都输出 64/64，可互相验证」。
 * 两份实现各自跑通不代表它们一致。 */
{
  console.log(`\n=== 四份实现的口径一致性 ===`);
  const run = (f) => {
    try {
      return execFileSync(process.execPath, [join(HERE, f)], {
        cwd: ROOT, encoding: 'utf8', timeout: 120000,
      });
    } catch (e) { return (e.stdout || '') + (e.stderr || ''); }
  };
  const checkOut = run('_discriminator-check.mjs');
  const semOut = run('_discriminator-semantic.mjs');
  const nCheck = (checkOut.match(/TOTAL discriminators:\s*(\d+)/) || [])[1];
  const nSem = (semOut.match(/可定位到语义的判别值:\s*(\d+)/) || [])[1];
  console.log(`  _discriminator-check    ${nCheck ?? '?'}`);
  console.log(`  _discriminator-semantic ${nSem ?? '?'}`);
  if (!nCheck || !nSem) {
    console.log('  · 有一个脚本没输出可解析的总数（跳过）');
  } else if (nCheck !== nSem) {
    console.log(`  ✗ 两份实现口径不一致：${nCheck} vs ${nSem}`);
    console.log('    「互相验证」的前提是两边都跑过且数字相同，不能凭印象写');
    problems++;
  } else {
    console.log(`  ✓ 一致（${nCheck}）`);
  }
}

/* ── 附加核验：交接文档「产出在哪」表里的文件必须存在 ──────────────
 * 05-RESUME-HERE.md 是新会话第一个读的文件，那张表是它的导航。
 * 表里指向不存在的文件 = 导航断了。实测清单里曾漏掉两份今天新增的报告
 * （35-s31-contradiction-evidence、31-content-instability）——
 * 不是我写错路径，是**新报告没被登记进交接文档**。
 *
 * 判据：只查那张表里的 `_probe/xxx.md` / `NN-xxx.md` 形式，
 * 不查正文里的路径引用（那些很多是沙箱内文件，见 36-path-refs-not-worth-checking.md）。 */
{
  const p = join(ROOT, 'deliverables/78-northstar/05-RESUME-HERE.md');
  if (existsSync(p)) {
    const s = readReport(p);
    const start = s.indexOf('## 二、产出在哪');
    const end = s.indexOf('## 三');
    const table = (start >= 0 && end > start) ? s.slice(start, end) : '';
    const refs = new Set();
    /* ⚠️ 必须允许大写：报告名里有 `06-BLIND-RESULT.md`、`07-NEGATIVE-B.md`。
     * 第一版写 [a-z0-9-]+ 只匹配到 8 份，把这两个大写名的漏掉了 ——
     * 而「核验了 8 份全部存在」听起来完全正常，实际漏了 2 份。 */
    for (const m of table.matchAll(/`((?:_probe\/)?\d{2}-[A-Za-z0-9-]+\.md)`/g)) {
      refs.add(join(ROOT, 'deliverables/78-northstar', m[1]));
    }
    console.log(`\n=== 交接文档「产出在哪」表（${refs.size} 份）===`);
    let missing = 0;
    for (const f of refs) {
      if (!existsSync(f)) { console.log(`  ✗ 表里指向不存在的文件: ${f.replace(ROOT, '')}`); missing++; }
    }
    if (missing === 0) console.log(`  ✓ ${refs.size} 份全部存在`);
    else problems += missing;
  }
}

/* ── 附加核验：报告里引用的 commit hash 必须真实存在 ──────────────────
 * 报告经常写「见 commit `afe8b41`」当作证据链。如果那个 hash 不存在
 * （打错、或者在 rebase 里被改写掉了），整条证据就断了，而读的人
 * 会以为「有 commit 就一定有据」。
 *
 * 判据：只收反引号里的 7 位十六进制串 —— 不戴反引号的 7 位数字
 * 全是字节数/行数，实测会误报。 */
{
  const seen = new Set();
  for (const rel of REPORTS) {
    const p = join(ROOT, rel);
    if (!existsSync(p)) continue;
    const s = readReport(p);
    for (const m of s.matchAll(/`([0-9a-f]{7})`/g)) seen.add(m[1]);
  }
  console.log(`\n=== commit 引用核验（${seen.size} 个）===`);
  let bad = 0;
  for (const h of seen) {
    try {
      execFileSync('git', ['cat-file', '-e', `${h}^{commit}`], { cwd: ROOT, stdio: 'ignore' });
    } catch {
      console.log(`  ✗ ${h} 不存在于本仓库历史里`);
      bad++;
    }
  }
  if (bad === 0) console.log(`  ✓ ${seen.size} 个 commit 引用全部真实存在`);
  else { console.log(`  ✗ ${bad} 个引用指向不存在的 commit`); problems += bad; }
}

if (SELFTEST) {
  /* 单次变异自测的判据：注入了已知错误之后，problems 必须 > 0。
   * 驱动脚本（verify-research）会针对每个 MUTATIONS 键各跑一次。 */
  console.log('');
  console.log('─'.repeat(70));
  const mut = MUTATIONS[SELECT_MUT];
  if (!SELECT_MUT) {
    console.log('✗ 自测需要指定变异：SELECT_MUT=<key>');
    console.log('  可选：' + Object.keys(MUTATIONS).join(' / '));
    process.exit(1);
  }
  if (!mut) {
    console.log(`✗ 未知变异 "${SELECT_MUT}"，可选：${Object.keys(MUTATIONS).join(' / ')}`);
    process.exit(1);
  }
  if (!selftestInjected) {
    console.log(`✗ 自测失败：变异 "${SELECT_MUT}" 没能注入`);
    console.log('  说明 MUTATIONS 里那个正则与实际报告内容脱节了');
    process.exit(1);
  }
  if (problems === 0) {
    console.log(`✗ 自测失败：注入变异 "${SELECT_MUT}"（覆盖 ${mut.covers}）后，审计没报错`);
    console.log('  说明那条检查是恒真的，或它没读到那份报告');
    process.exit(1);
  }
  console.log(`✓ 自测通过：变异 "${SELECT_MUT}" 覆盖「${mut.covers}」，检出 ${problems} 处`);
  console.log('  那条检查确实会响 —— 它不是恒真。');
  process.exit(0);
}

process.exit(problems === 0 ? 0 : 1);
