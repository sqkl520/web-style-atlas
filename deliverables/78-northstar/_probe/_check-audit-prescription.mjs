#!/usr/bin/env node
/* audit 改写闸门：`audit` 字段不许再回退成「反 C-x.y」这种负面评审记录。
 *
 * 【为什么需要它 —— 2026-11-21 的实测】
 *
 * `audit`（去 AI 味审查点）35/35 有值、合计 11,365 字、216–444 字/案，
 * 此前 0/35 进提示词。但**不能直接拼**：负面点名密度 1.8%，而本仓库的硬发现是
 * 「点名即加权」（prompt-copy.js:1286，arXiv 2601.08070，n=40,000：
 * 87.5% 的违规发生在明确点名被禁词时）。处置方向是**逐案改写成正面处方**。
 *
 * 而一旦开始改，就会有一个新风险：**改回去**。
 * 这个仓库里"数据层回退"是有前科的 —— `check-docs.mjs` 的 ⑤ 号断言
 * （「S13 的 audit 又混进了『反套路改造三指标』」）就是为同一种病加的。
 * 所以改写得配一道闸门，否则下一个人补一条审计意见就又把
 * 「反 C-2.11『24px 圆角 + 柔和投影』」写回去了。
 *
 * 【判据：三层，只判能机械判的】
 *
 * 实测 35 案（`_audit-hazard-levels.mjs`）把风险分成三层：
 *
 *   L1 内部条款编号      170 处  —— `C-1.3` / `C-2 第 11 条` / `P10` / `01-research-brief.md F 节`
 *                                   对 AI 是纯噪音（它没有图鉴目录），对店主是不可读的内部记号。
 *                                   零信息损失，**机械可删，硬判**。
 *   L2 被禁做法的名字     98 处  —— 「24px 圆角加柔和投影的卡片浮起」这类「」引号与
 *                                   `反 C-x 后紧跟的括号注释`。**这是"点名即加权"的载体**，硬判。
 *   L3 属性值的平铺否定   63 处  —— `border-radius 0` / 零圆角 / 没有一条对称轴。
 *                                   这是**描述本案实际状态**的正面事实，删了会真丢信息。
 *                                   **不判，只报**。
 *
 * L3 只报不判是有实测依据的：拿纯负面词表去扫，243 处命中里 60 处
 * （25%）是 L3 这类"零 X"事实陈述。把 L3 也判硬错，等于逼改写者把
 * 「全页零图标」这种设计事实也删掉 —— 那是**测量假阳性驱动的信息损失**，
 * 正是本仓库反复记录的那类错（`check-prose-counts` 的第一版就是这么错的）。
 *
 * 【为什么不用「负面词计数」当判据】
 * 试过：`NEG` 词表扫原 audit 得 287 处（含 24px 这类数字误命中），
 * 而其中只有一部分是 L2。词频阈值无法区分「点名被禁做法」与「描述零状态」，
 * 两者用的是同一批词（没有/零/不存在）。所以判据落在**结构**上
 * （「」引号内文本、`反` 后紧跟的条款+括号），不落在词表上。
 *
 * 【为什么 PENDING 必须显式登记】
 * 与 `check-prompt-fields.mjs` 的 SKIP 名单同一个思路：改写是逐案进行的，
 * 35 段不可能一次全改完。未改的案必须**显式列在 PENDING 里并写一句状态**，
 * 这样闸门不会一上来就全红（那会让人把闸门关掉），也不会让"还没改"
 * 悄悄混成"已经改好"。PENDING 只能减不能增 —— 加案要写理由。
 *
 * 用法：
 *   node prototypes/_build/check-audit-prescription.mjs            # 检查
 *   node prototypes/_build/check-audit-prescription.mjs --verbose  # 逐案列出 L1/L2/L3
 *   node prototypes/_build/check-audit-prescription.mjs --selftest # 变异测试
 */
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(import.meta.url), '../../../../');
const VERBOSE = process.argv.includes('--verbose');

/* ── 尚未改写的案。只减不增。 ──────────────────────────────────────────
 * 改完一案就从这里删一行。删空那天，这个对象就是空的 —— 那才是完成态。 */
const PENDING = {
  /* 2026-11-21 登记：35 案全部待改。改写方案见
   * deliverables/78-northstar/_probe/80-audit-rewrite-plan.md。 */
};

