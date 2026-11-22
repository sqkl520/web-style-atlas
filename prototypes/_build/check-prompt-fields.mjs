#!/usr/bin/env node
/* 字段覆盖率闸门：data.js 里有值的字段，到了提示词里没有？
 *
 * 【为什么需要它 —— 2026-11-21 的实测】
 *
 * `data.js` 的每个方案有 30 个字段，其中 `motion`（动效与交互）**35/35 全部有值**，
 * 而且写得极具体：
 *
 *   S15 "滚动：平面图缩放触发阈值为滚动 200px，缩到 68%，时长 600ms…"
 *   S21 "滚动，释放路径进入视口 20% 时按逻辑顺序逐枚扣接，每枚 70ms，
 *        缓动为 steps(1)（离散到位，模拟锁块落入），不使用淡入…"
 *
 * 而实测用 `buildStylePrompt` 生成 35 份提示词，`motion` 内容进入的案数是 **0/35**。
 * `prompt-copy.js` 全文只在注释里提过它一次（`:523`），没有一行读取它。
 * `audit`（去 AI 味审查点）同样是 35/35 有值、0 进提示词。
 *
 * 为什么几个月没人发现：`prototypes/_build/check-*.mjs` 里提到 `motion` 的
 * 只有 `check-scenes.mjs`，用法是把它当**搜索文本**（用户能不能搜到这个案），
 * 不是"它有没有进提示词"。**没有任何闸门知道这个字段应该到交付物里。**
 *
 * 而产品文案是对外承诺过这些内容的：行卡详情面板把 layout / visuals / motion /
 * audit 都渲染出来给店主看，提示词却只带走了其中一部分 —— 店主看到的是
 * "这个案有动效设计"，拿到手的提示词里一个字都没有。
 *
 * 【判据】
 * 对每个方案、每个非空字段：
 *   · 字段在 SKIP 名单里          → 跳过（这些是有意不进提示词的）
 *   · 字段内容能在提示词里找到切片 → 通过
 *   · 否则                        → FAIL，报出字段名与两边的长度
 *
 * `SKIP` 必须**显式列出**每一个不进提示词的字段，并为每个写一句理由。
 * 这样下一个加字段的人必须做一次有意识的决定，而不是默默漏掉 ——
 * 这正是本次缺陷的成因。
 *
 * 【为什么用切片而不是全文匹配】
 * 提示词会对内容做加工（截断、拼接、加引号），逐字匹配会大量误报。
 * 这里从字段值里取若干 14 字窗口，命中任意一个就算"到了"。
 * 阈值压得很松——这个闸门要抓的是"整个字段消失"，不是"少了一句话"。
 *
 * 用法：
 *   node prototypes/_build/check-prompt-fields.mjs            # 检查
 *   node prototypes/_build/check-prompt-fields.mjs --verbose  # 列出每个字段的匹配情况
 *   node prototypes/_build/check-prompt-fields.mjs --selftest # 变异测试
 */
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(import.meta.url), '../../..');
const VERBOSE = process.argv.includes('--verbose');

/* ── 有意不进提示词的字段 ────────────────────────────────────────────────
 * 每一条都必须写理由。没有理由的一律不许加进来。 */
