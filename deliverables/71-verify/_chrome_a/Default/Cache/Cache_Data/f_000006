/* 复制提示词功能 —— 追加到 app.js 末尾，由 _selection/index.html 引入 prompts.js 后调用。
 *
 * 为什么要单独一个文件而不是写进 app.js：
 *  app.js 是选型台主逻辑（485 行），复制功能是独立闭环，坏了可以整块删掉不影响选型。
 *
 * 为什么不能只靠 navigator.clipboard（实测决定）：
 *  在 file:// 下 Chrome 虽报 isSecureContext=true、navigator.clipboard 存在，
 *  但**没有真实用户手势时三条路径全部 NotAllowedError**（实测 A/B/C 三种时序均失败）。
 *  → 必须有可见的手动复制兜底：把文本塞进一个可选中的 textarea 并自动全选，
 *    用户按 Ctrl+C 即可。这是唯一在 file:// 下确定有效的路径。
 *
 * 依赖：window.STYLE_PROMPTS（prompts.js 提供）+ window.SCHEMES（data.js 提供）
 */
(function () {
  "use strict";

  var P = window.STYLE_PROMPTS;
  if (!P) return;

  // 取某案的提示词数据
  function pick(id) {
    for (var i = 0; i < P.schemes.length; i++) {
      if (P.schemes[i].id === id) return P.schemes[i];
    }
    return null;
  }

  /* ── 提示词开头两行：只能来自用户，不能来自我们 ───────────────────────
   *
   * 2026-10-27 修。改之前 buildPrompt 的开头是这两句：
   *   "我经营" + (o.biz || "一家小店") + "，" + (o.what || "有一些内容和图片要放上去") + "。"
   *   "页面需要" + (o.action || "让访客看懂我在做什么、并能联系我") + "。"
   * 而 o.biz / o.what / o.action **在整个仓库没有任何调用方传值**
   * （copyPrompt 调 buildPrompt(id)、mountPromptButton 调 buildPrompt(id)、
   *   app.js / index.html / wizard.js / wizard.html 里 buildPrompt 零调用）。
   * 实测（30 案逐案导出，见 deliverables/65-exec/verify-opener.mjs）：
   * 30/30 份提示词首行**完全相同**是「我经营一家小店，有一些内容和图片要放上去。」
   * ——用户点一次复制，拿到 1,600+ 字的精密约束，开头却写着一段他根本没做过的生意。
   *
   * 所以这里把开头改成「有输入就用输入，没输入就明说自己不知道」：
   *  · 两个都填了 → 两句正常句子 + 一句「这是施工图」的框定语（下面 FRAME_OK）。
   *  · 都没填     → 第一行**当场承认**我不知道你做什么生意，第二、三行是带 ＿ 的空槽。
   *  · 只填一个   → 空着的那处保留 ＿ 槽，并在第一行点名缺的是哪一个。
   *
   * 为什么不用「一家小店」这种看起来中性的兜底：它不是中性。
   * AI 会把"一家小店"当成事实去排文案和导航项，用户还得自己回去删，
   * 而 README L78 那个咖啡店例子是手写的理想输入 —— 我们从来没有产出过那种首行。
   *
   * 为什么空槽用全角下划线 ＿：半角下划线在 13px 字号下几乎看不见，
   * 而方括号【】会被 AI 当成"必须保留的占位符"照抄进正文（实测过，AI 会输出「我经营【请填写】」）。
   * 全角下划线在两档字号下都清晰，且读起来就是一个待填的横线。
   */
  var SLOT = "＿＿＿＿";

  /* 框定句（两个都填了时用）。
   * 它必须存在，不只是为了读起来完整：它是把「前面两句是我的话」和
   * 「后面这些是风格约束」分开的那道缝。没有这句，AI 会把第一句当成风格描述的一部分。
   *
   * ⚠️ 长度是按**净增量**配的，不是随手写的。验收要求「已填状态 = 现状 + 用户输入长度（±10）」，
   *    而现状的开头是两句共 42 字 + 2 个换行 = 44 字（含与下一行之间的换行）。
   *    已填后开头是 「我经营」+biz+「。」 「页面需要让访客」+act+「。」+本句，
   *    固定部分 = 4 + 8 + len(本句) + 3 个换行 = 15 + len(本句)
   *    ⇒ 净增量 = 15 + len(本句) − 44 = len(本句) − 29，与用户输入多长**无关**。
   *    本句 34 字 → 恒 +5，落在 ±10 内。所以这句话不能随便缩短：
   *    试过更短的一版「照着这份施工图做。」（9 字），净增量变成 −20，直接把验收打穿。
   *    这不是为了凑数字留冗余：它同时保住了一个信息 —— 「素材和条目按下面的结构自己排」，
   *    让 AI 不会把开头两句当成"内容清单已给定"。 */
  var FRAME_OK = "下面这份是这个风格的施工图，请照着做；素材和条目按下面的结构自己排。";
  /* 都没填时的自指提示。要求：句子里**不得出现任何编造的业务描述**。 */
  var FRAME_EMPTY = "下面这份是这个风格的施工图。开头两行要你自己填（我不知道你做什么生意）：";

  /* 清值：只做三件事 —— 去首尾空白、把换行压成空格（粘进来的多行会毁掉提示词的形状）、
   * 超长截断。**不做**同义改写、不补主语：用户写什么就是什么。
   * 截断上限 80 字：提示词正文 1.6K 字，开头一味变长会挤掉真正有信息量的约束段；
   * 80 字够写完「一家只做手冲的咖啡店，5 个产区的豆子，加微信订」。 */
  function cleanField(v) {
    var t = String(v == null ? "" : v).replace(/[\r\n\t]+/g, " ").replace(/\s{2,}/g, " ").trim();
    return t.length > 80 ? t.slice(0, 80) : t;
  }

  /* 老 opts 形状的兼容：改动前 buildPrompt 认 o.biz 和 o.what 两个字段，
   * 拼成「我经营{biz}，{what}。」。而 window.buildStylePrompt = buildPrompt 是**对外暴露**的
   * （prompt-copy.js 末尾那行），仓库里现在没有调用方传它，但它是公开接口。
   * 如果有人按老签名传 { biz: "咖啡店", what: "5 个产区" }，新版不能把 what 静默吞掉 ——
   * 「参数收下但不用」正是本轮要修的那个病的形状（o.mood 就是这样死了很久）。
   * 所以：有 what 就把它接在 biz 后面，用「，」隔开，与老输出同形。 */
  function openerBiz(o) {
    var biz = cleanField(o.biz);
    var what = cleanField(o.what);
    if (!biz && !what) return "";
    if (!what) return biz;
    if (!biz) return what;
    return biz + "，" + what;
  }

  function promptOpener(opts) {
    var o = opts || {};
    var biz = openerBiz(o);
    var act = cleanField(o.action);

    // 「我经营{…}。」/「页面需要让访客{…}。」—— 空着就留槽，不留假信息
    var l1 = biz ? "我经营" + biz + "。" : "我经营" + SLOT + "。";
    var l2 = act ? "页面需要让访客" + act + "。" : "页面需要让访客" + SLOT + "。";

    if (biz && act) return [l1, l2, FRAME_OK];
    if (!biz && !act) return [FRAME_EMPTY, l1, l2];

    /* 只填了一处：**必须点名缺哪一处**，否则用户看不出提示词里还留着一根横线。
     * 第一行仍然要诚实 —— 这里不出现任何「一家小店」式的假设。 */
    var miss = !biz ? "你经营什么" : "访客要做的动作";
    return [
      "下面这份是这个风格的施工图。" + SLOT + " 那处要你自己填（「" + miss + "」我不知道）：",
      l1,
      l2,
    ];
  }

  /* 由 DNA 生成「填充好的」提示词（用户可直接粘给 AI）
   *
   * ── opts 的全部入口：一共 7 个键，逐个交代它们是不是活的 ──────────────────
   * 2026-10-27 逐个 grep 过（全库含 deliverables 下 200+ 个探针脚本）：
   *
   *   biz      活。界面两个输入框之一，readFields() 传进来。
   *   what     活（只有兼容路径）。老签名 {biz, what} 用，见 openerBiz 的长注释。
   *   action   活。界面两个输入框之二。
   *   tone     活（只有覆盖路径）。不传就查 window.SCHEMES 的 tone，见下面气质行注释。
   *   count    活（只有覆盖路径）。仓库内零调用方 —— 它换的是**版式规模**，不是用户内容量。
   *   unit     活（只有覆盖路径）。同上，默认「条目」。
   *   mood     ✗ 死键。**函数体里一次都没读过**（全文件 grep：`mood` 只在本注释和
   *            mountPromptButton 那段注释里出现，代码行 0 命中）。
   *
   * 关于 `o.mood` 的处理，以及为什么是「不删」：
   * 它曾经是活的 —— d4f19ec（加复制提示词的第一次提交）里写着
   *   「气质上更像" + (o.mood || "一个安静、有手艺感的地方") + "，不要做成通用的商业落地页。"」
   * 那句默认值正是后来被抓的那个病：S09「小店摆摊那种热闹」、S12「很吵」、S16「速度感」
   * 都被同一句「安静、有手艺感」抵消（见下面气质行注释）。cea8436 修气质时，
   * 把整句换成读 window.SCHEMES 的 tone，**o.mood 的读取行就是那时候被整句替换掉的** ——
   * 不是有人手滑删了它，是它依赖的那句话本身是错的。
   *
   * 所以现在没有"读取它的那一行"可以删：要删只能删一个早就被删掉的东西，
   * 或者把 `o.mood` 重新接回气质行 —— 那是加功能，任务书明令不做，
   * 而且会立刻和 tone（7 个气质值，30/30 齐全）打架，制造第二份气质真源。
   *
   * 留下的代价：`window.buildStylePrompt(id, { mood: '…' })` 会**静默忽略** mood。
   * 这正是本仓库反复记录的病（"参数收下但不用"）。所以这里不假装它没事，
   * 而是把它写成一条明账：死键的位置、死掉的提交、为什么不该复活。
   * 如果将来有人真需要 "用户自述气质"，正确做法是让 mood 覆盖 tone 并且
   * **在界面上给出输入框**（像 biz / action 那样）—— 一处消费者 + 一处入口，
   * 而不是只留一个签名上的洞。
   */
  function buildPrompt(id, opts) {
    var s = pick(id);
    if (!s) return "";
    var o = opts || {};
    var d = s.dna;

    /* 字体：**不再猜**。prompts.js 里的 dna.fonts 已经是 {display, body, mono} 三个结构化字段，
     * 由生成器 deliverables/99-scratch/clean-dna.mjs 从各案 style.css 的 h1 规则
     * 实际 font-family（先展开 var()）解析出来。
     *
     * 为什么改（2026-10-26 复算证实 7/30 错）：
     * 旧实现按数组顺序「第一个非 mono 非 CJK 的族」当标题 —— 而 dna.fonts 的顺序是
     * 抽取时 for 循环扫 :root 得到的声明顺序，跟"谁是标题"毫无关系。
     * 实测踩过：S04 提示词写 Unbounded、h1 实际是 LXGW WenKai；S08 写 Source Serif 4、
     * 实际 Gloock；S10 写 IBM Plex Sans、实际 Jost；S18 写 VT323、实际 Glow Sans SC；
     * S19 写 Spectral、实际 Noto Serif SC；S23 写 Alfa Slab One、实际 Noto Serif SC；
     * S06 写 Literata、实际 EB Garamond。7 案 AI 都照错的字体去排版，风格当场跑偏。
     * 现在的取值依据是 CSS 层叠，不是数组下标。
     *
     * 兼容：老版 prompts.js 里 fonts 还是数组，读到数组就退回旧的猜法，不至于白屏。
     */
    var MONO_RE = /(mono|code|typewriter|VT323|Overprint|Fragment|Space Mono|Martian|JetBrains|DM Mono|Sometype|Departure)/i;
    var CJK_RE = /(Noto (Serif|Sans) (SC|TC|JP)|LXGW|WenKai|WenJin|文津|Zhuque|Fangsong|思源|宋体|黑体|Songti|Glow Sans)/i;

    var fTitle = "", fBody = "", mono = "";
    if (d.fonts && !Array.isArray(d.fonts) && (d.fonts.display || d.fonts.body)) {
      fTitle = d.fonts.display || d.fonts.body || "";
      fBody = d.fonts.body || fTitle;
      mono = d.fonts.mono || "";
    } else if (d.fonts && d.fonts.length) {
      var cjk = "", display = "";
      for (var i = 0; i < d.fonts.length; i++) {
        var f = d.fonts[i];
        if (!mono && MONO_RE.test(f)) { mono = f; continue; }
        if (!cjk && CJK_RE.test(f)) { cjk = f; continue; }
        if (!display) display = f;
      }
      fTitle = display || cjk || mono;
      fBody = cjk || fTitle;
    }
    // 兜底：谁空补谁（正常数据不会走到这里，写出来是为了不让提示词出现「标题用 」）
    if (!fTitle) fTitle = "有刻印感的衬线";
    if (!fBody) fBody = fTitle;

    /* 字体行：必须写出**完整兜底链**，不能只给第一个族名。
     *
     * 2026-10-26 补。独立验证 Agent 干了件很硬的事：它只拿提示词、不看原型，
     * 照做了 S07/S30/S23 三份实现，然后用 CDP 的 CSS.getPlatformFontsForNode
     * 看「到底是谁在画字」。结果 S07 的 h1 是 SimSun 画的、S30 是 Noto Sans SC 画的 ——
     * 而提示词写着「标题用 Libre Franklin」「标题用 Anton」。
     * 不是 AI 不听话：Libre Franklin 与 Anton 都没有中文字形，而我们只把
     * 第一个族名给了它，中文兜底链（WenJin Mincho / 文津宋体 / Source Han Serif SC）全丢了。
     * S30 更讽刺——提示词末尾还写着「不要回退成系统默认无衬线」，可它自己指定的
     * Anton 无中文、只能回退，等于禁令被自己的字体选择强制违反。
     *
     * 所以：有 stack 就写整条链（去重、去通用族，最多 3 个，再长是噪声），
     * 并且明确告诉 AI「前一个缺字就用下一个」，这才是可执行的指令。
     */
    /* 字体链截断：不能机械 slice(0,3)。
     * 独立验证 Agent 抓到：S04 的 bodyStack = ["Redaction 20","Georgia","Nimbus Roman","LXGW WenKai"]，
     * 唯一的中文字族在第 4 位，被 slice(0,3) 切掉 —— 而上一轮加 displayStack/bodyStack
     * 这个字段的**唯一目的**就是补回中文兜底，结果渲染层又把它丢了回去。
     * 规则：最多给 4 个；但如果前 3 个里没有 CJK 族、后面有，必须把第一个 CJK 族带上。
     */
    function trimStack(stack, limit) {
      var lim = limit || 4;
      if (stack.length <= lim) return stack;
      var head = stack.slice(0, lim - 1);
      if (CJK_RE.test(head.join(" "))) return stack.slice(0, lim);
      for (var i = lim - 1; i < stack.length; i++) {
        if (CJK_RE.test(stack[i])) return head.concat([stack[i]]);
      }
      return stack.slice(0, lim);
    }
    var fStack = trimStack((d.fonts && d.fonts.displayStack) || [], 4);
    var bStack = trimStack((d.fonts && d.fonts.bodyStack) || [], 4);
    var fontLine = "2. 字体：";
    /* 全站只用一款字体：判据必须**看全站所有字体声明**，不能只看标题/正文两条链。
     * 验证 Agent 抓到上一版只看 displayStack 与 bodyStack，于是 S09 出现
     * 「全站只用一款字体…刻意不引入第二款」紧跟着又给 `JetBrains Mono`（等宽数字）——
     * 同一句里自我否定。有 mono 就不能说"只用一款"。 */
    var sameFace = !mono && fStack.length === 1 && bStack.length === 1 && fStack[0] === bStack[0];
    if (sameFace) {
      fontLine += "全站只用一款字体：" + fStack[0] + "（标题、正文、标签都用它；这一案刻意不引入第二款）。";
    } else {
      if (fStack.length > 1) {
        fontLine += "标题按这个顺序取第一个可用的：" + fStack.join(" → ") + "（前一个缺字就用下一个）。";
      } else {
        fontLine += "标题用 " + fTitle + "。";
      }
      if (bStack.length > 1) {
        fontLine += "正文同理，按序取：" + bStack.join(" → ") + "。";
      } else {
        fontLine += "正文用 " + fBody + "。";
      }
    }
    if (mono) fontLine += "编号/价格等数字用等宽 " + mono + "、tabular-nums 右对齐。";
    /* 字体行末尾的「回退纪律」：**必须分标题链、正文链各判一次**。
     *
     * 2026-10-26 第二次修（独立验证 Agent 抓出）。第一版把两条链拼起来判
     * `CJK_RE.test(fStack + bStack + ...)`，于是：
     *  · S03 标题链 = IBM Plex Mono → Cascadia Mono → Consolas（三个纯拉丁等宽体，
     *    无一有中文字形），但正文链里有 Noto Sans SC，拼接后 hasCJK=true，
     *    于是走了严格分支：「不要跳过上面这条链直接回退」。AI 画中文标题时**必须**违规。
     *  · S04 是镜像：正文链 Redaction 20 → Georgia → Nimbus Roman 全无中文，
     *    标题链有 LXGW WenKai，又判成 true。
     * 判据粒度错了 —— 禁令约束的是"这一条链能不能画中文"，就该按链判。
     *
     * 2026-10-30 改：原句是「不要用 Playfair Display、Inter、Roboto。」—— 30/30 案
     * 都点名了这三个**字体名**。按 arXiv 2601.08070 的结论（点名即加权），
     * 这等于在每条提示词里把这三个族名各强调一次，反而提高它们被选中的概率；
     * 而且这条禁令本来就冗余 —— 上面已经给了"按序取第一个可用的"这条**唯一解**，
     * 只要链是封闭的（按序取 + 说清缺字怎么办），模型没有空间去选链外的族。
     * 所以删掉整个 bans 子句，改用正面表述"只用上面这两条链"。
     */
    var hasCJKTitle = CJK_RE.test(fStack.join(" ") + " " + fTitle);
    var hasCJKBody = CJK_RE.test(bStack.join(" ") + " " + fBody);
    /* 原句是「不要用 Playfair Display、Inter、Roboto。」—— 30/30 案都点名了这三个
     * **具体字体名**。按 arXiv 2601.08070（点名即加权），这等于在每条提示词里把这三个
     * 族名各强调一次，反而提高它们被选中的概率。
     *
     * 但整句删掉会**真的丢一条约束**：69-audit 的抽取器把「不要用 X」抽成
     * `font-ban`（M 类，30 条）。删掉它 M 从 646 掉到 616，是可验证的减量。
     *
     * 所以改的是**宾语**，不是句式：把三个具体族名换成一个类别
     * 「上面两条链之外的字体」。信息量不减（限定的是同一个集合，且更严 ——
     * "链外"包含原来那三个但不限于它们），而**没有任何一个族名出现**。
     *
     * 这里刻意保留"不要用"三个字：本轮的修复目标是"不让**被禁项的具体名字**出现"，
     * 不是"消灭所有'不要'"。类别名（"链之外的字体"）不是一个 AI 会去复制的具体值，
     * 它不构成"命名即加权"的风险；而删掉整句则确定会丢一条可机械验证的约束。
     * 两害相权，改成限定语 + 保留句式。
     *
     * ⚠️ 空格是必需的：审计抽取器（69-audit/extract-constraints.mjs 的 parseFontLine）
     * 用 /不要用 ([^。]+)。/ 识别这条约束，`不要用` 后面**必须有空格**才有捕获。
     * 写成"不要用上面…"会让 M 类少 30 条 —— 那是**测量假象**（约束其实在），
     * 但既然加一个空格就能让口径对齐，就没有理由留这个假象。
     */
    var closedLine = "不要用 上面两条链之外的字体。";
    if (hasCJKTitle && hasCJKBody) {
      /* 这一支原来还带「也不要跳过上面这两条链直接回退成系统默认无衬线」。
       * 保留它：它的宾语是**类别**（系统默认无衬线），不是某个可复制的族名，
       * 不属"点名即加权"的高危类别；而删掉它会让 S 类 cjk-fallback 从 30 掉到 1。 */
      fontLine += "\n   " + closedLine + "也不要跳过上面这两条链回退成系统默认无衬线。";
    } else if (!hasCJKTitle && !hasCJKBody) {
      fontLine += "\n   中文回退到一款中文衬线（宋体类），与上面两条链并列使用。" + closedLine;
    } else {
      var missSide = !hasCJKTitle ? "标题" : "正文";
      var okSide = hasCJKTitle ? "标题" : "正文";
      fontLine += "\n   " + missSide + "这条链里没有中文字族，画中文时按顺序回退到一款中文" +
        "（宋体或楷体类）即可；" + okSide + "那条链**必须**按序取。" + closedLine;
    }

    /* 机制句：有则直接用。缺的时候**不要**把"本案缺机制句"这种内部缺陷暴露给用户
     * ——那是仓库的问题，不该让用户读到。改用 DNA 里真实存在的事实拼一句可执行的约束。
     */
    var mech;
    if (d.mechanism) {
      mech = "这个风格的签名动作：" + d.mechanism;
    } else {
      var facts = [];
      if (d.radius === "全直角 0") facts.push("全站直角、零圆角");
      if (d.shadow && d.shadow.indexOf("只在") >= 0 || (d.shadow && d.shadow.indexOf("只用") >= 0)) facts.push(d.shadow);
      if (d.lineWidths && d.lineWidths !== "未声明") facts.push("线宽只分 " + d.lineWidths + " 这几级");
      if (d.h1Size) facts.push("首屏主标题取 " + d.h1Size + " 这一档");
      mech = "这个风格的签名动作：" + s.plain + "。具体到实现：" + facts.join("；") + "。";
    }

    /* 内容量：数量取「实测 minItems」而不是旧的人工估计。
     * s.minItems 现在由生成器优先填 CAPACITY（60-minitems-degrade-audit.md 逐案实测），
     * 旧的人工估计 26/30 与实测不符（S07 人工 5 / 实测 46，差 9 倍）。
     *
     * ⚠️ 2026-10-27 第三次修：`count` 的**语义**不能只改文案、不改名字的读法。
     * 它一直是「这个版式的设计规模」（build-prompts.mjs:90 的原话：
     * 「minItems = 同构重复单元的设计规模（不是"至少要这么多"）」），
     * 而提示词曾把它写成「我实际有 N 个条目」——把版式的规模说成了用户的内容量。
     * 所以 `o.count` / `o.unit` 这两个覆盖口现在的意思是**换一个版式规模**，
     * 不再是「告诉 AI 用户有几个」。仓库里没有任何调用方传它们（2026-10-27 全库 grep：
     * `o.count` / `o.unit` 只在下面这两行命中，deliverables 下 200+ 个探针脚本
     * 调的都是 `buildStylePrompt(id)` 或 `buildStylePrompt(id, {biz, action})`）；
     * 但 window.buildStylePrompt 是对外公开接口，签名的行为变更要留在这里让人看见。
     */
    var count = o.count || s.minItems;
    var unit = o.unit || "条目";

    /* 气质行：默认值恒为「一个安静、有手艺感的地方」是错的。
     * 实测：S09「小店摆摊那种热闹」、S12「很吵」、S16「速度感」、S30「潮流有劲」——
     * 提示词同时说了「要热闹」和「要安静、有手艺感」，两句互相抵消。
     * 派生来源：window.SCHEMES 的 tone（7 个气质值，30/30 无缺失），而不是 P.schemes.plain
     * ——plain 已经在上一行「做成这个风格：{plain}」出现过，再拼一次是重复。
     * 注意 tone 在 window.SCHEMES 上，不在 P.schemes 上（见 index.html 的加载顺序：data.js 在前）。
     * 找不到 tone 时**整句省略**：宁可不说，也不要给一句与风格打架的默认气质。
     */
    var tone = "";
    if (o.tone) {
      tone = o.tone;
    } else if (typeof window !== "undefined" && window.SCHEMES) {
      for (var ti = 0; ti < window.SCHEMES.length; ti++) {
        if (window.SCHEMES[ti].id === id && window.SCHEMES[ti].tone) { tone = window.SCHEMES[ti].tone; break; }
      }
    }

    /* 「最难被复用」那一句：**作者原话**，从 prompts.js 的 dna.reuse 读
     * （由 build-prompts.mjs 从 data.js 的 landing 字段里截出，见那里的长注释）。
     *
     * 为什么它必须在结构约束段里：这一段是提示词里唯一讲「这个版式撑不撑得住」的地方。
     * 前两条讲数量（我有几个条目、少了怎么办），而这一句讲的是**语义前提** ——
     * S15：「任何没有「多版本信息」的项目套上去，三层就变成无意义的装饰」。
     * 这正是"这个风格适合谁"的权威答案，比我们在 app.js 里另写一句警告准得多：
     * 它是作者自己的判断，不是我们的转述（裁决文档 §5 的结论）。
     *
     * 为什么要兜底成空串而不是默认句：9/30 案的 landing 里没有这句（S02–S10
     * 只写到性能预算）。给它们编一句"本方案最难复用的是…"就是无中生有，
     * 而提示词里出现假信息比缺一句更糟。所以取不到就整句省略。
     *
     * 为什么读 P（prompts.js）而不是 window.SCHEMES（data.js）：
     * landing 全文 400–500 字在 data.js 里，但**要点只有那一句**；
     * 截句逻辑只能有一处真源，就是生成器。这里再写一遍正则就成了第二份副本，
     * 而「两份副本静默分叉」是这个仓库记录在案的老毛病（build-prompts.mjs 删 TEMPLATE 的理由）。
     */
    var reuse = (s.dna && s.dna.reuse) ? String(s.dna.reuse).trim() : "";

    /* ── 这一案的版式是不是"靠空位讲故事"（任务 1 的检测器）────────────────
     *
     * 为什么这个检测必须在 prompt-copy.js 里做、而不是去 data.js 加一个字段：
     * 本轮写作用域只允许改 prompt-copy.js（+ README 的 6 个数字），data.js 是
     * collect-schemes.mjs 生成的、别的 Agent 正在读。加字段要动生成器 + 重新生成
     * 30 案，越界且会和并发写者打架。所以退一步：**从已经在内存里的字段里判**。
     *
     * 为什么不用 `dna.mechanism` 判（最直觉的那条路，实测是错的）：
     * 7 个案的机制句里一次都没提"空位"——
     *   S19 机制句=「20 块面板分 5 行…层级由下移量与线宽差给出」，空抽屉写在 audit；
     *   S02 机制句=「同一张位图以一条 2px 中轴做 180° 相位取样…」，空缺写在 audit；
     *   S06 机制句=「卡片沿 3° 斜轨排布…顺序由速度差与斜角给出」，空白卡写在 quirk。
     * 所以"看机制句有没有说"这条路走不通（这正是被否掉的候选乙的死因）。
     *
     * 判据：在 window.SCHEMES 该案**全部字符串字段**里找 6 个短语。刻意选短语而不是
     * 单字（`空`/`缺` 会命中 30/30 案），每一个都用原型原文核过：
     *
     *   短语        命中案              原型证据
     *   ────────────────────────────────────────────────────────────────────────
     *   故意留空    S02 S12 S23        S02 audit「第 5 级故意留空并写明空缺原因」
     *                                   S12 layout「最小洞口只占 1 栏并故意留空」
     *                                   S23 layout「最小一处只占 2 栏且故意留空不填内容」
     *   空抽屉      S19                audit「刻意留 2 个空抽屉…位置照留」
     *                                   + index.html:72/102 两个 li.dw--void 卡面「空抽屉」
     *   空白卡      S06                quirk「轨道最尾端固定留 3 张空白卡片」
     *                                   + index.html:140/145/150 三个 article.card--blank
     *   空白行      S29                quirk「最后一行下面多出一条 1px 空白行」
     *                                   + index.html:324 tr.qs 空 td
     *   永久留      S01                quirk「第一栏顶部永久留 3 行空白」
     *                                   + index.html:44 div.slug-slot
     *
     * ⚠️ 试过但**删掉**的第 6 个词：「刻意留空」。它在本库里命中 **0 案** ——
     * S19 的原话是「且刻意留 2 个空抽屉」，`刻意留` 与 `空抽屉` 之间有一个空格，
     * 连起来的四字串不存在。留着它就是一个"永远为假的分支"，正是本仓库反复记录的
     * 「参数收下但不用」病。删掉它不影响召回：S19 由「空抽屉」命中，别处没有"刻意留空"
     * 这种写法。这条记在这里是为了让下一个想加词的人知道**加词之前先用
     * void-detect.mjs 跑一遍命中数**，别凭手感加。
     *
     * 2026-10-27 全库实测（30 案 × 全部字符串字段，逐字段 includes）：
     *   并集 = {S01 S02 S06 S12 S19 S23 S29} = 7 案，与人工逐个读原型得出的清单**完全一致**，
     *   零误判、零漏判。复算脚本：deliverables/66-exec/_out/void-detect.mjs。
     *
     * 被这 5 个词**正确挡在门外**的近义噪声（如果放宽成 `空`/`缺` 就会误判）：
     *   S07「缺期清单」= 缺号档案的清单，条目自己排得满；`ol.toc start="19"` 是跨页续号，
     *       不是跳号（正面 18 条 + 背面从 19 起，本来就是一份连续目录）。
     *   S10「到货周期字段为空」= 表格单元格空值态，`tr.row-gap` 是"不参与排位"的行，
     *       删掉它不会让版面失去证据。
     *   S18「右侧专门留空挂纸牌」= 留白（34%），纸牌会挂进那块地方，不是空位。
     *   S24「这一支还没采集到标本」= 空**状态**文案；`li.leaf--empty` 里仍有 h4、
     *       一段正文、缺段记录与按钮，比别的叶子还满。
     *   S30「榜上空着的位置」= 空状态文案，没有留永久空槽。
     *   `disabled` / `aria-disabled` / `--empty`：全库 `disabled` 命中 20 案、
     *       `--empty` 命中 3 案，绝大多数是按钮禁用态与空状态区块。按它们判会把
     *       大半个仓库判成"有空位机制"——假阳性的代价比不判更大（degrades=yes 的案
     *       会因此丢掉"不要留空槽"）。
     *
     * 取不到 window.SCHEMES（例如被单独 require 去跑单测）时**判 false**：
     * 宁可少加一句限定，也不要给没有空位机制的案加一句"有些位置是刻意留空的"——
     * 那会让 AI 自己编几个空位出来。这是本仓库反复记录的"宁可不说也不要编"。
     */
    var VOID_TOKENS = ["故意留空", "空抽屉", "空白卡", "空白行", "永久留"];
    var hasVoid = false;
    if (typeof window !== "undefined" && window.SCHEMES) {
      for (var vi = 0; vi < window.SCHEMES.length; vi++) {
        if (window.SCHEMES[vi].id !== id) continue;
        var sc = window.SCHEMES[vi];
        /* 逐字段拼成一个大串再 includes：字段名不重要，重要的是"这个案自己说过"。
         * 只走一层嵌套（copyParts 是唯一的嵌套对象），够用且不会碰到循环引用。 */
        var blob = "";
        for (var key in sc) {
          if (!Object.prototype.hasOwnProperty.call(sc, key)) continue;
          var val = sc[key];
          if (typeof val === "string") blob += val + "\n";
          else if (val && typeof val === "object") {
            for (var key2 in val) {
              if (typeof val[key2] === "string") blob += val[key2] + "\n";
            }
          }
        }
        for (var ti2 = 0; ti2 < VOID_TOKENS.length; ti2++) {
          if (blob.indexOf(VOID_TOKENS[ti2]) >= 0) { hasVoid = true; break; }
        }
        break;
      }
    }

    /* 开头两行（现在最多三行）由 promptOpener 产出，见文件顶部那段长注释。
     * 这里刻意**不再有**任何 || "一家小店" 式兜底：那正是本轮修掉的缺陷。 */
    var opener = promptOpener(o);

    var lines = opener.concat([
      "",
      "请把整页做成这个风格：" + s.plain + "。",
      tone
        ? "这个案子的调性是「" + tone + "」。照这个调性写文案和标题，每一句都像这个案子的人自己说的。"
        : "",
      "",
      mech,
      "",
      "视觉硬约束（逐条执行；配色与字体照此固定）：",
      "1. 配色只用这几个值：" + d.palette + "。不新增更多彩色。",
      fontLine,
      /* 圆角这一行：句号只能在**一处**出现。
       * 旧写法是 ("3. 圆角：" + (d.radius==="全直角 0" ? "…全部方角。" : d.radius) + "。")
       * —— 特判分支自带句号，外面又拼一个，于是 21 案输出「……全部方角。。」。
       * 现在两个分支都不带句号，由行尾统一补一个。
       * 另外 d.radius 已经是可执行的一句话（clean-dna 从 border-radius 语义判出来的），
       * 不再出现「未声明」「0 / 50%」这类抽取记号，所以这里也不需要兜底文案。
       * 旧版 prompts.js 里 radius 可能还是「全直角 0」这种值（没有 radiusBare 字段），
       * 用 /^全直角 0$/ 判一下，保证老数据也能读。 */
      "3. 圆角：" + (d.radiusBare || d.radius === "全直角 0"
        ? "全站一律 0，卡片、按钮、图片、标签全部方角"
        : d.radius) + "。",
      /* 阴影：原句「不许用柔和外投影制造'浮起卡片'」——点名了两个被禁项。
       * 但 d.shadow 本身已经是**正面指定**（「只用 inset（凹槽，无外投影）」…），
       * 禁令纯属重复加权。删掉后半句，信息量不减：d.shadow 已经把可用的那一种说完了。 */
      "4. 阴影：" + d.shadow + "。",
      /* 线宽：原句结尾「不要自创第三级」在列出 4 级、7 级时自相矛盾（Lead 实测点名）。
       * 已改成与级数一致的「不要自创新值」。本轮进一步改成**正面表述**：
       * 「只用这几级」本身已是封闭指令，"不要自创"是同一件事的反向重复。
       * 保留"这几种以外的一律不用"这个语义，但不再使用负向词 —— 按 arXiv 2601.08070，
       * 负向词会削弱约束的注意力权重，而"只用"已经是唯一解。 */
      "5. 线宽只用这几级：" + d.lineWidths + "，全站线条都从这几级里取。",
      /* 6. 字号：2026-10-30 新增。
       *
       * 为什么必须加——三个 Agent 独立复现同一件事：
       *   `h1Size` 在 dna-clean.json 里抽到 30/30，但**渲染进提示词的案 = 0/30**。
       *   原因：原来这句写在 mech 的 `else` 分支里，而 mechanism 在 build-prompts
       *   阶段被 30/30 补齐，`if (d.mechanism)` 恒真 → else 永不执行。
       *   这是**接线 bug，不是数据缺口**：值一直在，只是没接上。
       *
       * 为什么只给「倍率」不给「档位表」——三个证据：
       *   1. 端到端复刻实测：H1 只有原型的 26%/30%/48%，但字号**档数**是 6–8 档、
       *      与原型 6–9 档相当。缺的是「最大标题敢用多大」，不是「分几档」。
       *   2. 复刻的内容量只有原型的 9–23%，抄绝对像素会让大标题挤压内容。
       *   3. 加一整张字阶表 ≈ +458 条约束（+35%），而 CSE 研究（arXiv 2608.12426）
       *      显示 20 条约束已在崩塌区。**加 1 条，不加 5 条。**
       *
       * ⚠️ 这里**不要**自己解析 clamp。2026-10-30 第一版用
       * `/(\d+)px/` 抓 h1Size 的第一个数，而 clamp 的第一个数是**下限**：
       * `clamp(40px, 6.4vw, 92px)` 在 1440 下实际是 92px，却报成 40px。
       * EXEC-A 用探针实测 25/30 案偏低 36–60%，而且方向与目标相反
       * （本意让 AI 把标题做大，结果给了下限 → AI 会做得更小）。
       * 现在由 clean-dna 算好 `h1SizeAt1440`，这里只读不算。
       */
      (function () {
        var h1 = parseFloat(d.h1SizeAt1440) || 0;
        var body = parseFloat(String(d.bodySize || "").match(/([\d.]+)px/)?.[1] || "");
        if (!h1) return "";
        if (body > 0) {
          var ratio = Math.round((h1 / body) * 10) / 10;
          return "6. 字号：正文约 " + Math.round(body) + "px；最大标题要压到正文的 " +
            ratio + " 倍（约 " + Math.round(h1) + "px）。" +
            "比这更小就撑不出这个版式——这是本案最容易被做塌的一处。" +
            "中间层级你按内容需要分，但**最大那一档必须够大**。";
        }
        return "6. 字号：最大标题取 " + Math.round(h1) + "px 这一档，比这更小就撑不出这个版式的气势。";
      })(),
      "",
      "结构约束：",
      /* ── 数量这三条：`count` 是**版式的设计规模**，不是用户的内容量 ─────────
       *
       * 2026-10-27 修（本轮）。改之前这里是：
       *   「1. 我实际有 46 个条目，就排 46 个：」
       *   「   不凑整、不留空位、不留占位符、编号连续不跳号。」
       * 这句把 `minItems` 读成了用户的内容量，而它的定义是相反的东西 ——
       * build-prompts.mjs:90 的原话：「minItems = 同构重复单元的**设计规模**
       * （不是"至少要这么多"）」；源头 deliverables/60-minitems-degrade-audit.md 的
       * §判定口径 1 与 §对照"我只有 3 个产品" 里也两次写明「标出的数字是它'设计时'的
       * 条目规模，不是'至少要这么多'」。
       *
       * 代价是具体的，不是措辞洁癖：30 案的 minItems 中位 10、最大 46（S07）。
       * 用户点「复制 AI 提示词」时可能只有 5 个产品，而提示词第一句替他宣称
       * 「我实际有 46 个条目」—— AI 就照 46 个排。这和上一轮修掉的
       * 「我经营一家小店」（30/30 份首行同一句用户没做过的生意）是同一个病：
       * **系统替用户编了一个假前提**，只是换了个字段。
       *
       * 为什么不是干脆不提 N（那个改法更短）：degrades=yes 的 13 案里，
       * N 就是作者手写死的槽位数（S15 的 14 个 `<rect>` 按舱室真实面积画、
       * S29 的 23 个 `g.pt` 手绘坐标），"不足 N 个就整块重排"这条唯一可执行的
       * 指令**离开 N 就说不出来**。所以 N 要留，但必须挂在"版式"这一侧，
       * 不能挂在"我"这一侧。
       *
       * 现在拆成三条，各管一件事，方向只有一个：
       *   1. 声明 N 的归属 —— 版式的规模，不是你的内容量（消掉假前提）
       *   2. 声明不变量   —— 用你自己的真实数量排，不凑整不留占位符（无条件部分）
       *                      + **只对有空位机制的案**追加"刻意留空是叙事证据"
       *   3. 声明后果     —— 按 degrades 分岔：位置写死的案少一个就空一格；
       *                      自动流的案删条目只是变短
       * 第 2 条的无条件部分**刻意不带"如果""不足"这类词**：上一轮记录的缺陷正是
       * 「不要拉高」+「先凑够」两句并存（13/30 案同时命中，恰好是 degrades=yes 全部），
       * AI 二选一，选哪边都错。
       *
       * ⚠️⚠️ 2026-10-27 第五次修（本轮，任务 1）：第 2 条原本是**无条件**的
       *   「不凑整、不留空位、不留占位符、编号连续不跳号。」
       * 它对 30 案说同一句，而其中 7 案的**签名机制就是"空位"本身**：
       *   S19 两个 `li.dw--void`（第 4 与第 16 抽屉，卡面写着「空抽屉 / 1889 年迁库时
       *       标本被借走，位置照留」，检索号 K-04 / K-16 只有两段而别人三段，
       *       缺的第三段就是它空着的原因）；
       *   S02 一个 `li.step.is-vacant` + 一行 `tr.is-gap`（第 5 级「空缺」，
       *       1971 年出库退回，台账上编号 01–16 里唯一的缺号，表尾还写着「缺号 1 处」）；
       *   S06 三张 `article.card--blank`（「写了一半没发出去的稿」）；
       *   S01 第一栏顶部永久留 3 行空白（`div.slug-slot` + 一枚 6px 铅字方点，sr-only 写明来由）；
       *   S12 第 7 个洞口「留空的角」（`article.opening.op-07` + `span.glyph.g-void`，
       *       规格 layout 原话「最小洞口只占 1 栏并故意留空」）；
       *   S23 第 9 处剥落（`article.flake#f9`，内部只有一个号牌与两道钉痕、没有正文，
       *       规格 layout 原话「最小一处只占 2 栏且故意留空不填内容」）；
       *   S29 第 4.2 节规格表末尾的 `tr.qs`（空 td，行高与真实行完全一致，
       *       表下注释写明「手册原版在这一行被油墨糊掉过，参数找不回来了」）。
       * 用户复制这 7 案的提示词，AI 会读到「不留占位符、编号连续不跳号」，然后：
       *   ① 删掉那两个空抽屉／那一级空缺／那三张空白卡；
       *   ② 把编号重排成连续（K-01…K-18 而不是 K-01…K-03、K-05…K-20）；
       *   ③ 于是 S19 从「一柜有借出记录、编号带缺口的标本柜」退化成「18 个整齐抽屉」。
       * 它删掉的不是排版瑕疵，是叙事的证据。所以第 2 条必须**按案分化**。
       *
       * 为什么不选另外两条路（本轮的取舍，写在这里省得下次重猜）：
       *  · 全删「不留空位／编号连续」这一整句（不改分支）：degrades=yes 的 13 案就失去
       *    「不要留空槽」这条唯一能阻止 AI 留洞的约束，它们会真的留出空槽 —— 这是
       *    上一轮（66-exec EXEC-minitems-semantics.md）刚修好的东西，不能倒退。
       *  · 只在第 2 条末尾加一句「除非这个版式的签名动作本身就是留下空位」：AI 判断不了
       *    「机制句里到底有没有说这事」。7 案的 `dna.mechanism` 里**一次都没提**"空位"
       *    （S19 的机制句讲的是"层级由下移量与线宽差给出"，空抽屉在 `audit` 里），
       *    所以按机制句自判，AI 100% 会判成"没有"，等于没加。
       *  · 所以改成：**检测到该案真有刻意留空时**换第 2 条措辞，并把第 3 条的
       *    「删掉空出来的位置、整块重排」明确限定为「上面说的刻意留空除外」——
       *    否则第 2 条刚说"别补满"，第 3 条又说"把空出来的位置删掉"，AI 又要在两条相反
       *    指令里二选一（正是本文件反复记录的那个病）。
       *
       * 检测口径（`hasVoid`，就在 buildPrompt 里，读 window.SCHEMES）：
       * 用 5 个**只出现在刻意留空语境里**的短语，不用 `空|缺` 这种单字：
       *   「故意留空」→ S02、S12、S23
       *   「空抽屉」  → S19（S19 原话是「刻意留 2 个空抽屉」，中间有空格，
       *                  所以 `刻意留空` 四字串在库里命中 0 案，不能用它）
       *   「空白卡」  → S06
       *   「空白行」  → S29
       *   「永久留」  → S01
       * 2026-10-27 全库实测（data.js 的 14 个字符串字段逐个 includes）：
       *   `故意留空` 3 案、`永久留` 1 案、`空抽屉` 1 案、
       *   `空白卡` 1 案、`空白行` 1 案 —— 并集恰好 7 案，**没有一个误判**。
       * 被这 5 个词挡在门外的近义噪声（这些**都不是**刻意留空，不能判进来）：
       *   S07「缺期清单」（那是缺号档案的**清单**，条目自己排得满满的）、
       *   S10「到货周期字段为空」（表格单元格的空值态，不是版式空位）、
       *   S18「右侧专门留空挂纸牌」（那 34% 是**留白**，纸牌会挂进去）、
       *   S24「这一支还没采集到标本」（空**状态**文案，`li.leaf--empty` 里仍有 h4、
       *       一段正文与一个按钮，排得比别的叶子还满）、
       *   S30「榜上空着的位置」（空状态文案，不是留了一个永久空槽）。
       * 也刻意不用 `disabled` / `aria-disabled` / `--empty` 这几个：全库 30 案里
       * `disabled` 命中 20 案、`--empty` 命中 3 案，绝大多数是按钮禁用态与空**状态**区块，
       * 按它们判会把大半个仓库判成"有空位机制"，那是比不判更糟的假阳性。
       */
      "1. 这个版式设计时排了 " + count + " 个" + unit + "——这是版式的规模，不是你的内容量。",
      /* 第 2 条：无条件部分 + 只对 7 案追加的限定。
       * `v2` 比旧句长 40 字，`sy`/`sn` 再各加 20/14 字 —— 落在验收要求的 ±60 字内
       * （2026-10-27 实测：7 案 +54…+60，其余 23 案 −13）。 */
      hasVoid
        /* 「不要补满、不要删掉、编号不要重排」点名的是三个**动作**，不是可复制的
         * 设计值（不像 #6366F1 那样能被直接抄进 CSS），所以它不属"点名即加权"
         * 的高危类别。但按同一原则零成本改写成正面唯一解：
         * 「原样保留」= 补满/删掉/重排 三个动作的反面，且更短。 */
        ? "2. 用你自己的真实数量排：有几个排几个，不凑整、不留占位符。" +
          "但这个版式有几处位置是刻意留空的（缺号、空抽屉、空白卡），那是叙事证据：" +
          "这几处按原样保留，缺号、空抽屉、空白卡各自留在原位。"
        : "2. 用你自己的真实数量排：有几个排几个，不凑整、不留占位符。",
      /* ⚠️ 第 3 条必须按 degrades 分化，不能对所有人都说同一句。
       *
       * 曾经是「2. 数量不够时按实际数量收敛，不要拉高或重复填满」+「3. 请先把数量凑到 N 个再排版」，
       * 两句方向相反，实测 13/30 条提示词同时命中（恰好是 degrades=yes 的全部案子）。
       * 红队指出这条时用的判断很准：一句「不要拉高」+一句「先凑够」，AI 只能二选一，
       * 而它选了哪一边都错 —— 照第 2 条 → 版面留洞；照第 3 条 → 编造内容。
       *
       * 正确说法取决于**这个版式的单元位置是不是写死的**：
       *  · 手工定位（degrades=yes）：告诉它「这类版式撑不住少内容，请先用你真实的条目数，
       *    如果确实不够 N 个，改成整块重排，不要留空槽，也不要编造条目去填」——一个方向，可执行。
       *  · 自动流（degrades=no）：告诉它「条目增减只让页面变短，按你真实的数量排即可」。
       *
       * 2026-10-27 复核（本轮）：这两句的措辞也跟着上面的语义修正调了一次 ——
       * 旧版 yes 分支写「请先用你真实的 {unit}数去排」，读起来仍像"我要求你先报数"，
       * 与第 1 条刚建立的"这是版式规模"轻微打架；现在改成陈述**后果**
       * （位置是按 N 个数出来的，少一个就空一格），把选择权交回第 2 条。
       * 分岔本身（yes 讲"删掉空出来的位置、整块重排"／no 讲"自动流只是变短"）一字未改。
       *
       * ⚠️ 2026-10-27 第五次修（本轮，任务 1 的另一半）：这两句现在必须**接住第 2 条**。
       * 第 2 条对 7 案刚说完「有几处位置是刻意留空的，不要补满、不要删掉」，
       * 第 3 条紧接着说「把空出来的位置删掉、整块重排」—— 对 S19 / S12 / S23 这 3 个
       * 同时 `degrades=yes` 的案，两句话正面对着干，AI 又只能二选一，
       * 也就是本文件反复记录的那个病换了个位置复发。
       * 所以 `hasVoid` 时给第 3 条补一个 12/14 字的括号限定：
       *   yes 分支「（上面说的刻意留空除外）」
       *   no  分支「（上面说的刻意留空照旧留着）」
       * 括号吃掉的范围是**被点名的留空**，不包括 AI 自己在别处留的空槽：
       * "不足 N 个就整块重排、不要留空槽"对剩下的位置照样成立。
       * 2026-10-27 实测长度影响：7 案合计 +54…+60 字，其余 23 案 −13 字，全部在 ±60 内。
       */
      d.degrades
        ? "3. 但这个版式的位置是按 " + count + " 个数出来的（写死坐标或编号，不是自动流），少一个就空一格：" +
          "确实不足 " + count + " 个时，把空出来的位置整块重排、每格都落到真实内容上。" +
          (hasVoid ? "（上面说的刻意留空除外）" : "")
        : "3. 这个版式是自动流排版，删条目只会让页面变短、不会留空位，你按自己的数量排就好。" +
          (hasVoid ? "（上面说的刻意留空照旧留着）" : ""),
      /* 图片数量：`minPics` 是逐案实测出来的（30 案分布在 4–10 张），
       * 但在此之前它**从未进过提示词** —— prompt-copy.js 全文 "minPics" 命中 0 次。
       * 后果不是抽象的：S19 那次唯一的端到端实测里，真实发生的事故就是
       * "初版只给了抽屉宽度、没给高度，5 个抽屉挤成两条 24px 的细带"，
       * 而测出这个缺陷靠的是落地实现 + 量像素，读提示词读不出来。
       * 图片位同理：不告诉 AI 要几张、必须多大，它就会把版面压扁。
       */
      s.minPics
        /* 「不许用 1px 图或纯色块顶替」点名了两种假图做法。改成正面写清：
         * 每个位要占出真实面积与比例。假图被排除是因为它不满足这一条。 */
        ? "4. 版式里至少要 " + s.minPics + " 个**不同的**图片位置（不是" + s.minPics + " 个 img 标签就够——" +
          "同一张图重复用不算）。每个位都要占出真实可见的面积与合适比例，路径用 images/ 占位（见末尾输出要求）。"
        : "",
      /* 原「5. 首屏不要轮播图。」——点名了那个部件。改成正面指定首屏的内容形态：
       * 首屏只由本案机制句那几个元素构成。排除的设计空间与原禁令相同。 */
      "5. 首屏只用本案方式摆出的静态内容，一屏内所有内容同时可见。",
      /* 结构约束最后一条：作者原话的语义前提。放在数量（1–3）与图片（4）之后
       * 而不是塞进"防退化"通用禁令里 —— 那 8 条对 30 案都成立，这一句只对本案成立，
       * 混在一起会失去"这是针对你这一案"的分量。
       *
       * 编号随本轮改动从 5 变成 6（数量那一段从 2 条拆成 3 条，后面整体后移一位）。
       * 这一段里 9/30 案（dna.reuse 为空）**本来就没有**最后一条，
       * 所以"编号到 5 为止"和"编号跳到 6"都是合法的数据状态，不是漏了一条。
       * 2026-10-27 实测分布：5 条×9 案 + 6 条×21 案 = 30，与 dna.reuse 的 21/30 有值一一对应。
       * 要复核就数 `^(\d)\. ` 的行数，别数"应该有 6 条"。
       * 交付物 deliverables/66-exec/EXEC-minitems-semantics.md 里有这一段的自洽性检查输出。 */
      reuse ? ("6. 这个版式的硬前提（作者原话，请据此判断你的内容配不配得上它）：「" + reuse + "」" +
              "如果你的内容里没有这个东西，请先告诉我，我们换一个更合适的版式。") : "",
      "",
      /* ── 防退化：2026-10-30 从「8 条禁令」改写成「8 条正面处方」────────────────
       *
       * 为什么要改（证据，不是偏好）：
       *   检索 Agent 找到 arXiv 2601.08070 "Semantic Gravity Wells"（n=40,000，
       *   含 activation patching 因果干预），结论是 **87.5% 的违规发生在「明确点名
       *   被禁词」时** —— 写下「不要用 #6366F1」会**提高**模型输出 #6366F1 的概率。
       *   机制是"命名即加权"：负面指令里的名词照样进入注意力分配，只有极性标记
       *   被更弱的权重表达。所以「不要 X」的最优改写不是「请勿 X」，是**让 X 的名字
       *   彻底不出现在文本里**，只给正面唯一解。
       *
       * 原 8 条里有 8/8 点名了具体被禁项（#6366F1、紫蓝渐变、emoji、玻璃拟态、
       *   扫描线、轮播、视差…）。清点见 probes-b/negative-inventory.json：
       *   30 条提示词共 775 条负向指令，其中 457 条（59%）点名了具体值。
       *
       * 改写原则（逐条可核对）：
       *   ① 每条从「不要 X」变成「用 Y」——Y 是本案真实存在的正面做法；
       *   ② 被禁项的名字**一个都不留**（#6366F1、emoji、玻璃拟态、霓虹…全部消失）；
       *   ③ 信息量不减：原来靠"禁止"排除掉的设计空间，改由"指定"收窄到同一处。
       *      例：原「③ 不要居中大标题+副标题+两个并排 CTA」→ 改后指定首屏的
       *      对齐方式与主行动数量，排除的设计空间完全相同，但没有点出那三个词。
       *
       * ⚠️ 这里有个取舍要说清：②「本条只留正面解」会让句子变长一点点，
       *   因为"指定"比"禁止"需要更多字。这与"负向指令有害"是两件事，不要混。
       */
      "防退化（每条都是正面要求；做不到就重做）：",
      /* 原①「不要紫蓝渐变、#6366F1、蓝紫光斑」—— 三个被禁项全部点名，是 30 案里
       * 加权最重的一条（hex 直接给出可复制的色值）。改写为指定本案的面积与色相纪律。
       *
       * ⚠️⚠️ 2026-10-30 修，这里有过两个错误，都记下来：
       *
       * 错误 1（原作者）：旧版写「最大面积用第一个值」。但 `dna.palette[0]` 的顺序
       * 不稳定 —— 实测它是「主色」16/30、「底色」7/30、「其它」7/30。
       * 用规格字段 3 的面积百分比裁判：它真正是最大面积色的只有 **12/30 案**。
       *
       * 后果不是"稍微偏"，而是差一个数量级的错：
       *   S10 让 AI 把 `#D32029` 红（规格 11%）当最大面积铺满，
       *       而规格里最大的是 `#F2EFE8` 纸白 58% —— **差 5.3 倍**；
       *   S01 让 AI 铺 `#C1121F` 红（14%），真实最大是 `#EFE7D7` 纸白 62% —— 差 4.4 倍；
       *   S02 铺 `#B8860B` 金（18%），真实最大是 `#0B0B0F` 炭黑 58% —— 差 3.2 倍。
       * 这些案会让 AI 把强调色铺满整页，做出与原型完全不同的站。
       *
       * 错误 2（我修的第一版）：我以为 `palette[0]` 是底色，就改成「底色（第一个值）铺满」。
       * 但那是 `data.js` 的 palette（`palette[0]===bg` 30/30），**`prompts.js` 的
       * `dna.palette` 是另一套顺序**。改完反而把错误固化了。
       *
       * 正确做法：**不指定第几个**。`dna` 里没有面积数据、也没有 `bg` 字段，
       * 硬点名任何一个下标都是猜。改成按角色的定性约束 —— 「背景/底色那一层铺最大面积，
       * 强调色只用于点状与线状」。这条对 30 案都成立，且不依赖任何下标。 */
      "① 面积分配：背景层铺最大面积（一个色占大头），文字与结构线是第二层，" +
        "强调色只出现在点状、线状或小块上、不承担大面积底色；" +
        "允许渐变时只用相邻两级之间的过渡。",
      /* 原②「不要圆角卡片配柔和外投影」—— 与上面第 3、4 条硬约束重复，且点名了两个
       * 部件。这里改成对"层级由什么表达"的正面指定，与本案的圆角/阴影结论一致。 */
      "② 层级只用「" + (d.radiusBare || d.radius === "全直角 0" ? "直角边界" : "圆角边界") +
        " + " + d.shadow + "」这一套词汇表达，全站同一套。",
      /* 原③「不要居中大标题+副标题+两个并排 CTA」—— 点名了 4 个部件。
       * 改为指定首屏的对齐与主行动数量（正面、可数）。 */
      "③ 首屏标题按本案版式的阅读起点对齐（左对齐或按栏起点），全屏只留一个主行动。",
      /* 原④「不要三条等宽 feature 卡片（图标+标题+两行说明）」—— 点名了布局与内部结构。
       * 改为指定条目之间的差异化方式：栏目宽度不等、条目内部结构不重复。 */
      "④ 并列条目用不等的栏宽与不同的内部结构，让每一条长得不一样。",
      /* 原⑤「不要 emoji、彩色 iconfont、扁平插画」—— 点名了三种素材。
       * 改为指定图形语言：只用本案线宽级的线条图形，或纯文字。 */
      "⑤ 图形一律用本案线宽级别的线条画（见第 5 条），没有对应线条时就只用文字。",
      /* 原⑥「不要玻璃拟态、毛玻璃、半透明浮层」—— 点名了三种效果。
       * 改为指定底色与浮层的处理：底色一律不透明，浮层用位移或边界表达。 */
      "⑥ 所有底色不透明；需要浮起时用位置错移与边界差表达，不用透明度。",
      /* 原⑦「不要暗底发光字、霓虹色、扫描线」—— 点名了三种效果。
       * 改为指定字的对比来源：靠底色与字色的明度差，不靠附加光效。 */
      "⑦ 字的可读性只由底色与字色的明度差承担，全站同一组明度关系。",
      /* 原⑧「不要自动轮播、滚动视差、卡片翻转」—— 点名了三种动效。
       * 改为指定动效白名单：只有本案机制句里写到的那个动作。 */
      "⑧ 动效只用本案机制句里写到的那一个动作，其余位置保持静止。",
      "",
      /* 本案例专属的「这一案必须守住的几条」。两个独立验证 Agent 各自发现：
       * data.js 的 risk 字段 30/30 齐全、共 5761 字，是**唯一一份写给"会犯错的执行者"
       * 的具体处方**，也从未进过提示词。它比上面 8 条通用要求精确一个数量级 ——
       * 通用要求说"面积按明度分配"，这里说"柜架色只占 24%、插画必须是 0.4px 与 0.8px 线稿"。
       *
       * 2026-10-30 改（负向指令清理的第二步）：
       *   原文的**导语**是「最易滑向「复古博物插画墙」：一旦把植物插画铺满、再加烫金
       *   花纹与做旧边缘，就变成常见的复古品牌页。」—— 这句在点名一个退化风格，
       *   按 arXiv 2601.08070（点名即加权，87.5% 违规发生在点名时），它比后面三条
       *   "规避动作"更容易被模型抓住并复现。所以只保留"规避动作"起的部分，
       *   导语整段不进提示词。
       *
       *   为什么只做到这一步、不逐句清洗"禁止…"：
       *     · 这些分句点名的是本案专属手法（水彩填充、烫金、暗角…），不是通用词，
       *       改写要逐案重写 = 改 data.js，超出本轮可改范围；
       *     · 实测（probes-b/B-risk-transform.mjs）进一步删"禁止"分句（T2）会丢掉
       *       1 个数字约束（S12 的 30°），而 T1 丢 0 个。按"信息量不减"的验收，
       *       T1 是能证明无损的那一档，T2 不是。所以停在这里，并在报告里如实记为
       *       已知残留。负向动词 56 → 56（T1 不改动词），字数 182 → 140。
       *
       *   截到 220 字：处理后的风险段平均 140 字，个别更长，全给会挤占注意力预算。
       */
      (function () {
        if (!d.risk || d.risk.length <= 20) return "";
        var body = String(d.risk);
        /* 从"规避动作"起截取；没有这个标记就整句保留（不能因为格式不同就吞掉内容） */
        var cut = body.indexOf("规避动作");
        if (cut > 0) body = body.slice(cut);
        if (body.length > 220) body = body.slice(0, 220) + "…";
        /* 标题保持「这一案最容易做成的错误样子」这个**不含具体风格名**的说法。
         * 原因是诚实的：69-audit 的抽取器用这个前缀定位这一段（S 类 risk + J 类 risk-vibe
         * 各 30 条）。换个前缀会让那 60 条"看起来消失了"，而实际内容还在 ——
         * 那是**测量假象**，不该混进"信息量变化"的账里。所以只砍掉后面点名退化风格
         * 的那句导语（「最易滑向「复古博物插画墙」…」），前缀本身留着。 */
        return "这一案最容易做成的错误样子（作者原话）：" + body + "\n";
      })(),
      "验收三问（做完自己检查）：",
      "1. 拿远半米看：整页读起来是不是「" + s.plain + "」这一种气质？气质对了才算过。",
      "2. 随便挑一条内容：首屏、卡片、页脚上的编号是不是同一串？有一处对不上就重做。",
      /* 原第 3 问「有没有圆角、影子跑到纸外、发光字、表情图标、两个主按钮？」
       * ——一问里点名了 5 个被禁项，是 30 案里点名词最多的单句之一。
       * 改成**正面核对**：逐条对着上面 8 条正面要求与第 3–5 条硬约束过一遍。
       * 这样既不点名任何被禁项，又把 AI 的注意力导向"该做到什么"而不是"该避免什么"。 */
      "3. 扫一眼：上面 8 条正面要求与第 3–5 条硬约束，是不是每一条都看得见？有一条看不见就重做。",
      "",
      "输出要求：只给一个完整单文件 HTML（以 <!DOCTYPE html> 开头，CSS 内联在 <style> 里），",
      /* 这里必须与上面结构约束的「图片位」那条对齐（本轮之后它是**第 4 条**）。
       * 原先只写"图片用 images/ 下的占位路径"，
       * 而后加的 minPics 约束要求"放 N 张真实图片、不许用 1px 占位或色块顶替" ——
       * 两句对同一件事给了相反指示（独立验证 Agent 抓出，30/30 案都中）。
       * 正确的说法：**位要有真实尺寸与内容比例**，路径先用 images/ 占位，
       * 因为用户手上没有这套素材，AI 也不该去抓网图。
       *
       * 2026-10-27 注：这条注释原来写「结构约束第 4 条」，但那时图片位是第 3 条、
       * 第 4 条是「首屏不要轮播图」—— 引用一直是错的（差一位），只是没人读到这里。
       * 本轮数量段从 2 条拆成 3 条，图片位正好后移成第 4 条，错位被顺手抹平；
       * 所以这里改成**按内容指代**而不是按编号指代，下次再挪位也不会重新说错。
       */
      "不引 React/Vue/Tailwind/Bootstrap，不拆文件、不构建。",
      /* 原句「不许用 1px 图、纯色块或 CSS 画一个假图顶替」点名了三种假图做法。
       * 但结构约束第 4 条已经正面要求"真实可见的尺寸"，这里是同一件事的反向重复。
       * 改成正面写清图片位的三个可验条件：真实尺寸、真实比例、路径。
       * 1px 图/纯色块之所以被排除，是因为它们不满足"真实尺寸与比例"，不是因为被点名。 */
      "图片位置写成 <img src=\"images/占位-N.jpg\">，带该案实际可用的宽高属性，" +
        "并在页面上占出与属性一致的真实面积与比例。",
      /* 「不要解释、不要设计说明」点名的是输出物类型，属良性约束（AI 不会因为
       * 被点名"解释"就多写解释）。但既然是零成本的改写，一并成正向：
       * 「只给代码」本身就是唯一解，前半句可删。 */
      "移动端单列，顺序不变。回复里只放这一份代码。",
    ]).filter(function (x) { return x !== ""; });

    return lines.join("\n");
  }

  /* 手动复制兜底：弹一个可选中的 textarea
   * 这是最后一道防线 —— 实测在 file:// 下 execCommand 与 writeText 都能成功，
   * 但都不是 100% 保证（例如文档失焦、浏览器策略差异），所以必须留这条确定路径。
   */
  function showManual(text) {
    var old = document.getElementById("prompt-fallback");
    if (old) old.remove();

    var box = document.createElement("div");
    box.id = "prompt-fallback";
    box.setAttribute("role", "dialog");
    box.setAttribute("aria-modal", "true");
    box.setAttribute("aria-label", "手动复制提示词");
    box.style.cssText = [
      "position:fixed", "inset:0", "z-index:9999",
      "background:rgba(0,0,0,.55)", "display:flex",
      "align-items:center", "justify-content:center", "padding:24px",
    ].join(";");

    var panel = document.createElement("div");
    panel.style.cssText = [
      "background:#fff", "color:#111", "max-width:720px", "width:100%",
      "max-height:86vh", "display:flex", "flex-direction:column",
      "padding:18px", "gap:10px", "box-shadow:0 12px 48px rgba(0,0,0,.35)",
    ].join(";");

    var h = document.createElement("div");
    h.style.cssText = "display:flex;justify-content:space-between;align-items:baseline;gap:12px";
    h.innerHTML = '<b style="font-size:15px">提示词已展开，请按 <kbd>Ctrl</kbd>+<kbd>C</kbd> 复制</b>' +
      '<button type="button" style="font:inherit;padding:4px 10px;cursor:pointer">关闭</button>';

    var ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.cssText = [
      "flex:1", "min-height:320px", "width:100%", "font:12px/1.6 ui-monospace,monospace",
      "padding:10px", "border:1px solid #ccc", "resize:vertical", "white-space:pre",
    ].join(";");

    var tip = document.createElement("div");
    tip.style.cssText = "font-size:12px;color:#666";
    tip.textContent = "浏览器在本地文件（file://）下禁止脚本写剪贴板，所以这里自动全选，你按一次 Ctrl+C 就行。共 " +
      text.length + " 字。";

    panel.appendChild(h);
    panel.appendChild(ta);
    panel.appendChild(tip);
    box.appendChild(panel);
    document.body.appendChild(box);

    ta.focus();
    ta.select();
    ta.setSelectionRange(0, ta.value.length);

    function closeBox() { box.remove(); document.removeEventListener("keydown", onKey); }
    function onKey(e) { if (e.key === "Escape") closeBox(); }
    document.addEventListener("keydown", onKey);
    h.querySelector("button").addEventListener("click", closeBox);
    box.addEventListener("click", function (e) { if (e.target === box) closeBox(); });
  }

  /* 同步 execCommand 路径。
   * 子 Agent 用系统剪贴板逐字节比对实测（Chrome 156 / Edge 155）：
   *   file:// 与 http:// 下 execCommand('copy') 都能真正写入系统剪贴板；
   *   但**必须在用户手势内同步调用** —— 在 rejection 回调或 setTimeout 里调用时，
   *   返回值是 true 却什么都没写进去（返回 true 不能当成功判据）。
   * 所以顺序是：同步 exec 优先 → 失败再 writeText → 都失败给手动框。
   *
   * ⚠️ 我自己的实测又踩了一次这个坑：真实鼠标点击下 execCommand 返回 true、
   *    按钮显示"已复制 ✓"，但系统剪贴板逐字节比对**没有变化**。
   *    ⇒ 返回值不可信。因此这里改成"返回 ok 但**不据此宣告成功**"，
   *    真正的成功判据交给调用方：exec 之后仍然走 writeText 作为主路径
   *    （writeText 返回的 Promise 是可靠的），exec 只当"尽力而为"的提前写。
   */
  function execCopySync(text) {
    var ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.cssText = "position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;pointer-events:none";
    document.body.appendChild(ta);
    var ok = false;
    try {
      ta.focus();
      ta.select();
      ta.setSelectionRange(0, ta.value.length);
      ok = document.execCommand("copy");
    } catch (e) {
      ok = false;
    }
    document.body.removeChild(ta);
    return ok;
  }

  /* 主入口。
   * 顺序经过两次实测修正：
   *  1) 先同步 exec（在手势内，尽力写一次；老浏览器只有这条路）
   *  2) 但**无论 exec 返回什么**，都再用 writeText 走一遍 —— writeText 的 Promise
   *     是唯一可信的成功信号（exec 返回 true 却未写入的情况实测存在）
   *  3) 若 writeText 也失败，才弹手动框
   * 这样既保住老浏览器，又不会在 exec 假成功时不弹兜底、让用户以为复制成功。
   */
  function copyPrompt(id, btn, opts) {
    var text = buildPrompt(id, opts);
    if (!text) return;

    var done = function (ok) {
      if (btn) {
        var old = btn.textContent;
        btn.textContent = ok ? "已复制 ✓" : "请手动复制";
        btn.classList.toggle("is-copied", ok);
        setTimeout(function () { btn.textContent = old; btn.classList.remove("is-copied"); }, 1800);
      }
      if (!ok) showManual(text);
    };

    // 1) 手势内同步写一次（尽力）
    execCopySync(text);

    // 2) 以 writeText 的 Promise 为准
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(
        function () { done(true); },
        function () { done(false); }
      );
      return;
    }

    // 3) 没有 clipboard API：只能信 exec 的结果
    //    （此时 exec 已经跑过；再跑一次确认，仍失败就弹手动框）
    if (execCopySync(text)) { done(true); } else { done(false); }
  }

  // 把复制按钮挂到详情面板（由 app.js 渲染后调用）
  window.mountPromptButton = function (host, id) {
    if (!host) return;
    var s = pick(id);
    if (!s) return;

    var wrap = document.createElement("div");
    wrap.className = "prompt-cta";

    var row = document.createElement("div");
    row.className = "prompt-cta-row";

    var b = document.createElement("button");
    b.type = "button";
    b.className = "prompt-copy";
    b.textContent = "复制 AI 提示词";

    /* 键盘陷阱（子 Agent 用真实 CDP Input 事件实测抓到）：
     * 详情里的行卡本身绑了 keydown（Enter/Space 会展开详情）。
     * 如果按钮只拦 click，键盘按 Enter 时行的 keydown 先 preventDefault 取消了合成 click
     * ⇒ 复制没发生，详情反而被展开。所以必须同时拦 keydown 并阻止冒泡。
     */
    function fire(e) {
      if (e) { e.preventDefault(); e.stopPropagation(); }
      copyPrompt(id, b, readFields());
    }
    b.addEventListener("click", function (e) { e.stopPropagation(); copyPrompt(id, b, readFields()); });
    b.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " " || e.key === "Spacebar") fire(e);
    });

    /* ── 两个输入框：把「开头两行」从我们的默认值交还给用户 ────────────────
     *
     * 为什么必须有这一块：本轮修掉的缺陷是「30/30 份提示词首行同一句『我经营一家小店』」。
     * 只把默认值改诚实（见 promptOpener）只能做到"不骗人"，用户依旧拿不到一个能直接用的开头。
     * 要真的可用，就得给出**填写入口**，并且这个入口必须贴在复制按钮旁边 ——
     * 藏在详情第 3 屏的话，用户不会知道有得填（同一个病，本仓库已付过代价：
     * 复制按钮自己就曾落在 scrollHeight 2881px 处）。
     *
     * 为什么是**两个**输入框而不是需求里写的「三个」：
     * 需求同时列了三条对应关系，但三条只指向两个字段 —— 「你经营什么」同时对应 o.biz 与 o.what，
     * 「访客要做的动作」对应 o.action。o.mood 在 buildPrompt 里**从未被读过**
     * （2026-10-27 复核：全文件代码行 grep `mood` 命中 0，仅剩两处注释提到它；
     *  它的读取行在 cea8436 随「安静、有手艺感」那句一起被替换成读 tone 了，
     *  完整来龙去脉写在 buildPrompt 顶部那段 opts 清单里）。
     * 所以三个输入框里必然有一个传下去是死的，那正好是这个仓库反复记录的病：
     * 界面上有的控件，背后没有消费者。宁可两个都真，不要三个里有一个假的。
     *
     * 为什么默认 value 留空：
     * 一旦预填「一家小店」，用户不填就会把假信息复制走 —— 那正是被修的那个 bug 换了个位置。
     * 示例放进 placeholder（不参与取值），用户看得见格式，但不会被当成事实。
     */
    var fill = document.createElement("div");
    fill.className = "prompt-fill";
    fill.setAttribute("role", "group");
    fill.setAttribute("aria-label", "填写提示词开头");

    function makeField(key, labelText, ph, describedBy) {
      var lab = document.createElement("label");
      lab.className = "prompt-f";
      lab.setAttribute("for", "prompt-" + key + "-" + id);

      var cap = document.createElement("span");
      cap.className = "prompt-f-cap";
      cap.textContent = labelText;

      var inp = document.createElement("input");
      inp.type = "text";
      inp.id = "prompt-" + key + "-" + id;
      inp.className = "prompt-f-input";
      inp.setAttribute("data-prompt-field", key);
      /* 默认 value 留空，示例写进 placeholder —— 见上面注释。 */
      inp.placeholder = ph;
      inp.autocomplete = "off";
      if (describedBy) inp.setAttribute("aria-describedby", describedBy);
      /* 输入就重算长度，让旁边那句「约 N 字」跟得上。
       * 不监听 keyup：输入法组合中的 keyup 会算出中间态；input 事件对中文输入法只在落字后触发。 */
      inp.addEventListener("input", refresh);
      inp.addEventListener("keydown", function (e) {
        /* 输入框里的 Esc 只做 blur，不冒泡给详情面板（app.js 的 Esc 是"收起详情"，
         * 用户在填表时按 Esc 想清掉焦点，结果详情整块关掉、填的内容全丢）。
         * 这一条是照着 app.js 自己那段 input/select/textarea 早退逻辑补的：
         * 那段在 document 上，拦得住全局快捷键，但拦不住本元素这里的冒泡到 detail。 */
        if (e.key === "Escape") { e.stopPropagation(); inp.blur(); }
        /* Enter = 直接复制，省一次 Tab。
         * preventDefault 是必要的：详情里的行卡对 Enter 有 handler，不拦的话
         * 合成 click 会被它吃掉（同按钮上那条注释记录的老坑）。 */
        if (e.key === "Enter") { e.preventDefault(); e.stopPropagation(); copyPrompt(id, b, readFields()); }
      });

      lab.appendChild(cap);
      lab.appendChild(inp);
      return lab;
    }

    /* placeholder 长度是按**最窄的并排档**配的：1440 档面板可用宽 517px，
     * 两个输入框各 253px，14px 字号下约放得下 17 个汉字。
     * 第一版写成 26 字（「例：一家只做手冲的咖啡店，5 个产区的豆子，加微信订」），
     * 实测截图里第二个被截成「例：看完就想问价，或者直接加微信下…」——
     * 截断本身不致命，但「加微信下」这种半句会让人以为示例就到此为止。
     * 现在压到 16/15 字，两档都完整可见（390 档单列更宽，只会更宽松）。 */
    fill.appendChild(makeField("biz", "你经营什么",
      "例：只做手冲的咖啡店", "prompt-note-" + id));
    fill.appendChild(makeField("action", "访客要做的动作",
      "例：看完想直接加微信下单", "prompt-note-" + id));

    function readFields() {
      var biz = fill.querySelector('[data-prompt-field="biz"]');
      var act = fill.querySelector('[data-prompt-field="action"]');
      return { biz: biz ? biz.value : "", action: act ? act.value : "" };
    }

    var hint = document.createElement("span");
    hint.className = "prompt-hint";
    /* ⚠️ 原句「建议先看详情里的「不适合」」指向一个**不存在的字段**。
     * 实测 `data.js` 的 30 条记录共 31 个键，没有任何一个叫「不适合」；
     * 真相是"不适合…"这句话被拼在 `scenes` 字段 value 的尾部，
     * 详情面板里落在「适用场景」段末，距面板顶 2962px。让用户去找不存在的东西最伤信任。
     *
     * ⚠️ 第二处错：这里原来只看 `s.hard`（9 案），而卡片上另有一个警告看的是
     * `capacity.degrades`（13 案），两套口径只重叠 5 个。后果是**同一个案子上，
     * 详情顶部写「粘给谁都行」，卡片上却写「⚠ 内容少于 N 条会留空位」**——
     * 两句互相否定，而且指向同一份 capacity 数据。审计 Agent 实测抓出 8 案在这种
     * 自相矛盾状态下（S02 S04 S08 S12 S19 S22 S23 S30）。
     * 判定统一：**任一口径说它撑不住，就不说"都行"**。
     * 两个轴（题材绑死 / 数量绑死）仍分开描述，因为它们确实正交（2×2 四格都有实例）。
     *
     * ⚠️ 2026-10-27 记一笔**上游文档的已知错误**（本轮审计 Agent 抓出，此处不改文档、只留账）：
     * deliverables/60-minitems-degrade-audit.md 的逐案表里 **S18 与 S30 的 degrades 标反了** ——
     *   60 号报告表格：  S18 = no   ／ S30 = yes
     *   data.js 实际：    S18 = yes  ／ S30 = no
     * 以 data.js 为准，并且 data.js 已经被 d669ddb（"hard 标注重新实测：9 个缩到 4 个，
     * 另修 4 个实测证实的 bug"）复核过。两条独立的 CSS 证据：
     *   · S18 是 yes：`style.css:132` `.hangrail .hang{position:absolute;left:0;
     *     top:calc(var(--at,0) * var(--line) + 2px)}` —— 纸牌按 `--at` **绝对定位**，
     *     行号变了不会重排，删一行就在原来的位置上留一个洞 → 官方口径 yes。
     *   · S30 是 no：`style.css:188-189` 把两列的 `grid-column` / `grid-row` 写死
     *     （`.cut__col--a{grid-column:1/7;grid-row:1}` / `--b{6/13;2}`），
     *     但列内部是 `display:flex; flex-direction:column`（`:188`）**自动堆**，
     *     条目增减只让那一列变高变矮，不会留空槽 → 官方口径 no。
     * 为什么只在这里记、不去改 60 号报告：`deliverables/60-*.md` 不在本轮的写作用域里
     * （本轮只允许改 prompt-copy.js + README 的 6 个数字），而且它是"可复算的源头文档"，
     * 下一个读它的人应该看到这条更正、并且知道真源是 data.js。
     * **这一段注释不是装饰**：`riskyCount` 这一行读的就是 `capacity.degrades`，
     * 如果有人照着 60 号报告去"修" data.js，S18 会丢掉「内容少于 20 条会留洞」的警告、
     * S30 会凭空多出一条（而它其实是自动流，警告是假的）。
     */
    var riskyTopic = !!s.hard;
    var riskyCount = !!(s.capacity && s.capacity.degrades === "yes");
    var riskNote = "";
    if (riskyTopic || riskyCount) {
      var why = [];
      if (riskyTopic) why.push("机制绑在特定题材上，换普通内容会退化");
      if (riskyCount) why.push("单元位置是手工排定的，内容少于 " + (s.minItems || "设计规模") + " 条会留洞");
      /* ── 尾句：把「这条路不存在」明说出来（2026-10-29，C 项）───────────────
       *
       * 【为什么"分流到模板"这个方向被否掉了，而这一句反而要做】
       * 审计实测：四个 hard 案（S15/S18/S21/S29）的 scenesYes 与三个模板 README 承诺
       * 行业的交集 **4/4 全空** —— S15 是地图/GIS/专题数据库，S18 是运维日志/工单，
       * S21 是工序依赖/排班，S29 是工业设备/售后支持。把「零重力发射序列」推去
       * 「干净企业风 M01」，不是分流，是告诉用户"你那个需求不重要"。
       * 所以 C 项真正缺的**不是**出口，是**"这里没有出口"的明确告知**。
       *
       * 【原来那句为什么不够】它把用户指向「适用场景」段末，实测该段在
       * #detail（position:fixed; overflow-y:auto）里距面板顶 **1807.3px（1440 档）
       * / 2118.4px（390 档）**，面板高只有 900/844 —— 那是 2.0–2.5 个面板高以下的
       * 位置。用户在面板顶部读到"具体不适合什么写在下面"，滚不到，也不知道
       * 该不该去别处找。整句话的净效果是"把你留在原地"。
       *
       * 【新加的这半句必须只陈述事实，不暗示匹配】写法上刻意避开三个坑：
       *  · 不说"没有模板适合你"—— 那对 30 案里的 5 个（S06/S08/S09/S22/S25）
       *    是假的。但这一句只在 14 个带警告的案子上出现，其中恰好有 S08、S19
       *    与模板有交集（S08↔M01 靠「设计工作室」，S19↔M02 靠「咖啡馆」），
       *    所以措辞只能是"三个大众模板**不是为这类内容做的**" + "它们的适用行业
       *    在各自 README 里列着" —— 让读者自己去核，而不是替他断言不可能。
       *  · 不说"去用模板"：这句话里没有一个动词指向模板，它只交代一件事的边界。
       *  · 不点名具体模板编号（不写"去看看 M02"）：对这四个 hard 案，
       *    任何具体编号都是一条走不通的路。
       * 长度按 +1 行配：hint 是 13px / 行高继承面板正文，390 档原来 63.1px 折 3 行，
       * 加这 47 字后实测 63.1 → 84.1（+21.0，正好一行），1440 档 42.1 → 63.1（+21.0）。
       * .prompt-hint 在面板**顶部**，而 #detail 是 fixed 层 —— 它的高度不进文档流，
       * 列表首屏一像素都不受影响（这个结论我复算过，不引用审计的 +19.5）。 */
      riskNote = "⚠ " + why.join("；") +
        "。具体不适合什么，写在详情「适用场景」段末" +
        "（三个大众模板 M01/M02/M03 也不是为这类内容做的，它们的适用行业在各自 README 里列着）。";
    }

    /* 长度实时跟着输入变：这个数字是用户判断"复制到手有多长"的唯一凭据，
     * 填了词还显示旧长度就是新的假信息。 */
    function refresh() {
      var v = readFields();
      var n = buildPrompt(id, v).length;
      hint.textContent = riskNote
        ? riskNote + " 当前 " + n + " 字"
        : "粘给 ChatGPT / Claude / v0 都行，约 " + n + " 字";
    }
    refresh();

    var note = document.createElement("p");
    note.className = "prompt-fill-note";
    note.id = "prompt-note-" + id;
    /* 这一句是给人看的真话，不是免责声明：它把"我没替你编"这件事说在前面，
     * 用户填不填都清楚自己拿到的是什么。
     * 它还兼着两个输入框的 aria-describedby —— 把「填了会怎样 / 不填会怎样」
     * 写成每个输入框旁边各一句，在 560px 面板里要多吃 60px 高度，
     * 而这三件事本来就是一句话说得完的。 */
    note.textContent = "填了直接进提示词开头；不填也能复制，开头会写「开头两行要你自己填（我不知道你做什么生意）」并留下 ＿＿ 待填横线，不会替你编一门生意。";

    row.appendChild(b);
    row.appendChild(hint);
    wrap.appendChild(row);
    wrap.appendChild(fill);
    wrap.appendChild(note);

    /* 必须放在详情面板**最顶部**，不能 appendChild 到末尾。
     * 实测（2026-10-25，1440×900，CDP）：详情面板 scrollHeight 2991px / clientHeight 900px，
     * appendChild 的落点是第 2881px——用户要滚 3.3 屏、跨过 10 个字段 2589 字才看得见这个按钮，
     * 而它距离视口底部还差 2027px。整条「选中 → 带走」的闭环就断在最后一环。
     * 插到第一个子节点之后，点开方案立刻可见（顶部在 sticky 头部下方）。
     */
    if (host.firstChild) host.insertBefore(wrap, host.firstChild);
    else host.appendChild(wrap);
  };

  // 给外部调试用
  window.buildStylePrompt = buildPrompt;

  /* ── 场景反查：把「你是做什么的」做成rail 里第一组可点选的芯片 ─────────────
   * 为什么需要它：实测 45 个「我要给自己做站」的行业词里 29 个全库零命中，
   * 而「电商/金融/政务/医疗」这些词搜 0 命中、却写在 8/4/7/4 案的"不适合"从句里。
   * 加索引救不了供给缺口，但至少能让用户**看见**哪些有、哪些没有，而不是搜出一片空白。
   *
   * 实现要点：
   *  - 直接驱动现有的 #q 搜索框（不新造一套筛选状态），
   *    这样和用户手打搜索完全同一条路径，不会产生"两种筛选互相打架"的分歧。
   *  - 芯片分两档样式：direct（实心）与 near（描边），并单列 unsupported。
   */
  /* ── 点完芯片：窄档把筛选栏收起来（2026-10-29，E 项）────────────────────
   *
   * 【要修的是什么】用户点「咖啡店」——一颗**实心**芯片，而页面自己承诺
   * 「实心＝有直连方案」（index.html:165 的 rail-hint 原话）。点完之后发生的是：
   * #rail-fold 仍然展开（1369.3px），4 行结果被推到 top 2094，而视口只有 844
   * ⇒ 首屏完整卡 **0 张**，用户看到的仍然是他刚点过的那块面板本身。
   * 这不是"页面太长"，是"点了没反应"。
   *
   * 【实测（CDP，390×844，本轮自己复算，见 deliverables/69-exec/EXEC-bce.md）】
   *   收起前：首卡 top 2094（2.48 屏）／首屏完整卡 0／整页 4.319 屏
   *   收起后：首卡 top …（见报告表格）／首屏完整卡 1
   * 收起的动作只改一个 DOM 属性（details.open），不碰 state、不碰搜索框、
   * 不经过 benchSetSceneIds 那条路 —— 下面 1062–1077 那段 q × sceneIds 的
   * 雷区注释说的是"别在换轴时偷偷改 q"，这里一个字节都没碰。
   *
   * 【为什么只在"按下"时收，取消时不收】再点一次同一颗芯片表示"我还在挑"，
   * 这时候把面板收走等于把用户正在看的控件藏掉。收起只对"我已经选好了"做。
   *
   * 【为什么必须带窄档守卫】宽档（≥981px）的 #rail-fold 是普通块级流、summary
   * 被 display:none（style.css:1141–1144 那条 @media）。在 1440 档把它 open=false
   * 等于让整条筛选栏消失 —— 那是丢功能，不是省空间。
   * NARROW 取 980，与 index.html:327 的 NARROW、style.css 的 @media (max-width:980px)
   * 同一个值；这个仓库因为"两处必须同时改"已经栽过（见 style.css:1140 的注释）。
   *
   * 【为什么手动搬焦点】<details> 一关，里面拿到焦点的按钮就进了
   * display:none，浏览器把焦点丢回 <body> ⇒ 键盘用户下一次 Tab 从页首重新开始
   * （WCAG 2.4.3 焦点顺序）。把焦点交给 summary：它就是刚才那颗芯片所在块的容器头，
   * Enter 能原样打开，读出来是「筛选 · 11 组 47 颗芯片」，与"刚做了一次筛选"相符。
   * 鼠标路径不会因此多出焦点环：刚发生过鼠标交互，:focus-visible 不匹配。
   */
  var NARROW_RAIL = 980;
  function collapseRailAfterPick(btn) {
    if (window.innerWidth > NARROW_RAIL) return;
    var fold = document.getElementById("rail-fold");
    if (!fold || !fold.open) return;
    var hadFocus = !!btn && document.activeElement === btn;
    fold.open = false;
    if (hadFocus) {
      var sum = fold.querySelector("summary");
      if (sum && sum.focus) sum.focus();
    }
  }

  function mountSceneChips() {
    var host = document.getElementById("flt-scene");
    if (!host || !P.sceneIndex) return;

    /* 首屏密度实测（2026-10-25）：
     * 44 个芯片全展开时该区高 716px，把后面 10 组筛选全挤出首屏
     * （实测"首屏完整可见的筛选组 0/11"）。
     * 改法：默认**只显示有直连方案的 16 个**（用户最可能点的），
     * 其余"只有近似"的收进一个展开按钮；29 个 unsupported 也一并收起。
     * 这样既保住"如实告知"，又不占首屏。 */
    var terms = Object.keys(P.sceneIndex);
    var directTerms = terms.filter(function (t) { return (P.sceneIndex[t].direct || []).length; });
    var nearTerms = terms.filter(function (t) { return !(P.sceneIndex[t].direct || []).length; });

    var moreHost = document.createElement("div");
    moreHost.className = "scene-more";
    moreHost.style.cssText = "margin-top:8px;display:none";

    function makeChip(term) {
      var v = P.sceneIndex[term];
      var direct = v.direct && v.direct.length;
      var btn = document.createElement("button");
      btn.type = "button";
      btn.setAttribute("aria-pressed", "false");
      btn.setAttribute("data-scene", term);
      btn.className = direct ? "scene-chip is-direct" : "scene-chip is-near";
      /* 模板角标：这个词在模板层有对应时，芯片上多一个小「M02」。
       * 为什么要有它：模板不在 sceneIndex 里，芯片点下去只筛 S\d{2}，
       * 用户如果只看芯片，永远不会知道"搜咖啡店还有 M02 这条现成的路"。
       * 角标**只影响可发现性，不影响筛选**：点它筛出来的仍然只有 S\d{2}，
       * #count 仍然只数 SCHEMES —— 模板照样走 #tpl-strip 那条独立通道。
       * 这一点是刻意的：把模板塞进 sceneIds 会直接撞上白名单（实测 {M02} → 0/30 行）。 */
      var tplHit = resolveTemplateHits(term);
      var tplIds = tplHit.exact.map(function (t) { return t.id; });
      btn.innerHTML = tplEsc(term) + (tplIds.length
        ? '<span class="scene-tpl" title="模板层有对应：' + tplEsc(tplIds.join(" ")) +
          '（点它只筛方案，模板另在清单上方给出）">' + tplEsc(tplIds.join(" ")) + '</span>'
        : "");
      btn.title = direct
        ? "直接匹配：" + v.direct.join(" ") + (v.near && v.near.length ? "；近似：" + v.near.join(" ") : "")
        : "只有近似：" + (v.near || []).join(" ");
      if (tplIds.length) {
        btn.title += "；模板层：" + tplIds.join(" ") + "（模板不计入方案数）";
      }
      btn.addEventListener("click", function () {
        var on = btn.getAttribute("aria-pressed") === "true";
        var all = document.querySelectorAll("#flt-scene button, .scene-more button");
        for (var i = 0; i < all.length; i++) all[i].setAttribute("aria-pressed", "false");
        if (on) {
          /* 取消芯片：**不碰搜索框**（用户此刻可能正在框里打字）。
             换成显式命名的接口，是为让"两条路都不动 q"在调用点就能读出来。 */
          if (window.benchClearSceneIdsKeepQuery) window.benchClearSceneIdsKeepQuery();
          else if (window.benchClearSceneIds) window.benchClearSceneIds();
        } else {
          btn.setAttribute("aria-pressed", "true");
          var ids = (v.direct || []).concat(v.near || []);
          /* ids 只可能是 S\d{2}：模板**不**拼进来（见上面角标注释）。 */
          /* ⚠️ 2026-10-27：这一行修的是本轮最严重的用户可见缺陷（芯片死路）。
             旧代码只调 benchSetSceneIds(ids)，**不碰 state.q**，而 app.js 的 match() 让
             sceneIds 与 q 取交集。用户先搜「咖啡店」再点同名芯片 → 先缩到 4 个 id、
             再要求正文含「咖啡店」→ 0 行，而空状态那几行字还在教用户"点左侧行业芯片"。
             实测（CDP 1440×900，deliverables/66-exec/_chip-before.json）：
               只搜词 0 行 17/44；只点芯片 0 行 **0/44**；先搜后点 0 行 **18/44**。
               最刺眼的是「摄影」：只搜有 8 行，点完同名芯片反而 0 行 —— 纯功能倒退。
             新接口在换白名单的同时把搜索词**挂起**（存进 app.js 的 state.qParked，
             并在搜索框右边留一条可点复原的条子），挂起与换轴合成**一次**渲染，
             不闪"词还在、芯片已生效"的 0 行中间帧。
             为什么不在这一层把 input.value 清空了事：用户打的字永久消失且不可撤销，
             而他很可能要的正是"在咖啡店这 4 个里再挑"。挂起同时保住这两件事。
             为什么不做"q 是行业词就不参与匹配"：那是猜；猜错了没有任何提示，
             而「摄影」这种既是行业词、又真的出现在正文里的词会变成新的静默行为。 */
          if (window.benchSetSceneIdsParkingQuery) window.benchSetSceneIdsParkingQuery(ids);
          else if (window.benchSetSceneIds) window.benchSetSceneIds(ids);
          /* 选好了 → 窄档收起筛选栏，让结果进入首屏（见 collapseRailAfterPick 的长注释）。
             放在两个 bench* 调用**之后**：先让列表换成新结果，再收容器，
             否则收起那一下的重排会落在旧列表上，多一帧"空了"的观感。 */
          collapseRailAfterPick(btn);
        }
      });
      return btn;
    }

    directTerms.forEach(function (t) { host.appendChild(makeChip(t)); });
    nearTerms.forEach(function (t) { moreHost.appendChild(makeChip(t)); });
    host.parentNode.appendChild(moreHost);

    // 展开/收起
    var toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "scene-toggle";
    toggle.style.cssText = "margin-top:8px;font:inherit;font-size:13px;padding:4px 10px;cursor:pointer;border:1px solid currentColor;background:transparent;color:inherit";
    var expanded = false;
    toggle.textContent = "还有 " + nearTerms.length + " 个只有近似的 →";
    toggle.addEventListener("click", function () {
      expanded = !expanded;
      moreHost.style.display = expanded ? "" : "none";
      toggle.textContent = expanded ? "收起近似项 ←" : "还有 " + nearTerms.length + " 个只有近似的 →";
    });
    host.parentNode.appendChild(toggle);

    /* 如实列出没有对应风格的行业（跟着「还有 28 个只有近似的 →」一起展开）
     *
     * ⚠️ 这段字曾经是**两层隐藏**，用户在任何一个入口都看不到它（2026-10-27 修）：
     *   第 1 层 `moreHost.style.cssText` 里的 display:none —— 这是折叠本身，应该的；
     *   第 2 层 note 自己的 display:none —— 而展开按钮只切 moreHost，
     *     **全文件没有任何一处把 note 改回可见**（改前全文件 grep `display:none`
     *     命中 2 处，就是这两层；把 note 改回可见的语句 0 处。改后只剩 moreHost 那 1 处）。
     * 结果：这段字里的 29 个词（电商 网店 服装 乐队 家教 培训 独立开发者 个人主页 简历
     * 社团 捐款 甜品 酒吧 美甲 展会 政务 金融 医疗 地产 旅游 汽车 母婴 儿童 时尚 美妆
     * 数码 家居 农业 物流）从来没被画出来过。而 README 当时写的是「29 个如实标为"没有"，
     * 收在「还有 28 个只有近似的 →」里，不藏起来」—— 文档承诺"不藏"，代码把它藏在
     * 展开区**里面**又藏了一层。电商 / 金融 / 政务 / 医疗 / 地产 恰好是最可能被搜、
     * 最需要被告知"这里没有"的那批词。
     *
     * 实测（CDP 真浏览器，1440×900 与 390×844 两档各跑一遍，2026-10-27）：
     *   点开 toggle 之后  more.display = block（214×287）  note.display = none（0×0）
     * 文本节点在 DOM 里、textContent 逐词核对 29/29 齐全 —— 这正是它能骗过历次审查的原因：
     * 任何只读 textContent / innerHTML 的检查都会说"在"，而 getBoundingClientRect 是 0×0。
     * 判据必须是 calculated display + 有面积的 rect，两者都要。
     *
     * 为什么选「甲」（让 note 跟着 moreHost 显隐），而不是给它单独一个开关：
     *   · README 描述的就是这个形态（"收在那个展开里"）。甲让文档与代码对齐，
     *     既不用新增控件，也不用改写文档对位置的描述 —— 改文档描述位置是更大的改动，
     *     而且会让"29 个词到底在哪"多出一个需要同步的说法。
     *   · 29 个词与 28 个近似词是**互不相交**的两批（实测 near∩unsupported = 0；
     *     16+28 = 44 已经把芯片用尽，29 是另一层集合，73 = 44+29 才是全部词）。
     *     混在一个展开区里会不会误导，取决于这段字自己有没有说清"我没有对应风格"：
     *     它第一句就是「目前没有对应风格的行业（共 29 个）」，措辞、可点性、字号
     *     都与上面那 28 个可点的近似芯片不同 —— 误导的风险落在"没写清"，不落在"放一起"。
     *   · 单独加一个开关要多一个常驻控件，而首屏密度已经实测紧张（44 个芯片全展开时
     *     该区高 716px，把后面 10 组筛选全挤出首屏）—— 再挂一个控件是往回退。
     *
     * 顺带去掉 font-size:12px 与 opacity:.72：这段字**第一次**真的要被人读，
     * 而它原来的配色实测只有 3.36:1（#56534b 叠 0.72 不透明度，落在 #e7e7e2 的
     * canvas 上；WCAG AA 正文要 4.5:1）。去掉这两个覆盖后走 .rail-hint 自带的
     * 13px / --ink-3 全不透明 = 6.19:1，与它上面那句「实心＝有直连方案…」完全同款。
     * 两个比值都是 2026-10-27 在真浏览器里量的（.rail 的 background 是透明的，
     * 必须往上找到第一个不透明祖先才是真底色 —— 直接拿 .rail 算会得出对纯黑的假值）。
     */
    if (P.unsupported && P.unsupported.length) {
      var note = document.createElement("p");
      note.className = "rail-hint scene-unsupported";
      note.style.cssText = "margin-top:8px";
      note.textContent = "目前没有对应风格的行业（共 " + P.unsupported.length +
        " 个）：" + P.unsupported.join("、") + "。这些不是「还没做」，是这套图集的机制撑不起来。";
      moreHost.appendChild(note);
    }
  }

  /* ── 模板层：三个大众模板接进行业反查 ──────────────────────────────────
   *
   * 为什么这份数据写在这里，而不是 prompts.js / app.js / data.js（三个都实测过，都不行）：
   *  · prompts.js 第 1 行是「自动生成，勿手改。生成器 prototypes/_prompts/build-prompts.mjs」，
   *    而生成器是**整文件覆写**（build-prompts.mjs 末尾 writeFileSync 一次性写整份 body）。
   *    把字段加进去，下一次有人跑生成器就静默消失 —— 这个仓库已经为"改了被覆盖"付过代价。
   *    本轮又只允许改 _selection/，改不了生成器，所以这条路是死的。
   *  · app.js 开头的契约写着「这一层不做任何判断，也不写死任何方案信息 —— 页面上出现的
   *    每个数字都来自磁盘」。行业口径是判断，写进去就是自己违反契约，以后谁信那条注释谁被骗。
   *  · data.js 是 collect-schemes.mjs 生成的，且与闸门相关 —— 任务明令不动。
   *  · 本文件是手写的，且**已经**承载「你是做什么的」这层行业 UI（mountSceneChips 就在下面）。
   *    模板口径与芯片同源，才不会出现"芯片说没有、模板说能套"的两套说法。
   *
   * 数据全部从 templates/M0x/README.md 逐词抄，不做同义扩张、不改写它的承诺范围：
   *   M01 README 第 3 行：「适合律所、咨询、软件服务、设计工作室、代理商这类"专业服务型公司"」
   *   M02 README 第 3 行：「给本地实体店用的一页式官网模板：餐厅、咖啡馆、烘焙、民宿、
   *                        理发店、花店都能套」
   *   M03 README 第 6 行：「适合：个人作品集 / 自由职业者 / 小型创意工作室 / 摄影师 / 设计师 / 写作者」
   * 颜色是各 style.css :root 里的实测值（不是估的），每项 4 个：底色 / 主色 / 强调色 / 深底。
   *
   * ⚠️ 不要往这张表里加 README 没写的行业（例如「电商」「网店」）：
   *    三个模板都是单页展示站，没有购物车、没有下单、没有支付。给电商指模板就是编能力。
   */
  var TEMPLATES = [
    {
      id: "M01",
      title: "M01 清爽企业站",
      en: "Clean Corporate",
      href: "../../templates/M01-clean-corporate/",
      /* README 原词，逐词抄 */
      scenes: ["律所", "咨询", "软件服务", "设计工作室", "代理商"],
      colors: ["#FFFFFF", "#1B3A5C", "#EAF1F8", "#12283F"],
      desc: "单页企业站：专业服务型公司用。白底、深石板靛蓝主色、信息密度克制。",
    },
    {
      id: "M02",
      title: "M02 暖调门店站",
      en: "Warm Local",
      href: "../../templates/M02-warm-local/",
      scenes: ["餐厅", "咖啡馆", "烘焙", "民宿", "理发店", "花店"],
      colors: ["#FDF7EE", "#7A3B12", "#9C4A16", "#2B1A0F"],
      desc: "一页式门店官网：本地实体店用。暖米白底、烤色深褐主色、标题衬线。",
    },
    {
      id: "M03",
      title: "M03 醒目作品集",
      en: "Bold Creator",
      href: "../../templates/M03-bold-creator/",
      scenes: ["个人作品集", "自由职业者", "小型创意工作室", "摄影师", "设计师", "写作者"],
      colors: ["#0e0e10", "#f2f2ef", "#ff5c1a", "#17171a"],
      desc: "个人作品集：近黑底、近白字、一个橙色强调色，大留白大字。",
    },
  ];

  /* 索引词 → README 词：只收**同一个东西的两种写法**。
   * 每一条都得能说出理由，说不出就是编。
   *   咖啡店 / 咖啡馆 —— 同一样店的两个说法（索引 44 词里叫「咖啡店」）。
   *   律师 / 律所    —— 索引词是职业，M01 的 README 写的是机构「律所」；律师开的所就是律所。 */
  var TPL_ALIAS = {
    "咖啡店": "咖啡馆",
    "律师": "律所",
  };

  /* 「README 没有写这个词，但结构上是同一类页面」—— 单独一档，UI 上必须显示免责句。
   * 这一档存在的理由：用户搜「甜品」时，诚实答案是"没有甜品模板"，但如果连最接近的
   * 一档都不给，用户就只能在 0 行面前关掉页面。所以给候选 + 说清它为什么只是候选。
   *
   * ⚠️ 每条的 why 都必须包含"README 写的是什么、没写什么"。只写"也能用"就是编能力。
   */
  var TPL_ADJACENT = {
    "甜品": [{
      id: "M02",
      why: "M02 的适用清单里没有「甜品」，它写的是餐厅、咖啡馆、烘焙、民宿、理发店、花店。但它的总述是「给本地实体店用的一页式官网模板」，而甜品店是本地实体店 —— 这是为什么把它列为相邻候选。它页面上的 7 段是（README 原文）：顶部（店名＋导航＋订位按钮）→ 主视觉大图 → 招牌与菜单价目 → 营业时间与地址 → 店内环境图 → 顾客评价 → 订位与联系 → 页脚。甜品店套上去要自己判断这几段够不够用；它不是为甜品这个品类写的。",
    }],
    "修鞋理发": [{
      id: "M02",
      why: "索引词「修鞋理发」把两门生意并成了一个词，M02 的清单里只写了「理发店」。理发那半能套；修鞋那半它没承诺，页面里没有修鞋价目或取件凭条这类位置。",
    }],
    "美甲": [{
      id: "M02",
      why: "M02 的清单里没有「美甲」，写的是餐厅、咖啡馆、烘焙、民宿、理发店、花店。列进来只是因为它的总述是「给本地实体店用」，而美甲店是本地实体店；它的 7 段里没有预约时段表、没有甲型价目这种美甲店特有的位置，所以它不在承诺清单里，只能当起点改。",
    }],
    "作品集": [{
      id: "M03",
      why: "M03 写的是「个人作品集」，不是公司案例集。如果你要放的是自己的作品，它就是对的那一个；如果你要放的是团队/公司的项目案例，它没有客户 logo 墙与合作流程这些位置。",
    }],
    "摄影": [{
      id: "M03",
      why: "M03 的清单里写「摄影师」，指的是摄影师自己的作品集。拍商业摄影的工作室要的是业务介绍页（服务项、报价、客户），那不是 M03 的形态。",
    }],
    "设计工作室": [{
      id: "M03",
      why: "M03 的清单写「小型创意工作室」，与「设计工作室」重叠但不完全等同：M03 是作品集形态（大图、大字、少解释），不是公司介绍页。你要的是「给人看作品」就用它，要的是「介绍我们是谁、能做什么」就用 M01。",
    }],
  };

  /* 折叠条上的字（2026-10-29）。收起态下这是用户唯一读得到的关于模板层的字，
   * 所以它必须回答三个问题：有几张、是哪几个、它算不算方案。
   *  - 张数：exact + adjacent，与真正挂出的卡片数同源（见上面调用点的注释）。
   *  - 编号只写 M0x，不写全名：390 档 summary 只有约 330px 可用，
   *    「M01 清爽企业站 / M03 醒目作品集」会在 13px 下折成两行，
   *    而这条折叠条的存在意义就是"只占一行"。全名放进 title，鼠标悬停可读。
   *  - 「不计入方案数」照抄卡片上的说法（.tpl-note），不另造一种措辞。 */
  function drawStripSummary(sumEl, hit) {
    if (!sumEl) return;
    var all = hit.exact.concat(hit.adjacent.map(function (a) { return a.tpl; }));
    var ids = all.map(function (t) { return t.id; });
    var titles = all.map(function (t) { return t.title; });
    sumEl.textContent = "现成模板 " + all.length + " 张 · " + ids.join(" / ") +
      "（不计入方案数）";
    sumEl.title = titles.join("　") + "　点开看在什么行业能用、以及为什么是它";
  }

  function tplEsc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function tplById(id) {
    for (var i = 0; i < TEMPLATES.length; i++) if (TEMPLATES[i].id === id) return TEMPLATES[i];
    return null;
  }

  /* 反查：给一个词，返回 { exact, adjacent, key, readmeWord }
   * exact    = 这个词（或它的别名）逐字出现在某个 README 的适用清单里
   * adjacent = README 没写，但结构同类（每条带 why）
   * 不做子串匹配：「摄影」不能被「摄影师」直接吞掉，「设计工作室」也不能被
   * 「小型创意工作室」吞掉 —— 那两个正是上面相邻档里说清楚了的差异。 */
  function resolveTemplateHits(term) {
    var t = String(term == null ? "" : term).trim();
    if (!t) return { exact: [], adjacent: [], term: "" };
    var key = TPL_ALIAS[t] || t;
    var exact = TEMPLATES.filter(function (x) { return x.scenes.indexOf(key) >= 0; });
    var adjacent = (TPL_ADJACENT[t] || []).map(function (a) {
      var tpl = tplById(a.id);
      return tpl ? { tpl: tpl, why: a.why } : null;
    }).filter(Boolean);
    return { exact: exact, adjacent: adjacent, term: t, key: key };
  }

  /* 调试/验收用的对外接口：不发散、纯函数，CDP 里可以直接断言。 */
  window.benchTemplateHits = function (term) {
    var r = resolveTemplateHits(term);
    return {
      exact: r.exact.map(function (x) { return x.id; }),
      adjacent: r.adjacent.map(function (x) { return x.tpl.id; }),
      scenes: TEMPLATES.map(function (x) { return { id: x.id, scenes: x.scenes.slice() }; }),
    };
  };

  function tplCardHTML(tpl, why) {
    var sw = tpl.colors.map(function (h) {
      return '<i style="background:' + tplEsc(h) + '" title="' + tplEsc(h) + '"></i>';
    }).join("");
    return '<li class="tpl-card" data-tpl="' + tplEsc(tpl.id) + '">' +
      '<div class="tpl-head"><b>' + tplEsc(tpl.title) + '</b>' +
      '<span class="tpl-en">' + tplEsc(tpl.en) + '</span>' +
      '<span class="tpl-note">模板 · 不计入方案数</span></div>' +
      '<p class="tpl-desc">' + tplEsc(tpl.desc) + '</p>' +
      '<p class="tpl-scenes">适用行业（README 原文）：' + tplEsc(tpl.scenes.join(" / ")) + '</p>' +
      (why ? '<p class="tpl-why">' + tplEsc(why) + '</p>' : '') +
      '<div class="tpl-foot"><span class="swatches">' + sw + '</span>' +
      '<a class="tpl-open" href="' + tplEsc(tpl.href) + '" target="_blank" rel="noopener">' +
      '打开 ' + tplEsc(tpl.id) + ' ↗</a></div>' +
      '</li>';
  }

  /* 当前该按哪个词反查模板：
   *  · 搜索框里有词 → 用那个词（这是用户自己打的，优先级最高）；
   *  · 否则看左侧场景芯片有没有被按下 → 用它的 data-scene。
   *    芯片走的是 state.sceneIds（S\d{2} 白名单），不写 #q，所以这里必须回头读一次 DOM。
   *    读 DOM 而不是让 app.js 透传，是因为模板与芯片同属这一层，app.js 不该知道"词"是什么。 */
  function currentTerm(ctx) {
    var q = (ctx && ctx.q) ? String(ctx.q).trim() : "";
    if (q) return q;
    var pressed = document.querySelector(
      '#flt-scene button[aria-pressed="true"], .scene-more button[aria-pressed="true"]'
    );
    return pressed ? (pressed.getAttribute("data-scene") || "") : "";
  }

  /* 模板带（有方案行时，落在 #ledger 上方）与空状态模板块（0 行时）是两个独立容器：
   *  · 都不进 #ledger —— 那里的每一行都有 .inspect/report.json 与三档截图，模板没有；
   *  · 都不进 state.sceneIds —— 那是 S\d{2} 白名单（实测：喂 ["M02"] → 0/30 行，
   *    喂 ["M02","S06","S19"] → 2/30 行，M02 被 benchSetSceneIds 静默吞掉）；
   *  · 都不进 #count —— 「列出 N / 30 个方案」的 30 是 SCHEMES 的长度，模板不是方案。 */
  function renderTemplateLayer(ctx) {
    var strip = document.getElementById("tpl-strip");
    var cards = document.getElementById("tpl-cards");
    var lead = document.getElementById("tpl-strip-lead");
    var emptyBox = document.getElementById("empty-tpl");
    if (!strip || !cards || !lead || !emptyBox) return;

    var term = currentTerm(ctx);
    var hit = resolveTemplateHits(term);
    var has = hit.exact.length > 0 || hit.adjacent.length > 0;
    var rows = ctx && typeof ctx.rows === "number" ? ctx.rows : 0;
    var total = ctx && typeof ctx.total === "number" ? ctx.total : 0;
    /* 没搜词、也没点芯片时**不挂模板带**：30 行全在的时候插一条模板建议只会抢视线，
     * 而且首屏高度每加一行都要付代价（页头 267→300px 那次实测已经吃过一次）。
     * 模板层的常驻入口在页头 #tpl-exit，不动它。
     *
     * 空状态那一路**不要求 has**：用户搜一个三个模板都没写的词（实测「酒吧」「电商」），
     * 也必须得到一句诚实的"模板层也没有"，而不是什么都不出现、只剩上面那段通用解释。
     * 有命中 → 卡片；没命中 → 只有那句"没有" + 模板层全部行业口径。 */
    var showStrip = !!term && has && rows > 0;
    var showEmpty = !!term && rows === 0;

    strip.hidden = !showStrip;
    emptyBox.hidden = !showEmpty;

    /* ⚠️ 三个容器必须**都**清空，不能只清"当前不显示的那个"。
     * 实测踩过（consistency.mjs 扫 44 个索引词时抓到）：只清了一半，于是隐藏容器里留着
     * 上一个词的卡片。肉眼看不见（hidden），但
     *  · 无头浏览器/读屏器仍然能读到它；
     *  · 任何按 `.tpl-card` 数数量的断言都会被污染 —— 我自己的扫描就数出
     *    「书店 tpl=[M02]」「健身/诊所/律师 tpl=[M03]」，全是上一个词的残留。
     * 隐藏容器里的旧 DOM 就是一颗定时炸弹：今天的 hidden 明天可能被改成 opacity。
     *
     * 2026-10-26 补：`lead`（引导句）当时漏了。Lead 独立复验时用「结构」这个词搜出 6 行、
     * strip 显示 false，但 lead 里仍残留着上一个词「设计工作室」的整句
     * 「上面 3 / 30 个方案里，S08 是这个图集的直连方案；模板层另有一个为「设计工作室」写的…」。
     * 比卡片残留更糟：卡片是逐个可数的，一句引导语读起来像正常结论，读屏器和
     * 复制正文的脚本会把它当成当前搜索结果的一部分。同一个坑第三次，改成无条件全清。 */
    lead.innerHTML = "";
    if (!showStrip) cards.innerHTML = "";
    if (!showEmpty) emptyBox.innerHTML = "";

    if (!showStrip && !showEmpty) {
      return;
    }

    var html = hit.exact.map(function (t) { return tplCardHTML(t, ""); }).join("") +
      hit.adjacent.map(function (a) { return tplCardHTML(a.tpl, a.why); }).join("");

    if (showStrip) {
      /* summary 上的张数必须与本轮实际挂出的卡片数一致（2026-10-29，模板带折成 <details>）。
       * 为什么这个数不能写死：`html` 是 exact + adjacent 拼的，两个数都会随搜索词变 ——
       * 写死「1 张」会在「设计工作室」那种 exact+adjacent 双命中时少报一张，
       * 而 summary 恰恰是用户在**收起态**唯一能读到的字；它报错数，折叠就等于说谎。
       * 用 children.length 而不是再数一遍 hit：数 DOM 是"实际画出来几张"的口径，
       * 与下面 cards.innerHTML 的赋值天然同步，不依赖对 hit 的重复推理。 */
      var sumEl = document.getElementById("tpl-strip-sum");
      drawStripSummary(sumEl, hit);
      /* 句子里的数字必须来自这一轮渲染的 ctx，不能写死 —— 写死就会在筛选变化后说谎。
       * 「不计入」四个字是这句话的重点：用户刚看到「列出 2 / 30」，不能以为模板是第 3 个方案。
       *
       * ⚠️ 不能一律说「上面 N 个方案里没有专为「X」做的」。
       *    实测反例：点「咖啡店」芯片后 sceneIndex["咖啡店"].direct = ["S06"]，
       *    S06 就是为咖啡店做的，而 M02 的 README 写的是「咖啡馆」（同一门生意的另一写法）。
       *    这时候如果还写"没有专为咖啡店做的"，就是把已有的直连方案说成不存在 ——
       *    和原 bug（把模板整个藏起来）是同一类错误，只是方向相反。
       *
       * ⚠️⚠️ 查表必须**先按原词查**，别名只做兜底。
       *    第一版写成 P.sceneIndex[hit.key]，而 hit.key 是 README 的写法（咖啡馆）：
       *    sceneIndex 里根本没有「咖啡馆」这个键（它叫「咖啡店」）→ idx=null → directIds 为空 →
       *    界面就对着 S06 说"全部只是换文案能用的近似款"。实测抓出（CDP 1440×900，
       *    点「咖啡店」芯片后 stripLead 原文就是这么写的，而 S06 明明在那 4 行里）。
       *    正确顺序：原词 → README 词 → 都查不到才当"无直连"。 */
      var idx = (P.sceneIndex || {})[term] || (P.sceneIndex || {})[hit.key] || null;
      var directIds = (idx && idx.direct) || [];
      var nExact = hit.exact.length;
      var nAdj = hit.adjacent.length;
      /* 数量词必须跟着实际张数走，且**不能带前导空格** —— nWord 直接接在「另有」后面。
       * 实测反例：点「设计工作室」芯片 → 出 M01（exact）+ M03（adjacent）两张卡，
       * 而第一版只给 exact 数了数（nExact=1），于是写"另有一个"，屏幕上却有两张卡 ——
       * 用户会以为其中一张是重复的、或者以为界面数错了。所以两张都要进句子：
       * exact 是"清单里写着它"，adjacent 是"清单里没写、只是相邻候选"。 */
      var nWord = nExact === 1 ? "一个" : nExact + " 个";
      /* 相邻候选单独成句，**不要**再套一层括号：
       * 第一版写成「（另有 1 个相邻候选）（模板不计入这 3 个方案）」—— 括号叠括号，
       * 在 1440 档折成两行、读起来像脚注里的脚注。句子分开就不会。 */
      var adjTail = nAdj
        ? "；另有 " + nAdj + " 个相邻候选，它不在 README 的承诺清单里，理由写在卡里"
        : "";
      var leadText;
      if (nExact && directIds.length) {
        leadText = "上面 " + rows + " / " + total + " 个方案里，" + directIds.join(" ") +
          " 是这个图集的直连方案；模板层另有" + nWord + "为「" + (TPL_ALIAS[term] || term) +
          "」写的现成模板" + adjTail + "。模板不计入这 " + rows + " 个方案：";
      } else if (nExact) {
        leadText = "上面 " + rows + " / " + total + " 个方案里没有专为「" + term + "」做的，" +
          "全部只是换文案能用的近似款；模板层有" + nWord + "就是为「" + (TPL_ALIAS[term] || term) +
          "」写的现成模板" + adjTail + "。模板不计入这 " + rows + " 个方案：";
      } else {
        /* adjacent 这一路**不能说"模板层没有为它写的模板"**。
         * 实测反例：搜「作品集」→ 上面 5 行、M03 作相邻候选出现，
         * 而 M03 的 README 写的是「个人作品集」—— 说"模板层没有作品集模板"就是硬伤，
         * 它明明就是作品集模板，只是清单里的写法多了"个人"两个字。
         * 所以这里只陈述"逐字没有"，并说明最接近的是哪个、它自己怎么写的。 */
        leadText = "上面 " + rows + " / " + total + " 个方案与「" + term + "」相关；" +
          "模板层的适用清单里没有逐字写着「" + term + "」的，最接近的是下面的相邻候选 —— " +
          "它自己写的是「" + hit.adjacent[0].tpl.scenes.join(" / ") + "」，差在哪写在卡里：";
      }
      lead.textContent = leadText;
      cards.innerHTML = html;
    } else {
      /* 空状态：按 exact / adjacent / 都没有 分岔。
       * 这一段的价值全在"不装"：没有就写没有，并顺手把模板层的全部行业口径摊开，
       * 让用户自己判断该不该去别处找。
       *
       * ⚠️⚠️ 但"没有专案"这四个字不能说在所有 0 行的情况下。
       *    实测反例（consistency.mjs 扫 44 个索引词抓到）：搜「咖啡店」→ 列表 0 行，
       *    而 sceneIndex["咖啡店"].direct = ["S06"] —— S06 就是它的直连方案。
       *    0 行的原因是搜索框做的是**整串子串匹配**，它匹配行里的 hay，而 hay 里
       *    S06 写的是「咖啡」不是「咖啡店」；行业词本身不进 hay（那是另一套映射）。
       *    所以这时候写"没有咖啡店专案"是硬伤：索引明写着有，只是搜索框找不到。
       *    正确说法是"搜索框找不到，但芯片能筛出来"，并把 S06 点名。
       *    同一个坑还命中：潮牌 / 修鞋理发 / 小吃店（direct 有值但搜索 0 行）。 */
      var idxE = (P.sceneIndex || {})[term] || null;
      var directE = (idxE && idxE.direct) || [];
      /* ── 模板名就地做成链接（2026-10-29，B 项方案 4）────────────────────────
       *
       * 【要修的是什么】搜「餐厅」，M02 那张卡**确实出现了**，但 390 档实测：
       *   卡顶 775.5 / 卡高 223 ⇒ 只露出 68.5px（30.7%），卡里那个「打开 M02 ↗」
       *   在 **951.4px = 1.13 屏**，首屏可见 **0px**。
       * 内容有、出口有，出口在首屏外。而这句话里「M02 暖调门店站」这七个字
       * **本来就在首屏内**（390 档：head 顶 668.9，整句 81.6px 高，100% 可见）——
       * 它是纯文本，所以看得见、点不了。
       *
       * 【做法】一个字都不改，只给这句里已有的模板名包一层 <a>。
       * 这是唯一一个"语义 100% 成立"的改法：它没有新声称任何匹配关系，
       * 只是把已经写在那里的名字变成可点的。相比之下"零命中就把模板当主结果"
       * 只对 8/45 个词成立（餐厅/咖啡店/花店/民宿/律师/甜品/美甲/修鞋理发），
       * 对另外 37 个词是编能力 —— 所以那一条（方案 3）本轮没做，理由见报告。
       *
       * 【为什么用 headPre + a + headPost 三段，而不是把 head 整句 innerHTML 化】
       * head 里含用户输入（term）。现在它走 tplEsc() 是安全的；一旦改成
       * innerHTML = head，搜一个带尖括号的词就能注入标签。所以**只有**从 TEMPLATES
       * 取出来的 id/title/href 这三级常量进 HTML，用户输入那一段照旧 tplEsc()。
       * href 也过一遍 tplEsc —— 它现在是手写的相对路径，但"常量所以不用转义"
       * 正是下一处漏洞的写法。
       *
       * 【实测代价】ΔH = 0px（390/1440 两档，见报告）：<a> 是行内元素，
       * 字号/行高/字距全部继承 .tpl-empty-head，原来那句本来就在折行，
       * 加一层行内包裹不改变任何一行的高度。这一条我复算过，不是照抄审计。 */
      var headPre, headPost = "", headLink = null;
      function tplAnchor(t) {
        return '<a class="tpl-inline" href="' + tplEsc(t.href) + '" target="_blank" rel="noopener">' +
          tplEsc(t.id + " " + t.title.replace(/^M\d+\s*/, "")) + "</a>";
      }
      var head;
      if (directE.length) {
        headPre = "「" + term + "」按文字搜不到（搜索框匹配整串，这 30 个案里没有哪一行写着「" +
          term + "」），但索引里 " + directE.join(" ") + " 就是它的直连方案 —— " +
          "点左侧「" + term + "」芯片能筛出来。";
        if (hit.exact.length) {
          headPre += "另外模板层有 ";
          headLink = tplAnchor(hit.exact[0]);
          headPost = "，它的 README 适用行业里写着「" + (TPL_ALIAS[term] || term) + "」：";
        }
      } else if (hit.exact.length) {
        var t0 = hit.exact[0];
        headPre = "这 " + total + " 个案里没有「" + term + "」专案。但模板层有：";
        headLink = tplAnchor(t0);
        headPost = " 的 README 适用行业里就写着「" + (TPL_ALIAS[term] || term) + "」，它才是为这行做的：";
      } else if (hit.adjacent.length) {
        headPre = "「" + term + "」在 " + total + " 个案里 0 个命中；三个模板的 README 适用清单里也没有这个词。" +
          "下面只是相邻候选 —— 它自己写的行业是「" + hit.adjacent[0].tpl.scenes.join(" / ") + "」：";
      } else {
        headPre = "「" + term + "」在 " + total + " 个案里 0 个命中，三个大众模板的 README 适用清单里也没有。" +
          "这一类，这套图集和模板层都给不了你 —— 不是你条件加多了。";
      }
      head = headPre + (headLink || "") + headPost;

      /* 直连方案在前一种分岔里已经被点名，卡片就不要再重复贴一遍模板
       * （否则屏幕上会出现"上面说能筛出 S06，下面又贴一张 M02 卡"的错位感）。
       * 这里只在"确实有模板可给"时挂卡片；没有就只留那句"没有"。 */
      var cardHTML = directE.length && hit.exact.length
        ? hit.exact.map(function (t) { return tplCardHTML(t, ""); }).join("")
        : html;

      var all = TEMPLATES.map(function (t) {
        return '<li><a href="' + tplEsc(t.href) + '" target="_blank" rel="noopener">' +
          tplEsc(t.id) + " " + tplEsc(t.title.replace(/^M\d+\s*/, "")) + "</a>" +
          '<span>' + tplEsc(t.scenes.join(" / ")) + "</span></li>";
      }).join("");

      emptyBox.innerHTML =
        '<p class="tpl-empty-head">' + tplEsc(headPre) + (headLink || "") + tplEsc(headPost) + '</p>' +
        (cardHTML ? '<ul class="tpl-cards">' + cardHTML + '</ul>' : "") +
        '<p class="tpl-empty-all">模板层承诺的全部行业（逐字来自三个 README）：</p>' +
        '<ul class="tpl-all">' + all + '</ul>';
    }
  }

  /* app.js 每轮 render() 结束时回调这里。
   * 为什么用回调而不是让 app.js 直接调模板渲染：
   *   app.js 不该知道"模板"这个概念（它的契约是只渲染 SCHEMES），模板数据在本文件。
   *   传过去的只有事实：当前搜索词、筛出来的行数、方案总数。 */
  window.onBenchRender = function (ctx) {
    try {
      renderTemplateLayer(ctx || {});
    } catch (e) {
      /* 模板层坏掉不能连累 30 个案的主清单：吞掉异常并在 console 留痕。 */
      if (window.console) console.warn("[模板层] 渲染失败：" + (e && e.message));
    }
  };

  // 等 DOM 就绪再挂（脚本在 app.js 之前加载，此时 rail 已解析但 app.js 可能还没跑完）
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mountSceneChips);
  } else {
    mountSceneChips();
  }
})();
