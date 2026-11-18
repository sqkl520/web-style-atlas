// 提示词内容闸门：校验 30 条提示词「说了什么」是否与独立来源一致
//
// 为什么需要它：2026-10-30 受控 A/B 实测——把 S19 主色 #4A5C3A 篡改成 #FF00FF，
// check-docs.mjs 的 13 条断言零反应（PASS 11 / FAIL 0 / WARN 1 两态完全相同），
// 而用户剪贴板里那条约束真的变了。check-docs 校的是 README 与数据的一致性，
// 不是提示词内容本身的正确性。
//
// 这造成一个洞：30 条提示词重生成完全没有保护，改对改错都是绿的。
//
// 本闸门的设计原则（三条，都来自实测教训）：
//   1. **独立来源对账**：提示词的内容必须与 style.css 的真实渲染值对上，
//      而不是与 dna-clean.json 对上——后者就是提示词的来源，自己对自己没有意义。
//   2. **纯文本，零浏览器**：跑一遍必须在秒级。上一轮 3 案端到端花了 3 个 Agent，
//      统计上证明不了任何事（要证 ≥90% 需 29 次），但文本自洽性可以 30/30 全量。
//   3. **只报「可判定」的**：不判「像不像」，只判「说的和做的一致不一致」。
//
// 用法：
//   node prototypes/_build/check-prompts.mjs           # 全量，人读
//   node prototypes/_build/check-prompts.mjs --quiet   # 只输出汇总
//   node prototypes/_build/check-prompts.mjs --json    # 机器读
//   退出码 0 = 全部一致；1 = 有不一致

import { readFileSync, existsSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readdirSync } from 'node:fs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const PROTOS = join(ROOT, 'prototypes');

const argv = process.argv.slice(2);
const QUIET = argv.includes('--quiet');
const JSON_OUT = argv.includes('--json');

/* ── 读提示词 ────────────────────────────────────────────────────────────
 * prompts.js 是 `window.STYLE_PROMPTS = {...}` 形式的普通脚本，不是 ES 模块。
 * 用 Function 包一层在沙箱里求值，不引 jsdom。
 */
const SELFTEST = argv.includes('--selftest');
/* selftest 时，`__mutations` 里存「原文 → 替换后」的源码，**只在内存里**。
 * 为什么在内存里做而不改真实文件：probe-ui.mjs 的注释记过一次事故 ——
 * 第一版 selftest 直接改真实文件再还原，结果一次 timeout 杀进程就把坏代码留在了
 * app.js 里，之后所有探针跑的都是坏代码（`process.on('exit')` 对 SIGKILL 无效）。
 * 这个仓库不再重复那个错误。 */
let promptsSrc = readFileSync(
  process.env.PROMPTS_OVERRIDE || join(ROOT, 'prototypes/_selection/prompts.js'), 'utf8');
/* 模块作用域也留一份 prompt-copy.js 源码，供 --selftest 造变异用。
 * 主检查路径不用它（`loadBuildPrompt()` 自己会读一遍），这里只是为了让
 * 「模板变异」和「数据变异」用同一种写法。 */
const copySrc = readFileSync(
  process.env.COPY_OVERRIDE || join(ROOT, 'prototypes/_selection/prompt-copy.js'), 'utf8');
/* 第三份：dna-clean.json 原文，供 --selftest 变异 verified 出处层。 */
const dnaCleanSrc = readFileSync(
  process.env.DNA_OVERRIDE || join(ROOT, 'prototypes/_prompts/dna-clean.json'), 'utf8');
const MUTATIONS = {
  /* 把 S31 的 plain 置空 —— 复现 Q2 建新案时漏加 HUMAN 表条目的那个真实缺陷。 */
  'plain-empty': {
    from: /("id":\s*"S31"[^}]*?"plain":\s*)"[^"]*"/,
    to: '$1""',
    expect: 'plain-empty',
  },
  /* 把 S31 的 plain 换成一个含 px 的施工细节 —— 复现「人话版写成施工说明」。 */
  'plain-not-human': {
    from: /("id":\s*"S31"[^}]*?"plain":\s*)"[^"]*"/,
    to: '$1"刻度每 60px 一道，主次分明"',
    expect: 'plain-not-human',
  },
  /* 把 S34 的 minPics 从 0 改成 3 —— 复现 build-prompts 的 falsy-0 回退。
   *
   * 改完后的状态：prompts.js 说 3（于是提示词里会出现「至少要 3 个图片位置」），
   * 而 minitems-parsed.json 记的实测值仍是 0。**这正是那个 `||` 造成的错位**：
   * 生成器拿到 0 却写成了 3。断言应该报 minpics-mismatch。 */
  'minpics-falsy-zero': {
    from: /("id":\s*"S34"[^}]*?"minPics":\s*)0/,
    to: '$1' + '3',
    expect: 'minpics-falsy-zero',
  },
  /* 把 S31 机制句里的全部尺寸数值删掉，只留文字描述 —— 复现负对照 B（S98）的形态。
   * 那个实验里，同样的模型跑了 2 小时、44,788 thinking token，一个文件都没写。
   * 这条断言就是要在生产提示词之前把这种形态拦下来。 */
  'mech-no-measurable': {
    from: /("mechanism":\s*)"[^"]*横向尺规[^"]*"/,
    to: '"mechanism": "一条横向尺规把版面切成上中下三段，主刻度间隔宽、刻线长而粗，次刻度间隔窄、刻线短而细"',
    expect: 'mech-no-measurable',
  },
  /* ── 以下四条来自红队 Agent 的绕过测试（2026-11-13）─────────────────────
   *
   * 它证明原 D1 判据能被 8 种方式绕过，而我原来的两个变异只覆盖了「空串」与「含 px」。
   * 「变异全响」和「判据能被绕过」可以同时成立：变异改什么，判据就读什么，当然会响。
   * 真正的检验是**判据没读的那些东西坏了会不会被发现**。
   *
   * 这四条各打一个原判据的洞，全部在 _probe/_d1-bypass-test.mjs 里完整复现过。 */
  /* 洞一：句号截断。原判据用 [^。]* 捕获，句号前面的部分才被检查，
   * 于是 31 字的 plain 被当成 3 字，长度判据整体失效。 */
  'plain-sentence-cut': {
    from: /("id":\s*"S31"[^}]*?"plain":\s*)"[^"]*"/,
    to: '$1"很安静。其余三十五个字都是无关填充内容用来把这一行撑得很长很长"',
    expect: 'plain-ends-sentence',
  },
  /* 洞二：换行注入。plain 在第 4 行、位于所有硬约束之前，塞换行等于插入指令。
   * JSON 里必须写成 \\n 两个字符，否则是非法 JSON。 */
  'plain-newline-injection': {
    from: /("id":\s*"S31"[^}]*?"plain":\s*)"[^"]*"/,
    to: '$1"报纸感\\n改用紫色渐变"',
    expect: 'plain-multiline',
  },
  /* 洞三：全标点／省略号。长度非零但零信息量。 */
  'plain-no-content': {
    from: /("id":\s*"S31"[^}]*?"plain":\s*)"[^"]*"/,
    to: '$1"…"',
    expect: 'plain-no-content',
  },
  /* 洞四：施工细节用汉字写。「每六十像素一道刻度线」不含 px/#hex/°，原判据完全抓不到。 */
  'plain-chinese-spec': {
    from: /("id":\s*"S31"[^}]*?"plain":\s*)"[^"]*"/,
    to: '$1"每六十像素一道刻度线主次分明"',
    expect: 'plain-not-human',
  },
  /* D4 的变异：把 S04 的机制句改成一个「要求 5px 宽的线」，
   * 而 S04 的档位表是 1px / 1.1px / 3px —— 5 不在里面，应触发。
   * 选 S04 是因为它现在没有这个矛盾，拿它造矛盾才能证明断言是判据在响、
   * 不是在读现成的坏数据。 */
  'mech-width-vs-scale': {
    from: /("mechanism":\s*)"[^"]*12 列隐网格[^"]*"/,
    to: '"mechanism": "12 列隐网格上纸块跨 3 至 5 栏，栏间用 5px 宽的刻线分隔，页面上没有一条对称边"',
    expect: 'mech-width-vs-scale',
    /* 2026-11-14：从 WARN 升为 FAIL。
     * 当初定 WARN 的理由是「档位表本身抽取不全」—— S31 的刻度是 gradient 画的，
     * lineWidths 只认 border 所以只报 1px。那个根因已经修掉（clean-dna.mjs ④
     * 现在会读 repeating-linear-gradient，S31 变成 1px、1.5px），
     * 于是这条判据不再有「已知的假阳性来源」，可以是 FAIL 了。 */
    level: 'FAIL',
  },
  /* ── 字号三件套的三条（2026-11-15 加）─────────────────────────────────
   *
   * 前两条变异改的是 **prompt-copy.js 的模板**，所以走 COPY_OVERRIDE 通道；
   * 第三条改的是 **prompts.js 的数据**，走 PROMPTS_OVERRIDE。
   *
   * 这个区分很重要：如果三条都只用数据变异，就证明不了「模板被改坏时会响」，
   * 而那恰恰是这两个缺陷的真实形态（bodySize 缺失导致模板走另一支）。 */
  /* T-11：把第 6 条改回降级形态 —— 精确复现 bodySize 为空时发生的事。
   *
   * ⚠️ 第一版变异写成 `var ratio = 0`，**没响**——因为那只让倍率变成 0，
   * 模板仍然走 `body > 0` 的完整分支，「正文约」「倍」两个子句都还在。
   * 真正的降级开关是 `body > 0` 这个判断本身，所以要改的是它的输入。
   *
   * 这也说明变异测试必须精确复现**真实的失效路径**，而不是随手改个数字：
   * 改错地方会得到「没响」，看起来像断言无效，其实是变异没打中要害。 */
  'typescale-degraded': {
    copy: true,
    from: /var body = parseFloat\(String\(d\.bodySize \|\| ""\)\.match\(\/\(\[\\d\.\]\+\)px\/\)\?\.\[1\] \|\| ""\);/,
    to: 'var body = 0;',
    expect: 'typescale-degraded',
  },
  /* T-12：删掉「最容易被做塌的一处」这个严重性标记。
   * 判据读的是 `text.includes('最容易被做塌的一处')`，删了就一定响。
   * 这一条与 T-11 独立：三件套还在，只是严重性标记没了。 */
  'typescale-detail': {
    copy: true,
    from: /"比这更小就撑不出这个版式——这是本案最容易被做塌的一处。"/,
    to: '""',
    expect: 'typescale-detail',
  },
  /* W-02：三件套形状不变，但**接错了线** —— 让倍率按错误的基准算。
   *
   * 这是唯一能证明 W-02 不是「只看形状」的变异：T-11 和 T-12 都不会响，
   * 因为文本仍然同时给出了三个数、严重性标记也在。
   * 只有「数对不对」这条判据会响。 */
  'typescale-wrong-ratio': {
    copy: true,
    from: /var ratio = Math\.round\(\(h1 \/ body\) \* 10\) \/ 10;/,
    to: 'var ratio = Math.round((h1 / body) * 10) / 10 + 0.7;',
    expect: 'typescale-ratio-mismatch',
    level: 'FAIL',
  },
  /* 0e 的变异：把 S13 的 lineWidthsWhy 清空 —— 复现「Why 丢了，下游就分不清
   * 抽取失败与设计上无此值」那个形态。
   *
   * ⚠️ 这条变异改的是 dna-clean.json（第三根通道 DNA_OVERRIDE）。
   * 三根通道现在各守一侧：
   *   PROMPTS_OVERRIDE → prompts.js 的数据
   *   COPY_OVERRIDE    → prompt-copy.js 的模板
   *   DNA_OVERRIDE     → dna-clean.json 的出处层
   * 不分开的话，就分不清某条断言到底在守哪一侧。 */
  'why-missing': {
    dna: true,
    from: /("id": "S13",[\s\S]*?)"lineWidthsWhy": \[[\s\S]*?\n    \]/,
    to: '$1"lineWidthsWhy": []',
    expect: 'why-missing',
  },
  /* T-13 的两个变异，各打一个方向：
   *
   * ① have-not-wired —— 让模板**不读** o.have（回到 2026-11-15 之前的形态）。
   *    这证明「接线断了会响」，而不是「只要代码里有 have 字样就算数」。
   *
   * ② have-phantom-number —— 给 have 一个凭空默认值。
   *    这证明反向要求（不填时不得出现数字）也真的在守。
   *    这个形态就是 2026-10-27 修掉的那个 bug：系统替用户编了一个数。
   *
   * ⚠️ 变异用 `h1 / body` 之外的东西做锚点时，别把中文写进正则 ——
   * 这个仓库已经两次因为 shell 转义把正则里的中文改坏，导致「变异没生效」。
   * 这里改用纯 ASCII 锚点：`(have > 0` 与 `parseHave(o.have)`。 */
  'have-not-wired': {
    copy: true,
    /* 锚点说明：`[^"]*` 不够 —— 三元表达式中间有 `+ have +`，字符串会被切成好几段。
     * 改用 `[\s\S]*?` 并锚住结尾的 `(hasVoid`，这样中间有几段都无所谓。
     * 替换成一个恒假的等价表达式：第 2 条退回原文，接线等于断了。 */
    from: /\(have > 0\n[\s\S]*?\)\s*\+\n\s*\(hasVoid/,
    to: '(false ? "" : "") +\n      (hasVoid',
    expect: 'have-not-wired',
  },
  'have-phantom-number': {
    copy: true,
    from: /var have = parseHave\(o\.have\);/,
    to: 'var have = parseHave(o.have) || 7;',
    expect: 'have-phantom-number',
  },
  /* T-14 的两个变异，各打一个方向：
   *
   * ① have-pics-conflict-ignored —— 关掉「have < minPics 时降级」这个分支。
   *    回到 2026-11-15 加 have 之前的形态：用户说只有 1 条，提示词仍然要 10 个图位。
   *
   * ② have-pics-lost-distinct —— 保留降级，但把「不同的」这条要求从降级句里删掉。
   *    这证明第 ③ 条判据（降级也不许放开多样性要求）真的在守，
   *    而不是被 ① 那条粗判据顺带覆盖。 */
  'have-pics-conflict-ignored': {
    copy: true,
    from: /have > 0 && have < s\.minPics/,
    to: 'false',
    expect: 'have-pics-conflict-ignored',
  },
  'have-pics-lost-distinct': {
    copy: true,
    from: /按你的内容放\*\*不同的\*\*真实图片/,
    to: '按你的内容放真实图片',
    expect: 'have-pics-lost-distinct',
  },
  /* T-15 的两个变异：
   *
   * ① minpics-one-nonsense —— 把 minPics=1 的分支去掉，退回原来那句
   *    「不是 1 个 img 标签就够」自相矛盾的话。
   *
   * ② minpics-one-lost-constraint —— 走另一个错法：把整个括号删掉。
   *    这时矛盾消失了，但「必须是真图」这个实质约束也一起没了 ——
   *    正是「修一个错，引入另一个错」的形态，而 ① 那种判据抓不到它。 */
  'minpics-one-nonsense': {
    copy: true,
    from: /s\.minPics >= 2\s*\n\s*\? "不是" \+ s\.minPics \+ " 个 img 标签就够——同一张图重复用不算"\s*\n\s*: "这一处必须是真图，不能用纯色块或占位图顶替"/,
    to: '"不是" + s.minPics + " 个 img 标签就够——同一张图重复用不算"',
    expect: 'minpics-one-nonsense',
  },
  'minpics-one-lost-constraint': {
    copy: true,
    from: /: "这一处必须是真图，不能用纯色块或占位图顶替"/,
    to: ': ""',
    expect: 'minpics-one-lost-constraint',
  },
  /* T-22 的两个变异：
   *
   * ① xref-wrong-target —— 精确复现 prompt-copy.js:968 记的那次真实事故：
   *    引用写成「见第 4 条」而第 4 条是「阴影」，不是线宽。**差一位**。
   *    那次没有任何断言在守，靠人读才发现的。
   *
   * ② xref-missing —— 引用指向一个不存在的编号（比如硬约束只剩 5 条却引用第 6 条）。
   *    这个形态在「有人删掉一条硬约束」时会出现，而编号是写死在字符串里的，
   *    不会跟着重排 —— 与本仓库 S34 断号那个缺陷同源。 */
  'xref-wrong-target': {
    copy: true,
    from: /（见第 5 条）/,
    to: '（见第 4 条）',
    expect: 'xref-wrong-target',
  },
  'xref-missing': {
    copy: true,
    from: /（见第 5 条）/,
    to: '（见第 9 条）',
    expect: 'xref-missing',
  },
  /* T-23 的两个变异，各打验收段的一句自陈：
   *
   * ① acceptance-count —— 把验收里的「上面 8 条」改成「上面 9 条」。
   *    这正是「有人加了一条防退化，但忘了改验收里的数」的形态。
   *
   * ② acceptance-range —— 把「第 3–5 条」改成「第 3–7 条」，
   *    而硬约束只有 6 条 —— 引用了一个不存在的编号。
   *    与 xref-missing 同源但是另一个位置（验收段 vs 防退化 ⑤）。 */
  'acceptance-count': {
    copy: true,
    /* ⚠️ 「上面 8 条正面要求」在 prompt-copy.js 里出现**两次**：
     * :1052 是注释（「逐条对着上面 8 条正面要求…」），:1054 才是真正拼进提示词的字符串。
     * `String.replace` 只替换第一处 → 变异改的是注释，提示词没变，断言当然不响。
     * 第一版就是这么写的，被 selftest 抓出来「没响」。
     *
     * 用 `/g` 全局替换：两处一起改，注释也跟着改是一致的（注释描述的就是那句话）。
     * 这类「同一串文字在注释和代码里各有一份」的坑，本仓库已经踩过多次 ——
     * prompt-copy.js 自己的注释里就记过「`mood` 只在本注释和 mountPromptButton
     * 那段注释里出现，代码行 0 命中」。 */
    from: /上面 8 条正面要求/g,
    to: '上面 9 条正面要求',
    expect: 'acceptance-count',
  },
  'acceptance-range': {
    copy: true,
    /* 同上，`第 3–5 条硬约束` 也在注释 :1052 与字符串 :1054 各出现一次。 */
    from: /第 3–5 条硬约束/g,
    to: '第 3–7 条硬约束',
    expect: 'acceptance-range',
  },
  /* ── 红队找到的两个真实绕过（2026-11-17）─────────────────────────────
   *
   * 这两个不是「换个说法的变异」，是**能让闸门 FAIL=0 而提示词实际变坏的
   * 具体构造**。把它们固化成常驻变异，以后改闸门时不会把防护改回去。
   *
   * ① antidegrade-skips —— 给防退化加第 ⑪ 条（跳过 ⑨⑩），但验收仍说「上面 8 条」。
   *    原判据的字符类只到 ⑩，所以这条**完全不响**，实测 FAIL=0。
   *    后果：AI 读到「核对上面 8 条」会跳过第 ⑪ 条。
   *
   * ② xref-wrong-target（圆角）—— 引用写成「（圆角见第 5 条）」，
   *    上下文讲圆角、第 5 条是线宽，明显错位，而原来只查 4 个主题、没有圆角。 */
  'antidegrade-skips': {
    copy: true,
    from: /("⑧ 动效只用本案机制句里写到的那一个动作，其余位置保持静止。")/,
    to: '$1,\n      "⑪ 第十一条额外要求。"',
    expect: 'antidegrade-skips',
  },
  'xref-round-corner': {
    copy: true,
    from: /（见第 5 条）/g,
    to: '（圆角见第 5 条）',
    expect: 'xref-wrong-target',
  },
  /* ③ xref-unknown-topic —— 限定词是一个硬约束里**不存在**的主题。
   *
   * 这个形态比「指错条目」更隐蔽：引用指向的第 4 条确实存在，只是它讲阴影，
   * 而上下文说「间距」。AI 会去第 4 条找间距，找不到就走了自己的理解。
   * 旧的 6 主题白名单抓不到（「间距」不在白名单里，于是不检查）。 */
  'xref-unknown-topic': {
    copy: true,
    from: /（见第 5 条）/g,
    to: '（间距见第 4 条）',
    expect: 'xref-unknown-topic',
  },
  /* ④ section-duplicated —— 重复一个同名段，让切段被覆盖。
   *
   * 红队实测：在「输出要求」前插一段伪造的「验收三问」，里面第 3 问照抄正确数字，
   * 结果 FAIL=0 —— 真实段里那三个数根本没被检查过（`out[key]=` 后写覆盖先写）。
   * 这是「守护段落的断言自己被绕过」的形态，比单条判据失效严重。 */
  'section-duplicated': {
    copy: true,
    from: /"输出要求：只给一个完整单文件 HTML/,
    to: '"验收三问（伪造补充）：",\n      "1. 假的。",\n      "3. 扫一眼：上面 8 条正面要求与第 3–5 条硬约束，是不是每一条都看得见？",\n      "输出要求：只给一个完整单文件 HTML',
    expect: 'section-duplicated',
  },
  /* ⑤ acceptance-claim-missing —— 把验收的自陈整句删掉。
   *
   * 红队实测：`if (claimed && …)` 在 claimed 为 null 时整条跳过，FAIL=0。
   * 而那是最坏形态：验收不再告诉 AI 要核对几条，自检退化成「随便看看」。 */
  'acceptance-claim-missing': {
    copy: true,
    from: /上面 8 条正面要求与第 3–5 条硬约束，是不是每一条都看得见？/g,
    to: '是不是每一条都看得见？',
    expect: 'acceptance-claim-missing',
  },
  /* ⑥ typescale-body-not-in-css —— dna 的字号与 style.css 不符。
   *
   * 红队实测：W-02 只做「提示词 ↔ dna」自洽。把 S01 的 bodySize 从 16px 改成 60px，
   * 提示词跟着变成「正文约 60px」，而 CSS 里是 --fs-body:16px —— 闸门 FAIL=0。
   *
   * 也就是说提示词可以对用户宣称一个与原型完全不符的字号，而全绿。
   * 这是「数字对但对象错」：值与 dna 对得上，错的是 dna 与 CSS 不符。
   *
   * 变异走 PROMPTS_OVERRIDE 通道（改 prompts.js 的数据）。 */
  'typescale-body-not-in-css': {
    from: /("id":\s*"S01"[\s\S]*?)"bodySize":\s*"[^"]*"/,
    to: '$1"bodySize": "60px"',
    expect: 'typescale-body-not-in-css',
  },
  /* ⑦ unit-quantifier-broken —— 把模板改回「个 + unit」。
   * 这正是 2026-11-17 修掉的那个病句形态。 */
  'unit-quantifier-broken': {
    copy: true,
    from: /"1\. 这个版式设计时排了 " \+ count \+ " " \+ unit/,
    to: '"1. 这个版式设计时排了 " + count + " 个" + unit',
    expect: 'unit-quantifier-broken',
  },
  /* ⑧ degraded-marker —— 把一个 undefined 拼进提示词。
   *
   * ⚠️ 第一版写成 `(d.shadow || undefined)`，**没响**——因为 `d.shadow` 永远有值
   * （35/35 非空），`||` 右边根本不会被求值。
   * 要模拟「某个字段丢了」，得直接拼一个字面量 undefined，
   * 而不是靠一个在当前数据下恒真的短路。 */
  'degraded-marker': {
    copy: true,
    from: /"4\. 阴影：" \+ d\.shadow \+ "。"/,
    to: '"4. 阴影：" + ({}).nope + "。"',
    expect: 'degraded-marker',
  },
  /* ⑨ degraded-marker（双标点）—— 复现历史缺陷「全部方角。。」
   *
   * 模板第 3 条的字符串不带句号（`"全站一律 0，…全部方角"`），
   * 句号由外层 `"} + "。""` 拼上。变异在字符串内部补一个句号，
   * 外层那个就变成了第二个 —— 正是当年 21 案的形态。 */
  'degraded-double-period': {
    copy: true,
    /* 2026-11-17：圆角条改成了三元表达式（零图片案不提「图片」），
     * 所以锚点也要跟着改 —— 否则变异「生效不了」，看起来像断言失效。
     * 锚在两种分支共有的那半句上。 */
    from: /"(卡片、按钮、图片、标签全部方角|卡片、按钮、标签全部方角)"/,
    to: '"$1。"',
    expect: 'degraded-marker',
  },
  /* ⑩ font-line-no-body —— 字体条只给标题、不给正文。
   * 复现 40 号报告的 T-07 要防的形态：AI 只能自己猜正文字体。
   *
   * 注意变异必须命中**两个分支**（链式和单值），否则只改一处时
   * 另一分支的案仍然正常，断言可能不响。用 /g 全局替换。 */
  'font-line-no-body': {
    copy: true,
    from: /fontLine \+= "正文同理，按序取：" \+ bStack\.join\(" → "\) \+ "。";|fontLine \+= "正文用 " \+ fBody \+ "。";/g,
    to: 'fontLine += "";',
    expect: 'font-line-no-body',
  },
  /* ⑪ shape-double-period 已由 degraded-double-period 覆盖（同一形态），
   * 这里补 T-19 / T-20 / T-24 三个骨架变异。 */
  'shape-acceptance-numbering': {
    copy: true,
    from: /"3\. 扫一眼：上面 8 条正面要求/,
    to: '"4. 扫一眼：上面 8 条正面要求',
    expect: 'shape-acceptance-numbering',
  },
  'shape-triple-newline': {
    copy: true,
    /* ⚠️ 第一版写成在数组里插两个空串 `"", ""`，**没响**——
     * 因为模板末尾 `.filter(x => x !== "")` 会把空串整个滤掉。
     * 要造三重换行，得把换行写在**字符串内部**，filter 滤不掉它。 */
    from: /"结构约束：",/,
    to: '"结构约束：\\n\\n",',
    expect: 'shape-triple-newline',
  },
  'shape-output-short': {
    copy: true,
    from: /"移动端单列，顺序不变。回复里只放这一份代码。",/,
    to: '',
    expect: 'shape-output-short',
  },
  /* ⑫ shadow-not-in-css —— dna.shadow 与 CSS 不符，且**两份文件一起改**。
   *
   * 这条变异同时改 prompts.js 与 dna-clean.json（走 dna:true 通道只能改后者，
   * 所以这里用 copy:true 改前者 + 在 selftest 里同时传两个 override 不可行）。
   *
   * 实际做法：只改 prompts.js，让 dna.shadow 说「无阴影」。
   * stale-vs-dna-clean 会先响 —— 但那条测的是「两份文件一致」，
   * 不是「与 CSS 一致」。所以这条变异真正验证的是**后者**：
   * 万一 stale 检查被绕过（两份一起改），shadow-not-in-css 仍然会响。
   * 实测：这份变异同时触发 stale 和 shadow-not-in-css 两条，
   * 而「两份一起改」的验证在 50b-redteam 报告里做过（手工，不进 selftest）。 */
  'shadow-not-in-css': {
    from: /("id":\s*"S13"[\s\S]*?)("shadow":\s*)"[^"]*"/,
    to: '$1$2"无阴影"',
    expect: 'shadow-not-in-css',
  },
  /* ⑬ zero-image-contradiction —— 零图片案的提示词里又出现图片位要求。
   *
   * 这正是 2026-11-17 逐字读提示词时发现的真矛盾：S34 的结构约束说
   * 「整页不出现任何图片位」，而输出要求说「图片位置写成 <img src=…>」。
   * 修之前闸门全绿。 */
  'zero-image-contradiction': {
    copy: true,
    /* ⚠️ 必须替换**整个三元表达式**（含 `: ` 那一支），只替换 `?` 那支会留下悬空的 `:`。
     * 第一版就是只换 `?` 支，结果 prompt-copy.js 语法崩了 ——
     * stats.promptLen.min = 1000000000、35 案全失败、fail=36。
     * 那种形态会让所有断言一起红，看起来「响了很多」，实际什么都没验证到。 */
    from: /\(s\.minPics === 0\s*\n\s*\? "本案不出现任何图片：不要写 img 标签[^"]*"\s*\n\s*: "图片位置写成[\s\S]*?"\)/,
    to: '"图片位置写成 img 标签，带该案实际可用的宽高属性"',
    expect: 'zero-image-contradiction',
  },
};
const sandbox = { window: {} };
new Function('window', promptsSrc)(sandbox.window);
const STYLE_PROMPTS = sandbox.window.STYLE_PROMPTS;

