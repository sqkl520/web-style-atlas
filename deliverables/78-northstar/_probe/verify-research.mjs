#!/usr/bin/env node
/* 研究线体检：盲测证据 + 报告一致性。
 *
 * 为什么不并进 `prototypes/_build/quarter.mjs`：
 * 那个是**产品链**的季度体检（规格 → DNA → 提示词 → 九道闸门）。
 * 这里的五个脚本是**研究线**的证据链（盲测产物、判别值、报告数字）。
 *
 * 混在一起的后果是耦合：有人清理 `_probe/_staged/` 里的研究产物，
 * 产品体检就会红 —— 而那是一个没人能理解的失败。
 * 两条线各有各的入口，各自红各自的。
 *
 * ═══ 用法 ═══════════════════════════════════════════════════════════
 *
 *   node deliverables/78-northstar/_probe/verify-research.mjs
 *   node deliverables/78-northstar/_probe/verify-research.mjs --quiet   # 只报失败
 *
 * 退出码 0 = 全部通过；1 = 有失败（可直接接进提交前检查）。
 *
 * ═══ 它跑什么 ═══════════════════════════════════════════════════════
 *
 *   1. _evidence-gate         六条断言：判别值 67/67、阴性对照、干净值、hex 数、案数
 *   2. _discriminator-check   逐案判别值明细（同时是 1 的数据来源）
 *   3. _report-numbers-audit  48 份报告里的数字 / 行数 / 字节数 / commit 引用
 *   4. _revoked-claims        主报告里有没有「已被别处判作废但还在引用」的表述
 *   5. _fact-index            被多份报告共同引用的数字（只列，不断言）
 *
 * 前四个有 pass/fail；第五个是索引，永远 exit 0。
 */
import { execFileSync } from 'node:child_process';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const QUIET = process.argv.includes('--quiet');