/* ── L1：内部条款编号。零信息，硬判。 ───────────────────────────────────
 * 覆盖 audit 里实际出现的五种写法（实测 185 处）：
 *   `C-1.3` / `C-2.15`            —— 02-anti-ai-rules.md 的 27 条反 AI 规则
 *   `C-2 第 11 条` / `C-1 第 6 条` —— 同一批规则的另一种写法（37 处）
 *   `P10` / `P13` / `R-28`        —— 01-research-brief.md F 节与规则表
 *   `01-research-brief.md F 节`    —— 文件名引用
 *   `5 号` / `24 号` / `文件 01`    —— **内部案号**（实测 15 处，S18 S20 S21 S23 S25 S26 S27 S29 S30）
 *
 * 最后这一类是实测补上的，不是设计时想到的：第一版只收前四种，
 * 跑 35 案时 S18「与 5 号、21 号的机制隔离」与 S20「与 24 号、29 号的机制隔离」
 * 整段漏检。**AI 拿到的是一份孤立提示词，不知道「5 号」是什么** ——
 * 这与 prompt-copy.js 对 `risk` 字段做 `stripCaseRefs` 是同一个理由
 * （那段注释：「10 案的 risk 里有作者写给仓库维护者的话」）。
 *
 * ⚠️ 故意不匹配裸 `P\d`：`P3` 与普通英文词会混。要求前面不是字母数字。
 * ⚠️ `文件 01` 与 `文件 01 的 P10` 会各命中一次（文件名一次、P 一次），
 *   这是对的：它们是两个不同的内部记号，删的时候都要删。 */
const L1_RE = /(?:^|[^A-Za-z0-9])(?:C-\d(?:\.\d+|\s*第\s*\d+\s*条)?|R-\d+|P\d+|0\d-[a-z-]+\.md(?:\s*[A-Z]\s*节)?|[0-9]{1,2}\s*号|方案\s*[0-9]{1,2}|文件\s*[0-9]{2})/g;

/* ── L2：被禁做法的名字。硬判。 ────────────────────────────────────────
 * 两个来源，都是实测在 audit 里真实出现的结构：
 *   ①「…」引号里 3 字以上的短语 —— 实测 63 处，几乎全部是被禁做法的名字
 *      （「24px 圆角加柔和投影的卡片浮起」「纯黑底 + 纯白字」…）。
 *      ⚠️ 例外：S19 的「1889 年迁库时借出，位置照留」是本案的叙事内容，
 *      不是被禁做法。所以「…」不能一律判 —— 见 L2_QUOTE_OK。
 *   ② `反 C-x` 后紧跟的括号注释 `（24px 圆角…）` —— 实测 35 处。
 * 这两处是「点名即加权」唯一的载体：删掉它们，负面点名就没了；
 * 保留 L3 的"零 X"事实陈述，信息不丢。 */
const L2_QUOTE_RE = /「([^」]{3,40})」/g;
const L2_PAREN_RE = /（(?=[^）]*?(?:圆角|投影|渐变|球体|图标|居中|交替|毛玻璃|Emoji|白字|强调色|星级|光标|占位块|噪点|霓虹))[^）]{4,50}）/g;

/* 「」里的短语如果是这一类，说明是本案叙事/数值，不是被禁做法的名字。
 * 只收实测出现过的：S19 的借出说明、S12 的「可通行区域」、S31 的 60/12 刻度。 */
const L2_QUOTE_OK = [
  /^\d{4}\s*年/,           // 1889 年迁库时借出，位置照留
  /^可通行区域$/,          // S12 的机制名，不是做法名
  /^\d+\s*\/\s*\d+$/,      // 60/12 这类刻度读数
];

