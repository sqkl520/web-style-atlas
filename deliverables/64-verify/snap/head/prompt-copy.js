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

  // 由 DNA 生成「填充好的」提示词（用户可直接粘给 AI）
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
        fontLine += "标题按这个顺序取第一个可用的：" + fStack.join(" → ") + "（前一个缺字就换下一个，不要自己另选）。";
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
    /* 字体行末尾的「不准回退」禁令：**必须分标题链、正文链各判一次**。
     *
     * 2026-10-26 第二次修（独立验证 Agent 抓出）。第一版把两条链拼起来判
     * `CJK_RE.test(fStack + bStack + ...)`，于是：
     *  · S03 标题链 = IBM Plex Mono → Cascadia Mono → Consolas（三个纯拉丁等宽体，
     *    无一有中文字形），但正文链里有 Noto Sans SC，拼接后 hasCJK=true，
     *    于是走了严格分支：「不要跳过上面这条链直接回退」。AI 画中文标题时**必须**违规。
     *  · S04 是镜像：正文链 Redaction 20 → Georgia → Nimbus Roman 全无中文，
     *    标题链有 LXGW WenKai，又判成 true。
     * 判据粒度错了 —— 禁令约束的是"这一条链能不能画中文"，就该按链判。
     */
    var hasCJKTitle = CJK_RE.test(fStack.join(" ") + " " + fTitle);
    var hasCJKBody = CJK_RE.test(bStack.join(" ") + " " + fBody);
    var bans = "\n   不要用 Playfair Display、Inter、Roboto。";
    if (hasCJKTitle && hasCJKBody) {
      fontLine += bans + "也不要跳过上面这两条链直接回退成系统默认无衬线。";
    } else if (!hasCJKTitle && !hasCJKBody) {
      fontLine += bans + "中文没有指定字族，回退到一款中文衬线（宋体类）即可，但不要用系统默认无衬线。";
    } else {
      var missSide = !hasCJKTitle ? "标题" : "正文";
      var okSide = hasCJKTitle ? "标题" : "正文";
      fontLine += bans + missSide + "这条链里没有中文字族，画中文时按顺序回退到一款中文" +
        "（宋体或楷体类）即可；" + okSide + "那条链**必须**按序取，不许跳过。";
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

    var lines = [
      "我经营" + (o.biz || "一家小店") + "，" + (o.what || "有一些内容和图片要放上去") + "。",
      "页面需要" + (o.action || "让访客看懂我在做什么、并能联系我") + "。",
      "",
      "请把整页做成这个风格：" + s.plain + "。",
      tone
        ? "这个案子的调性是「" + tone + "」。照这个调性写文案和标题，不要写成通用的商业落地页。"
        : "",
      "",
      mech,
      "",
      "视觉硬约束（逐条执行，不得改色、不得换字体）：",
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
      "4. 阴影：" + d.shadow + "。不许用柔和外投影制造'浮起卡片'。",
      "5. 线宽只用这几级：" + d.lineWidths + "，不要自创第三级。",
      "",
      "结构约束：",
      "1. 我实际有 " + count + " 个" + unit + "，就排 " + count + " 个：",
      "   不凑整、不留空位、不留占位符、编号连续不跳号。",
      /* ⚠️ 第 2 条必须按 degrades 分化，不能对所有人都说同一句。
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
       */
      d.degrades
        ? "2. 这个版式的单元位置是手工排定的（不是自动流），撑不住太少的内容。" +
          "请先用你真实的 " + unit + "数去排；如果确实不足 " + count + " 个，把空出来的位置删掉、整块重排，" +
          "不要留空槽，也不要为了凑数编造内容。"
        : "2. 这个版式是自动流排版，条目增减只会让页面变短、不会留空位。按你真实的数量排即可，不要为了凑数编造内容。",
      /* 图片数量：`minPics` 是逐案实测出来的（30 案分布在 4–10 张），
       * 但在此之前它**从未进过提示词** —— prompt-copy.js 全文 "minPics" 命中 0 次。
       * 后果不是抽象的：S19 那次唯一的端到端实测里，真实发生的事故就是
       * "初版只给了抽屉宽度、没给高度，5 个抽屉挤成两条 24px 的细带"，
       * 而测出这个缺陷靠的是落地实现 + 量像素，读提示词读不出来。
       * 图片位同理：不告诉 AI 要几张、必须多大，它就会把版面压扁。
       */
      s.minPics
        ? "3. 版式里至少要 " + s.minPics + " 个**不同的**图片位置（不是" + s.minPics + " 个 img 标签就够——" +
          "同一张图重复用不算）。每个位都要有真实可见的尺寸，路径用 images/ 占位（见末尾输出要求），" +
          "但不许用 1px 图或纯色块顶替。"
        : "",
      "4. 首屏不要轮播图。",
      "",
      "防退化（出现任何一条就重做）：",
      "① 不要紫蓝渐变、#6366F1、蓝紫光斑。",
      "② 不要圆角卡片配柔和外投影。",
      "③ 不要居中大标题 + 副标题 + 两个并排 CTA 的首屏。",
      "④ 不要三条等宽 feature 卡片（图标＋标题＋两行说明）。",
      "⑤ 不要 emoji、彩色 iconfont、扁平插画。",
      "⑥ 不要玻璃拟态、毛玻璃、半透明浮层。",
      "⑦ 不要暗底发光字、霓虹色、扫描线。",
      "⑧ 不要自动轮播、滚动视差、卡片翻转。",
      "",
      /* 本案例专属的「最容易做成什么样」。两个独立验证 Agent 各自发现：
       * data.js 的 risk 字段 30/30 齐全、共 5761 字，是**唯一一份写给"会犯错的执行者"的具体禁令**，
       * 却从未进过提示词。它比上面 8 条通用禁令精确一个数量级 ——
       * 通用禁令说"不要紫蓝渐变"，这里说"纸纹只铺满幅底色层、正文栏内部保持干净、禁止统一套做旧滤镜"。
       * 截到 220 字：完整风险段平均 190 字，个别 331 字，全给会挤占注意力预算。
       */
      (d.risk && d.risk.length > 20)
        ? ("这一案最容易做成的错误样子（作者原话，务必避开）：" +
           (d.risk.length > 220 ? d.risk.slice(0, 220) + "…" : d.risk) + "\n")
        : "",
      "验收三问（做完自己检查）：",
      "1. 拿远半米看：整页像「" + s.plain + "」，还是像一张通用落地页？像落地页就重做。",
      "2. 随便挑一条内容：首屏、卡片、页脚上的编号是不是同一串？有一处对不上就重做。",
      "3. 扫一眼：有没有圆角、影子跑到纸外、发光字、表情图标、两个主按钮？有任何一个就重做。",
      "",
      "输出要求：只给一个完整单文件 HTML（以 <!DOCTYPE html> 开头，CSS 内联在 <style> 里），",
      /* 这里必须与上面结构约束第 4 条对齐。原先只写"图片用 images/ 下的占位路径"，
       * 而后加的 minPics 约束要求"放 N 张真实图片、不许用 1px 占位或色块顶替" ——
       * 两句对同一件事给了相反指示（独立验证 Agent 抓出，30/30 案都中）。
       * 正确的说法：**位要有真实尺寸与内容比例**，路径先用 images/ 占位，
       * 因为用户手上没有这套素材，AI 也不该去抓网图。
       */
      "不引 React/Vue/Tailwind/Bootstrap，不拆文件、不构建。",
      "图片位置写成 <img src=\"images/占位-N.jpg\"> 并给出该案实际可用的宽高属性；不许用 1px 图、纯色块或 CSS 画一个假图顶替。",
      "移动端单列，顺序不变。不要解释、不要设计说明，只给代码。",
    ].filter(function (x) { return x !== ""; });

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
  function copyPrompt(id, btn) {
    var text = buildPrompt(id);
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
    wrap.style.cssText = "margin:14px 0 4px;display:flex;flex-wrap:wrap;gap:8px;align-items:center";

    var b = document.createElement("button");
    b.type = "button";
    b.className = "prompt-copy";
    b.textContent = "复制 AI 提示词";
    b.style.cssText = [
      "font:inherit", "padding:9px 16px", "cursor:pointer",
      "border:1px solid currentColor", "background:transparent", "color:inherit",
    ].join(";");

    /* 键盘陷阱（子 Agent 用真实 CDP Input 事件实测抓到）：
     * 详情里的行卡本身绑了 keydown（Enter/Space 会展开详情）。
     * 如果按钮只拦 click，键盘按 Enter 时行的 keydown 先 preventDefault 取消了合成 click
     * ⇒ 复制没发生，详情反而被展开。所以必须同时拦 keydown 并阻止冒泡。
     */
    function fire(e) {
      if (e) { e.preventDefault(); e.stopPropagation(); }
      copyPrompt(id, b);
    }
    b.addEventListener("click", function (e) { e.stopPropagation(); copyPrompt(id, b); });
    b.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " " || e.key === "Spacebar") fire(e);
    });

    var hint = document.createElement("span");
    hint.style.cssText = "font-size:12px;opacity:.7";
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
     * 两个轴（题材绑死 / 数量绑死）仍分开描述，因为它们确实正交（2×2 四格都有实例）。 */
    var riskyTopic = !!s.hard;
    var riskyCount = !!(s.capacity && s.capacity.degrades === "yes");
    if (riskyTopic || riskyCount) {
      var why = [];
      if (riskyTopic) why.push("机制绑在特定题材上，换普通内容会退化");
      if (riskyCount) why.push("单元位置是手工排定的，内容少于 " + (s.minItems || "设计规模") + " 条会留洞");
      hint.textContent = "⚠ " + why.join("；") + "。具体不适合什么，写在详情「适用场景」段末。";
    } else {
      hint.textContent = "粘给 ChatGPT / Claude / v0 都行，约 " + buildPrompt(id).length + " 字";
    }

    wrap.appendChild(b);
    wrap.appendChild(hint);
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
          if (window.benchClearSceneIds) window.benchClearSceneIds();
        } else {
          btn.setAttribute("aria-pressed", "true");
          var ids = (v.direct || []).concat(v.near || []);
          /* ids 只可能是 S\d{2}：模板**不**拼进来（见上面角标注释）。 */
          if (window.benchSetSceneIds) window.benchSetSceneIds(ids);
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

    // 如实列出没有对应风格的行业（默认收起，点开才看）
    if (P.unsupported && P.unsupported.length) {
      var note = document.createElement("p");
      note.className = "rail-hint scene-unsupported";
      note.style.cssText = "margin-top:8px;font-size:12px;opacity:.72;display:none";
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
      var head;
      if (directE.length) {
        head = "「" + term + "」按文字搜不到（搜索框匹配整串，这 30 个案里没有哪一行写着「" +
          term + "」），但索引里 " + directE.join(" ") + " 就是它的直连方案 —— " +
          "点左侧「" + term + "」芯片能筛出来。";
        if (hit.exact.length) {
          head += "另外模板层有 " + hit.exact[0].id + "，它的 README 适用行业里写着「" +
            (TPL_ALIAS[term] || term) + "」：";
        }
      } else if (hit.exact.length) {
        var t0 = hit.exact[0];
        head = "这 " + total + " 个案里没有「" + term + "」专案。但模板层有：" +
          t0.id + " " + t0.title.replace(/^M\d+\s*/, "") + " 的 README 适用行业里就写着「" +
          (TPL_ALIAS[term] || term) + "」，它才是为这行做的：";
      } else if (hit.adjacent.length) {
        head = "「" + term + "」在 " + total + " 个案里 0 个命中；三个模板的 README 适用清单里也没有这个词。" +
          "下面只是相邻候选 —— 它自己写的行业是「" + hit.adjacent[0].tpl.scenes.join(" / ") + "」：";
      } else {
        head = "「" + term + "」在 " + total + " 个案里 0 个命中，三个大众模板的 README 适用清单里也没有。" +
          "这一类，这套图集和模板层都给不了你 —— 不是你条件加多了。";
      }

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
        '<p class="tpl-empty-head">' + tplEsc(head) + '</p>' +
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