const STEPS = [
  /* ⚠️ id 必须和实际文件名完全一致（含开头的下划线）。
   * 第一版写成 'evidence-gate' 漏了下划线，报 MODULE_NOT_FOUND ——
   * 而它恰好是唯一带下划线的那个，这说明「凭记忆写文件名」不可靠。 */
  { id: '_evidence-gate', label: '证据闸门（六条断言）', fail: true },
  { id: '_evidence-gate', args: ['--selftest'], label: '自测：证据闸门', fail: true },
  { id: '_discriminator-check', label: '判别值逐案明细', fail: true },
  { id: '_discriminator-check', args: ['--selftest'], label: '自测：判别值定义与命中判定', fail: true },
  { id: '_report-numbers-audit', label: '报告数字审计（48 份）', fail: true },
  /* 数字审计有六个独立检查，每个都用一条变异证明它会响。
   * 只测其中一条的话，其余五个仍然是「从没被证明会响」的状态。 */
  { id: '_report-numbers-audit', args: ['--selftest'], env: { SELECT_MUT: 'number' }, label: '自测：数字/行数断言', fail: true },
  { id: '_report-numbers-audit', args: ['--selftest'], env: { SELECT_MUT: 'caliber' }, label: '自测：案数口径解释', fail: true },
  { id: '_report-numbers-audit', args: ['--selftest'], env: { SELECT_MUT: 'handoff' }, label: '自测：交接表存在性', fail: true },
  { id: '_report-numbers-audit', args: ['--selftest'], env: { SELECT_MUT: 'staged' }, label: '自测：_staged 产物集合', fail: true },
  { id: '_report-numbers-audit', args: ['--selftest'], env: { SELECT_MUT: 'casenum' }, label: '自测：案数是否等于实测', fail: true },
  { id: '_report-numbers-audit', args: ['--selftest'], env: { SELECT_MUT: 'commit' }, label: '自测：commit 引用真实性', fail: true },
  { id: '_report-numbers-audit', args: ['--selftest'], env: { SELECT_MUT: 'caliberDrift' }, label: '自测：多份实现口径一致', fail: true },
  { id: '_revoked-claims', label: '作废声明检查', fail: true },
  { id: '_revoked-claims', args: ['--selftest'], label: '自测：作废声明检查', fail: true },
  { id: '_fact-index', label: '事实反向索引（只列不断言）', fail: false },
  /* ⚠️ 2026-11-21 新增：评分器盲区。
   * 上面十几项检查的都是"研究报告说得对不对"，没有一项检查
   * **北极星指标的尺子本身**。而实测它当时对 26/35 案从未判过，
   * 报告却读作"四案五类全过"。
   * 这一项不判分（fail: false）—— 它报的是覆盖率的清单，
   * 覆盖率低不等于错。但它必须每次都被打印出来。
   * 加 `--id` 跑：node _scorer-blindspot.mjs */
  { id: '../_blindtest/score', args: ['--selftest'], label: '自测：盲测评分器判据', fail: true },
  /* 2026-11-21 新增：正对照。
   * 拿 35 个**原型**（手工做的、已知合格）当产物跑一遍判据。
   * 判据如果判它们违规，那是判据错了 —— 不是原型错了。
   * 本仓库已经两次因为"判据把对的判成错的"而差点改坏正确的东西
   * （§十三 gradient 误判、§二十七 字体锚点连错三次），两次都靠人肉回查。
   * 这一项把"判据会不会冤枉合格样品"变成可自动跑的检查。 */
  { id: '../_blindtest/score', args: ['--positive-control'], label: '正对照：35 个原型不被判违规', fail: true },
  { id: '_scorer-blindspot', label: '评分器覆盖率（不判分，只报）', fail: false },
  /* 2026-11-21 新增：动效段的效果对照。
   * 补上 motion 之后，"补对了没有"不能靠读提示词确认 —— 那只能证明文本变了。
   * 这一项比较 S34 两轮产物（有/无动效段），断言动效结构真的出现了。 */
  { id: '_motion-effect', label: '动效段是否到达产物（S34 两轮对照）', fail: true },
  /* 2026-11-21 新增：机制保真度。
   * `score.mjs` 的五类判据里**没有一类查机制** —— 所以它报"五类全过"时，
   * 风格可能对、机制却不在（实测 S13 两份产物五类全过，机制 5/8 vs 8/8）。
   * 这一项按 check-prompts 已有的三态（hit/script/comment/absent）判，
   * 只报不判：阈值取决于每个案机制句自己写了多少。 */
  { id: '_mech-fidelity', label: '机制保真度（只报不判）', fail: false },
  /* 2026-11-21 新增：两套「机制数值」实现的一致性。
   * 「从 CSS 抽机制数值」有两套实现：check-prompts 的 mechSourceNumbers
   * （判原型）与 mech-fidelity 的 declaredNumbers（判产物）。它们是照抄关系，
   * 但照抄不是保证 —— 本仓库记过「同一组逻辑四份实现、同一个 bug 犯了四次」。
   * 这一项用 11 个样本（含 opacity 归一与子串陷阱）逐样本比对两者。 */
  { id: '_mech-impl-consistency', label: '机制数值两套实现一致', fail: true },
  /* 2026-11-22 新增：等价形式矩阵。
   * 这一轮修了 8 处判据误报，7 处同源（判据量字面、实现用等价形式）。
   * 修了 8 次，但没有任何机制防止第 9 次。这一项就是那个机制：
   * 五个概念（圆角/线宽/渐变/字体链/默认栈）各列 4–6 种等价写法，
   * 双向测（假阳性 + 假阴性），断言判据给出同一结论。 */
  { id: '_equiv-matrix', label: '等价形式矩阵（27 种写法）', fail: true },
  /* 2026-11-22 新增：拉丁字体角色（第四角色）普查。
   *
   * S19 的 KNOWN_EXEMPT 写着「原型自声明『拉丁标题 = Spectral』，dna.fonts 缺这个字段」。
   * 那句话本身就是一条我们不愿承认的账 —— 判据豁免掩盖了数据模型缺槽。
   * 这一项用同一个提取判据跑全部 35 原型：认出 5 案（S01 Archivo / S03 Space Grotesk /
   * S04 Unbounded / S16 Archivo Black / S19 Spectral），0 误报，
   * 并用三条变异证明这三个守卫（已占角色 / CJK / 等宽）都不是空的。
   *
   * fail: true —— 因为「真阳必须是 5、误报必须是 0」是可断言的，
   * 判据一退化成"对着期望表输出对答案"，变异测试就会红。 */
  { id: '_latin-role-probe', label: '拉丁字体第四角色（5 案 + 3 变异）', fail: true, args: ['--selftest'] },
  /* 2026-11-22 新增：图片数的同构对照组。
   *
   * 4 个产物图片数不够（S01/S09/S15/S24），很容易被读成「提示词要求写错了」。
   * 实测 7 份提示词在图片这一段**完全同构**（slots=6, have=5），产物却分成 3:4 两组。
   * 同一输入不同结果 → 是模型侧概率性失手，不是施工图缺陷。
   *
   * fail: true —— 它守的是「这个对照组本身」。一旦有人改了图片段的措辞，
   * 7 份就不再同构，脚本会因同构组不足 6 案而红，提醒对照组已失效。 */
  { id: '_pic-control-group', label: '图片数同构对照组（3 达标 / 4 失手）', fail: true },
  /* 2026-11-22 新增：第四角色真的到了提示词里。
   *
   * `_latin-role-probe` 证明「能认出 5 案」，这一项证明「认出来的东西进了交付物」——
   * 两件事必须分开测，因为这个仓库最老的病之一就是「字段有值、0 进交付物」
   * （`motion` 35/35 有值、0/35 进提示词，挂了好几轮没人发现）。
   *
   * 同时验措辞三条都在：不给范围的话 AI 会把这第四款字体抬成第二标题字体。 */
  { id: '_latin-in-prompt', label: '第四角色到达提示词（5/35 + 措辞三条）', fail: true },
  /* 2026-11-22 新增：枚举点巡检。
   *
   * 这一轮抓到五次同一形状的缺陷 —— 「闸门读不到对象却报出干净数」，
   * 五次都没有任何一处会报错。它们全是**筛选条件写窄了**：
   * 正对照的 dir 写死、只取第一个 <style>、注释当声明、undecided 盖住别的结论、
   * --all 的 /^S\d{2}$/ 漏掉重跑目录。
   *
   * 与其一条条修，不如把「所有枚举点」摆出来让人逐条对 ——
   * 「应有多少」只有人知道，脚本替不了。所以这一项 fail: false（只报不判）。 */
  { id: '_enumerate-audit', label: '枚举点巡检（23 处，只报不判）', fail: false },
  /* 2026-11-22 新增：字体来源普查。
   *
   * 原来只知道「14/21 份产物没有可用字体源」，而那个数是从判据⑤的报警条数
   * 反推出来的，不是普查。真做成普查之后分布是 10 远程 / 3 仅 local() /
   * 12 无来源 / **0 内嵌** —— 这个 0 否掉了「让提示词给自托管路径」这个方向。
   *
   * 它守的是「内嵌仍为 0」这个事实：一旦哪天不为 0，说明做法变了，
   * 报告里那节结论要重核。另外校验四档合计 = 总数，防止分类漏掉一种形态。 */
  { id: '_font-source-census', label: '字体来源普查（0 内嵌 / 12 无来源）', fail: true },
  /* 2026-11-22 新增：同输入重复性。
   *
   * 判断一个缺陷该「改提示词」还是该「重跑取优」，取决于它是稳定还是波动。
   * 这一轮反复把波动当稳定：图片数少几张被当成提示词缺陷、线宽越界被当成
   * 产物质量问题 —— 而这些都是同一份提示词下会变的量。
   *
   * 判据：找 md5 相同的提示词组，比对两次产物。字体集合必须一致 ——
   * 如果「用哪些字体」都随机，那所有字体类判据的结论都不可重复。
   *
   * 现在只有 1 组（S21-r2 / S21-r3），脚本自己会打印「没有第二组佐证」。 */
  { id: '_repeatability', label: '同输入重复性（1 组，字体稳定）', fail: true },
  /* 2026-11-23 新增：判据改动的前后对比工具自检。
   *
   * 这一轮改判据很多次，每次只跑改后那一次 —— 只知道「现在有多少违规」，
   * 不知道「这个数是变来的还是本来就在」。给 judgeFontChain 补上展开变量那次，
   * 正对照立刻红，当时无法判断是「新发现的真问题」还是「判据变严」。
   *
   * `_scorer-diff.mjs` 就是补这个的：取旧版评分器跑一遍、换回新版再跑一遍、diff。
   * 这里只验它自己能跑通且恢复正确（用改前 commit 7eba54a）。
   * fail: true —— 如果它恢复校验失败，仓库里会留下旧版评分器而毫无提示。 */
  { id: '_scorer-diff', label: '判据前后对比（16 案变化，含覆盖面从漏到全）', fail: true, args: ['e1c3478'] },
  /* 2026-11-23 新增：字体来源约束。
   *
   * 28 份产物里 12 份（43%）只写族名 —— 本地看着完全正常，换台机器就换字，
   * 开发时不会暴露。2026-11-23 补进提示词之后，这条守它不被改回去：
   *   ① 35/35 都带  ② 措辞正面（不含「不要只写…」）  ③ 三条路齐全
   *
   * fail: true —— 但也提醒「加了不等于好了」：脚本末尾会打印
   * 「还没验证生效」，因为现有产物都不是用带这句的提示词跑的。 */
  { id: '_font-source-rule', label: '字体来源约束（35/35 + 三条路）', fail: true },
  /* 2026-11-23 新增：图片数全量基线。
   *
   * §四十六 那个对照组是精选的 7 案。全量是 24 份 alt 分支产物：
   * 达标 15 份 = 63%，9 个失手里 8 个是「少」。
   *
   * 这个数不是判据，是**参照**。以后改提示词再跑一批：
   *   60% 上下 = 和现在没区别（别把波动读成改善）
   *   40%     = 真退化
   *   85%     = 真改善
   * 没有基线，任何一次「跑完发现 X 案失手」都无法判断是好是坏。
   *
   * fail: false —— 它会随样本增加而变化，红了只说明基线漂了，
   * 不代表出错。真正要守的是「达标率掉到 40% 以下」那个退化信号。 */
  { id: '_pic-baseline', label: '图片数全量基线（63%，只报不判）', fail: false },
  /* 2026-11-23 新增：跑批成功率。
   *
   * 不知道基线是多少，就分不清「某个案总失败」（那个案有问题）和
   * 「某个时段总失败」（上游有问题）—— 两者处置完全相反。
   *
   * ⚠️ 它有一个已知的**自我否定**：只数磁盘上留着的目录，
   * 而被 rm 掉的失败跑查不到。首测时它显示 100%，实际是 86%（12/14），
   * 因为失败目录都被清理了。脚本会自己打印这个警告 —— 那个警告比数字有用。
   *
   * fail: false（只报不判）—— 成功率取决于上游状态，红了不代表仓库有问题。 */
  { id: '_run-success-rate', label: '跑批成功率（有自我局限警告）', fail: false },
  /* 2026-11-23 新增：字体来源的约束效果。
   *
   * 起因是这一轮最重要的一个反转：S22 同提示词两次，一次写了 Google Fonts
   * 来源、一次 0 处；而 S21 无约束三次里也写了一次。所以「加约束有没有用」
   * 至今不明 —— 而我已经差点在拿到第一份正例时就宣布有效。
   *
   * 这个脚本给 Wilson 置信区间，并明确说样本够不够：
   * 1/2 = 50% 的 95% 区间是 [9%, 91%] —— 两份样本**什么都不能证明**。
   * 判定标准在脚本里固定：每组 ≥5 份 + 两组区间不重叠，才允许说「提高了概率」。
   *
   * fail: false（只报不判）—— 样本会继续增长，红的含义不明确。 */
  { id: '_font-source-rate', label: '字体来源约束效果（给置信区间）', fail: false },
  /* 2026-11-23 新增：跑批时间线。
   *
   * 这一轮最重要的运营层发现：成功率是**分时段**的 ——
   * 凌晨 10/10、深夜 3/11。而这个差异比任何单案的差异都大。
   * 在知道这件事之前，每次连续失败我都在想「是不是这个案有问题」。
   *
   * 配套改了两处：
   *   · acp-run 从本轮起每次跑批往 `_blindtest/_runs.jsonl` 追加一行台账
   *     （不存上游原始输出，一行 120 字节，不会被系统清理）
   *   · 本脚本优先读台账，台账为空才回落到易失的 %TEMP% 日志
   *
   * fail: false（只报不判）—— 成功率随上游状态变化，红了不代表仓库有问题。 */
  { id: '_run-timeline', label: '跑批时间线（按小时 + 最长连败）', fail: false },
  /* 2026-11-23 新增：字体回退链完整度。
   *
   * ⚠️ 这一项的价值不在数字，在它**推翻了自己两次**。
   *
   * 【第一次】初版判据把通用族过滤掉再数长度，于是
   * `"Martian Mono", ui-monospace, monospace` 被算成「只有 1 个族」
   * → 报出「38 份里 37 份链太短」。拿 35 个原型一跑，**5 个原型自己是那样**
   * （S04/S05/S07/S09/S13）—— 判据把合格样品判成违规 = 判据错了。
   * 错在：正文链回退到 serif 会变气质，等宽链回退到 monospace 是对的。
   *
   * 【第二次】改成「整条声明有没有退路」后报「产物 21% vs 原型 26%，
   * 与原型持平」，结论是「这条判据没有可靠合格线」。但这个正对照是**脏的**：
   *   · `font-family: inherit` 被算成「无退路」（原型 S01:174、S07:217、S09:232）
   *   · `@font-face{font-family:"Barlow"}` 的**定义**被当成**使用**（S04 有 3 处）
   * 排掉这两类之后，原型真实的「无退路」是 **0/35**，不是 9/35。
   * 「原型也这样」那句话本身就是脏数据造成的 —— 它把一个真缺陷洗成了
   * 「没法定线」，并且这个错误结论已经在报告里挂了一轮。
   *
   * 【第三次，2026-11-24】改判据而不是改阈值：判「链有没有以通用族收尾」。
   * 产物系统性丢掉了原型每条链末尾那个 `sans-serif`/`serif`：
   *   原型 S01:20 `--f-text: "Noto Sans SC", "Source Han Sans SC", sans-serif;`
   *   产物 S01:29 `font-family: "Noto Sans SC", "Source Han Sans SC";`
   * 这是确定性的差别，不需要概率。
   *
   * 数据由 `_font-fallback-chain.mjs` 产生，本 label 里的数字与它的输出逐字一致。
   * 该脚本同时打印四条判据的分子分母与 Fisher 双侧 p，以及「本判据自身的可信度」
   * （正对照：A 在 35 份原型上误报 0 份）。
   *
   * fail: false —— **不再是「不知道线在哪」**，而是「知道线在哪但不上闸」。
   * 线是原型 0/35。不上闸的理由是：产物 10/38 不达标这件事要不要变成
   * 提交前必红，取决于要不要为它改提示词 —— 那是产品决定。
   * 一度红，人就会开始无视它。 */
  { id: '_font-fallback-chain', label: '字体回退链（A 产物 26% / 原型 0%，p=0.0011）', fail: false },
  /* 2026-11-23 新增：读字体的公共实现 + 等价性证明。
   *
   * 一天之内同一个坑踩了三次（不展开 CSS 变量），三次都在**新写的代码**里。
   * 说明问题不是「不知道要展开」，是「每次写新代码都会忘」。
   * 解法只有让实现只有一个 —— `_blindtest/_css-fonts.mjs`。
   *
   * 但收成一份的时候必须证明**新的一份和旧的那几份等价**，
   * 否则只是把「四份可能漂移的」变成「五份」。这个脚本就是那个证明：
   *   73 份样本（38 产物 + 35 原型）上，新实现与 _repeatability 的抽取结果完全一致
   * 另外它还证明了新实现**更正确**：嵌套 fallback `var(--a, var(--b))`
   * 旧的 4 份都会截断，新的能展开。
   *
   * fail: true —— 等价性是可断言的。一旦漂移，红得对。 */
  { id: '_css-fonts-selftest', dir: '../_blindtest', label: '字体读取共享模块（73 份等价 + 嵌套 fallback）', fail: true },
];