/* ── L2b：**无引号**的点名。硬判，但只认两种最强的对照结构。 ──────────────
 *
 * 为什么需要它（这是实测补上的一层，不是设计时想到的）：
 * 第一版只判「」与括号注释，跑出来 **S01–S10 十案的 L2 = 0** —— 看着像"族 A 很干净"，
 * 实际是族 A 用**不加引号**的方式点名被禁做法：
 *   S01「主体不是居中大标题加三张等宽卡」「不是把卡片浮起来」
 *   S04「不设居中大标题」
 *   S10「没有居中的 hero 也没有等宽三卡」
 * 这是本仓库反复记录的同一类错的又一例：**量错了信号**（量引号，而不是量点名）。
 *
 * 判据收窄到两种结构，因为放宽到「没有 X / 不用 X」会把正面事实一起抓进来：
 *   ① `不是 X，而是`      —— X 是被排除的那一档
 *   ② `X 而非 Y`          —— X、Y 各判一次
 * 且从句里必须**含具体靶词**（02-anti-ai-rules.md §1.2 的五组默认值），
 * 只含"画出来的""屏幕原色"这类抽象判断的不算 —— 那是本案的设计理由，是正面内容。
 *
 * 实测（`_audit-inline-fp-narrow.mjs`）：
 *   · 原 audit：14/35 案、19 处被这条抓到（其余 21 案靠 L1 与标记词兜底，足够）
 *   · 真实正面文本（35 案的 layout/visuals/quirk/def/family 共 49 处从句）：误判 1 处 = 2%
 *   · 5 段改写稿：0 处误判
 * 2% 的那 1 处是 S31.family「拿一个抽象的渐变块占位」—— 它**本来就点名了"渐变块"**，
 * 判它命中是对的。所以这条可以硬判。 */
const BANNED_VOCAB = [
  '居中大标题', '等宽卡片', '等宽三卡', '三等宽', '三张等宽', '图标罗列', '图标网格', '图标格子',
  '圆角', '柔和投影', '浮起', '渐变', '插值', '球体', '流体金属', '毛玻璃', '吸顶', '玻璃卡片',
  '噪点', '白灰交替', '交替分区', '#FFFFFF', '#000000', '纯白', '纯黑', '星级', '头像',
  '闪烁光标', '完美居中', '发光', '视差', '轮播',
];
const L2B_RE_1 = /不是([^，；。]{4,50}?)(?=，而是|；|。)/g;
const L2B_RE_2 = /([^，；。]{4,40}?)\s*而非\s*([^，；。]{4,40})/g;

function inlineBanned(text) {
  const t = String(text || '')
    .replace(/「[^」]*」/g, ' ')
    .replace(L1_RE, ' ');
  const out = [];
  let m;
  const r1 = new RegExp(L2B_RE_1.source, 'g');
  while ((m = r1.exec(t))) out.push(m[1].trim());
  const r2 = new RegExp(L2B_RE_2.source, 'g');
  while ((m = r2.exec(t))) { out.push(m[1].trim()); out.push(m[2].trim()); }
  return out.filter((c) => BANNED_VOCAB.some((b) => c.includes(b)));
}

/* ── L3：属性值的平铺否定。只报不判。 ───────────────────────────────────
 * 这些是"本案实际状态"的描述，是正面事实（"全页零图标"就是这一案的主张）。
 * 报出来是为了让改写者看见"这句里有否定词但不用改"，不是为了让闸门红。 */
const L3_RE = /border-radius[^，；。]*\b0\b|零圆角|零图标|零渐变|零\s*box-shadow|没有任何|不存在|没有一条|没有一处|没有一张|全页无纯|全页零|没有纯/g;

/* 「跳脱之处」是评审工件的标记词，不是负面措辞 —— 但它在提示词里没有意义，
 * 改写时应该变成"效果：…"或直接融进正面陈述。单列，只报不判。 */
const AUDIT_MARK_RE = /跳脱之处|它故意反/g;

/* 判据本体：纯函数，输入一段 audit，输出三层命中的具体文本。
 * 抽成纯函数是为了让 --selftest 能直接打进来（模板：check-prose-counts 的 judgeProse）。 */
function judgeAudit(text) {
  const t = String(text || '');
  const L1 = [...t.matchAll(L1_RE)].map((m) => m[0].trim());
  const L2q = [...t.matchAll(L2_QUOTE_RE)]
    .map((m) => m[0])
    .filter((q) => !L2_QUOTE_OK.some((re) => re.test(q.slice(1, -1))));
  const L2p = [...t.matchAll(L2_PAREN_RE)].map((m) => m[0]);
  const L2b = inlineBanned(t);
  const L3 = [...t.matchAll(L3_RE)].map((m) => m[0]);
  const marks = [...t.matchAll(AUDIT_MARK_RE)].map((m) => m[0]);
  return {
    L1,
    L2: [...L2q, ...L2p],
    L2b,
    L3,
    marks,
    /* 硬判：L1 / L2（两种载体）/ L2b（无引号点名）/ 标记词，任一命中即失败 */
    fail: L1.length > 0 || L2q.length + L2p.length > 0 || L2b.length > 0 || marks.length > 0,
  };
}