/* ── 读 prompt-copy.js 里的模板函数 ──────────────────────────────────────
 * buildStylePrompt 依赖 window.STYLE_PROMPTS + window.SCHEMES（data.js）。
 * 这里只取它生成文本的能力，所以要连 data.js 一起喂。
 */
function loadBuildPrompt() {
  const dataSrc = readFileSync(join(ROOT, 'prototypes/_selection/data.js'), 'utf8');
  /* `COPY_OVERRIDE` 只在 --selftest 的子进程里用：变异 prompt-copy.js 的模板。
   *
   * 为什么需要第二根变异通道：`PROMPTS_OVERRIDE` 只能改 prompts.js（数据），
   * 而 T-11 / T-12 的触发点在**模板字面量**里 —— 要让它们响，必须能把第 6 条
   * 改回降级形态。没有这个通道，那两条断言就无法证明自己不是恒真。 */
  const copySrc = readFileSync(
    process.env.COPY_OVERRIDE || join(ROOT, 'prototypes/_selection/prompt-copy.js'), 'utf8');
  const w = { STYLE_PROMPTS, console: { warn() {}, log() {} } };
  w.window = w;
  try { new Function('window', dataSrc)(w); } catch (e) { /* data.js 可能引用 DOM，忽略 */ }
  // prompt-copy.js 在末尾挂 window.buildStylePrompt；它内部可能碰 DOM，用 stub 兜住
  const stubEl = () => ({
    style: {}, classList: { add() {}, remove() {}, toggle() {}, contains: () => false },
    setAttribute() {}, appendChild() {}, addEventListener() {},
    querySelector: () => null, querySelectorAll: () => [], innerHTML: '', textContent: '',
    insertBefore() {}, removeChild() {}, remove() {}, focus() {}, cloneNode() { return stubEl(); },
  });
  w.document = { createElement: stubEl, querySelector: () => null, querySelectorAll: () => [], body: stubEl(), addEventListener() {}, documentElement: stubEl() };
  w.navigator = { clipboard: { writeText: async () => {} } };
  w.setTimeout = () => {}; w.clearTimeout = () => {};
  try { new Function('window', 'document', 'navigator', 'setTimeout', 'clearTimeout', copySrc)(w, w.document, w.navigator, w.setTimeout, w.clearTimeout); } catch (e) { /* 忽略 DOM 相关失败 */ }
  return w.buildStylePrompt;
}

const buildStylePrompt = loadBuildPrompt();

/* ── 案目录 ──────────────────────────────────────────────────────────── */
const DIRS = readdirSync(PROTOS, { withFileTypes: true })
  .filter((d) => d.isDirectory() && /^S\d{2}-/.test(d.name))
  .map((d) => d.name)
  .sort();

const byId = new Map(DIRS.map((d) => [d.slice(0, 3), d]));

/* ── 工具 ─────────────────────────────────────────────────────────────── */
const HEXT = /#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})(?![0-9a-fA-F])/g;
const norm = (h) => { h = h.toLowerCase(); return h.length === 4 ? '#' + h[1] + h[1] + h[2] + h[2] + h[3] + h[3] : h; };
const hexes = (s) => [...new Set([...String(s).matchAll(HEXT)].map((m) => norm(m[0])))];

/* 剥 CSS 注释——`extract-dna.mjs` 就是因为不剥，把注释当字体名吞了（本轮实测）。 */
const stripCssComments = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '');

/* 展开 :root 变量。
 * 为什么必须做：S13 的 `lineWidths` 里有一级 `9px`，它来自
 * `border-bottom: var(--band-shade) solid var(--shade)` + `--band-shade: 9px`。
 * 不展开变量就会误判「提示词声称的值在 CSS 里查不到」——2026-10-30 第一版闸门
 * 就是这么误报的：报 S13 的 9px 不存在，实际它在 :root 里，用了 8 处。
 */
function parseRootVars(css) {
  const m = stripCssComments(css).match(/:root\s*\{([\s\S]*?)\}/);
  const out = new Map();
  if (!m) return out;
  for (const x of m[1].matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) out.set(x[1], x[2].trim());
  return out;
}
function resolveVars(v, vars, depth = 0) {
  if (depth > 8) return v;
  return v.replace(/var\((--[\w-]+)(?:\s*,\s*([^)]*))?\)/g, (_, name, fb) => {
    const hit = vars.get(name);
    return hit !== undefined ? resolveVars(hit, vars, depth + 1) : (fb || '');
  });
}

/* 求值 calc() 里的一元/二元算术。
 * 为什么需要：S27 的 `border-left: calc(var(--mis) * 2)`，`--mis: 1.8px` → 3.6px。
 * 不展开 calc，闸门就查不到 3.6，误报成「提示词编了一个值」。
 *
 * 只处理 `calc(数字px 运算符 数字px)` 这类简单形式——专门为线宽设计，
 * 不追求通用 CSS 计算。遇到不认识的形态原样返回，不猜。
 */
function evalCalc(v) {
  return v.replace(/calc\(\s*([^()]*?)\s*\)/g, (whole, expr) => {
    const m = expr.match(/^\s*(\d*\.?\d+)px\s*([*\/+\-])\s*(\d*\.?\d+)(px)?\s*$/);
    if (!m) return whole;
    const a = parseFloat(m[1]), op = m[2], b = parseFloat(m[3]);
    let r = NaN;
    if (op === '*') r = a * b;
    else if (op === '/') r = b ? a / b : NaN;
    else if (op === '+') r = a + b;
    else if (op === '-') r = a - b;
    return Number.isFinite(r) ? r + 'px' : whole;
  });
}