const SKIP = {
  id: '标识符',
  dir: '目录名，界面用',
  cn: '中文名，作为标题出现在提示词里但没有 14 字连续切片',
  en: '英文名，同上',
  fr: 'F/R 家族分类，界面筛选用',
  structure: '结构类型标签，界面筛选用',
  threshold: '认知门槛，界面筛选用',
  tone: '调性 —— 实际进了提示词（「这个案子的调性是…」），但取的是短句',
  def: '一句话视觉定义 —— 实际进了提示词（plain/签名动作），短句',
  family: '美学家族 —— 实际进了提示词，但会被截断加工',
  fontsSpec: '字体规格 —— 进了提示词但被重写成字体链，不是原文',
  risk: '反 AI 味风险 —— 实际进了提示词（「这一案最容易做成的错误样子」）',
  landing: '落地页文案，界面用',
  scenes: '场景标签数组，界面筛选用',
  quirk: '签名怪癖 —— 实际进了提示词（「这个风格有一处签名怪癖」）',
  copy: '文案素材，界面用',
  copyParts: '文案分段，界面用',
  bg: '底色 —— 进了提示词（「页面底色…用 #X」），但只有 6 位 hex',
  primary: '主色，同上',
  buttonText: '按钮文案，界面用',
  errorCode: '错误码，界面用',
  errorCodeSource: '错误码出处，界面用',
  palette: '色板数组 —— 进了提示词但被格式化，不是原文',
  built: '构建状态，界面用',
  gate: '闸门结果，界面用',
  shots: '截图元数据，界面用',
  axes: '筛选轴，界面用',
  scenesYes: '适用场景 —— 实际进了提示词，但会被加工',
  scenesNo: '不适用场景 —— 实际进了提示词，但会被加工',
  /* ── `audit` 已从这份 SKIP 名单移除（2026-11-22）────────────────────
   *
   * 它在这份名单里待了很久，理由是「原文是负面评审记录，直接拼与『点名即加权』冲突」
   * （详见 _probe/79 §二十二）。2026-11-22 做了两件事，现在它该被正常检查：
   *
   *   ① 35 段逐案改写成正面处方 —— 内部条款编号 35→0、负面措辞 195→0、
   *      字数 11,365 → 6,075（53%）。校验脚本 `_probe/_audit-apply-to-data.mjs`
   *      写入前逐条断言这三项。
   *   ② `prompt-copy.js` 增加读取它的那一段（放在防退化之后，标题写
   *      「这一案自己的做法」）。
   *
   * 所以这里**不需要再写一条 SKIP** —— 它会落到正常检查路径上：
   * 内容必须能在提示词里找到切片，找不到就 FAIL。
   * 这比留一条"已知缺口"的注释强：那种注释只说明"我知道它没进"，
   * 而正常检查会在**下一次它掉出去时**立刻报红。 */
};

/* 明确**应该**进提示词、且必须被这个闸门守住的字段。
 *
 * ⚠️ 第一版把 layout / visuals 放进了这里，跑出 69 条 FAIL，全是误报 ——
 * 它们的**原文**确实没进提示词，但它们的**要点**通过 dna.mechanism 蒸馏后进了：
 *
 *   S29.layout 原文：「基础 10 栏、栏距 18px、外距 56px…左缘留 72px…规格表允许右出血 96px」
 *   S29 机制句    ：「左缘 72px 内 3px 穿孔按 18px 间距排一列…规格表下沉 18px 并右出血 96px」
 *
 * 机制句就是从 layout/visuals 里提炼的施工图。要求原文逐字出现，是把
 * "原文没进"当成"信息没进"，这正是本仓库反复犯的那类错（量了错的信号）。
 *
 * 所以 MUST_FLOW 只留真正必须逐字到场的字段。layout / visuals 改为 GIST_FLOW：
 * 判据是「它的核心数值有没有出现在机制句里」，见下方 gistCovered()。 */
const MUST_FLOW = ['dna'];

/* 这些字段允许被蒸馏，不算缺席。但必须登记，让"它到底进没进"这件事可查。 */
const GIST_FLOW = ['layout', 'visuals'];

function sliceHit(haystack, value) {
  const v = String(value || '');
  if (v.length < 14) return haystack.includes(v);
  /* ⚠️ 步进写错过一次：原来是 `i += Math.max(14, Math.floor(v.length / 6))`，
   * 对 40 字的串步进是 14 → 只看 0、14、28 三个窗口，中间的 20-34 完全看不到。
   * 自测用例（取 20-34 那一段）当场抓出来了。现在固定步进 7 字。
   *
   * ⚠️ 第二处坑：**纯数字窗口会造成假命中。** 实测 S34.motion 的窗口
   * `"0/3/5.5/2/7/4/"` 命中了提示词里的 layout 缩进表 —— 那是另一个字段的内容。
   * 这会让"motion 蒸发"这个结论凭空少算一案（35 → 34）。
   * 所以纯数字/分隔符构成的窗口不算证据：它不携带任何只有这个字段才有的信息。 */
  const informative = (w) => /[一-龥A-Za-z]/.test(w.replace(/\d+(?:\.\d+)?(?:px|fr|mm|%|deg)?/g, ''));
  for (let i = 0; i + 14 <= v.length; i += 7) {
    const w = v.slice(i, i + 14);
    if (informative(w) && haystack.includes(w)) return true;
  }
  return false;
}

