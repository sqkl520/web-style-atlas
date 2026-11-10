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

    var fontLine = "2. 字体：标题用 " + fTitle + "，正文用 " + fBody + "。";
    if (mono) fontLine += "编号/价格等数字用等宽 " + mono + "、tabular-nums 右对齐。";
    fontLine += "\n   不要用 Playfair Display、Inter、Roboto，也不要回退成系统默认无衬线。";

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
      "2. 数量不够时按实际数量收敛，**不要拉高或重复填满**。",
      /* 内容量容限：degrades=yes 的案，单元位置是作者按固定条数手写死的
       * （绝对定位 / 写死 grid-row / 手绘 SVG 坐标 / 写死编号的行标题）。
       * 不告诉 AI 这一点，它会照常删条目，然后在版面上留下空洞。
       */
      d.degrades
        ? "3. 这一版式的位置是按 " + count + " 个" + unit + "手工排定的（不是自动流）：数量一变就会留洞。" +
          "所以请**先把数量凑到 " + count + " 个再排版**；确实凑不够时，把空出来的位置删掉、整块重排，不要留空槽。"
        : "3. 这一版式是自动流排版，条目增减只会让页面变短，不会留空位。",
      /* 图片数量：`minPics` 是逐案实测出来的（30 案分布在 4–10 张），
       * 但在此之前它**从未进过提示词** —— prompt-copy.js 全文 "minPics" 命中 0 次。
       * 后果不是抽象的：S19 那次唯一的端到端实测里，真实发生的事故就是
       * "初版只给了抽屉宽度、没给高度，5 个抽屉挤成两条 24px 的细带"，
       * 而测出这个缺陷靠的是落地实现 + 量像素，读提示词读不出来。
       * 图片位同理：不告诉 AI 要几张、必须多大，它就会把版面压扁。
       */
      s.minPics
        ? "4. 版式里要留 " + s.minPics + " 个图片位，每个都要有真实可见的尺寸（见末尾输出要求：路径用 images/ 占位，但不许用 1px 图或纯色块顶替）。"
        : "",
      "5. 首屏不要轮播图。",
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
    hint.textContent = s.hard
      ? "⚠ 这案机制绑死在行业数据上，换普通内容会退化——建议先看详情里的「不适合」"
      : "粘给 ChatGPT / Claude / v0 都行，约 " + buildPrompt(id).length + " 字";

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
      btn.textContent = term;
      btn.setAttribute("aria-pressed", "false");
      btn.setAttribute("data-scene", term);
      btn.className = direct ? "scene-chip is-direct" : "scene-chip is-near";
      btn.title = direct
        ? "直接匹配：" + v.direct.join(" ") + (v.near && v.near.length ? "；近似：" + v.near.join(" ") : "")
        : "只有近似：" + (v.near || []).join(" ");
      btn.addEventListener("click", function () {
        var on = btn.getAttribute("aria-pressed") === "true";
        var all = document.querySelectorAll("#flt-scene button, .scene-more button");
        for (var i = 0; i < all.length; i++) all[i].setAttribute("aria-pressed", "false");
        if (on) {
          if (window.benchClearSceneIds) window.benchClearSceneIds();
        } else {
          btn.setAttribute("aria-pressed", "true");
          var ids = (v.direct || []).concat(v.near || []);
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

  // 等 DOM 就绪再挂（脚本在 app.js 之前加载，此时 rail 已解析但 app.js 可能还没跑完）
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mountSceneChips);
  } else {
    mountSceneChips();
  }
})();