/* ── 机制句的数值与语义词断言（2026-11-04 加）──────────────────────────
 *
 * 为什么需要：`dna.mechanism` 是提示词里**唯一**一句结构描述，也是唯一携带
 * 本案独有数字的地方（30 条提示词共 403 个带单位 token，机制句占 141 = 35%）。
 * 而在本轮之前，**8 个 check 脚本对 `.mechanism` 的引用是 0** —— 也就是说
 * 提示词里唯一一句"这个风格长什么样"的话，从来没有被任何闸门看过一眼。
 * 后果是实测出来的：抽查 9 条机制句，5 条与实现不符（S01/S04/S07/S09/S10/S17/S25/S26）。
 *
 * 判据的边界（重要，别扩）：
 *   · **只查 `px` / `mm` / `%`**。刻意**不**查「栏/列/行/层/枚/档/倍/fr/角度」——
 *     那些在 CSS 里不是值而是**区间**（`grid-column: 1/9` 是 8 栏）或 **DOM 节点计数**
 *     （S19 的「5 行」是数出来的）。实测把它们纳入会产生 32 条 FAIL，绝大多数是误报。
 *   · **S03「9 栏」、S07「5 栏对 7 栏」这类量纲错配，这条断言抓不到**（数字确实存在，
 *     只是在 `5fr` 里）。那类只能人工改文案，已在 74-w4/00-EXECUTION-PLAN.md 逐条改过。
 *   · **三档**：声明侧命中 = PASS；只在注释里 = WARN（注释是推导依据，不是声明）；
 *     两处都没有 = FAIL。
 */

/* 词边界：`1px` 不能命中 `11.375px`，`5px` 不能命中 `25px`。
 * 这是 S10 的 `1px` 真错能被抓到、而 S07 的 `0.5px`（源码写 `.5px`）不误报的唯一防线。 */
const MECH_TOKEN_RE = /(?<![\d.])(\d+(?:\.\d+)?)\s*(px|mm|%)(?![\w])/g;

/* 从源码抽长度集合。四类都收：
 *   · `Npx` / `Nmm`
 *   · SVG 无单位 `stroke-width: N`（S09 的 3.5）
 *   · SVG 无单位 `r="N"` / `rx` / `ry`（S17 的 1.2）
 *   · `opacity: .NN` 归一成 `NN%`（S07 的 `.14` ↔ 14%）
 * ⚠️ 无单位容差**不能扩到坐标属性**（`x`/`y`/`x1`/`width`/`height`）：
 *    实测那样做会让 S10 的 `1px` 被 `x1="1"` 吸收、S17 的 `96px` 被 `y="96"` 吸收，
 *    两条真错当场消失。 */
