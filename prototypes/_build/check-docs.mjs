// README ↔ 代码 一致性检查：把「文档说了什么」和「代码实际是什么」对上。
//
// 为什么需要它（红队原话）：`check-stale.mjs` 查「渲染产物比源文件旧」，`check-anchors.mjs`
// 查「站内锚点有没有对应 id」，两个都**不覆盖 README 与 data.js 的一致性**。于是 README
// 里「9 个方案」「1100 字左右」「已知未修」这些话可以一路腐化而没有任何闸门会响：
// 它们既不是死链、也不是陈旧产物，它们只是**不再是事实**。
//
// 这份脚本就是补那一环：README 里每一个**能被代码复算**的硬编码数字与方案编号，
// 都拿 data.js / prompts.js / prompt-copy.js 的实测值当场对一遍。
//
// 用法：
//   node prototypes/_build/check-docs.mjs              # 查 README.md
//   node prototypes/_build/check-docs.mjs --quiet      # 只报 ⚠ / ✗
//   node prototypes/_build/check-docs.mjs README-EN.md # 查英文版（双语一致性会退化成单向）
//   node prototypes/_build/check-docs.mjs --selftest   # 自测：证明它真的能查出腐化（见下）
//   node prototypes/_build/check-docs.mjs --root <dir> # 指定文档所在目录（自测用）
//
// 退出码：0 = 无 FAIL；1 = 有 FAIL（可直接接进 CI / 提交前检查）。
//
// ── 它怎么自测（这一节是脚本的一部分，别删）─────────────────────────────
// 判据「能查出真实腐化」不能靠嘴说，要能让下一个人一条命令复现：
//
//   node prototypes/_build/check-docs.mjs --selftest
//
// 它把当前 README 复制到临时目录，**逐条把三处已知腐化改回原位**：
//   腐化 1  已经把「已修，根因记在这里」写回去的那条 → 改回「这是本项目一个已知未修的抽取缺陷」
//   腐化 2  14 案两轴那段 → 改回「9 个方案的机制绑死在自己的数据结构上（S03 S05 … S29）」
//   腐化 3  「1632–1920 字（中位 1822）」 → 改回「1100 字左右」
// 然后对副本跑一遍自己，断言：恰好 nums/prompt-len、status/fixed-claims、nums/warn-axes
// 三条红、regression/banned 也响、退出码 = 1。任一条没响就 exit 1 并指名是哪条腐化漏了。
// 全程不碰真仓库，跑完删临时目录。
//
// ── 自测二：nums/schemes 的六个「总数」用例（2026-10-27 新增，见文件里 2a 的注释）──
// 上面那三条测的是「它会不会响」；这一组测的是**「它在哪里瞎」**。起因是一个实测抓到的
// 真 FAIL：把「30 个可运行原型」改成「三十一个」、把「30 个方案」改成「31 个方案」，
// 本脚本当时仍然 0 FAIL / exit 0 —— 中文数字一个都匹配不上（盲区 A），
// 而上界 `n <= 30` 又把 31 / 40 直接放行（盲区 B）。
// 六个用例，四红两绿，每个都在独立临时目录里跑、都断言 **exit 码 + nums/schemes 那一行**：
//   改坏 1  三十个可运行的原型 → 三十一个        必须 FAIL（中文数字解析）
//   改坏 2  30 个方案 → 31 个方案                必须 FAIL（上界；老逻辑放过的正是这个）
//   改坏 3  30 个方案 → 29 个方案                必须 FAIL（下界，防回退）
//   改坏 4  30 个方案 → 40 个方案                必须 FAIL（上界）
//   误报 1  追加「30 个场景词」「1815 字」        必须**不**报（别的量，不能算方案总数）
//   误报 2  30 个方案 → 三十个方案（中文写 30）  必须**不**报（中文数字写对了也得过）
//   守门员  「全部 12 段字段」→ 13              必须 FAIL（panel/fields；这一条查的是
//           **我这一轮自己新写进 README 的事实**，没有它，新事实就是下一个腐化点）
//
// 为什么用 --selftest 而不是把步骤写在注释里让人手敲：手敲的自测会腐烂——README 一改，
// 注释里的 grep 就找不着目标了。写成断言后，README 变了它会当场告诉我"自测需要跟着更新"
// （exit 2），而不是安静地变成永远绿的假测试。
//
// 实测记录（2026-10-27，本仓库）：
//   · 改前（README 还写着「1100 字左右」「9 个方案」「已知未修」）：当时还没有本脚本
//   · 改后（上面三处修正落地）：0 FAIL / 0 WARN / 12 PASS，exit 0
//   · --selftest：5 FAIL（上面三条 + i18n + banned），exit 0（自测自身通过）
//   · 修完两处盲区后（2026-10-27）：0 FAIL / 0 WARN / 12 PASS，exit 0；
//     --selftest 两组共 9 个用例全绿，六个总数用例的输出见
//     `deliverables/65-exec/EXEC-docs-blindspot.md`。
//   · 顺带修掉一个**检查器自己的口径错**：README-EN 的中文摘要段写
//     「26 个原型机械闸门 FAIL=0」，旧版 GATE_TAIL 只认英文语序（`pass the gate`），
//     于是这句话被读成「总数 26」⇒ 单独跑 `check-docs.mjs README-EN.md` 是 1 FAIL。
//     这正是本次 ② 规则（按小句判语境）要消灭的那类假红。

import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, isAbsolute } from 'node:path';

// 仓库根由脚本自身位置推得（模板 = check-stale.mjs:16；含 Windows 盘符修正与 39 §3-N10 的 decodeURIComponent）。
const REAL_ROOT = decodeURIComponent(new URL('../..', import.meta.url).pathname).replace(/^\/([A-Za-z]:)/, '$1');

const argv = process.argv.slice(2);
const quiet = argv.includes('--quiet');
const rootArg = (() => {
  const i = argv.indexOf('--root');
  return i >= 0 ? argv[i + 1] : null;
})();
// --root 只换"文档从哪读"，数据源永远是真仓库
const DOC_ROOT = rootArg ? (isAbsolute(rootArg) ? rootArg : join(process.cwd(), rootArg)) : REAL_ROOT;
const docName = argv.find((a, i) => !a.startsWith('--') && argv[i - 1] !== '--root') || 'README.md';

/* ── 中文数字解析器（2026-10-27 加，为修 2a 的盲区 A）────────────────────────
 *
 * ⚠️ 它为什么必须声明在这里、而不是跟 2a 的其他代码放在一起：
 * `--selftest` 那个块在文件靠上的位置就 `process.exit()` 了，而它是**普通语句**，
 * 不是函数声明——`const` 有 TDZ。把 `CN_CASES` / `cnToNumber` 放在 2a 旁边，
 * 自测一跑就 `ReferenceError: Cannot access 'CN_DIGITS' before initialization`。
 * 这个文件里"自测块在最前面"是个已经存在的结构，新加的东西得顺着它，
 * 而不是让整份脚本为了一个辅助函数改结构。
 *
 * 覆盖范围：一–九十九 + 「廿」「卅」「卌」+ 一百/两百/一百二十三/两百零一。
 * **不做通用中文数字解析**：解析不出来就返 null 并由调用方放过 ——
 * 宁可漏报一个畸形写法，也不要把「两千零一十七年」猜成方案总数
 * （猜错的红比漏报更贵：下一个人会照着一条错的断言去改文档）。
 */
const CN_DIGITS = { '〇': 0, '零': 0, '一': 1, '二': 2, '两': 2, '三': 3, '四': 4, '五': 5, '六': 6, '七': 7, '八': 8, '九': 9 };

function cnToNumber(s) {
  const t = String(s).replace(/^廿/, '二十').replace(/^卅/, '三十').replace(/^卌/, '四十');
  // ⚠️ 只有**命中数字表**才当场返回（2026-10-27 实测：写成 `if (t.length === 1) return …` 时，
  // 「十」这个单字会走到这里、`CN_DIGITS['十']` 是 undefined ⇒ 返回 null ⇒ 悄悄地放过了。
  // 「十」必须往下走，由十位那条正则按「省略前导一」解析成 10。）
  if (t.length === 1 && Object.prototype.hasOwnProperty.call(CN_DIGITS, t)) return CN_DIGITS[t];
  let m = t.match(/^([一二两三四五六七八九])?十([一二三四五六七八九])?$/);
  if (m) return (m[1] ? CN_DIGITS[m[1]] : 1) * 10 + (m[2] ? CN_DIGITS[m[2]] : 0);
  m = t.match(/^([一二两三四五六七八九])百([零〇]?)([一二三四五六七八九])?$/);
  if (m) return (m[1] ? CN_DIGITS[m[1]] : 1) * 100 + (m[3] ? CN_DIGITS[m[3]] : 0);
  m = t.match(/^([一二两三四五六七八九])百([零〇]?)([一二三四五六七八九])?十([一二三四五六七八九])?$/);
  if (m) return (m[1] ? CN_DIGITS[m[1]] : 1) * 100 + (m[3] ? CN_DIGITS[m[3]] : 0) * 10 + (m[4] ? CN_DIGITS[m[4]] : 0);
  return null;
}