/* 蒸馏覆盖率：字段里的**数值**有多少在机制句里出现过。
 *
 * ⚠️ 这个指标只能**报**，不能**判** —— 2026-11-21 第一版拿它当 FAIL，
 * 跑出 67 条"缺陷"，其中大部分是误报。逐个查过 S01 的 layout：
 *
 *   24px   → 机制句有     ← 设计量，该进
 *   1440px / 1439px / 1024 / 768px → 机制句没有   ← **断点值，本来就不该进**
 *   6px    → 机制句没有，但整份提示词里有   ← 进了别处
 *
 * 断点、视口宽度、一次性微调值这些数字，机制句压缩掉是正确的：
 * 提示词另有单独一句讲"移动端单列"。把它们算作"丢失"是量错了信号。
 *
 * 要变成真判据，得先把数值分类（设计量 / 断点 / 一次性微调），
 * 而分类本身需要人判断每个数字的语义。在那之前，这个指标只报告。
 *
 * 这正是本仓库记过的做法：**先做只报不判的版本，看误判率，再决定升级。** */
function gistCovered(fieldValue, mechanism) {
  const nums = String(fieldValue || '').match(/\d+(?:\.\d+)?(?:px|fr|mm|%|deg)?/g) || [];
  /* 只保留"有单位"或 ≥10 的数 —— 单独的 1、2、3 这类序数没有区分度 */
  const meaningful = [...new Set(nums.filter((n) => /[a-z%]/.test(n) || parseFloat(n) >= 10))];
  if (!meaningful.length) return { ratio: 1, kept: 0, total: 0, missing: [] };
  const kept = meaningful.filter((n) => mechanism.includes(n));
  return {
    ratio: kept.length / meaningful.length,
    kept: kept.length,
    total: meaningful.length,
    missing: meaningful.filter((n) => !mechanism.includes(n)),
    /* 断点值单独摘出来，免得每次看报告都要人工过滤 */
    breakpoints: meaningful.filter((n) => /^(1[0-9]{3}|[2-9][0-9]{2})(px)?$/.test(n) && !mechanism.includes(n)),
  };
}