const results = [];
const t0 = Date.now();

/* ── 崩溃 vs 断言失败 ──────────────────────────────────────────────
 * 这两件事的处置完全不同：
 *   断言失败 = 脚本认为某条判据不成立 → 去看报告/数据哪里错了
 *   脚本崩溃 = 脚本自己坏了 → 去看脚本，判据根本没被执行
 *
 * 不加区分时的后果我实测过两次（写 caliberDrift 变异时）：
 *   · 副本路径指错 → 输出 0/0 → 退出码非零 → 我读成「检测到漂移」
 *   · 实际是 MODULE_NOT_FOUND，判据一次都没跑
 * 「因为崩了而红」和「因为真的有问题而红」在 exit code 上完全一样。
 *
 * 判据：输出里出现未捕获异常的痕迹，或者退出码是 -1（信号杀掉），
 * 就归为崩溃，单独标注并单独计数。 */
const CRASH_PATTERNS = [
  /^\s*at\s+\S+\s+\(/m,                  // 堆栈帧
  /Error:.*\n\s+at /,                    // 带堆栈的 Error
  /Cannot find module/,
  /SyntaxError/,
  /ReferenceError/,
  /TypeError/,
  /ERR_[A-Z_]+/,
];
function detectCrash(code, out) {
  if (code === -1) return '进程被信号杀掉（超时或外部 kill）';
  if (code === 0) return null;
  for (const re of CRASH_PATTERNS) {
    if (re.test(out)) return '脚本抛出未捕获异常（判据未执行）';
  }
  return null;
}

for (const s of STEPS) {
  /* `dir` 让某个步骤从别的目录跑（比如 `_blindtest/` 下的脚本）。
   * 2026-11-23 加：字体读取的共享模块 `_css-fonts.mjs` 必须放在 `_blindtest/`
   * 旁边（`score.mjs` 在那儿），但它的自测脚本也要进这条验证线 ——
   * 原来这里硬拼 `HERE/${id}.mjs`，那个脚本就找不到。
   * 与其把模块挪来挪去，不如让跑批器支持子目录。 */
  const file = join(HERE, s.dir ? s.dir : '', `${s.id}.mjs`);
  const started = Date.now();
  let out = '', code = 0;
  try {
    out = execFileSync(process.execPath, [file, ...(s.args || [])], {
      cwd: resolve(HERE, '../../..'),
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: 5 * 60 * 1000,
      env: { ...process.env, ...(s.env || {}) },
    });
  } catch (e) {
    out = (e.stdout || '') + (e.stderr || '');
    code = e.status == null ? -1 : e.status;
  }
  const ms = Date.now() - started;
  /* 只取最后几行做摘要 —— 中间过程在这个汇总层没有价值，
   * 要看细节目录里单独跑那个脚本。 */
  const lines = out.trim().split('\n').filter(Boolean);
  const tail = lines.slice(-3);
  const crash = detectCrash(code, out);
  results.push({ ...s, code, ms, tail, out, crash });
  /* 三种标记：✓ 通过　✗ 断言失败　💥 脚本崩溃 */
  const mark = code === 0 ? '✓' : (crash ? '💥' : (s.fail ? '✗' : '·'));
  if (!QUIET || code !== 0) {
    console.log(`${mark} ${s.label.padEnd(36)} ${(ms / 1000).toFixed(1)}s`);
    if (crash) console.log(`    ⚠️ ${crash} —— 这不是判据失败，是脚本本身坏了`);
    for (const t of tail) console.log(`    ${t.trim().slice(0, 100)}`);
  }
}

const failed = results.filter((r) => r.fail && r.code !== 0);
const crashed = failed.filter((r) => r.crash);
const asserted = failed.filter((r) => !r.crash);
const totalMs = Date.now() - t0;

console.log('');
console.log('─'.repeat(70));
if (failed.length === 0) {
  console.log(`结论：${STEPS.filter((s) => s.fail).length} 项断言全部通过（${(totalMs / 1000).toFixed(1)}s）`);
  console.log('');
  console.log('这些脚本都不碰 claude、不花钱。改任何报告之后跑一次。');
} else {
  /* 崩溃和断言失败分开报 —— 处置完全不同。 */
  console.log(`结论：${failed.length} 项未通过` +
    (crashed.length ? `（其中 ${crashed.length} 项是脚本崩溃，${asserted.length} 项是断言失败）` : ''));

  if (crashed.length) {
    console.log('');
    console.log('💥 脚本崩溃 —— 先修脚本，这些判据根本没被执行：');
    for (const f of crashed) console.log(`  · ${f.label}：${f.crash}`);
  }
  if (asserted.length) {
    console.log('');
    console.log('✗ 断言失败 —— 脚本跑通了但认为判据不成立：');
    for (const f of asserted) console.log(`  · ${f.label}`);
  }

  for (const f of failed) {
    console.log('');
    console.log(`── ${f.label} ──`);
    /* 失败时把完整输出打出来 —— 摘要不够定位 */
    console.log(f.out.trim());
  }
  console.log('');
  console.log('单独重跑：');
  for (const f of failed) {
    console.log(`  node deliverables/78-northstar/_probe/${f.id}.mjs ${(f.args || []).join(' ')}`);
  }
}

process.exit(failed.length === 0 ? 0 : 1);