// ── 中文数字解析器的自检表 ────────────────────────────────────────────────
// 为什么要有：`cnToNumber` 是本轮新写的，而"它错了"这件事**不会以任何可见方式表现**——
// 解析失败一律返 null，调用方一律放过。也就是说解析器写错 = 检查器静默瞎掉一大片。
// 2026-10-27 实测就抓到一次：「十」单独一个字曾返回 null（`if (t.length === 1) return …`
// 把「十」挡在了十位正则之前）。"三十"能过、"十"不能过，而 README 里恰好没有裸「十」，
// 所以**没有任何断言会红** —— 这正是"检查器的检查器"必须存在的理由。
//   --selftest 每次跑它；任一条不符合预期就 exit 2（说明解析器回退了）。
const CN_CASES = [
  ['一', 1], ['十', 10], ['十一', 11], ['二十', 20], ['三十', 30], ['三十一', 31],
  ['四十', 40], ['九十九', 99], ['廿', 20], ['卅', 30], ['卌', 40],
  ['一百', 100], ['两百', 200], ['一百二十三', 123], ['两百零一', 201],
  // 必须拒绝的：宁可返 null 放过，也不要把它们猜成方案总数
  ['一二三', null], ['三十一五', null], ['两千零一十七', null], ['abc', null],
];
function cnSelfCheck() {
  return CN_CASES.filter(([s, want]) => cnToNumber(s) !== want)
    .map(([s, want]) => `「${s}」期望 ${want}，实际 ${cnToNumber(s)}`);
}