function run({ verbose = VERBOSE } = {}) {
  const win = {};
  new Function('window', readFileSync(join(ROOT, 'prototypes/_selection/data.js'), 'utf8'))(win);
  const P = {};
  new Function('window', readFileSync(join(ROOT, 'prototypes/_selection/prompts.js'), 'utf8'))(P);
  const stubDoc = {
    getElementById: () => null, querySelector: () => null, querySelectorAll: () => [],
    createElement: () => ({ style: {}, setAttribute() {}, appendChild() {}, addEventListener() {} }),
    addEventListener: () => {}, readyState: 'complete', body: { appendChild() {} },
  };
  const g = {
    STYLE_PROMPTS: P.STYLE_PROMPTS, SCHEMES: win.SCHEMES, document: stubDoc,
    location: { href: 'http://x/', search: '', hash: '' },
    localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
    navigator: { clipboard: { writeText: async () => {} } },
    history: { replaceState() {} }, setTimeout, clearTimeout,
  };
  new Function('window', 'document', 'location', 'localStorage', 'navigator', 'history', 'setTimeout', 'clearTimeout',
    readFileSync(join(ROOT, 'prototypes/_selection/prompt-copy.js'), 'utf8'))(g, g.document, g.location, g.localStorage, g.navigator, g.history, setTimeout, clearTimeout);

  const fail = [];
  const unknown = [];
  const known = [];   // SKIP 里标了 "已知缺陷" 的，单独统计
  const gist = [];    // GIST_FLOW 字段的蒸馏覆盖率
  for (const s of win.SCHEMES) {
    const prompt = g.buildStylePrompt(s.id, { biz: '一家修鞋配钥匙的小店', action: '打电话约个时间', have: 5 });
    const mech = (P.STYLE_PROMPTS.schemes.find((x) => x.id === s.id) || {}).dna
      ? P.STYLE_PROMPTS.schemes.find((x) => x.id === s.id).dna.mechanism || '' : '';
    for (const [k, v] of Object.entries(s)) {
      if (v == null || v === '') continue;
      if (typeof v === 'object' && !Array.isArray(v) && k !== 'dna') continue;  // dna 单独处理
      if (Array.isArray(v)) continue;
      if (GIST_FLOW.includes(k)) {
        const g2 = gistCovered(v, mech);
        gist.push({ id: s.id, field: k, ...g2 });
        if (verbose) console.log(`  ~ ${s.id}.${k} 蒸馏覆盖 ${g2.kept}/${g2.total}（${Math.round(g2.ratio * 100)}%），断点值 ${g2.breakpoints.length} 个不计`);
        /* 只报不判 —— 原因见 gistCovered 上方的注释。 */
        continue;
      }
      const reason = SKIP[k];
      if (reason && !reason.startsWith('⚠️')) {
        if (verbose) console.log(`  · ${s.id}.${k} 跳过（${reason}）`);
        continue;
      }
      const hit = sliceHit(prompt, typeof v === 'object' ? JSON.stringify(v) : v);
      if (hit) {
        if (verbose) console.log(`  ✓ ${s.id}.${k}`);
        continue;
      }
      if (reason && reason.startsWith('⚠️')) { known.push({ id: s.id, field: k, reason }); continue; }
      if (reason) continue;
      if (MUST_FLOW.includes(k)) fail.push({ id: s.id, field: k, len: String(v).length });
      else unknown.push({ id: s.id, field: k });
    }
  }
  return { fail, unknown, known, gist };
}

/* ── 自测 ──────────────────────────────────────────────────────────────
 * 变异测试的两个方向都要证明：
 *   ① 字段真的丢了 → 闸门会红
 *   ② 字段真的在   → 闸门不会误报
 * 因为 ROOT 是模块级常量，这里用纯函数层做变异（sliceHit），
 * 再对真实数据断言「motion 现在处于 known 而不是 fail」——
 * 这条会在 motion 修好之后自动变红，提醒把 SKIP 里那行删掉。 */