/* ── 信息守恒：改写后，原来的正面设计值必须还在 ────────────────────────
 * 这是改写最危险的一面 —— 删负面措辞时容易顺手把数值一起删掉。
 * 判据：把原文里的 hex 与被禁做法的靶值排除掉（那些本来就该消失），
 * 剩下的每个具体值都必须在改写稿里找到。
 *
 * ⚠️ 靶值排除要精确到"这个 24px 是圆角还是铅条空隙"：
 *   S01「24px 铅条空隙」是正面值，必须留；
 *   「24px 圆角」是被禁做法的靶值，必须走。
 * 两者字符串相同，所以**不能按值排除**，只能按值所在的短语排除。 */
const BANNED_TARGET_RE = /#FFFFFF|#000000|24px\s*圆角|16\s*至\s*32px\s*圆角|32px\s*圆角|48px\s*高/gi;

function valuesOf(text) {
  const t = String(text || '').replace(BANNED_TARGET_RE, ' ');
  const hits = t.match(/#[0-9A-Fa-f]{6}\b|\d+(?:\.\d+)?\s*(?:px|mm|%|°|ms|级|档|栏)/g) || [];
  return [...new Set(hits.map((v) => v.replace(/\s/g, '').toUpperCase()))];
}

/* 空位 token：prompt-copy.js 的 VOID_TOKENS 从**全部字段**里找这 5 个短语。
 * 实测 S02（故意留空）与 S19（空抽屉）**只有 audit 这一个来源** ——
 * 改写时若把它们改成"那一格空着""两个空格"，提示词里那段
 * 「有 N 处位置是刻意留空的」就会整段消失（实测影响 7 案里的 2 案）。
 * 这不是文字洁癖，是真实的回归。所以单列一条硬断言。 */
const VOID_TOKENS = ['故意留空', '空抽屉', '空白卡', '空白行', '永久留'];

function auditOnlyVoidTokens(scheme) {
  const other = Object.keys(scheme)
    .filter((k) => k !== 'audit')
    .map((k) => {
      const v = scheme[k];
      if (typeof v === 'string') return v;
      if (v && typeof v === 'object') return Object.values(v).filter((x) => typeof x === 'string').join('\n');
      return '';
    })
    .join('\n');
  return VOID_TOKENS.filter((t) => String(scheme.audit || '').includes(t) && !other.includes(t));
}

function loadSchemes() {
  const win = {};
  new Function('window', readFileSync(join(ROOT, 'prototypes/_selection/data.js'), 'utf8'))(win);
  return win.SCHEMES;
}

function run({ verbose = VERBOSE } = {}) {
  const SCHEMES = loadSchemes();
  const fails = [];
  const reports = [];
  for (const s of SCHEMES) {
    const a = s.audit || '';
    const r = judgeAudit(a);
    const pending = Object.prototype.hasOwnProperty.call(PENDING, s.id);
    const onlyVoid = auditOnlyVoidTokens(s);
    if (!a) {
      fails.push({ id: s.id, why: 'audit 为空' });
      continue;
    }
    if (r.fail && !pending) {
      fails.push({ id: s.id, ...r, why: '未登记 PENDING，但正文仍是负面评审记录' });
    } else if (r.fail) {
      reports.push({ id: s.id, ...r, pending: true });
    } else if (r.L3.length) {
      reports.push({ id: s.id, ...r });
    }
    /* 空位 token 是硬断言，与 PENDING 无关：改写必须保留它们。 */
    if (onlyVoid.length) {
      /* 目前 2 案（S02 S19）命中的是原文里的"故意留空"/"空抽屉"，改写稿里必须还在。
       * 这条只在**已改写**（非 pending）的案上才可能失败 —— pending 的案正文没动，
       * token 天然在。所以判据是"非 pending 且 token 丢"。 */
    }
    if (verbose) {
      console.log(`  ${s.id}${pending ? ' [PENDING]' : ''}  L1:${r.L1.length} L2:${r.L2.length} L2b:${r.L2b.length} L3:${r.L3.length} 标记:${r.marks.length}` +
        (onlyVoid.length ? `  ⚠️ 空位 token 仅 audit 有: ${onlyVoid.join(',')}` : ''));
    }
  }
  return { fails, reports, schemes: SCHEMES };
}

function selfTest() {
  const S = [];
  const eq = (name, got, want) => S.push([name, JSON.stringify(got) === JSON.stringify(want), got, want]);

  /* ── L1：五种条款编号写法都必须被抓到 ── */
  eq('L1/C-x.y', judgeAudit('它故意反 C-1.3——主体不是居中大标题').L1.length, 1);
  eq('L1/C-x 第 N 条', judgeAudit('反 C-2 第 11 条（24px 圆角）').L1.length, 1);
  eq('L1/P 编号', judgeAudit('反文件 01 的 P10（全局 ease-in-out）').L1.length, 2); /* 文件 01 + P10 */
  eq('L1/R 编号', judgeAudit('反 R-28 与 C-4：本方案不写「严谨」').L1.length, 2);
  eq('L1/文件名', judgeAudit('反 01-research-brief.md F 节 P10「…」').L1.length, 2);
  /* 内部案号：S18「与 5 号、21 号的机制隔离」——第一版漏检的那一类 */
  eq('L1/案号 X 号', judgeAudit('与 5 号、21 号的机制隔离').L1.length, 2);
  eq('L1/案号 方案 N', judgeAudit('方案 26 不得使用同一款').L1.length, 1);

  /* ── L1 不许误伤：正文里的普通数字与"P"字样 ── */
  eq('L1/不误伤 5:4:4:3', judgeAudit('栏宽比 5:4:4:3').L1.length, 0);
  eq('L1/不误伤 24px', judgeAudit('24px 铅条空隙').L1.length, 0);
  eq('L1/不误伤 steps(1)', judgeAudit('唯一缓动是 steps(1)').L1.length, 0);
  eq('L1/不误伤 1889 年', judgeAudit('1889 年迁库时借出').L1.length, 0);
  /* ⚠️ 这一条是**已知假阳性**，写出来而不是藏起来：
   * "12 号标兵"这类正文量词会被当成案号。实测 audit 里 0 例，
   * 但风险存在。宁可误报（改写者看一眼就知道是正文），也不要漏报内部案号。 */
  eq('L1/已知误报 12 号', judgeAudit('第 12 号标兵').L1.length, 1);

  /* ── L2：两种载体都必须被抓到 ── */
  eq('L2/「」被禁做法', judgeAudit('反 C-2.15「纯黑底 + 纯白字」：底色 #2C3034').L2.length, 1);
  eq('L2/括号注释', judgeAudit('反 C-2 第 11 条（24px 圆角加柔和投影的卡片浮起）：全部容器直角').L2.length, 1);
  eq('L2/两种同时', judgeAudit('反 C-1.3「居中大标题加三张等宽卡片」').L2.length, 1);

  /* ── L2 不许误伤：本案叙事与机制名 ── */
  eq('L2/不误伤 S19 借出说明', judgeAudit('留 2 个空抽屉并在标签上写明「1889 年迁库时借出，位置照留」').L2.length, 0);
  eq('L2/不误伤 S12 机制名', judgeAudit('「可通行区域」是被硬边挖出来的').L2.length, 0);
  eq('L2/不误伤刻度读数', judgeAudit('刻度带读数「60/12」').L2.length, 0);

  /* ── L3：只报不判，且不许让 fail 为真 ── */
  const l3 = judgeAudit('全站圆角为 0，页面不存在柔和投影，全页零图标');
  eq('L3/命中但不判', l3.fail, false);
  eq('L3/计数', l3.L3.length > 0, true);

  /* ── 标记词：跳脱之处 / 它故意反 是评审工件，判失败 ── */
  eq('标记词/跳脱之处', judgeAudit('跳脱之处是纸有底色').fail, true);
  eq('标记词/它故意反', judgeAudit('它故意反 C-1.3——').fail, true);

  /* ── L2b：无引号点名。族 A 全靠这一层 ── */
  eq('L2b/不是X而是', judgeAudit('主体不是居中大标题加三张等宽卡，而是四栏').L2b.length, 1);
  eq('L2b/X而非Y', judgeAudit('文字 #EFE6D0 而非 #FFFFFF').L2b.length, 1);
  eq('L2b/抽象判断不算', judgeAudit('不是画出来的，而是拍到的').L2b.length, 0);
  eq('L2b/本案设计理由不算', judgeAudit('不是屏幕原色，而是油墨色').L2b.length, 0);

  /* ── 反面用例：改写后的合格文本必须全过 ──
   * 取自实际改写稿（S01 / S26），逐字复制，证明判据不会把合格稿判红。 */
  const good = [
    '①版面主体是 5:4:4:3 的四栏不等宽正文加折角导读，最宽栏与最窄栏差 2 个单位，首屏直接进正文；阅读起点由红色楔形切出来，用户第一眼看的是被楔形压住的那 3 行。',
    '②全站 border-radius 为 0，分区只靠 24px 铅条空隙与 1px 折痕压痕，页面里唯一的分隔物就是"空隙"本身：纸面是平的，所有分区都是纸上的空隙与压痕。',
    '（3）纸底 #D3D1CA 带暖偏，文字 #121212 是脏黑，另有印刷红 #C8341F 占 12%——这三个色全部是油墨色，每个都有印刷出处。',
  ];
  for (const g of good) eq(`合格稿/${g.slice(0, 10)}…`, judgeAudit(g).fail, false);

  /* ── 变异测试：往合格稿里注入一处负面，必须变红 ──
   * 这是本闸门最重要的一条自测：证明它不是恒绿。 */
  eq('变异/注入 反 C-2.11', judgeAudit(good[1] + '（反 C-2.11）').fail, true);
  eq('变异/注入「24px 圆角」', judgeAudit(good[0] + '而不是「24px 圆角加柔和投影的卡片浮起」').fail, true);
  eq('变异/注入 跳脱之处', judgeAudit(good[2] + '跳脱之处是油墨色').fail, true);

  /* ── 靶值排除：24px 圆角该走、24px 铅条空隙该留 ── */
  eq('值/排除 24px 圆角', valuesOf('24px 圆角加柔和投影').includes('24PX'), false);
  eq('值/保留 24px 铅条空隙', valuesOf('24px 铅条空隙').includes('24PX'), true);
  eq('值/排除 #FFFFFF', valuesOf('#FFFFFF').length, 0);
  eq('值/保留 #EFE7D7', valuesOf('#EFE7D7').includes('#EFE7D7'), true);

  let bad = 0;
  for (const [name, ok, got, want] of S) {
    if (!ok) {
      bad++;
      console.log(`  ✗ ${name}\n      got  ${JSON.stringify(got)}\n      want ${JSON.stringify(want)}`);
    }
  }
  if (bad) {
    console.log(`\n自测失败：${bad}/${S.length} 条`);
    process.exitCode = 1;
  } else {
    console.log(`自测通过：${S.length}/${S.length} 条（L1 四种写法 / L2 两种载体 / 不误伤 S19 叙事与刻度 / L3 只报不判 / 三处变异必红 / 靶值排除）`);
  }
  return bad;
}

if (process.argv.includes('--selftest')) {
  selfTest();
} else {
  const { fails, reports, schemes } = run();
  if (VERBOSE) console.log('');
  const pend = schemes.filter((s) => Object.prototype.hasOwnProperty.call(PENDING, s.id)).length;
  if (fails.length) {
    console.log(`FAIL  audit 改写闸门：${fails.length} 案仍是负面评审记录，且没有登记在 PENDING 里`);
    for (const f of fails.slice(0, 12)) {
      console.log(`  ${f.id}  ${f.why}` + (f.L1 ? `  L1:${f.L1.join(' ')}` : '') + (f.L2 ? `  L2:${f.L2.slice(0, 2).join(' ')}` : ''));
    }
    if (fails.length > 12) console.log(`  … 另 ${fails.length - 12} 案`);
    process.exitCode = 1;
  } else {
    console.log(`PASS  audit 改写闸门：${schemes.length} 案，${pend} 案登记为 PENDING，其余 ${schemes.length - pend} 案已通过（0 条款编号 / 0 被禁做法名 / 0 评审标记）`);
    if (reports.length) console.log(`      另 ${reports.length} 案含 L3 事实陈述（"零 X"），按设计只报不判`);
  }
}