function mechSourceNumbers(src, vars) {
  const len = new Set();
  const pct = new Set();
  const push = (v) => { const n = Number(v); if (Number.isFinite(n)) len.add(n.toFixed(2)); };

  for (const m of src.matchAll(/(?<![\w-])(\d*\.?\d+)\s*(px|mm)(?![\w])/g)) push(m[1]);
  for (const m of src.matchAll(/stroke-width\s*[:=]\s*["']?(\d*\.?\d+)/g)) push(m[1]);
  for (const m of src.matchAll(/\b(?:r|rx|ry)\s*[:=]\s*["'](\d*\.?\d+)["']/g)) push(m[1]);
  for (const m of src.matchAll(/(\d*\.?\d+)\s*%/g)) {
    const n = Number(m[1]); if (Number.isFinite(n)) pct.add(n.toFixed(2));
  }
  /* opacity 归一：`opacity: .14` / `opacity:min(.14, ...)` 两种写法都要认。
   * 后者的 `.14` 在一个函数调用里，简单的 `opacity\s*:\s*(\.\d+)` 抓不到 ——
   * S07 的「8% 至 14%」正是这种（`style.css:107` 的 `min(.14, calc(...))`）。 */
  for (const m of src.matchAll(/opacity\s*:\s*[^;{}]*?(\d*\.\d+)/g)) {
    const n = Number(m[1]);
    if (Number.isFinite(n) && n > 0 && n <= 1) pct.add((n * 100).toFixed(2));
  }
  /* HTML/JS 里内联声明的 `opacity:.NN` 同样归一 */
  for (const m of src.matchAll(/opacity\s*=\s*["']?(\d*\.\d+)/g)) {
    const n = Number(m[1]);
    if (Number.isFinite(n) && n > 0 && n <= 1) pct.add((n * 100).toFixed(2));
  }
  /* :root 变量展开：`--x: 3.5px` 已由上面的通用 px 扫描收进；这里补 var() 引用处的间接值 */
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      if (!k) continue;
      const m = String(v).match(/^(\d*\.?\d+)\s*(px|mm)?$/);
      if (m) push(m[1]);
    }
  }
  return { len, pct };
}

/* JS 体里的裸数字（含小数），单独成一个集合 —— 上面的 mechSourceNumbers 不收 script 体，
 * 因为它要区分「声明」和「注释」。这里专供「机制句的数字是否在实现里出现过」这条用。 */
function jsBareNumbers(html) {
  const out = new Set();
  const scripts = html.match(/<script[\s\S]*?<\/script>/gi) || [];
  for (const s of scripts) {
    for (const m of s.matchAll(/(?<![\w.])(\d*\.?\d+)(?![\w.])/g)) {
      const n = Number(m[1]);
      if (Number.isFinite(n)) out.add(n.toFixed(2));
    }
  }
  return out;
}

/* 语义名词：机制句里出现这些词，源码里必须真的用到了对应能力。
 * 只放**已经实测踩过坑**的词，不做禁词表 —— 禁词表是下一个 §9.15。 */
const MECH_VOCAB = ['焦距', '相位', '透印', '凹印'];
function mechVocabHits(mech) {
  return MECH_VOCAB.filter((w) => mech.includes(w));
}

/* 从 style.css 抽「真实声明过的」颜色（:root 变量 + 裸 hex），剥注释后 */
function cssColors(css) {
  const clean = stripCssComments(css);  return new Set(hexes(clean));
}

/* 抽 CSS 里真实声明的线宽。
 *
 * 口径必须与 `clean-dna.mjs` / `extract-dna.mjs` 的抽取保持一致，否则闸门会误报
 * 「提示词说的和 CSS 不符」。2026-10-30 第一版漏了四类，各误报一个案：
 *   ① `var(--x)` 变量 → S13 的 9px（用了 8 处）
 *   ② `column-rule`   → S07 的 0.5px
 *   ③ `stroke-width` 的 CSS 写法 → S27 的 3px / 1.6px
 *   ④ HTML 属性与 JS 计算值 → S03 的 1.2px / 1.5px
 * 漏掉一个就会指着正确的数据说它错。这个教训值得写在这里。
 *
 * ⚠️ 另有一条更根本的口径事实（EXEC-B 指出，我实测确认）：
 * **不要用「渲染实测」来验收 border 线宽，物理上对不上。**
 * Chrome 在 dpr=1 下把 `border-width` 量化成 `max(1, floor(w))`，不是四舍五入：
 *
 *   声明 0.35/0.4/0.5/0.6/0.8/1.1/1.2/1.25/1.4/1.5/1.6/1.7 → computed 全是 1px
 *   声明 2.4/2.5 → 2px    3.2/3.5/3.6 → 3px    5.5 → 5px    14.5 → 14px
 *   `stroke-width` 则**完全不量化**（28/28 原样）
 *
 * 实测（`deliverables/70-plan/LEAD-test-quantization.mjs`，28 档）：
 *   border: floor 吻合 28/28，round 吻合 20/28
 * 所以「提示词声称的值必须能在渲染里 ±0.05 找到」这个判据对 border 是错的。
 * **本闸门因此只做「源码对账」——读 `style.css` / `index.html` 的字面声明，
 * 不读 `getComputedStyle`。** 源码里写的是设计意图，那才是提示词该复述的东西；
 * 浏览器渲染成 1px 是实现细节。
 */
function cssLineWidths(css) {
  const clean = stripCssComments(css);
  const vars = parseRootVars(css);
  const out = new Set();
  // 覆盖 border / border-top / border-top-width / outline / outline-width / column-rule / stroke-width
  const PROP_RE = /(?:^|[;{\s])(border(?:-(?:top|right|bottom|left))?(?:-width)?|outline(?:-width)?|column-rule(?:-width)?|stroke-width)\s*:\s*([^;}]+)/g;
  for (const m of clean.matchAll(PROP_RE)) {
    const resolved = evalCalc(resolveVars(m[2], vars));
    /* `stroke-width` 是 SVG 属性，**单位可以省略**：`stroke-width: 1.1` 就是 1.1 用户单位。
     * 2026-10-30 第二版闸门漏了这一点，误报 S04 的 1.1px、S09 的 3.5/3.6px、
     * S11 的 1.25px 共 9 条 FAIL —— 全部是数据正确、闸门错。
     * 这是本轮第 3 个「工具口径比被测数据窄」的错误，记在这里。 */
    const isSvgWidth = /stroke-width$/i.test(m[1]);
    const w = isSvgWidth
      ? (resolved.match(/(?:^|\s)(\d*\.?\d+)(?:px)?\s*(?:$|[;}\s])/) || resolved.match(/(?:^|\s)(\d*\.?\d+)/))
      : resolved.match(/(?:^|\s)(\d*\.?\d+)px/);
    if (w && +w[1] > 0 && +w[1] <= 40) out.add(parseFloat(w[1]));
  }
  // HTML 里的 stroke-width 属性也写在这个函数里读不到，交给 htmlLineWidths

  /* repeating-linear-gradient 里的线宽。
   * 2026-11-14：抽取器（clean-dna.mjs ④）补上 gradient 之后，S31 的提示词变成
   * 「1px、1.5px」（真实值：次刻度 1px、主刻度 1.5px，都只在 gradient 里）。
   * 而闸门这一侧还在只看 border/outline，于是报「1.5px 查不到」——
   * **闸门与抽取器共享同一个盲点**，两边都"对"，其实都错。
   * 这类错误的特征：修好被测对象之后，闸门反而变红。看到这种红，先怀疑闸门。
   *
   * 判据与抽取器一致：双偏移色标（`color A B`）的硬停区间就是一条线，宽度 B-A；
   * 不看 transparent（那是间隙）；不断言 @media 归属（闸门只查存在性，
   * 抽取器那边才需要判断桌面作用域）。 */
  {
    const lower = clean.toLowerCase();
    const tag = "repeating-linear-gradient(";
    let at = lower.indexOf(tag);
    while (at >= 0) {
      let i = at + tag.length, depth = 1;
      while (i < clean.length && depth > 0) {
        if (clean[i] === "(") depth++;
        else if (clean[i] === ")") depth--;
        if (depth === 0) break;
        i++;
      }
      const body = resolveVars(clean.slice(at + tag.length, i), vars);
      /* 按括号深度切色标 */
      const stops = [];
      let d = 0, cur = "";
      for (const ch of body) {
        if (ch === "(") d++;
        if (ch === ")") d--;
        if (ch === "," && d === 0) { if (cur.trim()) stops.push(cur.trim()); cur = ""; continue; }
        cur += ch;
      }
      if (cur.trim()) stops.push(cur.trim());
      for (const s of stops) {
        /* 偏移：带 px 的，以及不带单位的 0（`color 0 1px`） */
        const offs = [];
        for (const m2 of s.matchAll(/(^|\s)(-?[0-9.]+)(px)?(?=\s|$)/g)) {
          if (m2[3] === "px") offs.push(parseFloat(m2[2]));
          else if (parseFloat(m2[2]) === 0) offs.push(0);
        }
        if (offs.length < 2) continue;
        /* 颜色名：去掉偏移 token 后剩下的第一个词；transparent 是间隙 */
        const name = s.replace(/(^|\s)(-?[0-9.]+)(px)?(?=\s|$)/g, " ").replace(/\s+/g, " ").trim().split(" ")[0] || "";
        if (/^(transparent|none|currentcolor)$/i.test(name)) continue;
        const w = offs[1] - offs[0];
        if (w > 0 && w <= 8) out.add(Math.round(w * 100) / 100);
      }
      at = lower.indexOf(tag, i + 1);
    }
  }
  return [...out].sort((a, b) => a - b);
}

/* HTML 里的 stroke-width 属性 */
function htmlLineWidths(html) {
  const out = new Set();
  for (const m of html.matchAll(/stroke-width\s*=\s*["']?(\d*\.?\d+)/g)) {
    if (+m[1] > 0 && +m[1] <= 40) out.add(+m[1]);
  }
  return [...out].sort((a, b) => a - b);
}

/* HTML 内联 <script> 里 JS 计算的 stroke-width。
 * 例如 S03 的 `line(..., major ? 1.5 : 1)` —— 1.5px 只在 JS 里，CSS 里没有。
 * 这是 clean-dna.mjs 已经处理的第九类来源，闸门也要跟。
 */
function jsLineWidths(html) {
  const out = new Set();
  // setAttribute("stroke-width", N)
  for (const m of html.matchAll(/setAttribute\(\s*["']stroke-width["']\s*,\s*([0-9.]+)/g)) {
    if (+m[1] > 0 && +m[1] <= 40) out.add(+m[1]);
  }
  // 三元/默认参里的候选值：xxx ? A : B —— 只取带 stroke/width/line 语境的
  for (const m of html.matchAll(/(?:major|minor|thin|thick|w)\s*\?\s*([0-9.]+)\s*:\s*([0-9.]+)/g)) {
    for (const v of [m[1], m[2]]) if (+v > 0 && +v <= 40) out.add(+v);
  }
  return [...out].sort((a, b) => a - b);
}

/* ── 检查项 ──────────────────────────────────────────────────────────── */
const findings = [];
const add = (level, id, rule, msg) => findings.push({ level, id, rule, msg });

const stats = {
  source: 'prototypes/_selection/prompts.js + prompt-copy.js vs prototypes/Sxx/style.css + index.html',
  cases: DIRS.length,
  promptLen: { min: 1e9, max: 0, median: 0 },
  paletteHexTotal: 0,
  fail: 0, warn: 0, pass: 0,
};

const lens = [];
const offPaletteAll = [];
const lwMismatch = [];

for (const d of DIRS) {
  const id = d.slice(0, 3);
  const css = readFileSync(join(PROTOS, d, 'style.css'), 'utf8');
  const html = readFileSync(join(PROTOS, d, 'index.html'), 'utf8');

  let text = '';
  if (typeof buildStylePrompt === 'function') {
    try { text = buildStylePrompt(id) || ''; } catch (e) { add('FAIL', id, 'prompt-build', `buildStylePrompt 抛错: ${e.message.slice(0, 100)}`); continue; }
  }
  if (!text || text.length < 500) {
    add('FAIL', id, 'prompt-missing', `提示词缺失或过短（${text.length} 字）`);
    continue;
  }
  lens.push(text.length);

  /* ── 0c. 机制句必须含至少一个带单位的可测值（2026-11-13 加，D3）──────
   *
   * 起因是一个对照实验（deliverables/78-northstar/07-NEGATIVE-B.md）：
   * 把 S31 提示词里的全部数值删掉、只保留文字描述（「主刻度的间隔宽、刻线长而粗」），
   * 同一个模型、同样的环境，跑了 2 小时、44,788 thinking token，**一个文件都没写**。
   *
   * 而泛化的描述（「干净、现代、留白充足」）反而能做出 466 行 ——
   * 说明失败形态不是「没数值」，而是「具体到需要精确值，却没给值」。
   *
   * 机制句是这些值的**唯一**承载体：实测 35 案里 33 案的可测值
   * 只出现在机制句这一句话里，结构化字段（lineWidths / h1Size …）并不复述它们。
   * 所以机制句一旦丢了数字，提示词会静默失效 —— 读起来完全正常，模型却做不出来。
   *
   * 判据：机制句里至少有一个「数字 + 单位」或「a:b」比例。
   * 这条不判数字对不对（那是其他断言的事），只判「还有没有可测的东西」。 */
  {
    const mechM = text.match(/这个风格的签名动作：([^\n]*)/);
    const body = mechM ? mechM[1] : '';
    if (!body) {
      add('FAIL', id, 'mech-missing', '提示词里找不到「这个风格的签名动作：」这一句');
    } else {
      const hasUnit = /\d+(?:\.\d+)?\s*(?:px|vw|fr|mm|%|deg|°)/.test(body);
      const hasRatio = /\b\d+:\d+/.test(body);
      if (!hasUnit && !hasRatio) {
        add('FAIL', id, 'mech-no-measurable',
          '机制句里一个带单位的可测值都没有 —— 这种「具体但无数值」的提示词会让模型卡住' +
          '（实测：删掉数值后 2 小时零产物）。机制句：' + body.slice(0, 60));
      }
    }
  }

  /* ── 0d. 机制句的线宽值必须与档位表相容（2026-11-13 加，D4）──────────
   *
   * 起因：S31 的提示词自相矛盾。
   *
   *   机制句：「主刻度每 60px、长 34px、**3px 宽**…」
   *   第 5 条：「线宽只用这几级：**1px**，全站线条都从这几级里取。」
   *
   * 两句话要求了两件冲突的事。模型选了机制句那一句、用了 3px，
   * 然后在「线宽是否都在档位表内」这条上被判违规
   * （实测 S31 用了档位表外的 3px，档位表只有 1px）。
   *
   * 这不是模型不听话，是提示词给了它一个不可能同时满足的约束。
   * 规划 Agent 实测 35 份里有 2 份同类矛盾（S27、S31）。
   *
   * 判据：机制句里所有 `Npx` 的 N，若档位表非空，必须能在档位表里找到
   * （允许向上取整，因为 Chrome 会把 0.5px 算成 1px）。
   *
   * 注意只查 px —— 机制句里的 vw / fr / % 不是线宽，不该跟档位表比。 */
  {
    const mechM = text.match(/这个风格的签名动作：([^\n]*)/);
    const lwM = text.match(/5\.\s*线宽只用这几级：([^，,\n]*)/);
    if (mechM && lwM) {
      const mechPx = [...mechM[1].matchAll(/(\d+(?:\.\d+)?)\s*px/g)].map((m) => parseFloat(m[1]));
      const scale = [...lwM[1].matchAll(/(\d+(?:\.\d+)?)\s*px/g)].map((m) => parseFloat(m[1]));
      if (mechPx.length && scale.length) {
        /* 机制句里的 px 有相当一部分是字号 / 间距 / 轴宽，不全是线宽。
         * 第一版我抓 `(\d+)px 宽`，结果假阳性 4 案：
         *   S03「264px 宽的纵向刻度轴」—— 那是轴宽
         *   S22「88px 宽」、S29「48px」—— 同理
         * 只有 S31 的「3px 宽 / 2px 宽」是真的在说刻度线。
         *
         * 更可靠的判据：机制句里凡出现「线宽」「刻线」「边框」这类词附近的 px 才查。
         * 退一步：只在同一句里同时出现「3px 宽」与「刻线/线/边框/描边」时判。
         * 这样漏报多于误报 —— 但漏报只是少抓一个矛盾，误报会让 4 个案子凭空变红。 */
        const widths = [];
        for (const m of mechM[1].matchAll(/(\d+(?:\.\d+)?)\s*px\s*宽/g)) {
          const idx = m.index ?? 0;
          const around = mechM[1].slice(Math.max(0, idx - 30), idx + 30);
          /* 还要排除「轴 / 栏 / 版心」这类语境 —— S03 的「264px 宽的纵向刻度轴」是轴宽，不是线宽。 */
          const isAxis = /轴|栏宽|版心|轨宽/.test(around);
          if (!isAxis && /刻线|刻度|尺规|线宽|边框|描边|线条/.test(around)) widths.push(parseFloat(m[1]));
        }
        const bad = widths.filter((w) => !scale.some((n) => Math.abs(w - n) < 0.01 || Math.abs(w - Math.ceil(n)) < 0.01));
        if (bad.length) {
          add('FAIL', id, 'mech-width-vs-scale',
            `机制句要求 ${bad.join('/')}px 宽的线，而第 5 条档位表只有 ${scale.join('/')}px —— ` +
            '提示词自相矛盾，模型无论照哪一句都会违反另一句');
        }
      }
    }
  }

  /* ── 0b. minPics 的提示词与实测必须一致（2026-11-12 加，D2）──────────
   *
   * 起因：`build-prompts.mjs:327` 原写 `(cap && cap.minPics) || h.minPics`。
   * `0` 是 falsy，于是「实测 0 张图」被当成「没有实测值」，回退到人工估计 3。
   * S34「石墨零图索引」因此拿到一句「至少要 3 个不同的图片位置」——
   * 往一个刻意零图的设计里要求放 3 张图。而提示词本身读起来完全正常。
   *
   * 判据：提示词里的「至少要 N 个图片位置」那个 N，必须等于
   * `minitems-parsed.json` 里该案的实测 minPics（0 时提示词应**没有**这句）。
   * 这条能同时抓住三类错：
   *   · falsy-0 回退（实测 0，提示词说 3）
   *   · 生成器与解析器口径分叉
   *   · 有人手改了 HUMAN 表却没重跑 */
  {
    const mpFile = join(ROOT, 'prototypes/_prompts/minitems-parsed.json');
    let mpById = {};
    try {
      for (const x of JSON.parse(readFileSync(mpFile, 'utf8'))) mpById[x.id] = x.minPics;
    } catch { /* 读不到就不查，下面不会产生假结论 */ }
    const measured = mpById[id];
    const m = text.match(/版式里至少要\s*(\d+)\s*个\*?\*?不同的\*?\*?图片位置/);
    const claimed = m ? Number(m[1]) : null;
    if (measured !== undefined) {
      if (measured === 0 && claimed !== null) {
        add('FAIL', id, 'minpics-falsy-zero',
          `实测 minPics=0（零图设计）但提示词要求「至少 ${claimed} 个图片位置」——` +
          '这是 build-prompts 的 falsy-0 回退，会要求模型往零图设计里放图');
      } else if (measured > 0 && claimed === null) {
        add('FAIL', id, 'minpics-missing-claim',
          `实测 minPics=${measured} 但提示词里没有「至少要 N 个图片位置」这句 —— 模型不知道该放几张`);
      } else if (claimed !== null && claimed !== measured) {
        add('FAIL', id, 'minpics-mismatch',
          `提示词说 ${claimed} 个图片位置，实测 minPics=${measured} —— 两处口径分叉`);
      }
    }
  }

  /* ── 0. plain 非空且可读（2026-11-12 加，D1）─────────────────────────
   *
   * 起因：S31–S35 是 Q2 新建的 5 个案子，建案时没同步加进 build-prompts.mjs 的
   * HUMAN 手写表，于是取值落到 `HUMAN[d.id] || { plain: "", … }` 的兜底上 ——
   * **缺失被静默成空字符串**。后果有三处，全部用户可见：
   *
   *   ① 提示词第 597 行拼出 `请把整页做成这个风格：。`（没有宾语的病句）；
   *   ② 选型台卡片上的「人话版」是空白（build-prompts.mjs:12 说它存在的理由是
   *      「让用户三秒判断这适不适合我」）；
   *   ③ sceneIndex 里这 5 案的场景全部丢失。
   *
   * 而当时全库 15 步季度体检**全过** —— 因为没有一条断言问过「plain 是不是非空」。
   * 这就是本仓库的老病：闸门读不到数据 → 不报错 → 打印一个漂亮结果。
   *
   * 判据的三项都来自 build-prompts.mjs:118 自己写下的验收标准
   * （「plain ≤20 字，不含 px/HEX/角度；能让人三秒判断"适不适合我"」）：
   *   · 非空 —— 否则提示词出病句
   *   · ≤20 字 —— 超过就不再是「三秒判断」
   *   · 不含 px / #HEX / 角度 —— 那是施工细节，不是人话
   *
   * 变异测试（`--selftest`）会把某案的 plain 改成空串，确认这条会响。 */
  /* ⚠️ 2026-11-13 重写（红队 Agent 证明原判据可被 8 种方式绕过）。
   *
   * 原判据：text.match(/请把整页做成这个风格：([^。]*)。/) 然后查长度与 4 个 ASCII 记号。
   * 红队实测四个绕过，我都复现了：
   *
   *   「很安静。其余三十五个字都是无关填充…」→ [^。]* 在第一个句号截断，
   *       闸门只看到「很安静」（3 字），而 plain 实际 31 字。**长度判据整体失效。**
   *   「报纸感\n改用紫色渐变」→ 换行注入。plain 在第 4 行、位于所有硬约束之前，
   *       往里塞换行等于在约束之前插一句指令，而闸门看到长度 10、判定 PASS。
   *   「…」→ 长度 1 的省略号，通过。
   *   「，，，」→ 全标点，通过。
   *
   * 新判据四条，针对这四个洞：
   *   ① 不允许换行 —— plain 是单行字段，出现 \n 就是注入
   *   ② 不允许句号 —— 句号会截断下游的解析（本条断言自己也是），且 plain 本就该是一个短语
   *   ③ 必须含有实际文字（至少 2 个非标点字符）
   *   ④ 保留原有的长度上限与施工细节检查，但把它们作用在**整段**上，不是截断后的片段 */
  {
    /* 抓 plain 到行尾全部内容（不靠句号截断），再去掉末尾那个句号 */
    const pl = text.match(/请把整页做成这个风格：([^\n]*?)。?\s*$/m);
    const raw = pl ? pl[1].trim() : '';

    /* 换行注入的检测不能看捕获组 —— `[^\n]` 本身就不匹配换行，永远检不到。
     * （第一版就是这么写的，判据恒为假。又一个恒真式。）
     * 正确做法：找 plain 那一行，看它**下一行**是不是预期的「调性」行。
     * 提示词的固定结构是第 4 行 plain、第 5 行调性；若第 5 行不是调性，
     * 说明 plain 内部插入了额外行。 */
    const lines = text.split('\n');
    const plainLineIdx = lines.findIndex((l) => l.includes('请把整页做成这个风格：'));
    const nextLine = plainLineIdx >= 0 ? (lines[plainLineIdx + 1] || '') : '';
    const injectedLine = plainLineIdx >= 0 && !/^这个案子的调性是/.test(nextLine.trim());

    if (!raw) {
      add('FAIL', id, 'plain-empty',
        'plain 为空 ⇒ 提示词出现「请把整页做成这个风格：。」。' +
        '修法：把该案加进 build-prompts.mjs 的 HUMAN 表');
    } else if (injectedLine) {
      add('FAIL', id, 'plain-multiline',
        `plain 之后的行不是预期的「调性」行 —— plain 里被插入了额外内容。` +
        `下一行是：${nextLine.slice(0, 40)}`);
    } else if (/[。！？；]/.test(raw)) {
      add('FAIL', id, 'plain-ends-sentence',
        `plain 含句末标点（。！？；），会在下游解析处截断：${raw}`);
    } else if (raw.replace(/[，、,.·…\-—\s"'「」『』()（）]/g, '').length < 2) {
      add('FAIL', id, 'plain-no-content',
        `plain 去掉标点后不足 2 个字符，用户读不出信息：${raw}`);
    } else if (raw.length > 20) {
      add('FAIL', id, 'plain-too-long', `plain ${raw.length} 字，超过 20 字（不再是「三秒判断」）：${raw}`);
    } else if (/px|#[0-9A-Fa-f]{3,6}|°|度角|度[，、。]|像素|字体|字号|＃[0-9A-Fa-f]{3,6}/.test(raw)) {
      add('FAIL', id, 'plain-not-human', `plain 含施工细节（px/HEX/角度/像素/字号），不是人话：${raw}`);
    } else if (/锟斤拷|烫烫烫|屯屯屯|[�]/.test(raw)) {
      /* 乱码检测：这几个串是 GBK/UTF-8 互转失败的经典产物，不可能是人写的中文。
       * � 是替换字符，说明上游某处已经坏了。 */
      add('FAIL', id, 'plain-garbled', `plain 是乱码（编码转换失败的特征串）：${raw}`);
    }
  }

  /* ── 1. 提示词里的色值 vs style.css 真实声明的色值 ────────────────────
   * 判据：提示词配色段列出的每个 hex，必须能在 style.css（剥注释后）里找到声明。
   * 反方向不查——CSS 里可以有大量派生色，提示词不必全列（那是设计选择）。
   */
  const palLine = text.match(/1\.\s*配色只用这几个值：([^\n]*)/);
  if (!palLine) {
    add('FAIL', id, 'palette-line', '找不到「配色只用这几个值」这一句');
  } else {
    const palHex = hexes(palLine[1]);
    stats.paletteHexTotal += palHex.length;
    const cssHex = cssColors(css);
    const htmlHex = new Set(hexes(stripCssComments(html)));
    const missing = palHex.filter((h) => !cssHex.has(h) && !htmlHex.has(h));
    if (missing.length) {
      add('FAIL', id, 'palette-not-in-css', `提示词列了 ${missing.length} 个 color，但 style.css/index.html 里查不到声明: ${missing.join(' ')}`);
    }
    if (palHex.length === 0) add('FAIL', id, 'palette-empty', '配色段一个 hex 都没有');
  }

  /* ── 2. 提示词里的线宽 vs CSS+HTML 真实声明的线宽 ────────────────────
   * 判据：提示词列的每一级必须真实存在（允许 ±0.02 误差）。
   * 反过来：CSS 里出现 ≥3 次的线宽也应在提示词里（出现次数需要渲染，这里只查存在性）。
   */
  const lwLine = text.match(/线宽只用这几级：([^，,\n]*)/);
  if (lwLine) {
    const claimed = (lwLine[1].match(/[\d.]+/g) || []).map(Number);
    const actualCss = cssLineWidths(css);
    const actualHtml = htmlLineWidths(html);
    const actualJs = jsLineWidths(html);
    const actualAll = [...new Set([...actualCss, ...actualHtml, ...actualJs])].sort((a, b) => a - b);
    const notInCss = claimed.filter((c) => !actualAll.some((a) => Math.abs(a - c) < 0.02));
    if (notInCss.length) {
      add('FAIL', id, 'linewidth-not-in-css', `提示词说线宽有 ${notInCss.join('、')}px，但 CSS/HTML 里查不到: 实际[${actualAll.join('、')}]`);
      lwMismatch.push({ id, claimed, actual: actualAll, notInCss });
    }
    // 措辞自相矛盾：列了 ≥3 级却说「不要自创第三级」
    if (claimed.length >= 3 && /不要自创第三级/.test(text)) {
      add('WARN', id, 'linewidth-wording', `列了 ${claimed.length} 级（${claimed.join('、')}）却说「不要自创第三级」`);
    }
  }

  /* ── 3. 配色段之外的 hex：只对**否定语境**报警 ────────────────────────
   *
   * 这条抓的是「提示词的否定句里点名禁色」。批判 Agent + 检索 Agent 都指出：
   * Semantic Gravity Wells（arXiv 2601.08070, n=40,000）实测 87.5% 的违规发生在
   * 「明确点名被禁词」时——「不要用 #6366F1」会**提高** AI 使用它的概率。
   *
   * 2026-10-30 首版对**所有**段外 hex 报警，30/30 全中；EXEC-B 把 8 条禁令改写成
   * 正向处方后降到 1 条（S25）。而 S25 那条是技术说明不是否定句：
   *
   *   「第三色由运行时的 mix-blend-mode: multiply 在两版相压处真算（构建期不固色），
   *     实测 #181C0D」
   *
   * 这是在描述**一个必须存在的派生色**，删掉它 AI 就不知道要用 multiply 真算而不是
   * 用 opacity 假装叠印。误报。
   *
   * 所以判据收紧为：只对「出现在否定词附近的 hex」报警。否定词取实际用到的那些，
   * 不含「实测 / 真算 / 由…算」这类技术说明语境。
   */
  const allHex = hexes(text);
  const palHexOnly = palLine ? hexes(palLine[1]) : [];
  const extra = allHex.filter((h) => !palHexOnly.includes(h));
  const NEG_RE = /(不要|禁止|避免|不得|反的是|不允许|别用|勿用|拒绝|规避)/;
  const suspicious = extra.filter((h) => {
    // 取该 hex 在全文里的每一处上下文，只要有任意一处落在否定语境附近就报
    let idx = -1;
    while ((idx = text.indexOf(h, idx + 1)) >= 0) {
      const win = text.slice(Math.max(0, idx - 40), idx + h.length + 40);
      if (NEG_RE.test(win)) return true;
    }
    return false;
  });
  if (suspicious.length) {
    add('WARN', id, 'hex-in-negative-context',
      `配色段之外有 ${suspicious.length} 个 hex 出现在否定语境里: ${suspicious.join(' ')}（按 arXiv 2601.08070 实测，点名禁词会提高 87.5% 的违规率 → 改写成正向处方）`);
  }
  // 段外但属技术说明的，单独记一条低优先提示，不计入 WARN 数
  const benign = extra.filter((h) => !suspicious.includes(h));
  if (benign.length) {
    add('INFO', id, 'hex-outside-palette-line',
      `配色段之外还有 ${benign.length} 个 hex，均为技术说明（派生色/混合结果），不是否定句: ${benign.join(' ')}`);
  }

  /* ── 4. 字号：提示词是否给了任何排版尺度信息 ──────────────────────────
   * 本轮实测：h1Size 进了提示词的案 = 0/30（prompt-copy.js:284 在死分支里）。
   * 这条只报 WARN，因为「该不该给字号」本身是个待裁决的设计问题。
   */
  if (!/字号|字阶|最大标题|主标题取|font-size/.test(text)) {
    add('WARN', id, 'no-typescale', '提示词没有任何字号/字阶信息');
  }

  /* ── 5. 机制句的数值 vs style.css / index.html（2026-11-04 加）────────
   * 见 mechSourceNumbers 上方的长注释。三档判定：声明侧 PASS / 仅注释 WARN / 都没有 FAIL。
   *
   * ⚠️ 机制句要从 `STYLE_PROMPTS.schemes[i].dna.mechanism` 取 —— `d` 是**目录名字符串**，
   * 不是案件对象。第一版这里写成 `d.mechanism` 得到 undefined，整块断言静默跳过，
   * 闸门照样打印「FAIL 0」。那是本仓库反复在治的病（闸门看起来绿、其实没跑），
   * 所以下面加了一条 `mech-empty` 断言：30 案里任何一案取不到机制句都要报，不许静默。
   */
  const mechEntry = ((STYLE_PROMPTS && STYLE_PROMPTS.schemes) || []).find((x) => x.id === id);
  const mech = ((mechEntry && mechEntry.dna && mechEntry.dna.mechanism) || '').trim();
  if (!mech) {
    add('FAIL', id, 'mech-empty', '取不到 dna.mechanism（STYLE_PROMPTS.schemes 里没有该案，或 dna.mechanism 为空）');
    /* ── 2026-11-17：机制句缺失时，兜底分支必须真的能兜住 ─────────────
     *
     * `prompt-copy.js:472-481` 有一条兜底：mechanism 为空时用
     * 「这个风格的签名动作：{plain}。具体到实现：{facts}。」拼一句，
     * 而 facts 里依赖 radius / shadow / lineWidths / **h1Size** 四个字段。
     *
     * 这正是 h1Size 唯一还活着的路径（主路径用 h1SizeAt1440）。
     * 实测：清空 S13 的 mechanism 后，签名动作行确实出现
     * 「首屏主标题取 56px 这一档」；把 h1Size 改成 999px，那句跟着变。
     *
     * 所以机制句缺失时，必须确认兜底拼出来的话**不是一句空壳** ——
     * 否则用户会拿到「具体到实现：。」这种残句。 */
    if (typeof buildStylePrompt === 'function') {
      let tb = '';
      try { tb = buildStylePrompt(id, { biz: '一家咖啡店', action: '下单买豆子' }) || ''; } catch { /* 上面已报 */ }
      const ml = tb.split('\n').find((l) => /这个风格的签名动作/.test(l)) || '';
      if (ml && /具体到实现：\s*。?\s*$/.test(ml)) {
        add('FAIL', id, 'mech-fallback-empty',
          '机制句缺失且兜底的 facts 一个都没拼出来，用户会读到「具体到实现：。」这种残句');
      }
    }
  }
  if (mech) {
    const vars = parseRootVars(css);
    /* 声明侧：剥掉 CSS 注释 + HTML 注释 + <script> 体 */
    const declSrc = stripCssComments(css) + '\n' +
      stripCssComments(html.replace(/<script[\s\S]*?<\/script>/gi, ' '));
    /* 注释侧：只取注释体 */
    const commSrc = (css.match(/\/\*[\s\S]*?\*\//g) || []).join('\n') + '\n' +
      (html.match(/<!--[\s\S]*?-->/g) || []).join('\n');
    const decl = mechSourceNumbers(declSrc, vars);
    const comm = mechSourceNumbers(commSrc, vars);
    /* JS 里算出来的量（S03 的 1.5 / 0.5 这类）。见 jsBareNumbers 的注释：
     * 这条放宽是为了不让「机制句正确但值在 JS 里」被误判。 */
    const jsNums = jsBareNumbers(html);

    for (const m of mech.matchAll(MECH_TOKEN_RE)) {
      const raw = m[0].trim();
      const val = Number(m[1]).toFixed(2);
      const isPct = m[2] === '%';
      const inDecl = isPct ? decl.pct.has(val) : decl.len.has(val);
      if (inDecl) continue;
      const inComm = isPct ? comm.pct.has(val) : comm.len.has(val);
      if (inComm) {
        /* 仅在注释里：说明这个值是从代码/滤镜参数反推的推导值，实现里没有对应声明。
           这是 WARN 不是 FAIL —— 它没错，但也没有声明在守护它。文案必须说清这一点，
           否则下一个人会去改正确的数字。 */
        add('WARN', id, 'mech-value-comment-only',
          `机制句的「${raw}」只在该案注释里找到（不是声明）。它是推导值，没有声明佐证 —— 不是错，但也没被守护`);
      } else if (jsNums.has(val)) {
        /* 值在 <script> 体里出现过（S03 的 `major ? 1.5 : 1`、`rel * 0.5`）。
           它确实在实现里，只是不是一条 CSS 声明。同样降 WARN，理由同上。 */
        add('WARN', id, 'mech-value-in-script-only',
          `机制句的「${raw}」只在该案 <script> 体里出现（JS 算出来的量，不是 CSS 声明）`);
      } else {
        add('FAIL', id, 'mech-value-not-in-source',
          `机制句的「${raw}」在该案 style.css / index.html（声明侧与注释侧）都找不到`);
      }
    }

    /* 语义词：机制句提到某工艺，源码里必须有对应实现（S03「焦距」是唯一的现存违规） */
    for (const w of mechVocabHits(mech)) {
      const all = declSrc + '\n' + commSrc + '\n' + (d.appjs || '');
      let has = all.includes(w);
      if (!has) {
        /* app.js 可能单独成文件（S07），补读一次 */
        try { has = readFileSync(join(PROTOS, d, 'app.js'), 'utf8').includes(w); } catch { /* 没有就算了 */ }
      }
      if (!has) {
        add('FAIL', id, 'mech-vocab-unimplemented',
          `机制句用了「${w}」，但该案 style.css / index.html / app.js 里没有这个概念的实现`);
      }
    }
  }

  /* 机制句里每个「N 栏 / N 列」都打印成 INFO —— **不判定对错**，只让人看见。
   * 为什么不断言：S03「9 栏」、S07「5 栏对 7 栏」这类是**量纲错配**，数字真实存在于
   * `5fr 1px 7fr` 里，任何存在性检查都抓不到；而硬去数 `column-count`/`repeat(N)` 会产生
   * 大量误报（`栏` 在 CSS 里是区间 `grid-column:1/9` 或 DOM 节点计数，不是值）。
   * 实测把「栏/行/层」纳入断言 → 32 条 FAIL，绝大多数是误报。
   * 所以这里只做一件事：**让这类数字在每次跑闸门时出现在人眼前**，
   * 而不是假装它被守住了。人工改文案的清单在 `deliverables/74-w4/00-EXECUTION-PLAN.md`。 */
  if (mech) {
    const colClaims = [...mech.matchAll(/(\d+)\s*[栏列]/g)].map((m) => m[0]);
    if (colClaims.length) {
      add('INFO', id, 'mech-column-claim-unchecked',
        `机制句里的栏/列声明未自动核对（量纲错配无法用存在性检查捕获）：${colClaims.join(' ')}`);
    }
  }

  /* ── T-11 / T-12 / W-02：字号条必须把三个数都说出来（2026-11-15 加）────────
   *
   * 起因（实测，不是推测）：把某案的 `bodySize` 清空后，提示词第 6 条从
   *
   *   「6. 字号：正文约 15px；最大标题要压到正文的 3.7 倍（约 56px）。
   *     比这更小就撑不出这个版式——这是本案最容易被做塌的一处。」
   *
   * **静默降级**成
   *
   *   「6. 字号：最大标题取 56px 这一档，比这更小就撑不出这个版式的气势。」
   *
   * 而当时整个闸门报 FAIL 0 / WARN 1（与正常态完全相同）。
   *
   * 为什么现有断言拦不住：`prompt-copy.js:665` 起的第 6 条是一个 IIFE，
   * `body > 0` 为假时**仍然返回一行**。所以「第 6 条存在」恒真，
   * 而「第 6 条说清了正文值与倍率」没有任何断言。`no-typescale` 那条 WARN
   * （下面第 4 段）也查不出来 —— 降级句里还有「最大标题」四个字，
   * `/字号|字阶|最大标题|主标题取|font-size/` 会命中。
   *
   * 这三条是本仓库唯一一类**作用在产品输出文本上**的断言。
   * 现有 14 条断言读的都是 `dna` 字段或 CSS —— 而「值在数据里、但没进文本」
   * 这个形态它们零反应（历史上 `h1Size` 抽到 30/30、渲染 0/30 就是这样漏掉的）。
   *
   * 设计取舍：只加这三条，不加 40 号报告里的其余 35 条。
   * 那 35 条守的是模板骨架，而骨架目前没有已知缺陷；一次加 38 条等于给
   * 一个没病的部位做 38 项体检。先加这三条，看它响不响。 */
  {
    const dna = (mechEntry && mechEntry.dna) || {};
    /* T-11：三件套必须在同一句里 —— 正文值 + 倍率 + 标题 px。
     * 正则要求「正文约 Npx」与「正文的 X 倍（约 Mpx）」同时出现，
     * 降级句两个子句都没有，所以一定不匹配。 */
    const T11 = /6\. 字号：正文约 \d+px；最大标题要压到正文的 [\d.]+ 倍（约 \d+px）/;
    if (!T11.test(text)) {
      add('FAIL', id, 'typescale-degraded',
        '字号条没有同时给出「正文值 + 倍率 + 标题 px」。' +
        (/\d+\. 字号：最大标题取/.test(text)
          ? '它是降级形态（正文值未知）——检查该案 dna.bodySize 是否为空或非法'
          : '整条缺失或格式变了'));
    }
    /* T-12：降级分支会丢掉这两个子句，它们只在完整分支里。
     * 「最容易被做塌」是严重性标记，「最大那一档必须够大」是可执行要求。 */
    for (const [frag, why] of [
      ['最容易被做塌的一处', '严重性标记（告诉 AI 这是本版式最脆的地方）'],
      ['最大那一档必须够大', '可执行要求（防止 AI 把标题做小）'],
    ]) {
      if (!text.includes(frag)) {
        add('FAIL', id, 'typescale-detail', `字号条缺「${frag}」——${why}`);
      }
    }
    /* W-02：三个数必须与 dna **复算**一致，不是只看形状对。
     *
     * 为什么容差是 0.6px / 0.06：文本里写的是整数（`Math.round`），
     * dna 里是小数（如 h1SizeAt1440 = 56.4 → 文本 56px）。
     * 0.6 够覆盖一个取整误差，又不足以放过「接错了另一根线」。 */
    const body = parseFloat(String(dna.bodySize || '').match(/([\d.]+)px/)?.[1] || '');
    const h1 = parseFloat(dna.h1SizeAt1440);
    const m = text.match(/6\. 字号：正文约 (\d+)px；最大标题要压到正文的 ([\d.]+) 倍（约 (\d+)px）/);
    if (m && body > 0 && h1 > 0) {
      const [gotBody, gotRatio, gotH1] = [Number(m[1]), Number(m[2]), Number(m[3])];
      const wantRatio = Math.round((h1 / body) * 10) / 10;
      if (Math.abs(gotBody - body) > 0.6) {
        add('FAIL', id, 'typescale-body-mismatch',
          `正文值对不上：提示词写 ${gotBody}px，dna.bodySize=${dna.bodySize}`);
      }
      if (Math.abs(gotH1 - h1) > 0.6) {
        add('FAIL', id, 'typescale-h1-mismatch',
          `标题值对不上：提示词写 ${gotH1}px，dna.h1SizeAt1440=${h1}`);
      }
      if (Math.abs(gotRatio - wantRatio) > 0.06) {
        add('FAIL', id, 'typescale-ratio-mismatch',
          `倍率对不上：提示词写 ${gotRatio}，按 dna 复算应为 ${wantRatio}（${h1}/${body}）`);
      }
    } else if (m && !(body > 0 && h1 > 0)) {
      /* 提示词给了三件套，但 dna 里取不到能复算的值 —— 这是「闸门读不到数据」，
       * 必须报出来，不能像本仓库反复踩的坑那样静默放行。 */
      add('FAIL', id, 'typescale-unverifiable',
        `提示词有三件套，但 dna 无法复算（bodySize=${JSON.stringify(dna.bodySize)} h1SizeAt1440=${JSON.stringify(dna.h1SizeAt1440)}）`);
    }

    /* ── T-16：字号必须能溯源到本案 style.css（2026-11-17 加）─────────────
     *
     * 上面 W-02 只做「提示词 ↔ dna」的自洽。红队实测它有个大洞：
     *
     *   把 S01 的 dna.bodySize 从 16px 改成 60px、h1SizeAt1440 从 96 改成 400，
     *   提示词跟着变成「正文约 60px；最大标题要压到正文的 6.7 倍（约 400px）」，
     *   而 style.css 里是 --fs-body:16px、--fs-h1:clamp(48px,6.67vw,96px)。
     *   **闸门 FAIL=0。**
     *
     * 也就是说：提示词可以对用户宣称一个与原型完全不符的字号，而全绿。
     * 这是「数字对但对象错」——W-02 校的是「值与 dna 对不对得上」，
     * 而这里值与 dna 对得上，错的是 dna 本身与 CSS 不符。
     *
     * 判据：正文值必须能在该案 style.css 里找到（直接数字或 --var 展开），
     * 标题值必须等于 clamp 在 1440 视口下的落值（或裸 px）。
     *
     * 容差 1px：clean-dna 计算 clamp 时用 1440 视口，这里用同样的算法。 */
    if (m) {
      const gotBody = Number(m[1]);
      const gotH1 = Number(m[3]);
      const cssNoComment = css.replace(/\/\*[\s\S]*?\*\//g, ' ');
      /* ⚠️ 第一版判据是「CSS 里出现这个 px 就算溯源成功」，实测太宽松：
       * S01 的 CSS 里别的地方正好有一个 60px（某个 padding/width），
       * 于是把 bodySize 改成 60px 时判据 PASS，而真正的字号是 16px。
       *
       * 改成必须出现在**字号语境**里：
       *   font-size: Npx  或字号变量（--fs-…、--text-…、--body-…、--base-…）= Npx
       * 这样「别处碰巧有个 60px」不会误放行。 */
      const sizeCtx = (n) => {
        const num = String(n).replace(/\./g, '\\.');
        const pats = [
          new RegExp(`font-size\\s*:\\s*${num}px`, 'i'),
          new RegExp(`font\\s*:[^;{}]*${num}px`, 'i'),
          new RegExp(`--[\\w-]*(fs|size|text|body|base|font)[\\w-]*\\s*:\\s*${num}px`, 'i'),
        ];
        if (pats.some((re) => re.test(cssNoComment))) return true;
        const htmlNoComment = html.replace(/<!--[\s\S]*?-->/g, ' ')
          .replace(/<script[\s\S]*?<\/script>/gi, ' ');
        return pats.some((re) => re.test(htmlNoComment));
      };
      if (!sizeCtx(gotBody)) {
        add('FAIL', id, 'typescale-body-not-in-css',
          `提示词说正文 ${gotBody}px，但 style.css / index.html 的**字号声明**里找不到它 —— 提示词与原型不符`);
      }
      /* 标题：从 CSS 的 clamp 算 1440 落值，或字号语境里的裸 px */
      const h1Ok = (() => {
        const clampRe = /clamp\(\s*([\d.]+)px\s*,\s*([\d.]+)vw\s*,\s*([\d.]+)px\s*\)/g;
        for (const c of cssNoComment.matchAll(clampRe)) {
          const lo = Number(c[1]), vw = Number(c[2]), hi = Number(c[3]);
          const at1440 = Math.min(hi, Math.max(lo, vw * 14.4));
          if (Math.abs(at1440 - gotH1) <= 1) return true;
        }
        return sizeCtx(gotH1);
      })();
      if (!h1Ok) {
        add('FAIL', id, 'typescale-h1-not-in-css',
          `提示词说最大标题 ${gotH1}px，但 style.css 里既没有这个字号声明，也没有一个 clamp 在 1440 下落到它 —— 提示词与原型不符`);
      }
    }
  }

  /* ── T-13：`o.have` 必须真的进提示词（2026-11-15 加）─────────────────────
   *
   * 起因：结构约束第 2 条一直是「用你自己的真实数量排：有几个排几个」，
   * 而界面只有「经营什么」「访客要做什么」两个输入框 —— 用户没有地方填这个数，
   * 于是 AI 只能按第 1 条的版式规模编。实测 35/35 案都受影响。
   *
   * 2026-11-15 加了 `o.have` 和第三个输入框。这条断言守的是那个接线别断：
   *
   *   不传 have      → 第 2 条必须是原文「用你自己的真实数量排」
   *   传 have: N     → 第 2 条必须说出 N
   *
   * ⚠️ 这条断言必须用**已填形态**调 buildStylePrompt —— 现有闸门主循环调的是
   * `buildStylePrompt(id)`（空形态），而 o.have 只在已填形态下才有意义。
   * 这是本仓库第④类缺陷的教训：量测的必须是真的交付形态。
   *
   * 顺带守一个反向要求：不填时**不得**凭空出现数字。
   * 若哪天有人给 have 加了个默认值（比如 "7"），这条会立刻响 ——
   * 那正是 2026-10-27 修掉的「我实际有 46 个条目」那个 bug 的形态。 */
  if (typeof buildStylePrompt === 'function') {
    const FILLED = { biz: '一家咖啡店', action: '下单买豆子' };
    let t0 = '', t5 = '';
    try {
      t0 = buildStylePrompt(id, FILLED) || '';
      t5 = buildStylePrompt(id, { ...FILLED, have: 5 }) || '';
    } catch (e) {
      add('FAIL', id, 'have-throws', `传 have 时 buildStylePrompt 抛错: ${e.message.slice(0, 80)}`);
    }
    if (t0) {
      const bare = /2\. 用你自己的真实数量排：有几个排几个，不凑整、不留占位符。/;
      const withNum = /2\. 你手上有 5 条内容，就排 5 条：不凑整、不留占位符。/;
      /* 顺序要紧：先判「凭空出现了数字」，再判「退回了原文」。
       *
       * ⚠️ 第一版写反了 —— 用 `if (!bare) … else if (/\d+ 条内容/)`，
       * 于是 phantom-number 变异（have 默认 7）只会触发 have-default-changed，
       * 永远不会触发 have-phantom-number，而变异测试期望的就是后者的规则名。
       * 这次是变异测试把它抓出来的：两条断言都响时，只有先命中的那条算数。 */
      if (/\d+ 条内容，就排/.test(t0)) {
        add('FAIL', id, 'have-phantom-number',
          '没传 have，但第 2 条里出现了「N 条内容」——用户没填的数不许凭空出现');
      } else if (!bare.test(t0)) {
        add('FAIL', id, 'have-default-changed',
          '不传 have 时第 2 条不是原文「用你自己的真实数量排」——' +
          '若改成了别的说法，必须同步更新本条断言，并确认没有凭空出现数字');
      }
      if (!withNum.test(t5)) {
        add('FAIL', id, 'have-not-wired',
          '传了 have:5，但第 2 条没有说「你手上有 5 条内容」——o.have 没接进模板');
      }

      /* ── T-17：`o.unit` 必须自带量词（2026-11-17 加）──────────────────
       *
       * 原模板是 `count + " 个" + unit`，把「个」写死在模板里。
       * 传 `{unit:'款产品'}` 会拼出「7 个款产品」——病句。
       *
       * 现在模板是 `count + " " + unit`，`unit` 必须自带量词。
       * 这条断言守三件事：
       *   ① 默认输出仍是「N 个条目」（零变化）
       *   ② 传带量词的值能拼出正确中文（「5 款产品」「5 条新闻」）
       *   ③ 传**不带量词**的裸名词时必须暴露 —— 拼出「5 产品」就该报
       *
       * ③ 是关键：它是这个参数唯一会出错的用法。
       * 如果哪天有人把模板改回 `" 个" + unit`，②会立刻响。 */
      const withUnit = (u) => {
        try { return buildStylePrompt(id, { ...FILLED, count: 5, unit: u }) || ''; }
        catch { return ''; }
      };
      const item1 = (t) => {
        const seg = (t.split('结构约束：')[1] || '').split('\n')[1] || '';
        return seg;
      };
      if (t0) {
        /* ① 默认 */
        const d = item1(t0);
        if (!/排了\s*\d+\s*个条目/.test(d)) {
          add('FAIL', id, 'unit-default-changed',
            `默认第 1 条不是「排了 N 个条目」：${d.slice(0, 50)}`);
        }
      }
      /* ② 带量词的正确用法 */
      const ua = withUnit('款产品');
      if (ua && !/排了 5 款产品/.test(item1(ua))) {
        add('FAIL', id, 'unit-quantifier-broken',
          `传 unit:'款产品' 应拼出「5 款产品」，实际：${item1(ua).slice(0, 50)}—— 模板可能又写死了「个」`);
      }
      /* ③ 不带量词时必须暴露 */
      const ub = withUnit('产品');
      if (ub && /排了 5 个产品/.test(item1(ub))) {
        add('FAIL', id, 'unit-double-quantifier',
          '传 unit:"产品" 拼出了「5 个产品」—— 模板又写死了「个」量词');
      }

      /* ── T-14：have 与 minPics 冲突时必须降级（2026-11-15 加）──────────────
       *
       * 加 `o.have` 之后才变得可达的一个矛盾：用户说「我只有 1 条内容」，
       * 而 30/35 案的 minPics > 1（最大 S14/S23 是 10）。
       * 直接说「至少要 10 个图片位」而用户只有 1 条内容，AI 只有两条路：
       * 编 9 条内容（正是本仓库反复要防的），或者把版面压扁塞 10 个空图位。
       *
       * 判据（三条，都要）：
       *   ① have < minPics  → 第 4 条必须提到用户的数量，且给出替代做法
       *   ② have >= minPics → 第 4 条必须还是正常的「至少要 N 个」
       *   ③ 降级时也不许放开「不同的图片」这条 —— 否则 AI 会用一张图填满
       *
       * ③ 是我第一版漏掉的：降级句原本只写「放真实图片」，
       * 而「不同的」和「同一张图重复用不算」都被丢掉了 —— 那等于把
       * 当初加 minPics 要防的事（S19 把 5 个抽屉压成两条 24px 细带）换了个形式放回来。 */
      const mpSrc = join(ROOT, 'prototypes/_prompts/minitems-parsed.json');
      if (existsSync(mpSrc)) {
        const mpById = new Map(
          JSON.parse(readFileSync(mpSrc, 'utf8').replace(/^﻿/, '')).map((x) => [x.id, Number(x.minPics) || 0]));
        const mp = mpById.get(id) || 0;
        /* tFull 提到 if (mp > 1) 外面：T-15（minPics===1 的病句检查）
         * 也要用它，而它只在 mp>1 的块里声明过。 */
        let tFull = '';
        try { tFull = buildStylePrompt(id, { ...FILLED, have: mp }) || ''; } catch { /* 下面按空处理 */ }
        if (mp > 1) {
          /* 用一个必然不足的数去探（minPics 最大是 10，用 1 一定不足） */
          let tShort = '';
          try { tShort = buildStylePrompt(id, { ...FILLED, have: 1 }) || ''; } catch { /* 已在上面报过 */ }
          if (tShort) {
            const hasUserCount = /你只有 1 条内容/.test(tShort);
            const hasNoSqueeze = /不要把图片压小去凑数/.test(tShort);
            const keepsDistinct = /不同的\*\*真实图片|不同的\*\*图片/.test(tShort);
            if (!hasUserCount || !hasNoSqueeze) {
              add('FAIL', id, 'have-pics-conflict-ignored',
                `用户只有 1 条内容而本案要 ${mp} 个图片位，第 4 条没有降级` +
                `（提到用户数量=${hasUserCount} / 给出「不要把图片压小」=${hasNoSqueeze}）——` +
                `AI 只能编内容或压扁版面`);
            } else if (!keepsDistinct) {
              add('FAIL', id, 'have-pics-lost-distinct',
                '第 4 条降级时把「不同的图片」这条要求丢了 —— AI 会用一张图重复填满');
            }
          }
          /* 反向：足量时不得降级。用 minPics 本身去做探针（tFull 已在上面算好）。 */
          if (tFull && /你只有 \d+ 条内容/.test(tFull)) {
            add('FAIL', id, 'have-pics-needless-degrade',
              `用户有 ${mp} 条内容、本案也只要 ${mp} 个图片位，却仍然降级了 —— 不该触发`);
          }
        }
        /* ── T-15：minPics=1 时不得出现「不是 1 个 img 标签就够」──────���───
         *
         * 这一条与 have 无关，是扫边界时连带发现的既有缺陷：
         * minPics=1 的 4 个案（S31/S32/S33/S35）原来写的是
         *
         *   「至少要 1 个不同的图片位置（不是 1 个 img 标签就够——同一张图重复用不算）」
         *
         * **自相矛盾**：只有 1 个位时，1 个 img 标签就是够的；
         * 「同一张图重复用不算」在只有一个位时也无从谈起。
         * 这句警告是为多图位写的，套到 1 上就成了病句。
         *
         * 判据：minPics === 1 时，第 4 条**不得**出现「不是1 个 img 标签」或
         * 「同一张图重复用不算」；同时必须保留「必须是真图」这个实质约束
         * （否则修法就是把整句删掉，那会丢掉「不许用色块顶替」）。 */
        if (mp === 1 && tFull) {
          const item4 = (tFull.split('结构约束：')[1] || '').split('\n').find((l) => /^4\./.test(l)) || '';
          if (/不是1 个 img 标签|同一张图重复用不算/.test(item4)) {
            add('FAIL', id, 'minpics-one-nonsense',
              '只有 1 个图片位却说「不是 1 个 img 标签就够」「同一张图重复用不算」—— 自相矛盾');
          } else if (!/必须是真图/.test(item4)) {
            add('FAIL', id, 'minpics-one-lost-constraint',
              'minPics=1 时第 4 条没有「必须是真图」的约束 —— 修矛盾不能把实质要求一起删掉');
          }
        }
        /* ── 零图片案：全文不得再提「图片位」──────────────────────────
         *
         * 2026-11-17 逐字读 35 份提示词时发现的真矛盾。S34（全库唯一零图片案）
         * 的提示词里同时出现：
         *   结构约束 4. 「本案是零图片设计：整页不出现任何图片位，不要自己补图片。」
         *   输出要求   「图片位置写成 <img src="images/占位-N.jpg">，…」
         * 两句的后果相反，AI 读到哪句都可能照做。
         *
         * 闸门当时全绿：`minpics-one-*` 只查第 4 条，`template-marker` 只查段标题存在，
         * 没有一条比对「风格描述」与「输出要求」是否一致。
         *
         * 判据：minPics===0 时，除了第 4 条那句正面声明之外，
         * 全文不得再出现「图片位置写成」「至少要 N 个…图片位置」「图片、标签全部方角」这类。 */
        if (mp === 0 && tFull) {
          const BAD = [
            [/图片位置写成/, '输出要求仍在讲「图片位置写成 <img …>」'],
            [/至少要\s*\d+\s*个\*\*不同的\*\*图片位置/, '还有一条要求 N 个图片位'],
            [/卡片、按钮、图片、标签全部方角/, '圆角条仍提「图片」方角'],
          ];
          for (const [re, why] of BAD) {
            if (re.test(tFull)) {
              add('FAIL', id, 'zero-image-contradiction',
                `零图片案的提示词里${why} —— 与结构约束第 4 条「整页不出现任何图片位」矛盾`);
            }
          }
        }
      }
    }
  }

  /* ── T-22 / T-23：提示词分段自洽（2026-11-15 加）──────────────────────────
   *
   * 这一块先解决一个前置问题：**怎么正确地把提示词切成段**。
   *
   * ⚠️ 用裸 `indexOf('输出要求')` 切段是错的 —— 结构约束第 4 条里有
   * 「路径用 images/ 占位（见末尾输出要求）」，那是正文里的一次提及，
   * 不是段标题。实测这一条让我的第一版脚本把「防退化」段切成空串，
   * 于是 34/35 案误报「实际防退化 0 条」。
   *
   * 正确做法：段标题必须在**行首**（`^…$`，带 m 标志）。
   * 这个仓库已经为「判据比原文更我以为的样子」付过很多次代价，
   * 所以这里把切段做成一个显式函数，并在注释里钉住为什么不能省。 */
  {
    const SECTION_RE = /^(视觉硬约束（[^\n]*|结构约束：|防退化（[^\n]*|验收三问（[^\n]*|输出要求：[^\n]*)$/gm;
    const splitSections = (txt) => {
      const hits = [...txt.matchAll(SECTION_RE)];
      const out = {};
      for (let k = 0; k < hits.length; k++) {
        const from = hits[k].index;
        const to = k + 1 < hits.length ? hits[k + 1].index : txt.length;
        out[hits[k][1].split(/[（：]/)[0]] = txt.slice(from, to);
      }
      return out;
    };
    const sec = splitSections(text);
    /* 段必须都切得出来 —— 否则后面的判据全会静默失效（本仓库的老病） */
    for (const name of ['视觉硬约束', '结构约束', '防退化', '验收三问', '输出要求']) {
      if (!sec[name]) {
        add('FAIL', id, 'section-missing',
          `切不出「${name}」段 —— 模板结构变了，依赖它的判据会静默失效`);
      }
    }
    /* ⚠️ 段名必须唯一（2026-11-17 红队实测）。
     *
     * `out[key] = ...` 是**后写覆盖先写**。模板里若出现第二个「验收三问」段
     * （哪怕是有人手滑复制了一段），`sec['验收三问']` 拿到的是**最后那个**，
     * 于是所有 acceptance-* 判据都在检查伪造的段，而真实段无人过问。
     *
     * 实测攻击：在「输出要求」前插一段伪造的「验收三问（伪造补充）」，
     * 里面第 3 问照抄正确的「上面 8 条」，结果 FAIL=0 ——
     * 真实段里那三个数**根本没被检查过**。
     *
     * 同理「视觉硬约束」被复制一份，`hardGen` 会以伪造段为准，
     * xref-* 全部指向假条目。
     *
     * 判据：每类段标题只能出现一次。 */
    const secCount = {};
    for (const m of text.matchAll(SECTION_RE)) {
      const k = m[1].split(/[（：]/)[0];
      (secCount[k] = secCount[k] || []).push(m.index);
    }
    for (const [k, poss] of Object.entries(secCount)) {
      if (poss.length > 1) {
        add('FAIL', id, 'section-duplicated',
          `「${k}」段出现 ${poss.length} 次（位置 ${poss.join(', ')}）—— 切段是后写覆盖先写，` +
          `依赖它的判据会全部作用在最后那一段上，前面的无人检查`);
      }
    }

    const hardGen = {};
    for (const line of (sec['视觉硬约束'] || '').split('\n')) {
      const mm = line.match(/^(\d+)\.\s*(.+)$/);
      if (mm) hardGen[mm[1]] = mm[2];
    }

    /* ── T-22：交叉引用必须真指向 ─────────────────────────────────────
     *
     * 提示词里有一处按编号的引用：「⑤ 图形一律用本案线宽级别的线条画（见第 5 条）」。
     *
     * 为什么值得有这条：`prompt-copy.js:1064` 记着一次真实事故 ——
     * 那条注释原来写「结构约束第 4 条」，而那时第 4 条是「首屏不要轮播图」，
     * **引用一直是错的（差一位），只是没人读到这里**。
     * 那次之后同类注释改成了按内容指代，但这处「见第 5 条」仍是按编号的：
     * 只要有人往视觉硬约束里插一条，它就会错。
     *
     * ⚠️ 编号在提示词里出现两次（视觉硬约束 1–6、结构约束 1–6），
     * 所以必须只拿视觉硬约束段里的编号去对 —— 全文收一个 map 会让后者覆盖前者。
     * 我第一版扫描脚本就是这么写的，35 案全部误报。 */
    /* ⚠️ 2026-11-17 红队实测：原来只有 4 个主题，于是「（圆角见第 5 条）」完全不检查。打了补丁加到 6 个。
     *
     * 但补丁本身也有问题：它仍是**枚举**，下次有人引用「间距见第 4 条」还是漏。
     * 我一度以为「真正的兜底需要中文分词」—— 实测推翻了：
     *
     *   35 案硬约束段的编号与主题对应关系是**完全固定**的：
     *     1=配色只用这几个值  2=字体  3=圆角  4=阴影  5=线宽只用这几级  6=字号
     *   （实测脚本逐案抽取「编号 → 冒号前的主题词」，每个编号 35 案只有一个值）
     *
     * 所以不需要分词，也不需要枚举。**直接从被引条目的实际文本里提主题**，
     * 再要求引用上下文提到同一个主题即可。这与「条目实际说了什么」绑定，
     * 条目改了主题，判据自动跟着变。
     *
     * 判据两层：
     *   ① 从 target 文本提取主题词（取冒号/逗号前那段，或用已知的主题关键词兜底）
     *   ② 上下文必须能看出它在讲这个主题 —— 找不到任何对应词就报
     *
     * ②的「找不到」是判定关键：上下文说「见第 5 条」而完全没提前提，
     * 那是正常的；但只要上下文提了**别的**主题，就必须对齐。 */
    const TOPIC_OF = (itemText) => {
      /* 条目文本的开头就是主题：「配色只用这几个值：…」「字体：…」「圆角：…」 */
      const m = itemText.match(/^([^：:，,。]{1,12})/);
      const head = m ? m[1].trim() : '';
      /* 主题词归一：长句取核心词 */
      for (const k of ['配色', '字体', '圆角', '阴影', '线宽', '字号']) {
        if (head.includes(k)) return k;
      }
      return head;
    };
    const TOPIC_WORDS = {
      配色: /配色|颜色|色值|色彩/,
      字体: /字体|字族|字形/,
      圆角: /圆角|方角|半径|直角/,
      阴影: /阴影|投影|inset|内凹|外投/i,
      线宽: /线宽|线条|描边|刻线|笔触/,
      字号: /字号|标题大小|倍率|字阶/,
    };
    for (const m of text.matchAll(/见第\s*(\d+)\s*条/g)) {
      const n = m[1];
      const ctx = text.slice(Math.max(0, m.index - 40), m.index);
      const target = hardGen[n];
      if (!target) {
        add('FAIL', id, 'xref-missing',
          `「见第 ${n} 条」指向不存在的硬约束（该段只有 ${Object.keys(hardGen).sort().join(',')} 条）`);
        continue;
      }
      const topic = TOPIC_OF(target);
      /* ⚠️ 判「上下文在讲什么主题」不能用「提到了谁」，也不能用固定字数的窗口。
       *
       * 两版都错，记录下来：
       *   ① 用 mentioned 全窗口 → 「（圆角见第 5 条）」漏抓，因为前面还有
       *      「线宽级别的线条画」，mentioned=[线宽,圆角] 含 topic=线宽。
       *   ② 用 ctx.slice(-12) → 截出「线条画（圆角」，仍然把「线宽」带进来。
       *
       * 正确做法：引用通常写在括号里「（X 见第 N 条）」。取**最后一个左括号之后**
       * 到引用之前的那段 —— 那才是作者给这次引用的限定词。
       * 没有括号时退回「引用前最后 8 个字」。 */
      const parenIdx = ctx.lastIndexOf('（');
      const scope = parenIdx >= 0 ? ctx.slice(parenIdx + 1) : ctx.slice(-8);
      /* ① 限定词里出现了已知主题词 → 必须与被引条目一致 */
      const nearTopics = Object.entries(TOPIC_WORDS)
        .filter(([, re]) => re.test(scope)).map(([k]) => k);
      if (nearTopics.length && !nearTopics.includes(topic)) {
        add('FAIL', id, 'xref-wrong-target',
          `引用限定词是${nearTopics.join('/')}（「${scope}见第 ${n} 条」），却指向「${topic}」—— 引用错位`);
        continue;
      }
      /* ② 限定词非空、但不是任何已知主题词 → 它在引用一个**不存在于硬约束的主题**。
       * 例如「（间距见第 4 条）」：硬约束里没有「间距」这一条，
       * 那这个引用无论指向谁都说不通 —— AI 会去第 4 条找「间距」而找不到。
       *
       * ⚠️ 这一条必须排除「功能词」：限定词可能只是「上面」「前文」这类指代，
       * 或纯标点/空白。只有当限定词是一个**像主题的名词**（2-4 个汉字、
       * 不含动词性虚词）时才判。 */
      const bare = scope.replace(/[\s，,。；;：:「」『』()（）]/g, '');
      const FUNC = /^(上面|前文|前述|此|该|这|那|本条|上文|以下|如上)$/;
      if (bare && !FUNC.test(bare) && /^[一-龥]{2,5}$/.test(bare) && !nearTopics.length) {
        add('FAIL', id, 'xref-unknown-topic',
          `引用的限定词「${bare}」不在硬约束的主题清单里（${Object.keys(TOPIC_WORDS).join('/')}）—— ` +
          `AI 会去第 ${n} 条找「${bare}」，而那条讲的是「${topic}」`);
        continue;
      }
      /* ③ 限定词为空（裸「见第 N 条」）时，退回看**括号外**的上下文主题。
       *
       * 这一条不能省：实测把「（见第 5 条）」改成「（见第 4 条）」，
       * 引用从线宽跳到了阴影 —— 上下文「⑤ 图形一律用本案线宽级别的线条画」
       * 明明在讲线宽，而 ① 和 ② 都因为「限定词为空」放行了。
       *
       * 用括号**外**（`ctx` 里 `（` 之前那部分）避免把限定词重复计算。
       * 取最后 20 字：太短会截断「线宽级别的线条画」这种长限定语。 */
      if (!nearTopics.length) {
        const outer = parenIdx >= 0 ? ctx.slice(0, parenIdx) : ctx;
        const outerTopics = Object.entries(TOPIC_WORDS)
          .filter(([, re]) => re.test(outer)).map(([k]) => k);
        /* 只在外部主题**唯一且明确**时才判，多主题时无法确定作者意图，不臆断 */
        if (outerTopics.length === 1 && outerTopics[0] !== topic) {
          add('FAIL', id, 'xref-wrong-target',
            `引用无限定词，但上下文在讲${outerTopics[0]}（「…${outer.trim().slice(-16)}」），` +
            `而第 ${n} 条是「${topic}」—— 引用错位`);
        }
      }
    }

    /* ── T-18：圆角 / 阴影必须能溯源到 CSS（2026-11-17 加）───────────────
     *
     * 这是 `typescale-*-not-in-css` 那个洞的同族问题。实测：
     *
     *   只改 prompts.js 的 radius 或 shadow → `stale-vs-dna-clean` 抓住 ✓
     *   **两份文件一起改** → 完全绕过，FAIL=0 ✗
     *
     * 因为 `stale-vs-dna-clean` 比的是「dna-clean.json 与 prompts.js 一致」，
     * 不是「与 style.css 一致」。两份一起改，它们仍然彼此一致。
     *
     * 对照组：`lineWidths` 被 `linewidth-not-in-css` 抓住了 —— 那条是真溯源。
     * 所以 gap 只在 radius 和 shadow 上。
     *
     * 判据（各自对 CSS 溯源）：
     *   · radius：`radiusBare` 为真时，CSS 里的 border-radius 必须真的是全 0 或没有；
     *             否则 dna.radius 描述的每个值都得在 CSS 里找到。
     *   · shadow：dna.shadow 说「无阴影」时 CSS 里不许有 box-shadow 声明；
     *             说「只用 inset」时必须有 inset；说「有外投影」时必须有非 inset。
     *
     * 这是**弱判据**（不是全等），因为 dna.shadow 是 clean-dna 归纳出的句子，
     * 不可能与 CSS 逐字对应。但它能拦住「两份一起改成一个明显的假话」。 */
    {
      /* ⚠️ 这个块在「分段自洽」作用域里，那里没有 `dna`。
       * 自己取一份 —— 不要指望外层变量，实测 reference error。 */
      const me = ((STYLE_PROMPTS && STYLE_PROMPTS.schemes) || []).find((x) => x.id === id);
      const dna = (me && me.dna) || {};
      const cssNC = css.replace(/\/\*[\s\S]*?\*\//g, ' ')
        .replace(/\/\/[^\n]*/g, ' ');
      const htmlNC = html.replace(/<!--[\s\S]*?-->/g, ' ')
        .replace(/<script[\s\S]*?<\/script>/gi, ' ');
      const allNC = cssNC + '\n' + htmlNC;

      /* 圆角 */
      const radShadows = [...allNC.matchAll(/border-radius\s*:\s*([^;}]+)/gi)].map((m) => m[1].trim());
      const dnaRadius = String(dna.radius || '');
      const claimsBare = dna.radiusBare || dnaRadius.includes('全直角') || dnaRadius.includes('全站一律 0');
      /* ⚠️ 判据必须只看 **border-radius 的取值**，不能全文搜这个 px。
       * 实测教训：S13 的 CSS 里有 37 处 8px（用于 padding/margin/gap），
       * 我把 dna.radius 改成「圆角全是 8px」时，全文搜 8px 竟然通过 ——
       * 与 typescale 那一版「S01 别处正好有个 60px」是同一个错。 */
      const radVals = radShadows.map((v) => v.replace(/\s+/g, ''));
      if (claimsBare) {
        /* 声称全直角：每个 border-radius 值都必须是 0 或 50% */
        const realNonZero = radVals.filter((v) => !/^0+[a-z%]*$/i.test(v) && v !== '50%');
        if (realNonZero.length && !dnaRadius.includes('50%')) {
          add('FAIL', id, 'radius-not-in-css',
            `dna.radius 说「${dnaRadius.slice(0, 20)}」但 CSS 的 border-radius 有非零值：${realNonZero.slice(0, 3).join(' / ')}`);
        }
      } else {
        /* 声称有具体档位：每个 N px/em/% 都得在 **border-radius 的取值里**出现 */
        const claimed = [...dnaRadius.matchAll(/([\d.]+)\s*(px|%|em|rem)/g)].map((m) => m[0].replace(/\s+/g, ''));
        const missing = claimed.filter((c) => !radVals.some((v) => v.includes(c)));
        if (missing.length) {
          add('FAIL', id, 'radius-not-in-css',
            `dna.radius 提到 ${missing.length} 个 CSS 的 border-radius 里不存在的值：${missing.slice(0, 3).join('、')}` +
            `（CSS 实际：${radVals.slice(0, 4).join(' / ') || '无 border-radius'}）`);
        }
      }

      /* 阴影
       * ⚠️ `inset` 必须**只在 box-shadow 的值里**才算 —— 它是 CSS 的定位简写属性
       * （`inset: 0` = top/right/bottom/left 全 0），在真实 CSS 里到处都是。
       * 第一版用 `/inset/i.test(cssNC)` 全文搜，实测 22 案误报：
       * S01 的 CSS 里有 3 处 `inset`，但没有一处是 box-shadow 的。
       *
       * ⚠️ 第二版又漏了 var 展开：S13 写的是 `box-shadow: var(--press-1-off)`，
       * 而 `--press-1: inset 2px …` —— 字面值里没有 inset，展开后才有。
       * 实测因此误报 S13 一条。这里先展开一层 var 再判。 */
      const dnaShadow = String(dna.shadow || '');
      const rootVars = {};
      for (const v of cssNC.matchAll(/(--[\w-]+)\s*:\s*([^;}]+)/g)) rootVars[v[1]] = v[2].trim();
      const expandVar = (val) => {
        let out = val, guard = 0;
        while (/var\(/.test(out) && guard++ < 5) {
          out = out.replace(/var\(\s*(--[\w-]+)\s*(?:,\s*[^)]*)?\)/g, (mm, name) => rootVars[name] || '');
        }
        return out;
      };
      const shadowDecls = [...cssNC.matchAll(/box-shadow\s*:\s*([^;}]+)/gi)]
        .map((m) => m[1].trim())
        .filter((v) => !/^\s*none\s*$/i.test(v))
        .map(expandVar);
      const hasInset = shadowDecls.some((v) => /inset/i.test(v));
      const hasOuter = shadowDecls.some((v) => {
        const parts = v.split(/,(?![^(]*\))/);
        return parts.some((p) => !/inset/i.test(p) && p.trim() && !/^\s*none\s*$/i.test(p.trim()));
      });
      if (dnaShadow === '无阴影') {
        if (shadowDecls.length) {
          add('FAIL', id, 'shadow-not-in-css',
            `dna.shadow 说「无阴影」但 CSS 里有 ${shadowDecls.length} 处 box-shadow 声明`);
        }
      } else if (/只用 inset/.test(dnaShadow)) {
        if (!hasInset) {
          add('FAIL', id, 'shadow-not-in-css',
            `dna.shadow 说「${dnaShadow.slice(0, 20)}」但 CSS 的 box-shadow（展开 var 后）里没有 inset`);
        }
      } else if (/混用/.test(dnaShadow)) {
        if (!hasInset || !hasOuter) {
          add('FAIL', id, 'shadow-not-in-css',
            `dna.shadow 说「${dnaShadow.slice(0, 20)}」但 CSS 里 inset=${hasInset} 外投影=${hasOuter}（已展开 var）`);
        }
      } else if (/外投影/.test(dnaShadow)) {
        if (!hasOuter) {
          add('FAIL', id, 'shadow-not-in-css',
            `dna.shadow 说「${dnaShadow.slice(0, 20)}」但 CSS 的 box-shadow（展开 var 后）里没有非 inset 分量`);
        }
      }
    }

    /* ── T-09 / T-19 / T-20 / T-24：骨架形状守卫（2026-11-17 加）───────────
     *
     * 这四条在当前 35 案 × 4 种形态下**全部零违规**（实测），所以它们是
     * 潜伏守卫而非活跃缺陷。但 T-09 有历史：21 案曾输出过「全部方角。。」，
     * 原因是字段本身以句号结尾、模板又补了一个 —— 而当时没有任何断言。
     *
     * 把它们集中在一处，因为都是「读一段文本、检查形状」的同类判据。 */
    {
      /* T-09：圆角 / 阴影条必须以**单个**句号收尾 */
      for (const [label, prefix] of [['圆角', '3. 圆角：'], ['阴影', '4. 阴影：']]) {
        const line = text.split('\n').find((l) => l.startsWith(prefix)) || '';
        if (!line) {
          add('FAIL', id, 'shape-line-missing', `找不到「${label}」条`);
        } else if (/。。/.test(line)) {
          add('FAIL', id, 'shape-double-period', `${label}条出现双句号：${line.slice(-20)}`);
        } else if (!line.trim().endsWith('。')) {
          add('FAIL', id, 'shape-no-period', `${label}条不以句号结尾：${line.slice(-20)}`);
        }
      }

      /* T-19：验收三问必须恰为 1,2,3 */
      const ai = text.search(/^验收三问（/m);
      const oj = text.search(/^输出要求：/m);
      if (ai < 0) {
        add('FAIL', id, 'shape-acceptance-missing', '找不到验收三问段');
      } else if (oj > ai) {
        const accept = text.slice(ai, oj);
        const nums = [...accept.matchAll(/^(\d+)\./gm)].map((m) => Number(m[1]));
        if (nums.join(',') !== '1,2,3') {
          add('FAIL', id, 'shape-acceptance-numbering',
            `验收三问编号是 [${nums.join(',')}]，应为 [1,2,3]`);
        }
      }

      /* T-20：输出要求段至少 3 行实质内容（模板是 4 行，第 1 行是段标题） */
      if (oj >= 0) {
        const outLines = text.slice(oj).split('\n').filter((l) => l.trim() && !/^输出要求：/.test(l));
        if (outLines.length < 3) {
          add('FAIL', id, 'shape-output-short',
            `输出要求段只有 ${outLines.length} 行实质内容，应有 3 行以上`);
        }
      }

      /* T-24：排版守卫 */
      if (/\n{3,}/.test(text)) add('FAIL', id, 'shape-triple-newline', '出现三重换行');
      if (/\t/.test(text)) add('FAIL', id, 'shape-tab', '出现制表符');
    }

    /* ── T-07：字体条必须把标题与正文都说清（2026-11-17 加）──────────────
     *
     * 40 号报告的 T-07：「字体条必须同时给出标题链与正文链（防止只给标题就收工）」。
     *
     * ⚠️ 但原判据「必须同时有『标题按这个顺序』和『正文同理』」是错的 ——
     * 我第一版扫描脚本就按这个写，结果 4 案（S05/S09/S26/S31）被误报。
     *
     * 真相：模板有**四种形态**（`prompt-copy.js:395-408`）：
     *   sameFace（标题正文同一款且都是单值）→ 「全站只用一款字体：X」
     *   标题链（fStack.length>1）          → 「标题按这个顺序取第一个可用的：A → B」
     *   标题单值                            → 「标题用 X」
     *   正文链（bStack.length>1）          → 「正文同理，按序取：A → B」
     *   正文单值                            → 「正文用 X」
     *
     * S05/S09/S26/S31 的 bodyStack 只有 1 个元素，所以正确输出是「正文用 X」。
     * **产品是对的，我的判据只认了一种说法。** 这是本仓库第 N 次同一个错。
     *
     * 判据：无论哪种形态，都必须**同时**给出标题用的是什么、正文用的是什么。 */
    {
      const hardSec2 = sec['视觉硬约束'] || '';
      const fontLine = hardSec2.split('\n').find((l) => /^2\. 字体：/.test(l)) || '';
      if (!fontLine) {
        add('FAIL', id, 'font-line-missing', '视觉硬约束里没有第 2 条字体');
      } else {
        const sameFace = /全站只用一款字体：/.test(fontLine);
        if (sameFace) {
          /* 单款字体形态：只需确认它真的说了那一款是什么，不是空话 */
          if (!/全站只用一款字体：\S/.test(fontLine)) {
            add('FAIL', id, 'font-line-empty', '「全站只用一款字体」后面没有字体名');
          }
        } else {
          const titleOk = /标题按这个顺序取第一个可用的：\S|标题用 \S/.test(fontLine);
          const bodyOk = /正文同理，按序取：\S|正文用 \S/.test(fontLine);
          if (!titleOk) {
            add('FAIL', id, 'font-line-no-title',
              `字体条没说标题用哪款：${fontLine.slice(0, 60)}`);
          }
          if (!bodyOk) {
            add('FAIL', id, 'font-line-no-body',
              `字体条没说正文用哪款 —— AI 只能自己猜正文字体：${fontLine.slice(0, 60)}`);
          }
        }
      }
    }

    /* ── T-21：全文不得出现退化标记（2026-11-17 加，40 号报告优先级最高的一条）──
     *
     * 一个 `undefined` 或 `NaN` 漏进提示词，是用户**直接看得见**的。
     * 这类问题已经在这个仓库发生过：`clean-dna.mjs` 的 `shadowText` 有
     * `return map[sh.kind] || sh.kind`，一旦 `shadowDetail` 产出未映射的 kind，
     * 用户拿到的提示词里就会出现一行英文内部标识符。
     *
     * 双标点那几项来自真实历史缺陷：21 案曾输出「全部方角。。」——
     * 原因是某个字段本身以句号结尾，模板又补了一个。
     *
     * 实测当前 35 案 × 4 种形态（空槽 / 已填 / have=5 / have=1）**零命中**。
     * 这条断言守的是下一次。
     *
     * ⚠️ 判据里的双标点不能盲查全文 —— 提示词正文里可能合法地出现
     * 中文省略或引号嵌套。所以只在**字段拼接边界**容易出问题的形态上判：
     * 「：。」「：，」「；。」「、。」这四种在正常中文里几乎不可能自然出现。 */
    const DEGRADE = [
      ['undefined', /undefined/],
      ['NaN', /NaN/],
      ['[object Object]', /\[object [A-Z]/],
      ['空引号「」', /「」/],
      /* 双句号是**真实历史缺陷**：21 案曾输出「全部方角。。」，
       * 原因是字段本身以句号结尾、模板又补了一个。
       * 我第一版漏了这一项（只列了「：。」「：，」这类组合），
       * 于是 degraded-double-period 变异不响 —— 是变异测试把它抓出来的。 */
      ['双句号「。。」', /。。/],
      ['冒号句号「：。」', /：。/],
      ['冒号逗号「：，」', /：，/],
      ['分号句号「；。」', /；。/],
      ['顿号句号「、。」', /、。/],
    ];
    for (const [name, re] of DEGRADE) {
      if (re.test(text)) {
        add('FAIL', id, 'degraded-marker',
          `提示词里出现退化标记「${name}」—— 用户会直接看到。` +
          `上下文：「${(text.match(new RegExp(`.{0,20}${re.source}.{0,20}`)) || [''])[0]}」`);
      }
    }

    /* ── T-23：验收段的自陈必须与实际相符 ─────────────────────────────
     *
     * 验收第 3 问写着「上面 8 条正面要求与第 3–5 条硬约束，是不是每一条都看得见？」
     * 这句话里的两个数都是**自陈**：
     *   · 「8 条正面要求」= 防退化段的实际条数
     *   · 「第 3–5 条硬约束」= 视觉硬约束段的编号范围
     *
     * 它们现在都是对的（实测 35 案防退化全部 8 条、范围全部存在），
     * 但**没有任何断言在守**。而 ① 的数量一旦变（加一条或删一条），
     * 验收那句就会静默说错 —— 与本仓库 S34 断号、交叉引用差一位是同一类：
     * **写死在字符串里的数字不会跟着重排。**
     *
     * 实测数据：防退化条数分布 {"8":35}，全部 8 条。 */
    const accept = sec['验收三问'] || '';
    const antiSec = sec['防退化'] || '';
    /* ⚠️ 2026-11-17 红队实测：原来的判据是
     *     [...antiSec.matchAll(/^[①②③④⑤⑥⑦⑧⑨⑩]/gm)].length
     * 字符类只到 ⑩。加一条用 ⑪ 写的第 9 条，这条断言**完全不响**：
     *   实测 防退化变成 ⑧ + ⑪ 两条末尾，验收仍说「上面 8 条」，闸门 FAIL=0。
     * 而 AI 读到「核对上面 8 条」时会跳过第 ⑪ 条 —— 正是这条断言要防的事。
     *
     * 改成数**任何行首的圈号**，再把数与验收自陈比对；同时要求圈号连续
     * （⑪ 接在 ⑧ 后面 = 跳号，也是缺陷，与本仓库 S34 断号同源）。 */
    const antiMarks = [...antiSec.matchAll(/^([①-⑳㉑-㉟])\s/gm)].map((m) => m[1]);
    const antiCount = antiMarks.length;
    const claimed = /上面\s*(\d+)\s*条正面要求/.exec(accept);
    if (claimed && Number(claimed[1]) !== antiCount) {
      add('FAIL', id, 'acceptance-count',
        `验收说「上面 ${claimed[1]} 条正面要求」，实际防退化 ${antiCount} 条（${antiMarks.join('')}）—— 数字写死了没跟着重排`);
    }
    /* ⚠️ claimed 缺失时不许静默放行（2026-11-17 红队实测）。
     *
     * 原实现是 `if (claimed && …)` —— 把验收第 3 问里的「上面 8 条正面要求」
     * 整句删掉，`claimed` 为 null，整条断言跳过，FAIL=0。
     * 而那正是最坏的形态：验收段不再告诉 AI「要核对几条」，
     * 这条自检就从「核对 8 条」退化成「随便看看」。
     *
     * 判据：验收段里**必须**有这句自陈。没有 = 缺陷。 */
    if (!claimed) {
      add('FAIL', id, 'acceptance-claim-missing',
        '验收三问里没有「上面 N 条正面要求」这句自陈 —— 少了它，AI 不知道该核对几条');
    }
    /* 圈号必须从 ① 开始连续递增。⑧ 后面接 ⑪ 是跳号。 */
    const CIRC = '①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳';
    for (let k = 0; k < antiMarks.length; k++) {
      if (antiMarks[k] !== CIRC[k]) {
        add('FAIL', id, 'antidegrade-skips',
          `防退化第 ${k + 1} 条用的是 ${antiMarks[k]}，应为 ${CIRC[k]} —— 圈号跳号或重号`);
        break;
      }
    }
    const hardNums = Object.keys(hardGen).map(Number);
    for (const m of accept.matchAll(/第\s*(\d+)\s*[–—-]\s*(\d+)\s*条/g)) {
      for (let n = Number(m[1]); n <= Number(m[2]); n++) {
        if (!hardNums.includes(n)) {
          add('FAIL', id, 'acceptance-range',
            `验收提到第 ${m[1]}–${m[2]} 条硬约束，但实际只有 ${hardNums.sort((a, b) => a - b).join(',')}`);
        }
      }
    }
  }

  stats.pass++;
}

/* A. 30 条提示词必须全部生成成功 */
if (lens.length !== DIRS.length) {
  add('FAIL', '*', 'coverage', `只生成了 ${lens.length}/${DIRS.length} 条提示词`);
}

/* B. 长度区间（README 与 check-docs 声称 1639–1998，中位 1829） */
lens.sort((a, b) => a - b);
if (lens.length) {
  stats.promptLen = { min: lens[0], max: lens[lens.length - 1], median: lens[Math.floor(lens.length / 2)] };
}

/* C. 每条提示词必须包含模板骨架的关键句（防止模板被改坏） */
const REQUIRED_MARKERS = [
  { re: /我经营＿+。/, name: '留白填空' },
  { re: /视觉硬约束/, name: '视觉硬约束段' },
  { re: /结构约束/, name: '结构约束段' },
  { re: /输出要求：只给一个完整单文件 HTML/, name: '输出要求段' },
];
for (const d of DIRS) {
  const id = d.slice(0, 3);
  if (typeof buildStylePrompt !== 'function') break;
  let t = '';
  try { t = buildStylePrompt(id) || ''; } catch { continue; }
  for (const m of REQUIRED_MARKERS) {
    if (!m.re.test(t)) add('FAIL', id, 'template-marker', `缺少模板骨架「${m.name}」`);
  }
}

/* D. 产物陈旧度：prompts.js 是 dna-clean.json 的生成物，两者必须同步
 *
 * 为什么需要它：2026-10-30 实测——执行 Agent 把 dna-clean.json 的 h1Size
 * 从 "" / "var(--fs-h1)" 修成具体值（7/30 案），但没有重跑 build-prompts.mjs，
 * 于是 prompts.js 仍停留在旧值。这期间用户复制到的提示词与数据源不一致，
 * 而当时 check-stale.mjs 只看原型不看这条链、check-docs.mjs 只看 README。
 *
 * 判据：读 dna-clean.json 的每个字段，与 prompts.js 里 window.STYLE_PROMPTS
 * 对应案的字段逐项比对。只比对 prompts.js 顶层的案对象（不含 sceneIndex 等索引表）。
 */
{
  const cleanRaw = readFileSync(
    process.env.DNA_OVERRIDE || join(ROOT, 'prototypes/_prompts/dna-clean.json'), 'utf8');
  const cleanArr0 = JSON.parse(cleanRaw);
  const cleanArr = Array.isArray(cleanArr0) ? cleanArr0 : Object.values(cleanArr0);
  const cleanById = new Map(cleanArr.map((e) => [e.id, e]));

  // STYLE_PROMPTS.schemes 是 30 个案对象的数组；每个案的 DNA 字段嵌在 `.dna` 下。
  const KEY_FIELDS = ['h1Size', 'lineWidths', 'radius', 'shadow'];
  const schemes = Array.isArray(STYLE_PROMPTS?.schemes) ? STYLE_PROMPTS.schemes : [];
  let staleCases = 0;
  for (const sp of schemes) {
    const id = sp.id;
    const dc = cleanById.get(id);
    if (!dc) continue;
    const dna = sp.dna || {};
    for (const f of KEY_FIELDS) {
      const a = dc[f];
      const b = dna[f];
      if (a === undefined || b === undefined) continue;
      if (String(a) !== String(b)) {
        add('FAIL', id, 'stale-vs-dna-clean',
          `${f} 不一致: dna-clean=${JSON.stringify(a)} / prompts.js=${JSON.stringify(b)} → 重跑 node prototypes/_prompts/build-prompts.mjs`);
        staleCases++;
        break;
      }
    }
  }
  if (staleCases) {
    add('FAIL', '*', 'stale-summary', `共 ${staleCases}/30 案的 prompts.js 落后于 dna-clean.json`);
  }

  /* ── 0e. 四个 `*Why` 必须真的记着出处（2026-11-15 加）────────────────
   *
   * 这一条的目的**不是**守内容，是让四个 Why 字段第一次被机器读到。
   *
   * 背景：`clean-dna.mjs` 从 2026-10-26 起就为 radius / lineWidths / h1Size /
   * bodySize 各产出一个 Why，记录「这个值从哪来」。当时注释写得很清楚：
   *
   *   「判据留档：这句话是怎么得出的……不进提示词（AI 不需要看抽取过程），
   *     只留在 dna-clean.json 里供人复核 —— 这个仓库的教训是
   *     『结论不带依据，下一轮就会有人按自己的理解改回去』。」
   *
   * 但实测（`_probe/42-why-fields-dropped.md`）：dna-clean.json 的 23 个字段里
   * 有 8 个零读取者，四个 Why 全在其中。「供人复核」这个意图两年没有被任何
   * 机器执行过 —— 它不会失效、不会报错、也没有人为它负责。
   *
   * 为什么这件事重要：判据要区分三种状态，而区分它们的信息只存在于 Why 里 ——
   *
   *   抽取成功       → 有值
   *   抽取失败       → 空值 + why 应当说「读不到」
   *   设计上无此值   → 空值 + why 说「本案没有显式规则，不编造」（如 clean-dna.mjs:1093）
   *
   * 后两种在 prompts.js 里长得完全一样。没有 Why，任何「非空」断言都会把
   * 第三种（正确行为）判成缺陷。
   *
   * ⚠️ 判据只查**结构**，不查语义。实测过用关键词（失败/读不到/error）判断
   * Why 是否在说「抽取失败」，结果 100% 误报 —— 它命中了 S31 的 `.error`
   * 和 `.error-code` 两个 CSS 类名。所以这里只要求「非空 + 有可辨认的出处形态」。
   *
   * 当前基线：四个 Why 在 35 案全部非空，本条 0 命中。它守的是下一次。 */
  const WHY_FIELDS = [
    /* lineWidthsWhy 是数组，元素形如「1.5 ← border-bottom: 1.5px solid var(--x)  ⓐ.sel」。
     * 含 `←` 说明它指向了具体的 CSS 声明，这是它唯一有意义的形态。 */
    ['lineWidthsWhy', (v) => Array.isArray(v) && v.length > 0 && v.every((s) => /\S\s*←\s*\S/.test(String(s)))],
    /* 其余三个是句子。只要非空且长度像话 —— 不判语义，理由见上。 */
    ['radiusWhy', (v) => typeof v === 'string' && v.trim().length >= 4],
    ['h1SizeWhy', (v) => typeof v === 'string' && v.trim().length >= 4],
    ['bodySizeWhy', (v) => typeof v === 'string' && v.trim().length >= 4],
  ];
  for (const sp of schemes) {
    const dc = cleanById.get(sp.id);
    if (!dc) continue;
    for (const [f, ok] of WHY_FIELDS) {
      if (!ok(dc[f])) {
        add('FAIL', sp.id, 'why-missing',
          `dna-clean.json 的 ${f} 缺失或没有可辨认的出处形态（值：${JSON.stringify(dc[f]).slice(0, 60)}）。` +
          `它是「这个值从哪来」的唯一记录 —— 没有它，下游无法区分「抽取失败」与「设计上无此值」`);
      }
    }
  }
}

/* ── 输出 ─────────────────────────────────────────────────────────────── */
const FAILS = findings.filter((f) => f.level === 'FAIL');
const WARNS = findings.filter((f) => f.level === 'WARN');
stats.fail = FAILS.length;
stats.warn = WARNS.length;

if (JSON_OUT) {
  console.log(JSON.stringify({ stats, findings }, null, 2));
} else if (SELFTEST) {
  /* selftest 母进程：正常检查的报告没有意义（它跑的是未变异的数据），
   * 只输出下面的变异结果。子进程带 --json，所以也有自己的分支。 */
} else {
  console.log(`提示词闸门：检查 ${DIRS.length} 条提示词（源: ${stats.source}）`);
  console.log(`  长度 ${stats.promptLen.min}–${stats.promptLen.max}，中位 ${stats.promptLen.median}  配色段 hex 合计 ${stats.paletteHexTotal}`);
  console.log('');

  const byRule = new Map();
  for (const f of findings) {
    const k = `${f.level}|${f.rule}`;
    if (!byRule.has(k)) byRule.set(k, []);
    byRule.get(k).push(f);
  }

  if (!QUIET || FAILS.length) {
    for (const [k, list] of [...byRule.entries()].sort()) {
      const [level, rule] = k.split('|');
      if (QUIET && level !== 'FAIL') continue;
      // INFO 是「记一笔但不要求动作」，只在非 quiet 模式显示，用 · 标记
      const mark = level === 'FAIL' ? '✗' : level === 'WARN' ? '~' : '·';
      console.log(`${mark} [${rule}] ${list.length} 条${level === 'INFO' ? '（信息，不需动作）' : ''}`);
      for (const f of list.slice(0, QUIET ? 3 : 40)) {
        console.log(`    ${f.id}  ${f.msg}`);
      }
      if (list.length > (QUIET ? 3 : 40)) console.log(`    … 其余 ${list.length - (QUIET ? 3 : 40)} 条同规则`);
    }
    console.log('');
  }

  console.log(`合计 FAIL ${stats.fail} / WARN ${stats.warn}`);
}

/* ── --selftest：确认新加的 plain 断言真的会响 ────────────────────────────
 *
 * 为什么需要它：一条从不失败的断言等于没写。本仓库已经栽过 ——
 * compare.mjs 里 4 条判据把 ok:true 写死了，于是「S07 得 7/7」的分母是假的。
 *
 * 做法：用**子进程**跑，而不是在主进程里重跑检查逻辑。
 * 原因：主循环是顶层代码（`for (const d of DIRS) { … }` 直接写在模块作用域），
 * 要重跑就得把它包成函数，那是 300 行的大改。子进程能零改动复用同一份逻辑。
 *
 * 但「子进程」不等于「改文件」：变异后的 prompts.js 写到**临时目录**，
 * 用 MEASURE_STUB 指向它，母文件一个字节都不动。
 * 这一点是从 probe-ui.mjs 的事故里学的：直接改真实文件再还原，
 * 一次 timeout 杀进程就会把坏代码留在仓库里。
 */
if (SELFTEST) {
  const { execFileSync } = await import('node:child_process');
  const { mkdtempSync, writeFileSync: wf } = await import('node:fs');
  const { tmpdir } = await import('node:os');
  const tmp = mkdtempSync(join(tmpdir(), 'ckprompt-'));
  console.log('\n=== --selftest：把缺陷装回去，确认断言会响 ===\n');
  let allGreen = true;
  for (const [name, m] of Object.entries(MUTATIONS)) {
    /* 三根通道，各守一侧：
     *   copy: true → prompt-copy.js 模板（COPY_OVERRIDE）
     *   dna:  true → dna-clean.json 出处层（DNA_OVERRIDE）
     *   默认       → prompts.js 数据（PROMPTS_OVERRIDE）
     * 不分开的话，就分不清某条断言到底在守哪一侧。 */
    const baseSrc = m.copy ? copySrc : m.dna ? dnaCleanSrc : promptsSrc;
    const mutated = baseSrc.replace(m.from, m.to);
    if (mutated === baseSrc) {
      console.log(`✗ ${name} —— 变异没生效（正则没匹配上），无法判定断言是否有效`);
      allGreen = false;
      continue;
    }
    const f = join(tmp, `${name}.js`);
    wf(f, mutated);
    let out = '', code = 0;
    const env = { ...process.env };
    if (m.copy) env.COPY_OVERRIDE = f;
    else if (m.dna) env.DNA_OVERRIDE = f;
    else env.PROMPTS_OVERRIDE = f;
    try {
      out = execFileSync(process.execPath, [fileURLToPath(import.meta.url), '--json'],
        { env, encoding: 'utf8', timeout: 120000 });
    } catch (e) { out = e.stdout || ''; code = e.status ?? 1; }
    let hit = false;
    try {
      const j = JSON.parse(out);
      hit = j.findings.some((x) => x.rule === m.expect && x.level === (m.level || 'FAIL'));
    } catch { /* 解析失败按没命中处理 */ }
    if (hit) { console.log(`✓ ${name} —— 触发了 ${m.expect}（退出码 ${code}）`); }
    else { console.log(`✗ ${name} —— 没响！断言无效`); allGreen = false; }
  }
  console.log(allGreen ? '\n全部变异都响了 —— 断言有效。' : '\n有变异没响 —— 断言需要重写。');
  process.exit(allGreen ? 0 : 1);
}

process.exit(FAILS.length ? 1 : 0);