function selfTest() {
  const S = [];
  const eq = (name, got, want) => S.push([name, JSON.stringify(got) === JSON.stringify(want), got, want]);

  /* sliceHit：短值走全文匹配 */
  eq('sliceHit/短值命中', sliceHit('abc XYZ def', 'XYZ'), true);
  eq('sliceHit/短值不命中', sliceHit('abc def', 'XYZ'), false);
  /* 长值走切片：取中部一段（**必须含文字**，纯数字窗口不算证据）能命中。
   * 注意别取 20-34 —— 那一段是 "x，缩到 68%，时长 60"，去掉数字后只剩 3 个汉字，
   * informative() 判它不够。取 28-42 那段（"，时长 600ms，缓动为阻尼"，有自己的语义）。 */
  const long = '滚动：平面图缩放触发阈值为滚动 200px，缩到 68%，时长 600ms，缓动为阻尼';
  const mid = long.slice(28, 42);
  eq('sliceHit/长值切片命中', sliceHit('前缀 ' + mid + ' 后缀', long), true);
  eq('sliceHit/长值全不命中', sliceHit('完全无关的一段文字，长度足够长了吧', long), false);
  /* ⚠️ 纯数字窗口不能算命中 —— 实测 S34.motion 的 "0/3/5.5/2/7/4/" 撞上了
   * layout 的缩进表，让 motion 蒸发的案数从 35 少算成 34。 */
  const numOnly = '0000000000 0/3/5.5/2/7/4/1% 0000000000';
  eq('sliceHit/纯数字窗口不算命中', sliceHit('0/3/5.5/2/7/4/1%', numOnly), false);
  /* 恒定行为检查：同一个输入不能时真时假 */
  eq('sliceHit/幂等', sliceHit(long, long), sliceHit(long, long));

  const r = run({ verbose: false });
  /* ⚠️ 2026-11-22：`audit` 从"已知缺陷"变成了"已接上"，这条断言跟着反转。
   *
   * 病史：它曾在这张 known 名单里待了很久（35/35 有值、0 进提示词，
   * 原文是负面评审记录不能直接拼）。2026-11-22 逐案改写成正面处方
   * 并在 prompt-copy.js 里加了读取段，之后它必须出现在**正常检查**里。
   *
   * 这条断言的价值在将来：如果哪天 audit 又从提示词里掉出去，
   * 它会重新落进 known，这条会红。 */
  const knownFields = new Set(r.known.map((x) => x.field));
  eq('真实数据/audit 已不再缺席', knownFields.has('audit'), false);
  eq('真实数据/motion 已不再缺席', knownFields.has('motion'), false);
  /* 这两个是必须流动的字段，任何一个报 fail 就是真缺陷 */
  eq('真实数据/MUST_FLOW 字段没有缺席', r.fail.length, 0);
  /* unknown 必须是空 —— 新增字段若不显式处理会落在这里 */
  if (r.unknown.length) {
    console.log('  unknown 字段：', JSON.stringify(r.unknown.slice(0, 5)));
  }
  eq('真实数据/没有未登记的字段', r.unknown.length, 0);

  const bad = S.filter(([, ok]) => !ok);
  for (const [name, ok, got, want] of S) {
    console.log(`  ${ok ? '✓' : '✗'} ${name}`);
    if (!ok) console.log(`      实得 ${JSON.stringify(got)}，期望 ${JSON.stringify(want)}`);
  }
  console.log(`\n自测：${S.length - bad.length}/${S.length} 通过`);
  return bad.length === 0;
}

if (process.argv.includes('--selftest')) {
  console.log('=== 字段覆盖率闸门自测 ===');
  process.exit(selfTest() ? 0 : 1);
}

const { fail, unknown, known, gist } = run();
console.log('字段覆盖率：data.js 的每个字段，到了提示词里没有？\n');
if (known.length) {
  const byField = {};
  for (const k of known) byField[k.field] = (byField[k.field] || 0) + 1;
  for (const [f, n] of Object.entries(byField)) {
    console.log(`  ⚠️ ${f}: ${n} 案有值但没进提示词 —— ${known.find((x) => x.field === f).reason}`);
  }
  console.log('');
}
/* 蒸馏覆盖率：只报不判。原因见 gistCovered 上方注释。 */
if (gist.length) {
  const byField = {};
  for (const k of gist) (byField[k.field] = byField[k.field] || []).push(k);
  for (const [f, arr] of Object.entries(byField)) {
    const ratio = arr.reduce((a, x) => a + x.ratio, 0) / arr.length;
    const bp = arr.reduce((a, x) => a + (x.breakpoints || []).length, 0);
    console.log(`  · ${f}: 机制句保住 ${Math.round(ratio * 100)}% 的数值（只报不判；其中 ${bp} 个是断点值，本就不该进）`);
  }
  console.log('');
}
if (unknown.length) {
  console.log(`  ✗ 未登记的字段（新增字段必须显式处理）：`);
  for (const u of unknown.slice(0, 10)) console.log(`      ${u.id}.${u.field}`);
  console.log('');
}
if (fail.length) {
  console.log(`  ✗ MUST_FLOW 字段缺席：`);
  for (const f of fail) console.log(`      ${f.id}.${f.field}（${f.len} 字）`);
}
console.log(`\n合计 FAIL ${fail.length + unknown.length} / WARN ${known.length ? Object.keys(known.reduce((a, k) => (a[k.field] = 1, a), {})).length : 0}`);
process.exit(fail.length + unknown.length === 0 ? 0 : 1);