// ── --selftest：证明"它真的能查出腐化"，而不是只会在干净仓库上返绿 ─────────
// 做法：把当前 README 复制到临时目录，**逐条把已知的三处腐化改回去**，再跑自己一遍，
// 断言恰好是那几条断言红了、退出码是 1。全程不碰真仓库，跑完删临时目录。
// 这样"检查器有没有用"是可复算的，而不是我在 deliverable 里贴一段手敲的输出。
if (argv.includes('--selftest')) {
  // 第 0 步：中文数字解析器自检。它必须排在所有别的自测之前，因为**下面每一条断言都建立在
  // 它之上**：解析器错了，六个 nums/schemes 用例可能全部"通过"（解析失败 ⇒ 放过 ⇒ 0 FAIL），
  // 那是比红更糟的绿。实测抓到过一次：「十」曾返回 null。
  {
    const bad = cnSelfCheck();
    if (bad.length) {
      console.log(`  ✗ 自测失败：中文数字解析器有 ${bad.length} 条不符合预期 ——`);
      for (const b of bad) console.log(`      ${b}`);
      console.log('    解析器错了，下面基于它的用例即使"全绿"也不可信（解析失败会被静默放过）。');
      process.exit(2);
    }
    console.log(`  ✓ 自测零（中文数字解析器）：${CN_CASES.length} 条解析用例全部符合预期（含「十」「廿」「卅」「一百」「两百零一」，以及必须拒绝的「两千零一十七」）`);
  }
  const { mkdtempSync, rmSync, copyFileSync, writeFileSync } = await import('node:fs');
  const { tmpdir } = await import('node:os');
  const { execFileSync } = await import('node:child_process');
  const tmp = mkdtempSync(join(tmpdir(), 'check-docs-selftest-'));
  const srcPath = join(REAL_ROOT, 'README.md');
  let text = readFileSync(srcPath, 'utf8');
  const before = text.length;

  // 三处腐化的"改回去"操作。patch 用 replace，找不到就明确报错（说明 README 又变了、
  // 这个自测需要跟着改，而不是静默跳过变成假绿）。
  // 三处腐化的"改回去"操作。patch 用 replace，找不到就明确报错（说明 README 又变了、
  // 这个自测需要跟着改，而不是静默跳过变成假绿）。
  // 腐化 1 的还原是**整条 bullet 换回原文**（而不是只换半句）：真实腐化就是那样一句话，
  // 只改半句会留下"修法是把分隔符改成必需"这种自相矛盾的残留，测的就不是原来那个缺陷了。
  const c1Start = text.indexOf('- ❌ **选型台曾对三个案子抽少了段');
  const c1End = text.indexOf('- ❌ **题材缺口**');
  if (c1Start < 0 || c1End < 0 || c1End < c1Start) {
    console.log('  ✗ 自测无法布置「腐化 1」：找不到「抽少了段」那条 bullet 的边界。');
    rmSync(tmp, { recursive: true, force: true });
    process.exit(2);
  }
  text = text.slice(0, c1Start)
    + '- ❌ **选型台对三个案子抽少了段**：`S12`/`S15`/`S19` 只展开 9 段。**原因不是规格里没有**——'
    + '这三案的 `_specs/*.md` **L25 都有「5. 布局与网格」**，是 `_build/collect-schemes.mjs:187` '
    + '的抽取对它们失效。**这是本项目一个已知未修的抽取缺陷**，不是规格缺陷。\n'
    + text.slice(c1End);

  const REVERTS = [
    ['腐化 3（实测区间 → 1100 字左右）', /\d{3,5}[–—\-]\d{3,5} 字的一段话（30 案实测：中位 \d{3,5} 字）/, '1100 字左右的一段话'],
  ];
  for (const [label, re, to] of REVERTS) {
    if (!re.test(text)) {
      console.log(`  ✗ 自测无法布置「${label}」：README.md 里找不到目标句式。`);
      console.log('    这条 README 又变了，自测需要跟着更新（否则它会变成永远绿的假测试）。');
      rmSync(tmp, { recursive: true, force: true });
      process.exit(2);
    }
    text = text.replace(re, to);
  }
  // 腐化 2：把 14 案那段改回旧的"9 个方案的机制"
  const bStart = text.indexOf('**它的边界**');
  const bEnd = text.indexOf('旁注站着**选型向导**');
  if (bStart < 0 || bEnd < 0 || bEnd < bStart) {
    console.log('  ✗ 自测无法布置「腐化 2」：找不到「它的边界」到「选型向导」之间的段落。');
    rmSync(tmp, { recursive: true, force: true });
    process.exit(2);
  }
  text = text.slice(0, bStart)
    + '**它的边界**：这是**迁移风格**用的，不是接管你的生意。9 个方案的机制绑死在自己的数据结构上'
    + '（S03 S05 S10 S14 S15 S18 S20 S21 S29），换普通内容会退化——按钮旁边会直接标'
    + '「⚠ 这案机制绑死在行业数据上，换普通内容会退化」，不让你事后才发现。\n\n'
    + text.slice(bEnd);
  writeFileSync(join(tmp, 'README.md'), text, 'utf8');
  copyFileSync(join(REAL_ROOT, 'README-EN.md'), join(tmp, 'README-EN.md'));

  console.log(`自测：把三处已修好的腐化改回原位（${before} → ${text.length} 字节），再跑本脚本\n`);
  let out = '', code = 0;
  try {
    out = execFileSync(process.execPath, [new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'), '--root', tmp],
      { encoding: 'utf8', cwd: REAL_ROOT });
    code = 0;
  } catch (e) {
    out = (e.stdout || '') + (e.stderr || '');
    code = e.status ?? 1;
  }
  console.log(out.trimEnd());

  // 断言：必须 FAIL、退出码 1，且**三处腐化各自都有对应的断言红**
  const mustFail = [
    ['腐化 3 被识别', /nums\/prompt-len[\s\S]*?(1100 字左右|模糊表述)/],
    ['腐化 1 被识别', /status\/fixed-claims/],
    ['腐化 2 被识别', /nums\/warn-axes/],
    ['粗粒回归黑名单也响', /regression\/banned/],
  ];
  let missed = mustFail.filter(([, re]) => !re.test(out)).map(([l]) => l);
  rmSync(tmp, { recursive: true, force: true });

  console.log('');
  if (code !== 1) console.log(`  ✗ 自测失败：改坏的 README 应当 exit 1，实际 exit ${code}`);
  for (const l of missed) console.log(`  ✗ 自测失败：${l} —— 对应断言没响，检查器对这条腐化是瞎的`);
  let part1ok = code === 1 && !missed.length;
  if (part1ok) console.log('  ✓ 自测一（三处已知腐化）：全部被对应断言抓出，退出码 1');

  /* ── 自测二：nums/schemes 的六个「总数」用例（2026-10-27 新增）────────────
   *
   * 【为什么单独立一组】上面那三条腐化测的是「检查器会不会响」，而这一组测的是
   * **「它在哪里瞎」** —— 2026-10-27 独立验证 Agent 实测出一个真 FAIL：
   * 把「三十个可运行的原型」改成「三十一个」、把「30 个方案」改成「31 个方案」，
   * 本脚本当时**仍然 0 FAIL / exit 0**。两个根因（都写在 2a 的注释里）：
   *   盲区 A  `([\d,]{1,4})` 只认阿拉伯数字，中文数字一个都匹配不上；
   *   盲区 B  `if (n <= 30 && …)` 把上界卡在实测值上，31 / 40 直接被放过。
   * 修完之后**必须能把这两个方向都抓住**，否则修法只是把盲区挪了个位置。
   *
   * 六个用例，四红两绿，对应任务书的四改坏 + 两误报：
   *   改坏 1  三十个可运行的原型 → 三十一个          必须 FAIL（测盲区 A + 中文数字解析）
   *   改坏 2  30 个方案 → 31 个方案                  必须 FAIL（测盲区 B 的上界）
   *   改坏 3  30 个方案 → 29 个方案                  必须 FAIL（下界方向，老逻辑本来能抓，防回退）
   *   改坏 4  30 个方案 → 40 个方案                  必须 FAIL（上界方向，老逻辑抓不到的正是这个）
   *   误报 1  追加「30 个场景词」+「1815 字」        必须**不**在 nums/schemes 上报错
   *   误报 2  30 个方案 → 三十个方案（中文写 30）    必须**不**报错（中文数字写对了也得过）
   *
   * 每条都在**独立临时目录**里跑，互不污染；每条都断言 exit 码与 nums/schemes 那一行，
   * 而不是只 grep 关键词 —— 只 grep "FAIL" 会把别的断言红当成自己抓到了（碰巧对）。
   * 变异目标句式找不到时 exit 2（和上面三条腐化一样：README 变了，自测要跟着改）。
   */
  const CASES = [
    {
      label: '改坏 1：三十个可运行的原型 → 三十一个',
      from: '**30 个可运行原型**', to: '**三十一个可运行的原型**',
      wantFail: true, wantMsg: /三十一个.*31|31（原句：三十一个/,
    },
    {
      label: '改坏 2：30 个方案 → 31 个方案',
      from: '**这是一座风格标本库：30 个方案', to: '**这是一座风格标本库：31 个方案',
      wantFail: true, wantMsg: /31（原句：31 个方案）/,
    },
    {
      label: '改坏 3：30 个方案 → 29 个方案',
      from: '**这是一座风格标本库：30 个方案', to: '**这是一座风格标本库：29 个方案',
      wantFail: true, wantMsg: /29（原句：29 个方案）/,
    },
    {
      label: '改坏 4：30 个方案 → 40 个方案',
      from: '**这是一座风格标本库：30 个方案', to: '**这是一座风格标本库：40 个方案',
      wantFail: true, wantMsg: /40（原句：40 个方案）/,
    },
    {
      // 误报测试用**插入**而不是替换：替换会连带打掉 44 个行业词那条事实，
      // i18n/facts 会红，那就分不清红的是 nums/schemes 还是别的断言了。
      label: '误报 1：追加「30 个场景词」「1815 字」（都不是方案总数）',
      append: '\n\n（复算备注：本层另有 30 个场景词，本节合计 1815 字。）\n',
      wantFail: false, wantMsg: /nums\/schemes.*方案\/原型总数 = 30/,
    },
    {
      label: '误报 2：30 个方案 → 三十个方案（中文数字写对了）',
      from: '**这是一座风格标本库：30 个方案', to: '**这是一座风格标本库：三十个方案',
      wantFail: false, wantMsg: /nums\/schemes.*方案\/原型总数 = 30/,
    },
    {
      // 这一条不是任务书点名的，是**本轮我自己新写的 README 事实**的守门员：
      // 我给 panel/fields 加了断言，就得证明那条断言真的会响，否则它只是装饰。
      // 把「12 段字段」改成 13 → panel/fields 必须红（app.js 实测 11+1=12）。
      label: '改坏 5：README「全部 12 段字段」→「全部 13 段字段」',
      from: '与全部 12 段字段。', to: '与全部 13 段字段。',
      wantFail: true, wantMsg: /panel\/fields.*13.*12|12.*段字段.*实测 12/,
      checkCode: 'panel/fields',
    },
  ];

  const baseText = readFileSync(join(REAL_ROOT, 'README.md'), 'utf8');
  const runOne = (docText) => {
    const dir = mkdtempSync(join(tmpdir(), 'check-docs-case-'));
    writeFileSync(join(dir, 'README.md'), docText, 'utf8');
    copyFileSync(join(REAL_ROOT, 'README-EN.md'), join(dir, 'README-EN.md'));
    let o = '', c = 0;
    try {
      o = execFileSync(process.execPath, [new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'), '--root', dir],
        { encoding: 'utf8', cwd: REAL_ROOT });
    } catch (e) {
      o = (e.stdout || '') + (e.stderr || '');
      c = e.status ?? 1;
    }
    rmSync(dir, { recursive: true, force: true });
    return { out: o, code: c };
  };

  console.log('\n自测二：nums/schemes 的六个用例 + 一条 panel/fields 守门员（四改坏 + 两误报 + 一改坏）\n');
  let part2ok = true;
  for (const c of CASES) {
    let doc = baseText;
    if (c.append) doc += c.append;
    else {
      if (!doc.includes(c.from)) {
        console.log(`  ✗ 自测无法布置「${c.label}」：README.md 里找不到 ${JSON.stringify(c.from)}`);
        console.log('    这条 README 又变了，自测需要跟着更新（否则它会变成永远绿的假测试）。');
        process.exit(2);
      }
      doc = doc.replace(c.from, c.to);
    }
    const r = runOne(doc);
    // 每条用例只看它自己那条断言（默认 nums/schemes，改坏 5 看 panel/fields）：
    // 只 grep "FAIL" 会把别的断言红当成自己抓到了 —— 那是"碰巧对"，比漏报更危险。
    const code = c.checkCode || 'nums\\/schemes';
    const reLine = new RegExp(code);
    const line = (r.out.split('\n').find((l) => reLine.test(l)) || `(没有 ${c.checkCode || 'nums/schemes'} 这一行)`).trim();
    const gotFail = r.code === 1 && new RegExp('✗\\s+' + code).test(line) && c.wantMsg.test(line);
    const gotPass = r.code === 0 && new RegExp('✓\\s+' + code).test(line) && c.wantMsg.test(line);
    const ok = c.wantFail ? gotFail : gotPass;
    if (!ok) part2ok = false;
    console.log(`  ${ok ? '✓' : '✗'} ${c.label}`);
    console.log(`      exit=${r.code} 期望=${c.wantFail ? '1（FAIL）' : '0（不报）'}  ${line}`);
  }

  console.log('');
  if (!part2ok) {
    console.log('  ✗ 自测失败：用例里有没通过的（见上面 ✗ 行）。');
    process.exit(1);
  }
  console.log('  ✓ 自测二（七个用例）：四改坏 + 一守门员全部 FAIL、两误报均不报错');
  if (part1ok) {
    console.log('\n  ✓ 自测通过：三处已知腐化 + 七个用例全部符合预期');
    process.exit(0);
  }
  process.exit(1);
}

const results = [];
const pass = (code, msg) => results.push({ lvl: 'PASS', code, msg });
const warn = (code, msg) => results.push({ lvl: 'WARN', code, msg });
const fail = (code, msg) => results.push({ lvl: 'FAIL', code, msg });

// ── 读数据源：都用 vm 装真文件，不复制一份"文档版事实" ─────────────────────
// 用的是和页面同一条装载路径（data.js / prompts.js 都是 `window.X = …`），
// 这样"检查器看到的"与"浏览器看到的"是同一份。
import vm from 'node:vm';

function loadData() {
  const sandbox = { window: {} };
  vm.createContext(sandbox);
  const SEL = join(REAL_ROOT, 'prototypes', '_selection');
  for (const f of ['data.js', 'prompts.js']) {
    vm.runInContext(readFileSync(join(SEL, f), 'utf8'), sandbox, { filename: f });
  }
  return { SCHEMES: sandbox.window.SCHEMES, P: sandbox.window.STYLE_PROMPTS, SEL };
}

// 提示词实测字数要**真的把 prompt-copy.js 跑起来**，不能读 prompts.js 里某个现成字段——
// README 承诺的是「按下去得到」的长度，那只有 buildPrompt() 知道。
function buildPromptLengths(SEL, SCHEMES) {
  const win = {};
  global.window = win;
  global.document = {
    readyState: 'complete',
    addEventListener() {},
    querySelector: () => null,
    querySelectorAll: () => [],
    getElementById: () => null,
    createElement: () => ({ style: {}, setAttribute() {}, appendChild() {}, remove() {}, addEventListener() {} }),
  };
  const sandbox = { window: win };
  vm.createContext(sandbox);
  sandbox.document = global.document;
  vm.runInContext(readFileSync(join(SEL, 'data.js'), 'utf8'), sandbox, { filename: 'data.js' });
  vm.runInContext(readFileSync(join(SEL, 'prompts.js'), 'utf8'), sandbox, { filename: 'prompts.js' });
  vm.runInContext(readFileSync(join(SEL, 'prompt-copy.js'), 'utf8'), sandbox, { filename: 'prompt-copy.js' });
  const build = win.buildStylePrompt;
  if (typeof build !== 'function') return null;
  const lens = SCHEMES.map((s) => ({ id: s.id, n: build(s.id).length })).filter((x) => x.n > 0);
  if (!lens.length) return null;
  const sorted = lens.map((x) => x.n).sort((a, b) => a - b);
  return { min: sorted[0], max: sorted[sorted.length - 1], median: sorted[Math.floor(sorted.length / 2)], all: lens };
}

const { SCHEMES, P, SEL } = loadData();

// ── 实测事实（每一条都能被 PATTERNS 里的断言引用）─────────────────────────
const F = {
  schemes: SCHEMES.length,
  promptSchemes: P.schemes.length,
  gateFailZero: SCHEMES.filter((s) => !s.gate || !(s.gate.fail > 0)).length,
  gateFailTotal: SCHEMES.reduce((a, s) => a + ((s.gate && s.gate.fail) || 0), 0),
  gateFailIds: SCHEMES.filter((s) => s.gate && s.gate.fail > 0).map((s) => s.id),
  hard: P.schemes.filter((s) => s.hard).map((s) => s.id),
  hardIds: P.hardIds || [],
  degrades: P.schemes.filter((s) => s.capacity && s.capacity.degrades === 'yes').map((s) => s.id),
  warn: P.schemes.filter((s) => s.hard || (s.capacity && s.capacity.degrades === 'yes')).map((s) => s.id),
  sceneTerms: Object.keys(P.sceneIndex || {}).length,
  sceneDirect: Object.keys(P.sceneIndex || {}).filter((t) => (P.sceneIndex[t].direct || []).length).length,
  sceneNear: Object.keys(P.sceneIndex || {}).filter((t) => !(P.sceneIndex[t].direct || []).length).length,
  unsupported: (P.unsupported || []).length,
  layoutFilled: SCHEMES.filter((s) => (s.layout || '').trim()).length,
  layoutLens: Object.fromEntries(['S12', 'S15', 'S19'].map((id) => [id, (SCHEMES.find((s) => s.id === id) || {}).layout || ''])),
  // 详情面板的字段数：**从 app.js 的源码里数 field() 调用**，不是硬编码 12。
  // 2026-10-27 加：README 这一轮新写了「全部 12 段字段」「30/30 有值」，而这两句话
  // 在本文件里原来**没有任何断言**——刚补上的事实如果没人查，它就会成为下一个腐化点。
  // 只数 `field('…'` 这种字面量调用；auditFold() 那一段返回的也是 .field，单独 +1。
  // app.js 读不到时返回 null，check 那边退化成 WARN（不静默变绿）。
  //
  // ⚠️ 必须先剥注释再数（2026-10-27 第一次就数错了，12 而不是 11）：app.js 的注释里
  // 引用了 `field('美学家族与参考', r.family)` 作为示例，也引用了 `var AUDIT_CUT_AT = …`
  // 作为"这里曾经有什么"的证据。它们都是文字，不是代码，但字符串匹配分不出来——
  // 于是"12 段"和"AUDIT_CUT_AT 又回来了"两条同时误报。剥离注释是这一组断言成立的前提。
  panel: (() => {
    const p = join(SEL, 'app.js');
    if (!existsSync(p)) return null;
    const raw = readFileSync(p, 'utf8');
    // 只处理行注释与块注释；本项目没有正则字面量里带 `/*` 的写法（有的话这里会多剥一点，
    // 后果是漏数一个 field()，check 会报"段数不符"而不是静默放过 —— 错在安全侧）。
    const js = raw.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    const fieldCalls = (js.match(/\bfield\(\s*'/g) || []).length;
    const hasAuditFold = /\bauditFold\(r\)\s*\+/.test(js);
    // audit 这一段必须在 risk 之前：app.js 里 auditFold(r) + 的行号要小于
    // field('反 AI 味风险与规避' 的行号（任务 3 的代码级判据，UI 上的 top 另测）。
    const aIdx = js.indexOf('auditFold(r) +');
    const rIdx = js.indexOf("field('反 AI 味风险与规避'");
    const auditLens = SCHEMES.map((s) => (s.audit || '').length);
    const auditSorted = [...auditLens].sort((a, b) => a - b);
    return {
      fieldCalls,
      totalFields: fieldCalls + (hasAuditFold ? 1 : 0),
      auditBeforeRisk: aIdx >= 0 && rIdx >= 0 && aIdx < rIdx,
      auditFilled: auditLens.filter((n) => n > 0).length,
      auditMin: auditSorted[0],
      auditMedian: auditSorted[Math.floor(auditSorted.length / 2)],
      auditMax: auditSorted[auditSorted.length - 1],
      auditTotal: auditLens.reduce((a, b) => a + b, 0),
      auditS13: (SCHEMES.find((s) => s.id === 'S13') || {}).audit || '',
      auditCutAtGone: !/var\s+AUDIT_CUT_AT\s*=/.test(js),
    };
  })(),
  // app.js 的详情面板实际渲染 11 段（field() 调用数），用于"字段数"类断言
  promptLens: buildPromptLengths(SEL, SCHEMES),
};

const ids = new Set(SCHEMES.map((s) => s.id));
const FILES = new Set(SCHEMES.flatMap((s) => [s.dir, s.dir.split('-')[0]]));

// ── 读文档 ────────────────────────────────────────────────────────────────
const DOC = join(DOC_ROOT, docName);
if (!existsSync(DOC)) {
  console.log(`  ✗ 找不到文档：${docName}（--root ${DOC_ROOT}）`);
  process.exit(2);
}
const src = readFileSync(DOC, 'utf8');
const L = src.split('\n');

// 数字文本 → Number。"1,617" / " 1 617 " 都要能读；这是本脚本唯一允许的宽松处。
const num = (s) => Number(String(s).replace(/[,\s　]/g, ''));

// 取「某个词之前最近的那个数字」，用来读"30 个方案""26 个闸门 FAIL=0"这类句式。
// 只在一行里找，且要求数字与量词相邻（中间最多两个非数字字符），避免把页面上的
// 无关数字（1440 宽、49.86%、第 3 行）当成断言。
function numBefore(re, line) {
  const m = line.match(re);
  return m ? num(m[1]) : null;
}

// ── 1. 方案编号是否存在 ───────────────────────────────────────────────────
{
  const bad = [];
  for (const m of src.matchAll(/\bS(\d{2})\b/g)) {
    const id = 'S' + m[1];
    if (!ids.has(id)) bad.push(id);
  }
  const uniq = [...new Set(bad)];
  // 文档里合法出现的非方案编号：S01–S30 之外不该有。模板是 M01 不是 S，故这里没有豁免。
  if (uniq.length) fail('ids/exist', `文档里有 ${uniq.length} 个不存在的方案编号：${uniq.join(' ')}（data.js 只有 S01–S30）`);
  else pass('ids/exist', `文档提到的方案编号全部存在（data.js ${F.schemes} 案）`);
}

// ── 2. 硬编码数字 vs 实测值 ───────────────────────────────────────────────
// 2a 方案总数 / 原型总数
//
// 【2026-10-27 修两处盲区 —— 独立验证 Agent 实测抓出，不是推演】
// 盲区 A（中文数字抓不到）：判总数的正则原来是 `([\d,]{1,4})`，**只认阿拉伯数字**。
//   而本仓库 README 是中文写作，「三十一个可运行原型」「三十个方案」这类写法一个都匹配不上。
//   实测复现：把「30 个可运行原型」改成「三十一个」、把「30 个方案」改成「31 个方案」，
//   旧版检查器仍然 **0 FAIL / exit 0** —— 一条都在喊，等于没查。
// 盲区 B（上界 30 把 31 排除）：旧逻辑是 `if (n <= 30 && n !== F.schemes …)`，注释理由是
//   「> 30 的多半是别的量（字数、字节）」。但 31 / 29 / 40 恰恰是**最可能出现的错写**
//   （把 30 写错成相邻数），上界卡在 30 等于宣告「只抓小于 30 的错值」。
//   现在上界放到 200，而「这是别的量」改用**上下文**判（下面 ① ② ③ 三条 skip 规则），
//   不再用「大于 30 就跳过」这种一刀切 —— 一刀切的问题不是它漏了 31，
//   而是它把「判断」换成了「一个恰好够用的魔数」，下一个人改数据规模时无从判断该不该跟着改。
//
// 三条 skip 规则，每条都配一个实测到的真实句子（不是想象中的反例）：
//   ① 冠词歧义：`一个方案` 是 "a scheme"，不是总数。README 实测 6 处会被误伤
//      （「选中一个方案」「一个原型」×4「一个能直接打开的 HTML 原型」）。
//      **只有中文的「一 / 两」**按冠词放过；阿拉伯数字 `1 个方案` 仍然是断言 —— 中文里
//      「一个」既可以是冠词也可以是计数，`1 个` 却只可能是计数。
//   ② 同一小句讲的是别的轴：`模板` `template` `场景` `行业词` `警告` `hard` `degrade(s)`
//      等词一出现，这个数字多半在讲那一轴（「3 个模板」「18 案带警告」「hard 4 案」
//      「18 schemes use no shadow」「13 schemes lay their units out by hand」）。
//      小句边界取 `，。；|` 与换行 —— 实测 README L16 是「30 个方案各配一个能直接打开的
//      HTML 原型，外加 3 个拿来就用的模板」：`模板` 在逗号**之后**，若按整行判，
//      这句真总数会被自己的后半句毒死（假阴性：改坏了也不报）。
//   ③ 紧随其后的是别的量词：`字` `KB` `px` `条` `模板` `行业词` `场景词`。`1815 字` `26 条`
//      跟在数字后面时这个数字不是方案数（实测提示词长度 1632–1920 字，若不放过会被读成总数）。
//
// 中文数字解析器（`cnToNumber` / `CN_DIGITS` / `CN_CASES`）声明在本文件靠上的位置，
// 因为 `--selftest` 块需要它们、而那个块是普通语句（`const` 有 TDZ）。原因写在那边。

// 文档里的数字文本 → Number（阿拉伯或中文）。cnToNumber 只吃纯中文数字串，混写（「3 十」）返 null。
function readNum(raw) {
  return /^\d/.test(raw) ? num(raw) : cnToNumber(raw);
}

{
  const bad = [];
  // 单位清单。两条负向断言都是**踩过**的：
  //   `个方案(?!的)`：`9 个方案的机制绑死…` 说的是"9 个方案的机制"，不是"9 个方案"。
  //     它曾把一句关于 hard 的话误读成总数断言，而且恰好与另一处真腐化同向 ——
  //     属于"碰巧对"，而碰巧对的检查器比漏报更危险：下一个人看到它红了会去改错地方。
  //   `个案(?!子)`：`三个案子抽少了段` 是子集陈述（30 案里的 3 案），不是总数。
  const NUM = '(\\d[\\d,]{0,5}|[〇零一二两三四五六七八九十百廿卅卌]{1,6})';
  const UNIT = '(?:个设计方案|个可运行的原型|个可运行原型|个方案(?!的)|个案(?!子)|个原型'
    + '|design\\s+schemes?|runnable\\s+prototypes?|schemes?|prototypes?)';
  const re = new RegExp(NUM + '\\s*' + UNIT, 'g');

  // ③ 紧随其后的别的量词
  const OTHER_MEASURE = /^\s*(?:字|字节|KB|MB|GB|px|条|模板|行业词|场景词|场景|个模板|个行业词|个场景词|个场景)/i;
  // 子集陈述的标志词：`四个案另有私有字体`（30 案里的 4 案）
  const SUBSET_TAIL = /^\s*(?:另有|各自|分别|其中)/;
  // ① 冠词
  const ARTICLE = /^[一两]$/;
  // ② 别的轴。左半边是任务里点名的词，右半边是**实测中英两版各自会假红的几种句式**，
  //    每一组都能指回一句真实文档（见上面注释）：
  //      同质/homogen → EN L351「12 schemes (40%) form a single connected block」
  //      轴/axis      → EN L354「only 2 schemes are "very quiet"」
  //      参数/parameter → EN L461「the other 18 schemes have no parameter file」
  //      机制/mechanism → EN L105「4 schemes have a mechanism bolted to a specific subject」
  //      阴影/shadow   → EN L84「18 schemes use no shadow」
  const OTHER_AXIS = /模板|template|场景|行业词|警告|hard|degrade|退化|机制|mechanism|阴影|shadow|同质|homogen|轴|axis|参数|parameter|锚点|anchor/i;
  // "26 prototypes pass the gate with FAIL = 0" 里的 26 是**达标数**，不是总数：
  // 同一行后面跟 pass / 达标 / at FAIL 的，交给 nums/gate 判，这里必须放过。
  // ⚠️ `闸门` / `FAIL` 也必须放进来（2026-10-27 实测）：README-EN 的中文摘要段写
  // 「26 个原型机械闸门 FAIL=0」—— 中文语序是「数字 + 机械闸门 FAIL=0」，
  // 而英文语序是「数字 + prototypes + pass the gate」。只按英文语序写 GATE_TAIL，
  // 这句话会被判成「总数写错 26」，是**检查器自己的口径错**（同 README-EN 上一版
  // 把 18 schemes 等 11 处子集陈述全判红，见 ① ② ③ 三条 skip 规则的注释）。
  const GATE_TAIL = /^\s*(?:pass|passed|passes|passing|达标|at\s+FAIL|机械闸门|闸门|FAIL)/i;

  // 小句 = 同一行里被 `，。；|` 切开的一段。只在**含这个数字的那一小句**里找语境词，
  // 否则「30 个方案…，外加 3 个模板」这种真总数会被后半句毒死。
  const clauseOf = (line, at) =>
    line.slice(0, at).split(/[，。；|]/).pop() + line.slice(at).split(/[，。；|]/)[0];

  for (const line of L) {
    for (const m of line.matchAll(re)) {
      const raw = m[1];
      const n = readNum(raw);
      const tail = line.slice(m.index + m[0].length, m.index + m[0].length + 40);
      if (GATE_TAIL.test(tail)) continue;
      if (n === null) continue;                 // 中文数字解析不出来：放过，不猜
      if (!(n > 0 && n <= 200)) continue;       // 字数（1632–1920）、字节数在这里被挡掉
      if (ARTICLE.test(raw)) continue;          // ①
      if (OTHER_MEASURE.test(tail)) continue;   // ③
      if (SUBSET_TAIL.test(tail)) continue;     // 子集陈述
      if (OTHER_AXIS.test(clauseOf(line, m.index))) continue; // ②
      if (n !== F.schemes) bad.push(`${n}（原句：${m[0]}）`);
    }
  }
  if (bad.length) fail('nums/schemes', `方案/原型总数与实测 ${F.schemes} 不符：${[...new Set(bad)].join('；')}`);
  else pass('nums/schemes', `方案/原型总数 = ${F.schemes}，文档未出现别的总数`);
}

// 2b 闸门达标数
{
  const bad = [];
  for (const line of L) {
    for (const m of line.matchAll(/([\d]{1,3})\s*(?:个闸门 FAIL=0|pass(?:es)? the gate with FAIL\s*=?\s*0|案 FAIL=0)/gi)) {
      const n = num(m[1]);
      if (n !== F.gateFailZero) bad.push(`${n}（原句：${m[0]}）`);
    }
    for (const m of line.matchAll(/FAIL\s*=\s*0[^\n]{0,20}?([\d]{1,3})\s*(?:案|schemes)/gi)) {
      const n = num(m[1]);
      if (n !== F.gateFailZero) bad.push(`${n}（FAIL=0 之后的案数）`);
    }
  }
  if (bad.length) fail('nums/gate', `达标案数与实测 ${F.gateFailZero} 不符：${[...new Set(bad)].join('；')}（实测 FAIL 总数 ${F.gateFailTotal}，落在 ${F.gateFailIds.join(' ')}）`);
  else pass('nums/gate', `闸门 FAIL=0 的案数 = ${F.gateFailZero}，与实测一致`);
}

// 2c hard / degrades / 警告并集，三个数都要对得上，且名单本身也要对
{
  const problems = [];
  for (const line of L) {
    // "N 个方案…（S…）" 这类：只在提到 hard 语义时判
    const hardCtx = /hard|题材绑|绑在特定题材|bolted to a specific subject|机制绑/i.test(line);
    const cnt = line.match(/([\d]{1,3})\s*(?:个)?\s*(?:方案的机制|schemes? have mechanisms|案(?:的机制)?)/i);
    if (hardCtx && cnt) {
      const n = num(cnt[1]);
      // 该行可能同时讲 degrades，用行内出现的编号集合判断它到底在说哪一轴
      const listed = [...line.matchAll(/\bS(\d{2})\b/g)].map((m) => 'S' + m[1]);
      const isDegList = listed.length && listed.every((x) => F.degrades.includes(x));
      const isHardList = listed.length && listed.every((x) => F.hard.includes(x));
      const isUnion = listed.length && listed.every((x) => F.warn.includes(x));
      const expect = isHardList && !isDegList ? F.hard.length
        : isDegList && !isHardList ? F.degrades.length
        : isUnion ? F.warn.length : null;
      if (expect !== null && n !== expect) {
        problems.push(`这行写 ${n}，实测 ${expect}（${m0(listed)}）`);
      }
    }
  }
  function m0(a) { return a.slice(0, 4).join(' ') + (a.length > 4 ? ' …' : ''); }

  // 独立于句式：只要文档里出现了 hardIds 的旧名单（9 个），就必须 FAIL
  const stale = ['S03', 'S05', 'S10', 'S14', 'S20'];
  const staleLine = L.find((l) => /hard|机制绑|mechanisms/i.test(l) && stale.filter((x) => l.includes(x)).length >= 3);
  if (staleLine) problems.push(`出现了 hard 旧名单的成分（S03/S05/S10/S14/S20 里至少 3 个）：${staleLine.trim().slice(0, 90)}`);

  if (problems.length) fail('nums/warn-axes', `警告口径与实测不符：${[...new Set(problems)].join('；')}（实测 hard=${F.hard.length}［${F.hard.join(' ')}］，degrades=${F.degrades.length}，并集=${F.warn.length}）`);
  else pass('nums/warn-axes', `警告两轴：hard ${F.hard.length} / degrades ${F.degrades.length} / 并集 ${F.warn.length}，文档口径一致`);
}

// 2d 提示词字数区间
//
// 判据分三档，**不要求逐字相等**：`prompt-copy.js` 是活文件（本轮就有别的 Agent 在改它，
// 实测在我写这几条断言的过程中它长了 15 个字符，min/max 从 1617/1905 漂到 1632/1920），
// 所以"文档写的区间"与"此刻实测的区间"允许小幅漂移：
//   精确相等            → PASS
//   偏差 ≤ DRIFT（3%）  → WARN（该更新了，但不算错，也没有人会被误导）
//   偏差 > DRIFT        → FAIL（这就是腐化：1100 字 vs 1807 字是 39% 的偏差）
// 这条容差不是放水，而是把"文档该不该改"与"文档有没有说谎"分开：
// 15 个字的漂移不该红，一句差 700 字的话必须红。
const DRIFT = 0.03;
{
  const bad = [], drifted = [];
  const lens = F.promptLens;
  const near = (doc, actual) => actual > 0 && Math.abs(doc - actual) / actual <= DRIFT;
  const judge = (docVal, actual, label) => {
    if (!lens) return;
    if (docVal === actual) return;
    if (near(docVal, actual)) drifted.push(`${label} 写 ${docVal}，此刻实测 ${actual}`);
    else bad.push(`${label} 写 ${docVal}，实测 ${actual}`);
  };

  for (const line of L) {
    // "约 N 字" / "roughly N characters" —— 模糊表述本身可以，但数值必须落在区间内
    for (const m of line.matchAll(/(?:约|大约|roughly|about|approximately)\s*([\d,]{3,6})\s*(?:字|characters)/gi)) {
      const n = num(m[1]);
      if (!lens) { bad.push('无法实测提示词长度'); break; }
      if (n < lens.min || n > lens.max) bad.push(`「${m[0]}」不在实测区间 ${lens.min}–${lens.max} 内`);
    }
    // "N 字左右" 这种不带上限的写法一律挡：README 承诺的是区间，不是"s左右"。
    // （这条曾经就是腐化的本体：实测 0/30 落在 1100±10%。）
    for (const m of line.matchAll(/([\d,]{3,6})\s*字左右/g)) bad.push(`「${m[0]}」是模糊表述`);

    // 文档写了区间：两端分别判
    for (const m of line.matchAll(/([\d,]{3,6})\s*[–—\-~至]\s*([\d,]{3,6})\s*字/g)) {
      if (!lens) { bad.push('无法实测提示词长度'); break; }
      judge(num(m[1]), lens.min, '区间下限');
      judge(num(m[2]), lens.max, '区间上限');
    }
    for (const m of line.matchAll(/([\d,]{3,6})\s*(?:–|—|-|to)\s*([\d,]{3,6})\s*characters/gi)) {
      if (!lens) { bad.push('无法实测提示词长度'); break; }
      judge(num(m[1]), lens.min, 'range lower bound');
      judge(num(m[2]), lens.max, 'range upper bound');
    }
    // 中位数（两种语言）。必须**紧跟 字 / characters** 才算提示词长度断言：
    // 否则 "layout 长度 … 中位 413" 这类别的指标会被误读成提示词中位数（实测踩过）。
    for (const m of line.matchAll(/(?:中位|median)\s*([\d,]{3,6})\s*(?:字|characters)/gi)) {
      judge(num(m[1]), lens.median, '中位');
    }
  }
  if (!lens) bad.push('buildStylePrompt 没跑起来（prompt-copy.js 装载失败）');

  const measured = lens ? `（实测 min ${lens.min} / median ${lens.median} / max ${lens.max}）` : '';
  if (bad.length) fail('nums/prompt-len', `提示词长度断言不成立：${[...new Set(bad)].join('；')}${measured}`);
  else if (drifted.length) warn('nums/prompt-len', `提示词长度小幅漂移，建议更新（容差 ${DRIFT * 100}%）：${[...new Set(drifted)].join('；')}${measured}`);
  else pass('nums/prompt-len', `提示词长度 = ${lens ? `${lens.min}–${lens.max}，中位 ${lens.median}` : '未实测'}，文档一致`);
}

// 2e 场景词 44 / 16 / 28 / 29
{
  const problems = [];
  const want = [
    [/\b(4[0-9])\s*(?:个行业词|个场景词|trade terms)/, F.sceneTerms, '行业词总数'],
    [/([\d]{1,3})\s*个有直连方案/, F.sceneDirect, '有直连的词数'],
    [/([\d]{1,3})\s*个只有近似/, F.sceneNear, '只有近似的词数'],
    [/([\d]{1,3})\s*个如实标为/, F.unsupported, '标为「没有」的词数'],
    [/([\d]{1,3})\s*have direct matches/, F.sceneDirect, '有直连的词数'],
    [/([\d]{1,3})\s*approximate only/, F.sceneNear, '只有近似的词数'],
    [/([\d]{1,3})\s*are honestly labelled/, F.unsupported, '标为「没有」的词数'],
  ];
  for (const line of L) {
    for (const [re, actual, label] of want) {
      for (const m of line.matchAll(new RegExp(re.source, 'g'))) {
        const n = num(m[1]);
        if (n !== actual) problems.push(`${label} 写 ${n}，实测 ${actual}`);
      }
    }
  }
  if (problems.length) fail('nums/scenes', `场景词数字不符：${[...new Set(problems)].join('；')}（实测 ${F.sceneTerms} / 直连 ${F.sceneDirect} / 近似 ${F.sceneNear} / 无 ${F.unsupported}）`);
  else pass('nums/scenes', `场景词 ${F.sceneTerms} / 直连 ${F.sceneDirect} / 近似 ${F.sceneNear} / 标为没有 ${F.unsupported}，文档一致`);
}

// 2f 「已知未修 / known, unfixed」这类状态断言：已经修掉的东西不许还挂着未修牌子
{
  const fixedKeywords = ['layout', '布局与网格', '布局', 'extraction', '抽取'];
  const hits = [];
  L.forEach((line, i) => {
    if (!/已知未修|已知未修复|known,? unfixed|still unfixed|未被修复/i.test(line)) return;
    // 只有"同一行/邻行讲的就是这几件已修的事"才算腐化；其它未修项允许存在
    const near = [line, L[i + 1] || '', L[i - 1] || ''].join(' ');
    if (fixedKeywords.some((k) => near.includes(k))) hits.push(`${i + 1}: ${line.trim().slice(0, 80)}`);
  });
  if (hits.length) fail('status/fixed-claims', `已修的事项仍被写成「未修」：${hits.join(' | ')}`);
  else pass('status/fixed-claims', '没有把已修项写成未修');
}

// 2g layout 抽取缺陷的三案必须仍是有值的（防止有人把"已修"写上去、代码却回退了）
{
  const empty = Object.entries(F.layoutLens).filter(([, v]) => !String(v).trim()).map(([k]) => k);
  if (empty.length) fail('status/layout-fix', `文档称已修，但 ${empty.join(' ')} 的 layout 仍为空（抽取回退了）`);
  else if (F.layoutFilled !== F.schemes) fail('status/layout-fix', `layout 只有 ${F.layoutFilled}/${F.schemes} 案有值`);
  else pass('status/layout-fix', `layout 抽取 30/30 有值，S12/S15/S19 = ${['S12', 'S15', 'S19'].map((k) => F.layoutLens[k].length).join('/')} 字`);
}

// ── 2h 详情面板：字段数 / 「去 AI 味审查点」的 30/30 / 它与 risk 的先后 ────────
// 2026-10-27 新增。为什么这一组必须存在：这一轮 README 里新写了三句**能被复算的话**——
//   「全部 12 段字段」「「去 AI 味审查点」30/30 有值（最短 276 / 最长 444 / 合计 10,065 /
//   中位 324）」「它排在「反 AI 味风险与规避」之前」。
// 而在加这一组之前，这三句话在本文件里**一条断言都没有**：它们是我亲手补上去的事实，
// 却没有任何机制在它们过期时喊一声 —— 那正是这份脚本第 1 行说要消灭的那种腐化。
// 所以连同 README 一起把判据写进来：文档说 12 段，就去数 app.js 里真的有几个 field()；
// 文档说 30/30 有值，就去 data.js 里真的数一遍；文档说 audit 在 risk 之前，
// 就在 app.js 源码里比那两个调用的**行号**（UI 上的 top 另由 CDP 实测，见
// deliverables/65-exec/EXEC-docs-blindspot.md —— 代码顺序对、样式又把它挪下去，是另一种病）。
{
  const P2 = F.panel;
  if (!P2) {
    warn('panel/fields', '读不到 prototypes/_selection/app.js，字段数与顺序未核对');
  } else {
    const bad = [];
    // ① README 声称渲染 12 段 —— 拿 app.js 的 field() 调用数 + auditFold 的那一段复算
    const docFieldCount = (() => {
      const m = src.match(/(?:全部\s*(\d{1,2})\s*段字段|all\s+(\d{1,2})\s+fields)/i);
      return m ? Number(m[1] || m[2]) : null;
    })();
    if (docFieldCount === null) bad.push('README 里找不到「全部 N 段字段 / all N fields」这句');
    else if (docFieldCount !== P2.totalFields) bad.push(`README 写 ${docFieldCount} 段字段，app.js 实测 ${P2.totalFields} 段（field() ${P2.fieldCalls} + auditFold 1）`);

    // ② 「去 AI 味审查点」30/30 有值，且 README 引的四个数要等于实测
    if (P2.auditFilled !== F.schemes) bad.push(`audit 只有 ${P2.auditFilled}/${F.schemes} 案有值`);
    const wants = [
      [/(?:最短|shortest)\s*([\d,]{2,5})\s*字?/, P2.auditMin, '最短'],
      [/(?:最长|longest)\s*([\d,]{2,5})\s*字?/, P2.auditMax, '最长'],
      [/(?:中位|median)[数]?\s*([\d,]{2,5})/, P2.auditMedian, '中位'],
      // ⚠️ 中英的语序相反：中文写「合计 10,065 字」，英文写「10,065 in total」。
      // 只写前一种，单独跑 `check-docs.mjs README-EN.md` 会报
      // 「audit 合计 写 324，实测 10065」—— 正则先撞上了「median 324」后面那个数。
      // 这是检查器自己的口径错，不是文档错（同 2a 的 GATE_TAIL 那次）。
      [/(?:合计|total)[^\d]{0,12}([\d,]{3,7})|([\d,]{3,7})\s*(?:字，?)?in total/i, P2.auditTotal, '合计'],
    ];
    for (const [re, actual, label] of wants) {
      const m = src.match(re);
      if (!m) { bad.push(`README 里找不到 audit 的${label}值`); continue; }
      const n = num(m[1] || m[2]);
      if (n !== actual) bad.push(`audit ${label} 写 ${n}，实测 ${actual}`);
    }

    // ③ 顺序：源码级
    if (!P2.auditBeforeRisk) bad.push('app.js 里 auditFold(r) 不在 field(\'反 AI 味风险与规避\') 之前');

    // ④ AUDIT_CUT_AT 不许回来：它一旦回来，说明又有人在 UI 层切数据
    if (!P2.auditCutAtGone) bad.push('app.js 里又出现了 `var AUDIT_CUT_AT = …`（UI 层切数据的补丁回来了，该去 collect-schemes.mjs 修）');

    // ⑤ S13 的 audit 不许再含评审工件标记
    if (P2.auditS13.includes('反套路改造三指标')) bad.push('S13 的 audit 又混进了「反套路改造三指标」（数据层回退了）');

    if (bad.length) fail('panel/fields', `详情面板口径不符：${bad.join('；')}`);
    else pass('panel/fields', `${P2.totalFields} 段字段（field() ${P2.fieldCalls} + auditFold 1），audit 30/30 有值（${P2.auditMin}–${P2.auditMax}，中位 ${P2.auditMedian}，合计 ${P2.auditTotal}），顺序 audit → risk，S13 = ${P2.auditS13.length} 字且无评审工件`);
  }
}

// ── 3. 中英双语同一事实是否一致 ───────────────────────────────────────────
{
  const enPath = join(REAL_ROOT, 'README-EN.md');
  if (docName !== 'README.md' || !existsSync(enPath)) {
    warn('i18n/pair', `未做双语比对（当前文档 ${docName}）`);
  } else {
    const en = readFileSync(enPath, 'utf8');
    const diffs = [];
    // 只比对"同一事实"的少数几个数，不做全文对齐（两份文件结构本就不同）
    // ⚠️ 中文侧也必须**认中文数字**（2026-10-27 修，和 2a 的盲区 A 同一个病）：
    //    这里原来是 `([\d,]{1,4})\s*个设计方案`，如果哪天中文版写成「三十个设计方案」，
    //    正则不匹配 ⇒ 报「方案数：中文缺」—— 明明写了，检查器说它缺。
    //    假警报比漏报更贵：它会教下一个人去怀疑一句正确的话。
    const zhNum = '(\\d[\\d,]{0,5}|[〇零一二两三四五六七八九十百廿卅卌]{1,6})';
    const pairs = [
      [new RegExp(zhNum + '\\s*个设计方案'), /(\d[\d,]{0,5})\s*design schemes/i, '方案数'],
      [new RegExp(zhNum + '\\s*个闸门 FAIL=0'), /(\d[\d,]{0,5})\s*pass the gate with FAIL/i, '达标数'],
      [new RegExp(zhNum + '\\s*个行业词'), /(\d[\d,]{0,5})\s*trade terms/i, '行业词数'],
    ];
    for (const [zhRe, enRe, label] of pairs) {
      const zh = src.match(zhRe), enm = en.match(enRe);
      if (!zh || !enm) { diffs.push(`${label}：${!zh ? '中文缺' : '英文缺'}`); continue; }
      // 英文侧永远是阿拉伯数字；中文侧可能是「三十」。用 readNum 统一读，读不出来就报「读不懂」
      // 而不是拿 NaN 去比 —— NaN !== NaN 会让这条断言永远红，且红得没有信息量。
      const a = readNum(zh[1]), b = num(enm[1]);
      if (a === null) { diffs.push(`${label}：中文写「${zh[1]}」，读不成数字`); continue; }
      if (a !== b) diffs.push(`${label}：中 ${a} vs 英 ${b}`);
    }
    // 提示词区间：两份都要落在实测区间且互相一致
    // ⚠️ 中英用的破折号不同（中文 –，英文 – 或 ASCII -），分隔符必须分开写；
    //    而且必须 **先剥掉千分位逗号** 再转数字 —— `Number('1,617')` 是 NaN，
    //    实测这一条一开始就把英文版判成 "NaN–NaN"（检查器自己说谎，比漏报更糟）。
    const zhRange = src.match(/([\d,]{3,6})\s*[–—\-~至]\s*([\d,]{3,6})\s*字/);
    const enRange = en.match(/([\d,]{3,6})\s*(?:–|—|-|to)\s*([\d,]{3,6})\s*characters/i);
    if (zhRange && enRange) {
      const z = [num(zhRange[1]), num(zhRange[2])], e = [num(enRange[1]), num(enRange[2])];
      if (z[0] !== e[0] || z[1] !== e[1]) diffs.push(`提示词区间：中 ${z.join('–')} vs 英 ${e.join('–')}`);
    } else if (!!zhRange !== !!enRange) diffs.push('提示词区间：只有一份写了区间');

    // 警告并集的口径：两边都必须写 14 这一档（写成 9 就是旧事实）
    const zh14 = /14\s*案/.test(src), en14 = /14 of the 30|14 schemes|\b14\b/.test(en);
    if (zh14 !== en14) diffs.push(`警告并集：中文${zh14 ? '写' : '没写'} 14，英文${en14 ? '写' : '没写'} 14`);

    if (diffs.length) fail('i18n/facts', `README 与 README-EN 的同一事实不一致：${diffs.join('；')}`);
    else pass('i18n/facts', '中英两版的关键事实一致（方案数 / 达标数 / 行业词数 / 提示词区间 / 警告并集）');
  }
}

// ── 4. 文档里提到的文件路径是否存在 ───────────────────────────────────────
{
  // 只查"以已知目录开头"的路径：`_specs/`、`templates/M01` 这类相对写法在文中是按
  // 「当前讲的是哪一层」省略前缀的（README 讲选型台时省略 `prototypes/`），
  // 强行按仓库根解析会把 20 多条合法引用判成缺失——那是检查器自己的口径错。
  // 所以：**带完整前缀的才查**，并对已知的省略前缀提供白名单式补齐。
  const PREFIXES = ['prototypes/', 'templates/', 'deliverables/', 'tools/', 'index.html', 'LICENSE'];
  // 占位符（Sxx / S* / <name>）不是路径，是"这一族文件"的写法。把它们判成缺失
  // 是纯口径错：实测 `prototypes/_specs/Sxx.md` 指着 30 份真实存在的规格。
  const PLACEHOLDER = /[⁇]|\bS[xX*]{2}\b|\bS\*|\bx{2,}\b|\bM0x\b/i;
  const SKIP = /[…*<>{}|⁇]|^https?:|^#|^mailto:/;
  const cands = new Set();
  for (const m of src.matchAll(/`([^`\n]{3,90})`/g)) cands.add(m[1].trim());
  for (const m of src.matchAll(/\]\(([^)\s]+)\)/g)) cands.add(m[1].trim());

  const missing = [], checked = [];
  for (const v0 of cands) {
    if (SKIP.test(v0) || PLACEHOLDER.test(v0)) continue;
    // 去掉 `:187` 这种行号后缀（本项目已明令：行号是可腐坏的引用，不许进文档；
    // 但历史段落里承认过它，所以这里剥掉再查，而不是直接判缺失）
    const v = v0.replace(/:\d+(-\d+)?$/, '').replace(/[）)]+$/, '').trim();
    if (!v) continue;
    if (!PREFIXES.some((p) => v === p || v.startsWith(p))) continue;
    if (/\/$/.test(v)) continue;                    // 目录以 / 结尾，另判
    const target = join(REAL_ROOT, v);
    checked.push(v);
    if (!existsSync(target)) {
      const base = v.split('/').slice(-1)[0];
      // ① 目录名的合法缩写：`templates/M01` → `templates/M01-clean-corporate/`
      //    这是文档里真实使用的写法（只写编号就够定位了）。它**不是缺失**，
      //    所以算"已存在"而不是 WARN —— 一条永远亮着的 WARN 等于没有 WARN。
      const parent = v.includes('/') ? join(REAL_ROOT, v.slice(0, v.lastIndexOf('/'))) : REAL_ROOT;
      const leaf = v.split('/').slice(-1)[0];
      const viaPrefix = existsSync(parent)
        && readdirSync(parent, { withFileTypes: true }).some((d) => d.name.toLowerCase().startsWith(leaf.toLowerCase()));
      if (viaPrefix) { /* 合法缩写，放过 */ }
      else {
        // ② 省略了某案目录前缀（`assets/CREDITS.md` 出现在讲单案的一行里）：
        //    能解析但写法不完整，记 WARN 而不判缺失。
        const viaScheme = SCHEMES.some((s) => existsSync(join(REAL_ROOT, 'prototypes', s.dir, v)))
          || SCHEMES.some((s) => existsSync(join(REAL_ROOT, 'prototypes', s.dir, base)));
        if (viaScheme) missing.push({ v, soft: true });
        else missing.push({ v, soft: false });
      }
    }
  }
  const hard = missing.filter((m) => !m.soft);
  const soft = missing.filter((m) => m.soft);
  if (hard.length) fail('paths/exist', `${hard.length} 个文档路径在仓库里不存在：${hard.map((m) => m.v).slice(0, 8).join(' ')}`);
  else if (soft.length) warn('paths/exist', `${soft.length} 个路径只能按缩写/省略前缀解析（存在但写法不完整）：${soft.map((m) => m.v).slice(0, 6).join(' ')}`);
  else pass('paths/exist', `文档里 ${checked.length} 条仓库路径全部存在`);

  // 模板编号存在性：`templates/M01` 这类
  const tplBad = [];
  for (const m of src.matchAll(/templates\/(M\d{2})/g)) {
    const hits = readdirSync(join(REAL_ROOT, 'templates')).filter((d) => d.startsWith(m[1]));
    if (!hits.length) tplBad.push(m[1]);
  }
  if (tplBad.length) fail('paths/templates', `不存在的模板编号：${[...new Set(tplBad)].join(' ')}`);
  else pass('paths/templates', '文档提到的模板编号都存在');
}

// ── 5. 已知会腐化的黑名单表述 ─────────────────────────────────────────────
// 这一组不是"通用道理"，是本仓库**已经腐化过**的原话。写回任何一句都是回归。
{
  const BANNED = [
    [/1100\s*字左右/, '「1100 字左右」——实测区间是 1600–2000 字，中位约 1800（具体值见 nums/prompt-len 的实测输出）'],
    [/roughly\s*1,?100\s*(?:Chinese\s*)?characters/i, '"roughly 1,100 characters" —— measured band is 1,600–2,000, median ~1,800'],
    [/\b9\s*个方案的机制/, '「9 个方案的机制」——hard 已缩到 4 个，警告并集是 14 案'],
    [/Nine schemes have mechanisms/i, '"Nine schemes have mechanisms" —— hard is 4, the warning union is 14'],
    [/S03 S05 S10 S14 S20 S21 S29|S03 S05 S10 S14 S15 S18 S20 S21 S29/, 'hard 旧名单（9 案）'],
    [/已知未修的抽取缺陷|known,? unfixed extraction defect/i, '「已知未修」——该缺陷已修'],
  ];
  const hits = [];
  for (const [re, why] of BANNED) {
    const m = src.match(re);
    if (m) hits.push(`${why}（命中：${m[0].slice(0, 40)}）`);
  }
  if (hits.length) fail('regression/banned', `文档写回了已腐化的原话：${hits.join('；')}`);
  else pass('regression/banned', `${BANNED.length} 条已腐化原话均未回归`);
}

// ── 输出（格式与 check-stale.mjs / check-anchors.mjs 一致：✓ / ⚠ / ✗）───────
const cnt = (k) => results.filter((r) => r.lvl === k).length;
if (!quiet) console.log(`文档一致性：${docName} ↔ data.js / prompts.js / prompt-copy.js`);
for (const r of results) {
  if (r.lvl === 'PASS') { if (!quiet) console.log(`  ✓ ${r.code.padEnd(20)} ${r.msg}`); }
  else if (r.lvl === 'WARN') console.log(`  ⚠ ${r.code.padEnd(20)} ${r.msg}`);
  else console.log(`  ✗ ${r.code.padEnd(20)} ${r.msg}`);
}
const nf = cnt('FAIL');
console.log(`\n${docName}: ${nf} FAIL / ${cnt('WARN')} WARN / ${cnt('PASS')} PASS`);
process.exit(nf ? 1 : 0);
