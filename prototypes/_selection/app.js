/* 选型台行为层。
   数据全部来自 data.js（由 _build/collect-schemes.mjs 从
   _CURRENT-VALUES.md → _specs/Sxx.md → .inspect/report.json 三层生成）。
   这一层不做任何判断，也不写死任何方案信息 —— 页面上出现的每个数字都来自磁盘。 */

(function () {
  'use strict';

  var ALL = (window.SCHEMES || []).slice();
  var THR_ORDER = { '低': 0, '中': 1, '高': 2 };

  var state = {
    q: '',
    /* 用户能回答的轴（放在前面 —— 它们才是挑选时要问的问题） */
    ground: new Set(),   // 亮底 / 暗底
    band: new Set(),     // 底色带（把"多少人挤在同一条带里"摆到台面上）
    load: new Set(),     // 一屏说清 / 三五屏 / 很多栏目
    loud: new Set(),     // 很安静 / 有态度不吵 / 就要扎眼
    /* 设计口径与项目质检状态（保留，但排在后面） */
    fr: new Set(),
    thr: new Set(),
    tone: new Set(),
    st: new Set(),
    gate: new Set(),
    /* 场景反查白名单：由 prompt-copy.js 的「你是做什么的」芯片写入。
       为空 = 不按场景筛。单独开一个状态是因为 state.q 是整串子串匹配，
       拼"S06 S19"这种串会筛出 0 个（实测踩过）。 */
    sceneIds: new Set(),
    /* 被行业芯片「接管」时寄存的搜索词（2026-10-27）。
       为什么需要它：见下面 parkQuery() 的长注释。简言之 —— 点芯片时若搜索框里有词，
       两条筛选取交集；而 18/44 个行业词在方案正文里根本没有，交集恒为空。
       所以点芯片时把 q 从输入框里**移出**，原值存在这里，好让用户一键放回去。
       null = 没有挂起的词。 */
    qParked: null,
    sort: 'n',
    open: null,          // 当前展开的方案 id
    vp: 'desktop',       // 详情里的视口
    shotIdx: 0,          // 详情里的第几张
  };

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /* ── 统计 ─────────────────────────────────────────────── */
  var stats = {
    total: ALL.length,
    built: ALL.filter(function (r) { return r.built; }).length,
    clean: ALL.filter(function (r) { return r.gate && r.gate.fail === 0; }).length,
    shots: ALL.reduce(function (a, r) {
      return a + r.shots.desktop.length + r.shots.tablet.length + r.shots.mobile.length;
    }, 0),
  };

  function uniq(key) {
    var m = new Map();
    ALL.forEach(function (r) {
      var v = (key(r) || '').trim();
      if (!v) return;
      m.set(v, (m.get(v) || 0) + 1);
    });
    return Array.from(m.entries());
  }

  /* ── 报头数字 ─────────────────────────────────────────── */
  $('#f-total').textContent = stats.total;
  $('#f-built').textContent = stats.built + ' / ' + stats.total;
  /* 2026-10-28 改：原来只写 `stats.clean`（= 26），即「30 个原型里有 26 个的闸门 FAIL=0」。
     但报头的标签是「闸门 FAIL=0」，读起来像「整个项目体检合格」——
     而**这个页面自己**当时有 FAIL、且报告曾陈旧 5.94 天，完全不在这个 26 里。
     标签与统计口径不符，是「界面在说半真话」的又一例：数字是真的，但回答的不是用户以为的那个问题。

     处置：这一格**保持纯数字 26**（不改成分数、不给标签加注），口径改由
     summary 行与 #self-gate 那一行说清。三版实测记录：
       · 「闸门 FAIL=0（原型）」标签 → `.mast` 右列 302 → 526px（+224），四个 dt 被均分
         拉宽到 130px，页头 +21.7px、首卡 +21.7px。**否决**（右列是 `minmax(300px,max-content)`，
         不受控；`.mast-facts` 是 4 等分网格，最长 dt 决定整列宽）。
       · 数字改成 `26 / 30` → 网格宽度零变化，但 1440 档四格各 74px，「闸门 FAIL=0」
         标签正好占满整格，分数把 dd 撑到贴住右边框，截图里「闸门 FAIL=0截图总数」读起来像连成一句。
         **否决**（视觉粘连，且分母信息与 self-gate 那一行重复）。
       · 当前：纯数字。分母改在 `.mast-fold` 里说清（那里本来默认展开）。 */
  $('#f-clean').textContent = stats.clean;

  /* ── 选型台自身的闸门状态（2026-10-28 加）────────────────
   *
   * 为什么必须在页面上写出来：本页的 `.inspect/report.json` 是 2026-10-22 的，
   * 直到 2026-10-28 才有机制发现它已陈旧（`check-stale.mjs` 当时只查 `/^S\d{2}-/`，
   * 和 `verify-prototype --all` 复制了同一个选择器 —— 病根不是没人写检查，是检查的目录漏了一层）。
   * 陈旧期实测 8562 分钟（5.94 天），其间 `_selection/` 被改了 25 个 commit、+6214/−783 行。
   * 重渲染后真实结果是 2 条 FAIL（body-size: 正文 13px 占字符量 90.5%；hairline: 页头两条 1px 线）。
   *
   * 这段文字从 `report.json` 现场读，不硬编码 —— 否则它自己就会成为下一个腐化源。
   * 读不到就如实说读不到，不装作没问题。 */
  var SELFGATE = (function () {
    var rep = window.SELECTION_REPORT;
    if (!rep || !Array.isArray(rep.findings)) return null;
    var f = rep.findings.filter(function (x) { return x.level === 'FAIL'; });
    var w = rep.findings.filter(function (x) { return x.level === 'WARN'; });
    return { fail: f.length, warn: w.length, ids: f.map(function (x) { return x.id; }), at: rep.at };
  })();
  (function () {
    var host = document.getElementById('self-gate');
    /* summary 行里的徽标：那是**固定一行**的高度，加字不增高。
       为什么要把结论同时放进 summary：`.mast-fold` 在宽档默认 open、窄档默认收起，
       如果只在折叠体里写，「本页自己有 FAIL」这件事在 390 档就要用户先点开才知道。
       徽标把结论提到那一行上，详句留在下面。 */
    var sum = document.querySelector('#mast-fold .mast-fold-sum');
    var badge = null;
    if (sum) {
      badge = document.createElement('span');
      badge.className = 'sg-badge';
      sum.appendChild(badge);
    }

    if (!SELFGATE) {
      var msg = '本页自身：没有闸门报告（没渲染过）—— 这一行不能替你担保什么。'
        + '跑 node prototypes/_build/render-scheme.mjs _selection 生成。';
      if (host) host.textContent = msg;
      if (badge) badge.textContent = '　·　本页自身：未渲染';
      return;
    }
    var when = String(SELFGATE.at || '').slice(0, 10);
    /* 2026-10-29 改：文案必须压到**一行**。三个独立 Agent 各自测出同一个回归 ——
     * 第一版 pass 分支 90+ 字，在 `.self-gate`（宽 548.3px、max-width 76ch）下折成 2 行，
     * 于是 `.mast-fold` 高 +19.5px、1440 首卡 top 从 430.5 → **450.0**。
     * 而 1440 档 `.mast-fold` 默认 open、窄档默认收起 —— 所以这个回归**只在宽档显形**，
     * 很容易被「390 档零变化」掩盖过去。
     *
     * 现在：正文只留一行放得下的结论句；完整解释写进 `title`（悬停可读、不占高度）。 */
    var short = '本页自身：FAIL ' + (SELFGATE.fail || 0) + ' · WARN ' + SELFGATE.warn
      + ' · 报告 ' + when
      + (SELFGATE.fail ? '（' + SELFGATE.ids.join(' / ') + '）' : '')
      + '　·　本页不在报头统计里';
    var detail = '报头那个「闸门 FAIL=0 ' + stats.clean + '」只数 30 个原型（'
      + stats.clean + ' / ' + stats.total + '），不含本页。\n'
      + '本页自身的闸门结果来自 prototypes/_selection/.inspect/report.json，'
      + '由 `node prototypes/_build/render-scheme.mjs _selection` 生成；'
      + '`check-stale.mjs` 会检查它是否过期。\n'
      + 'FAIL：' + (SELFGATE.ids.length ? SELFGATE.ids.join(' / ') : '无')
      + '；WARN ' + SELFGATE.warn + ' 条。';

    if (host) {
      host.textContent = short;
      host.setAttribute('title', detail);
      host.setAttribute('data-level', SELFGATE.fail ? 'fail' : 'pass');
    }
    if (badge) {
      badge.textContent = '　·　本页自身 FAIL ' + (SELFGATE.fail || 0) + ' · WARN ' + SELFGATE.warn;
      badge.setAttribute('data-level', SELFGATE.fail ? 'fail' : 'pass');
    }
  })();
  $('#f-shots').textContent = stats.shots;

  /* ── 筛选芯片 ─────────────────────────────────────────── */
  function chips(host, keyFn, set, labelFn) {
    var box = $(host);
    box.innerHTML = '';
    uniq(keyFn).forEach(function (pair) {
      var val = pair[0], n = pair[1];
      var b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('aria-pressed', set.has(val) ? 'true' : 'false');
      b.innerHTML = esc(labelFn ? labelFn(val) : val) + '<span class="n">' + n + '</span>';
      b.addEventListener('click', function () {
        if (set.has(val)) set.delete(val); else set.add(val);
        b.setAttribute('aria-pressed', set.has(val) ? 'true' : 'false');
        render();
      });
      box.appendChild(b);
    });
  }

  function stateKey(r) {
    if (!r.built) return '未建原型';
    if (!r.gate) return '已建 · 未渲染';
    return '已建 · 已渲染';
  }
  function gateKey(r) {
    if (!r.gate) return '未渲染';
    return 'FAIL ' + r.gate.fail;
  }

  /* 先挂用户能回答的四组轴，再挂设计口径与质检状态 */
  function axColor(c) {
    return '<i class="sw" style="background:#' + String(c).replace(/^#/, '') + '"></i>';
  }
  chips('#flt-ground', function (r) { return (r.axes || {}).ground; }, state.ground);
  chips('#flt-band', function (r) { return (r.axes || {}).band; }, state.band);
  chips('#flt-load', function (r) { return (r.axes || {}).load; }, state.load);
  chips('#flt-loud', function (r) { return (r.axes || {}).loud; }, state.loud);

  chips('#flt-fr', function (r) { return r.fr; }, state.fr, function (v) { return v + ' 型'; });
  chips('#flt-thr', function (r) { return r.threshold; }, state.thr);
  chips('#flt-tone', function (r) { return r.tone; }, state.tone);
  chips('#flt-state', stateKey, state.st, function (v) { return v.replace(' · ', '·'); });
  chips('#flt-gate', gateKey, state.gate);

  /* ── 过滤与排序 ───────────────────────────────────────── */
  function match(r) {
    var ax = r.axes || {};
    /* 场景反查（由 prompt-copy.js 的「你是做什么的」芯片驱动）：
       芯片不能靠往搜索框里拼方案号来筛 —— state.q 是**整串子串匹配**（见下方 L141
       hay.indexOf(state.q)），"S06 S19 S22 S09" 这种串在 hay 里根本不存在，
       实测点了芯片会筛出 0 个。所以单独开一个 id 白名单状态。
       sceneIds 为空表示不按场景筛。 */
    if (state.sceneIds && state.sceneIds.size && !state.sceneIds.has(r.id)) return false;
    if (state.ground.size && !state.ground.has(ax.ground)) return false;
    if (state.band.size && !state.band.has(ax.band)) return false;
    if (state.load.size && !state.load.has(ax.load)) return false;
    if (state.loud.size && !state.loud.has(ax.loud)) return false;
    if (state.fr.size && !state.fr.has(r.fr)) return false;
    if (state.thr.size && !state.thr.has(r.threshold)) return false;
    if (state.tone.size && !state.tone.has(r.tone)) return false;
    if (state.st.size && !state.st.has(stateKey(r))) return false;
    if (state.gate.size && !state.gate.has(gateKey(r))) return false;
    if (state.q) {
      /* ⚠️ `r.scenes`（字段 10 适用场景，含"不适合"）原本**不在搜索索引里**。
         后果是用户第一个会问的问题搜不到答案：实测搜「餐饮 / 金融 / 政务 / 课程」
         **四个词各 0 命中**，而 30/30 行上一个行业/场景字样都不显示
         （scenes 只在详情第 9 字段，位置在滚动容器的 3.42 屏之下）。
         （选型台信息架构审查员实测抓出。）
         一并纳入的还有：骨架名、字段 2 美学家族、字段 12 签名式怪癖、轴线取值。 */
      var ax = r.axes || {};
      /* ⚠️ 这里只能用 `scenesYes`，**不能用 `scenes`**。
         字段 10 的字面是「适合…**不适合：**…」，整串进索引会让正负一起进：
         实测搜"政务"命中 7 行，**7/7 全部只出现在"不适合"从句里**，
         而行卡不印 scenes → 用户看到 7 行却没有一行印出"政务"，
         只能得出"有 7 个方案适合政务"这个**与事实相反**的结论。
         （这是我自己在一次"修复"里引入的反向信号。原来的 0 命中至少诚实。） */
      /* 2026-10-31：`r.fonts` → `r.fontsSpec`。data.js 里这个字段是**规格原文**
       * （30 案实测 min 228 / 中位 360.5 / max 514 / 均值 373 字的字符串），
       * 与 prompts.js 里的 `dna.fonts` 对象同名不同形状。改名后两者不会再被误认。
       *
       * ⚠️ 曾写成 `r.fontsSpec || r.fonts` 兜底，已删（2026-10-31 锐评验收后）。
       * 理由：钝评实测「把 data.js 的 30 处 fontsSpec 全退回 fonts」时，
       * 六个检查器**全绿** —— 说明这个字段当时零测试保护。
       * 兜底的唯一实际效果是让「改名没做完」永远无法被观测到。
       * 现在改为：直接读 fontsSpec（读不到就是空，搜索少索引一个字段，
       * 但 `check-twolines.mjs` 的 R8 会红，问题在闸门里看得见，不在搜索里静默）。 */
      var hay = [r.id, r.cn, r.en, r.family, r.fontsSpec, r.def, r.tone, r.structure,
                 r.errorCode, r.threshold, r.layout, r.visuals, r.quirk,
                 r.scenesYes,
                 ax.ground, ax.band, ax.load, ax.loud,
                 (r.palette || []).join(' ')].join(' ').toLowerCase();
      if (hay.indexOf(state.q) < 0) return false;
    }
    return true;
  }

  /* ── 芯片 × 搜索框：同一根轴只允许一个主人（2026-10-27）────────────────────
   *
   * 【要修的死路，实测数字】44 个 sceneIndex 词逐个跑「先搜该词 → 再点同名芯片」
   * （CDP，1440×900，deliverables/66-exec/_chip-before.json）：
   *   · 只搜词 0 行：17 / 44
   *   · 只点芯片 0 行：**0 / 44**（芯片这条路一直是通的）
   *   · 先搜后点 0 行：**18 / 44**（比"只搜 0 行"多一个：摄影 —— 搜出 8 行，
   *     点了芯片反而变 0 行，是纯粹的功能倒退）
   *   · 先点后搜（点芯片后搜「白色」）0 行：34 / 44
   * 而 0 行时界面上那段话仍在教用户「点左侧行业芯片」——**用户照做了，还是 0**。
   * 根因不是文案错，是两条筛选取交集：match() 里 sceneIds 与 q 是 AND，
   * 而芯片只写 sceneIds、不碰 q（prompt-copy.js 的 click handler）。
   *
   * 【为什么不是「点芯片时把搜索框清空」】用户刚打的字被静默吃掉，而且他很可能
   * 就是想「在咖啡店这 4 个里再挑」——那一半意图被抹掉了，还无法恢复。
   * 【为什么不是「改成 OR」】那会破坏底色/亮度/内容量/闸门这些组之间的 AND 一致性；
   * 搜「咖啡店」再点「暗底」，用户期待的是交集，不是并集。
   * 【为什么不是「智能识别搜索词是不是行业词」】歧义真实存在（「白色」不是行业词，
   * 但「摄影」既是行业词也是正文里会出现的词），猜错就是新的静默改动。
   *
   * 【选的是：挂起（park）】点芯片时，把搜索框里的词**移出**输入框、存进 state.qParked，
   * 并在搜索框右边留一条可点的「已暂存「X」· 放回搜索 / 丢弃」。
   *   · 芯片立刻按自己的白名单筛（死路没了）；
   *   · 用户打的字一个不丢，一键能放回去（放回时同时取消芯片 —— 同一根轴上不能两个主人）；
   *   · 其他九组筛选器的 AND 语义**一点没动**；
   *   · 反过来（先点芯片再搜）仍然走 AND：那是真·精筛，交集为 0 时由空状态
   *     给出带行数的按钮，点一下就能退回去（见 syncEmptyFacts）。
   */
  function parkQuery() {
    var inp = $('#q');
    var raw = inp ? inp.value : '';
    if (!raw.trim()) return false;      // 空的不算「有词」，不覆盖已挂起的那个
    state.qParked = raw.trim();
    state.q = '';
    if (inp) inp.value = '';
    syncParked();
    return true;
  }

  /* 放回：把暂存的词写回搜索框，并让出场景轴（否则又回到「交集恒为空」）。
     注意这里**不调用 render()** —— 两个对外接口要在同一次渲染里完成状态切换。 */
  function restoreQuery() {
    if (!state.qParked) return false;
    var inp = $('#q');
    if (inp) inp.value = state.qParked;
    state.q = state.qParked.trim().toLowerCase();
    state.qParked = null;
    state.sceneIds = new Set();
    $$('.scene-chip').forEach(function (b) { b.setAttribute('aria-pressed', 'false'); });
    syncParked();
    return true;
  }

  function dropParked() {
    if (!state.qParked) return;
    state.qParked = null;
    syncParked();
  }

  /* 清空搜索轴的一切痕迹：q、输入框、以及被暂存的词。
     三个"离开搜索轴"的动作（只看芯片 / 只看搜索词 / 按词点芯片）都必须走它 ——
     只清其中两样会留下第三种状态：暂存条还在、搜索框空着、芯片已经换了。
     实测后果（_empty-probe.mjs「丢弃后应保持 2 行，实际 0」）：点「丢弃」时
     restoreQuery 走的是"暂存词仍在"的分支，把输入框填回去却没重渲染，列表停在旧结果。 */
  function clearQueryAxis() {
    state.q = '';
    var inp = $('#q');
    if (inp) inp.value = '';
    state.qParked = null;
    syncParked();
  }

  /* 挂起条：建一次、后续只改内容。为什么不用 index.html 的静态节点：
     本轮的写作用域只有 app.js 与 prompt-copy.js 的芯片段，index.html 不在里面；
     而且这条只在「有暂存词」时存在，静态节点会多一个永远 hidden 的空壳。
     
     ⚠️ 390 档必须**移到主区顶部**，不能留在 .bar 里（2026-10-27 实测抓出）：
     窄屏的 DOM 顺序是 rail（筛选）在前、主区在后，而芯片就在 rail 里。用户在 rail 点完
     芯片，如果条子挂在 .bar 里，它会在 rail 底下 —— 实测 top=896，视口只有 844，
     **首屏看不见**；连「列出 4 / 30」那个数都在 973，一样看不见。
     一条用户看不到的"你的字还在"凭据等于没有，这正是我要修的那类缺陷。
     所以窄屏（≤980px，与 style.css 里 .detail 变全屏层的断点一致）把它挂到
     .main 的最前面：它跟着芯片出现在同一条视线里，而不是躲在另一栏。 */
  var NARROW = 980;
  function isNarrow() { return window.innerWidth <= NARROW; }

  function syncParked() {
    var bar = $('.bar');
    var main = $('.main');
    if (!bar || !main) return;
    var el = document.getElementById('q-parked');
    if (!el) {
      el = document.createElement('span');
      el.id = 'q-parked';
      el.className = 'q-parked';
      el.setAttribute('aria-live', 'polite');
      el.style.cssText = 'display:inline-flex;align-items:center;gap:6px;flex-wrap:wrap;font-size:13px;line-height:1.5;color:var(--ink-2);' +
        'border:1px dashed var(--rule-2);padding:4px 8px;max-width:100%';
      var lab = document.createElement('span');
      lab.className = 'q-parked-lab';
      lab.style.cssText = 'overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:32ch';
      var back = document.createElement('button');
      back.type = 'button';
      back.className = 'btn-quiet';
      back.setAttribute('data-act', 'back');
      back.style.cssText = 'font-size:13px;padding:2px 8px;cursor:pointer;background:transparent;border:1px solid var(--rule-2);color:var(--ink-2)';
      back.textContent = '放回搜索';
      back.addEventListener('click', function () { restoreQuery(); render(); });
      var drop = document.createElement('button');
      drop.type = 'button';
      drop.className = 'btn-quiet';
      drop.setAttribute('data-act', 'drop');
      drop.style.cssText = back.style.cssText;
      drop.textContent = '丢弃';
      drop.addEventListener('click', function () { dropParked(); render(); });
      el.appendChild(lab); el.appendChild(back); el.appendChild(drop);
    }
    /* 位置每轮按视口重新决定（用户可能中途转向/改窗口大小）。
       窄屏用**固定底栏**，不挂进任何栏目 —— 这是量出来的结论，不是偏好：
       390×844 实测，条子若跟在 .bar 后面 top=842（视口 844，只剩 2px）、
       若塞进 rail 就在 rail 自己的滚动区里（rail max-height 40vh + overflow-y），
       两种都等于看不见。而页头 489px + rail 338px 就已经把主区推到了 989px 以下
       （这是既有的 F4，不在本轮改动范围内）—— 也就是说窄屏上"首屏可见"这件事
       只能靠脱离文档流来保证。底栏 48px、只在有暂存词时出现、一放回就消失。 */
    var wantParent = isNarrow() ? main : bar;
    if (isNarrow()) {
      el.style.position = 'fixed';
      el.style.left = '8px'; el.style.right = '8px'; el.style.bottom = '8px';
      el.style.zIndex = '60';
      el.style.background = 'var(--card)';
      el.style.boxShadow = '0 2px 14px rgba(0,0,0,.18)';
      el.style.marginBottom = '';
    } else {
      el.style.position = ''; el.style.left = ''; el.style.right = ''; el.style.bottom = '';
      el.style.zIndex = ''; el.style.background = ''; el.style.boxShadow = '';
    }
    if (el.parentNode !== wantParent) {
      if (wantParent === main) {
        main.insertBefore(el, main.firstChild);
        el.style.marginBottom = '10px';
      } else {
        var search = $('.search');
        if (search && search.parentNode === bar) search.insertAdjacentElement('afterend', el);
        else bar.insertBefore(el, bar.firstChild);
        el.style.marginBottom = '';
      }
    }
    /* ⚠️ 隐藏不能只靠 el.hidden（2026-10-27 实测抓出）：本元素的 display 写在**内联样式**里
       （inline-flex），而 [hidden] 的 display:none 来自 UA 样式表 —— 内联优先级更高，
       结果 hidden=true 时那条空壳仍然显示成"两个光秃秃的按钮"。
       截图 shots-chip/after-1440-s1-search-only.jpg 就是它（搜索框里只有咖啡店、
       没有暂存词，右边却挂着「放回搜索 / 丢弃」）。
       所以显示状态也写进内联样式，让两者只有一个来源。 */
    el.hidden = !state.qParked;
    el.style.display = state.qParked ? 'inline-flex' : 'none';
    var lab2 = el.querySelector('.q-parked-lab');
    if (lab2) {
      /* 窄屏用短句：390 档一行只放得下约 22 个汉字 + 两个按钮。
         长句会被折成两行、底栏从 48px 长到 67px，压住的内容比它解释的还多
         （实测 after-390 截图里「丢弃」被折到第二行）。
         短句不是简化信息，是把"字还在 + 能拿回来"这两件事留着，其余（为什么）由按钮本身说。 */
      lab2.textContent = state.qParked
        ? (isNarrow()
            ? '已暂存「' + state.qParked + '」'
            : '已暂存搜索词「' + state.qParked + '」——芯片正在按行业筛')
        : '';
    }
  }

  function sorted(rows) {
    var s = state.sort;
    return rows.slice().sort(function (a, b) {
      if (s === 'fr') return (a.fr || 'Z').localeCompare(b.fr || 'Z') || a.id.localeCompare(b.id);
      if (s === 'thr') return (THR_ORDER[a.threshold] == null ? 9 : THR_ORDER[a.threshold]) - (THR_ORDER[b.threshold] == null ? 9 : THR_ORDER[b.threshold]) || a.id.localeCompare(b.id);
      if (s === 'gate') return ((b.gate ? b.gate.fail : -1) - (a.gate ? a.gate.fail : -1)) || a.id.localeCompare(b.id);
      if (s === 'built') return (a.built ? 1 : 0) - (b.built ? 1 : 0) || a.id.localeCompare(b.id);
      return a.id.localeCompare(b.id);
    });
  }

  /* ── 清单渲染 ─────────────────────────────────────────── */
  var ledger = $('#ledger');

  function shotFig(r, vp) {
    var cap = vp === 'desktop' ? '1440' : vp === 'tablet' ? '768' : '390';
    var src = (r.shots[vp] || [])[0];
    if (!src) {
      return '<figure class="shot is-empty"><figcaption>' + cap + ' 未渲染</figcaption></figure>';
    }
    // 不加 loading="lazy"：闸门在 1440 档统计到"真实图片 0 张"，
    // 因为视口外的懒加载图在这一轮采集里根本没请求。整页 48 张缩略图直接加载，
    // 本地文件、总字节可控，换来的是"页面里到底有没有图"这个指标不再失真。
    return '<figure class="shot"><img src="' + esc(src) + '" alt="' + esc(r.id + ' ' + r.cn + ' 在 ' + cap + 'px 视口的首屏渲染截图') + '"><figcaption>' + cap + '</figcaption></figure>';
  }

  function gateTags(r) {
    if (!r.built) return '<span class="tag tag-none">未建原型</span>';
    if (!r.gate) return '<span class="tag tag-none">未渲染</span>';
    var out = [];
    out.push(r.gate.fail === 0
      ? '<span class="tag tag-pass">FAIL 0</span>'
      : '<span class="tag tag-fail">FAIL ' + r.gate.fail + '</span>');
    if (r.gate.warn) out.push('<span class="tag tag-warn">WARN ' + r.gate.warn + '</span>');
    return out.join('');
  }

  /* 卡片上显示"人话版"而不是 95 字的专业定义。
   * 为什么：审计实测 r.def 中位 95 字、20/30 含 px 值、8/30 含角度，
   * 是写给施工者的；而用户第一眼要判断的是"这风格适不适合我"。
   * 人话版在 prompts.js 里（plain，≤20 字），没有则回退到原定义，不会空着。 */
  function plainOf(r) {
    var P = window.STYLE_PROMPTS;
    if (P && P.schemes) {
      for (var i = 0; i < P.schemes.length; i++) {
        if (P.schemes[i].id === r.id && P.schemes[i].plain) return P.schemes[i].plain;
      }
    }
    return r.def || '';
  }

  /* 内容量容限：用户最关心"我只有 3 个产品，用这案会不会空得很难看"。
   * 数据来自 30 案实测（deliverables/60-minitems-degrade-audit.md）。
   * 关键区分（实测得出的，不能说错）：
   *  · capacity.minItems 是**设计规模**，不是"至少要这么多"——S07 的 46 条是它设计时的量，
   *    但它是 column-count 自动流，删到 3 条只是变短；
   *  · 真正要警告的是 degrades==="yes"：单元位置是写死的，内容少了会留洞。
   * 所以卡片上只在 degrades=yes 时给黄色警告，否则给中性提示。 */
  function capacityHTML(r) {
    var P = window.STYLE_PROMPTS;
    if (!P || !P.schemes) return '';
    var cap = null;
    for (var i = 0; i < P.schemes.length; i++) {
      if (P.schemes[i].id === r.id) { cap = P.schemes[i].capacity; break; }
    }
    if (!cap) return '';
    if (cap.degrades === 'yes') {
      /* 前缀那个警告符号在这里删掉了（2026-10-28）。
         它曾是 inspect.mjs 那条 `emoji` FAIL 的唯一来源（`Emoji in the page: …`）——
         页面里其它的同类符号全在注释里，而 probe 读的是 `document.body.innerText`，
         注释不进渲染树，所以真正被数到的只有这一处。
         （这一段刻意用文字描述那个符号、不写它的字形：`lint.mjs` 是**静态源码扫描**，
           它按行匹配符号，连注释里的都会数到。写上字形等于把刚修掉的 FAIL 从运行时
           搬到静态扫描里，计数不变。这类"注释里引述违规字符、于是自己变成违规"的坑
           在本仓库出现过不止一次。）
         为什么可以删而不用别的手段绕过：这条警告的表意本来就不靠那个符号。
         `.cap-warn` 已经给了三重信号 —— 黄底 #fdf6e3、赭色描边 #b8860b、文字色 #7a5a00，
         与 `.cap-ok`（无底、灰字）在同一行里并排出现时是**同一元素的两种视觉状态**，
         比一个表情符号更稳定（它的字形由系统字体决定，Windows/Android/iOS 三种画法）。
         仓库口径也一致：taste-skill 的 emoji 规则原文是「Remove. Use words or real imagery.」，
         这句话本身就是"用文字替代"的意思，文案已经是「内容少于 16 条会留空位」。
         删掉之后：`.cap-warn` 与 `.cap-ok` 的区分只剩颜色 + 底色 + 边框，
         这不影响可访问性 —— title 属性给的是完整解释（"单元位置是写死的…"），
         且两者都不携带状态语义（不是在报告通过/失败，只是在说这个版式对内容量敏不敏感）。
         实测（2026-10-28，inspect.mjs 三档 1440/768/390）：`emoji` FAIL 由 1 → 0，
         `[emoji] NOT PRESENT`。 */
      return '<span class="cap cap-warn" title="这个版式的单元位置是写死的（绝对定位/固定网格坐标/手绘坐标），内容少于设计规模会留下空洞">' +
        '内容少于 ' + cap.minItems + ' 条会留空位</span>';
    }
    return '<span class="cap cap-ok" title="单元靠自动流排布，删条目只是变短，不会留洞">' +
      '条目可增减（设计时 ' + cap.minItems + ' 条）</span>';
  }

  function rowHTML(r) {
    var sw = (r.palette || []).slice(0, 4).map(function (h) {
      return '<i style="background:' + esc(h) + '" title="' + esc(h) + '"></i>';
    }).join('');    var g = r.gate || {};
    var meta = [];
    /* 行卡上的「美学家族」（2026-10-27 改）。
       原代码是 `(r.family || '').split('。')[0].split('：').pop().slice(0, 34)`，
       三刀叠加后 30 案合计只剩 657 字，丢掉 5,254 字（30/30 全中）。
       更糟的是对 S13 这类「家族名：一句改造说明」的写法，`.split('：').pop()`
       会把家族名本身切掉，行卡上印的是半句：
       「把它从屏幕上的软挤出拉回日本凸版印刷的盲压（blind emboss」——
       连括号都没闭合（实测抓出）。
       现在改成**只去 HTML 转义、不切字**，靠 CSS 折两行（style.css 的 .row-family）。
       实测代价（CDP，30 案逐案量）：
         · 1440×900：30/30 行高完全不变（276.8px 恒等）。行高由右侧截图列
           （201.8px）＋行脚注撑起来，family 从 1 行变 2 行只是吃掉 75px 的行内余量；
           横向溢出 0，色块/错误码/cap 一个都没被挤掉。
         · 390×844：30 案里 28 案行高 +21～48px，30 行总高 15,472 → 16,387（+5.9%）。
           这是手机档唯一真实的代价，选择接受：手机行卡本来就 478–601px 高，
           +1 行文字换掉「只剩家族名」这个信息损失是划算的。
       详情面板里的「美学家族与参考」本来就是全文（field('美学家族与参考', r.family)），
       所以这次改的只是行卡预览，不是数据。 */
    meta.push('<span class="row-family">' + esc(r.family || '') + '</span>');
    meta.push('<span class="swatches">' + sw + '</span>');
    if (r.errorCode) meta.push('<span>' + esc(r.errorCode) + '</span>');
    meta.push(capacityHTML(r));

    var foot = [];
    if (r.gate) {
      foot.push('桌面 ' + (g.screens == null ? '—' : g.screens) + ' 屏');
      foot.push('真实图 ' + (g.realPictures == null ? '—' : g.realPictures));
      foot.push('横向溢出 ' + (g.overflow == null ? '—' : g.overflow));
      if (g.failIds && g.failIds.length) foot.push('FAIL：' + esc(g.failIds.join(' ')));
      if (g.warnIds && g.warnIds.length) foot.push('WARN：' + esc(g.warnIds.join(' ')));
    } else if (r.built) {
      foot.push('尚未渲染 —— 先跑 render-scheme.mjs');
    } else {
      foot.push('目录尚未建立 index.html');
    }

    return '' +
      '<li class="row' + (r.built ? '' : ' is-unbuilt') + '" data-id="' + esc(r.id) + '" tabindex="0" role="button" aria-label="展开 ' + esc(r.id + ' ' + r.cn) + '">' +
        // 显示完整编号 S01 而不是 01：这是**方案的标识**，不是装饰性的序号。
        // 闸门把纯 "01" 判为 Decorative index numbers，换成 S01 之后它读作 ID。
        '<p class="no">' + esc(r.id) + '</p>' +
        '<div class="row-main">' +
          '<div class="row-head">' +
            '<h3>' + esc(r.cn) + '</h3>' +
            '<span class="en">' + esc(r.en) + '</span>' +
            (r.fr ? '<span class="tag tag-fr">' + esc(r.fr) + ' 型 · ' + esc(r.structure) + '</span>' : '') +
            (r.threshold ? '<span class="tag">门槛' + esc(r.threshold) + '</span>' : '') +
            (r.tone ? '<span class="tag">' + esc(r.tone) + '</span>' : '') +
          '</div>' +
          '<p class="row-def">' + esc(plainOf(r)) + '</p>' +
          '<div class="row-meta">' + meta.join('') + '</div>' +
        '</div>' +
        '<div class="shots">' + shotFig(r, 'desktop') + shotFig(r, 'tablet') + shotFig(r, 'mobile') + '</div>' +
        '<div class="row-foot">' + gateTags(r) + '<span>' + foot.join('　·　') + '</span></div>' +
      '</li>';
  }

  var io = null;
  function observeRows() {
    // 入场动效：每行在自己进入视口时上浮 9px 淡入，行与行之间按索引错开。
    // 这不是装饰 —— 30 行的清单靠它把"我现在读到哪一行"交接给眼睛。
    // prefers-reduced-motion 时 CSS 把动画整体收敛到 0.01ms，等于不动。
    if (io) io.disconnect();
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce || !('IntersectionObserver' in window)) {
      $$('.row', ledger).forEach(function (el) { el.classList.add('is-in'); });
      return;
    }
    io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var el = en.target;
        var i = +el.getAttribute('data-i') || 0;
        el.style.animationDelay = Math.min(i, 8) * 26 + 'ms';
        el.classList.add('is-in');
        io.unobserve(el);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
    $$('.row', ledger).forEach(function (el) { io.observe(el); });
  }

  /* ── 空状态里的三个数字与"你搜的那个词" ────────────────────
     空状态不能写死 "44 个行业词里 16 个有直连" —— 那是 prompts.js 今天的状态，
     明天有人补了 3 个行业就变成新的谎。所以每次渲染都从 window.STYLE_PROMPTS.sceneIndex
     现算。三个数各有用处：
       · 行业词总数 → 让用户知道这一维其实很宽；
       · 有直连的词数 → 让用户知道"宽"里有多少是真能点的；
       · 差值就是供给缺口，这正是空状态要承认的那件事。
     搜索词只回填用户实际敲的那一个，且只在它确实是索引里的行业词时才填 ——
     否则敲错字也会被暗示成"这个词存在于索引里、只是没方案"，那是另一种说谎。 */
  function syncEmptyFacts() {
    var P = window.STYLE_PROMPTS;
    var idx = (P && P.sceneIndex) || {};
    var terms = Object.keys(idx);
    var direct = terms.filter(function (t) { return (idx[t].direct || []).length; }).length;
    var set = function (id, v) {
      var el = document.getElementById(id);
      if (el && v != null) el.textContent = String(v);
    };
    set('e-total', ALL.length);
    set('e-terms', terms.length);
    set('e-direct', direct);
    set('e-direct2', direct);
    /* 最后那句"为什么搜不到"按实际情况分两种：
       · 搜索词确实是索引里的行业词 → 点名它，并说清是缺数据；
       · 否则（敲错字、搜的是别的东西）→ 不能把"这个词存在于索引里、只是没方案"这种话
         塞给用户，那是另一种说谎。此时只说结构：这一维上行业词本来就命中不了。
       state.q 已 toLowerCase（中文不受影响，英文行业词也不在索引里）。

       2026-10-26 补一句范围限定：模板层接进来之后，空状态下面会多出一块「模板层有没有」。
       这里这两句话说的仍然只是**30 个案这一层**的供给缺口（模板不在 SCHEMES 里，也确实
       不在这套图集的行业索引里），所以必须把"图集"收窄成"这三十个案"，否则会和紧跟着的
       「但 M02 就是为餐厅做的」直接打架 —— 同一屏里两句互相否定，用户只会信更坏的那句。 */
    var why = document.getElementById('e-why');
    if (why) {
      /* ⚠️ 2026-10-27：原来的判据只有 idx[state.q] 一条，于是「咖啡店」会走进
         「「咖啡店」正属于没有直连方案的那一类」—— 而 sceneIndex["咖啡店"].direct 就是
         ["S06"]，S06 明明就是它的直连方案；紧接着的 #e-next 又说"芯片能筛出 4 行"。
         同一屏里三句话互相否定（截图 shots-chip/after-1440-s1-search-only.jpg 改前版）。
         改成三分：
           · 有直连 → 说清"搜索框匹配整串、索引里是有的"，并把编号点出来；
           · 只有近似 → 说清"没有直连，只有换文案能用的近似款"；
           · 不在索引里（敲错字/搜别的东西）→ 只说结构，不暗示这个词在索引里。
         三种话术都不能替用户下"是你条件加多了"的结论 —— 供给缺口不怪他。 */
      var rec = state.q ? idx[state.q] : null;
      var dIds = (rec && rec.direct) || [];
      var nIds = (rec && rec.near) || [];
      if (dIds.length) {
        why.textContent = '「' + state.q + '」按文字搜不到（搜索框匹配整串，这 ' + ALL.length +
          ' 个案里没有哪一行逐字写着它），但索引里 ' + dIds.join(' ') +
          ' 就是它的直连方案 —— 左边那颗「' + state.q + '」芯片是实的。';
      } else if (nIds.length) {
        why.textContent = '「' + state.q + '」正属于没有直连方案的那一类（只有 ' + nIds.join(' ') +
          ' 这几个换文案能用的近似款）——这是这 ' + ALL.length + ' 个案这一层的供给缺口，不是你条件加多了。';
      } else {
        why.textContent = '行业词搜不到，是这 ' + ALL.length + ' 个案缺这条数据，不是你条件加多了。';
      }
    }
    syncEmptyNext(idx);
  }

  /* ── 空状态里「接下来该怎么办」：每个指示都必须当场可执行（2026-10-27）─────────
   *
   * 【为什么要把 index.html 里那句话换掉】原文案是静态的，尾句写着
   * 「想继续在这三十个案里挑：点左侧行业芯片…或清空筛选后改用右侧排序看」。
   * 它有两个毛病，都是同一类：**指示的动作在当前状态下拿不到它承诺的结果**。
   *  1) 用户刚搜了词、又照它点了芯片 → 两者取交集 → 仍 0 行（实测 18/44 个词，
   *     见 _chip-before.json）。指示把人送进了墙，而且墙上还写着请往前走。
   *  2) 用户已经点过芯片（或已经清空过筛选）时，它还在教他点芯片/清空筛选 ——
   *     让他重做一遍已经做过的事，等于把"你操作错了"这个错误结论塞给他。
   *
   * 【现在的做法】不写死任何一句指示，每次 0 行时**先算**每条退路各能得到几行，
   * 再按当前状态只说那几条真的能走通的，并且每条后面挂一个当场可点的按钮。
   * 数字与按钮是同一份计算的产物 —— 这比"改文案"强的地方在于：文案不可能再和行为
   * 分叉，因为按钮就是行为本身。计算全部走同一个 match()，不另写一套判据。
   *
   * 【四种状态，四条不同的真话】
   *  a) 芯片 + 搜索词同时生效 → 说清是「并且」把它们乘成 0，给两个"只留一边"的按钮；
   *  b) 只有芯片（0 行是后面几组筛没的）→ 说芯片本身有几行，指出该松哪一组；
   *  c) 只有搜索词 → 行业词走芯片能出几行（点名芯片），非行业词直说这三十个案没有；
   *  d) 都没有 → 只有"你条件加多了"这一种解释，给显式的清空按钮。
   */
  function syncEmptyNext(idx) {
    var host = document.getElementById('empty');
    if (!host) return;
    /* 尾句原来是 #empty 的最后一个文本节点（"想继续在这三十个案里挑：…"）。
       第一次渲染时把它摘掉，换成受控的 #e-next —— 留着它会和下面这段同时教用户做事。
       ⚠️ 判据用「#e-why 之后的文本节点」而不是匹配那句话的字面：
       那句话在 index.html 里是被改过一次的（2026-10-25 重写空状态），按字面匹配的清理代码
       会在下一次改文案时**静默失效**，于是又回到"两句指示互相打架"。
       结构判据在这里是稳定的：这个 <p> 里除了 #e-why 与 #e-next，剩下的只能是旧文案。
       ⚠️⚠️ 但旧文案里**嵌着一个元素** #e-direct2（那句「只挑实心的那 16 个」里的 16）。
       只删文本节点会把它留下 —— 实测截图 after-1440-s1 就在「按「咖啡店」芯片筛（4 行）」
       后面多出一个孤零零的「16」。所以元素也要一起摘，判据是"在 #e-why 之后、
       且不是 #e-next / #e-why 本身"。 */
    var whyEl = document.getElementById('e-why');
    if (whyEl) {
      var after = false;
      for (var i = 0; i < host.childNodes.length; i++) {
        var nd = host.childNodes[i];
        if (nd === whyEl) { after = true; continue; }
        if (!after) continue;
        if (nd.id === 'e-next') continue;
        if (nd.nodeType === 3) {
          if (nd.textContent.trim()) { host.removeChild(nd); i--; }
        } else if (nd.nodeType === 1 && (nd.id === 'e-direct2' || nd.tagName === 'SPAN')) {
          /* 旧句子里唯一的 span 就是 #e-direct2；将来若加了别的受控节点，
             在这里显式列出来，而不是放宽成"删掉所有 span"。 */
          if (nd.id === 'e-direct2') { host.removeChild(nd); i--; }
        }
      }
    }
    var box = document.getElementById('e-next');
    if (!box) {
      box = document.createElement('span');
      box.id = 'e-next';
      host.appendChild(box);
    }

    /* 三条退路的行数：都从同一个 match() 算，避免"文案说 N 行、点下去 M 行"。
       ⚠️ 2026-10-27 修过一次差点漏掉的错：nChipOnly 必须**只**关掉 q，
       若把后面九组也一起清，数字就会比「其余条件不变、只去掉芯片」大 ——
       而按钮承诺的正是后者。这是探针 _empty-probe.mjs 抓出来的第一个谎
       （[b] 说"芯片本身能筛出 0 行"，实际那 4 行是被「暗底」筛没的，不是芯片筛没的）。 */
    /* 四条退路的行数：全部从同一个 match() 算，避免"文案说 N 行、点下去 M 行"。
       2026-10-27 探针 _empty-probe.mjs 抓出两个谎，都在这几行里：
        ① "只看搜索词（30 行）"点了只出 3 行 —— 因为算的时候只去了芯片，没把 q 算回来；
           当时 q 是空的（词被挂起），"只看搜索词"指的其实是**挂起的那个词**。
        ② "只留芯片，松开后面几组（30 行）"点了只出 4 行 —— nChipAlone 算对了，
           但按钮文案里引用的变量写错成了 nChipOnly 的语义。
       现在每个数字都对应一条**确定的**状态转换，且转换函数本身（下面的 click handler）
       用的是同一组操作，所以数字与行为不可能再分叉。 */
    var saveQ = state.q, saveIds = state.sceneIds;
    var parked = state.qParked;
    var nChipOnly, nSearchOnly, nChipAlone;
    state.q = ''; nChipOnly = ALL.filter(match).length;                   // 只去 q，其余不动
    /* "只看搜索词"= 保留芯片之外的九组 + 搜索词本身（现打的 q 或挂起的 parked） */
    state.sceneIds = new Set();
    state.q = (saveQ || parked || '').toLowerCase();
    nSearchOnly = ALL.filter(match).length;

    /* 「只留芯片」：松开九组、不动芯片、不动 q。做法是先备份再清空再还原，
       借用同一个 match() —— 多写一份判据就多一个会说谎的地方。
       备份必须在清空之前完成（第一次写漏了，等于把用户的选择永久清掉）。
       ⚠️ 还必须先把 sceneIds **恢复**成 saveIds：上一行为算 nSearchOnly 把它清空了，
       不恢复的话这里算出来的是"什么都没留"，会报出 30 行（探针抓到的第二个谎）。 */
    state.sceneIds = saveIds;
    var AX = [state.ground, state.band, state.load, state.loud,
              state.fr, state.thr, state.tone, state.st, state.gate];
    var keep = AX.map(function (s) { return Array.from(s); });
    AX.forEach(function (s) { s.clear(); });
    state.q = ''; nChipAlone = ALL.filter(match).length;
    AX.forEach(function (s, i) { s.clear(); keep[i].forEach(function (v) { s.add(v); }); });
    state.q = saveQ; state.sceneIds = saveIds;

    var hasChip = !!(state.sceneIds && state.sceneIds.size);
    var hasQ = !!state.q;
    var chipTerm = '';
    if (hasChip) {
      var pressed = $('#flt-scene button[aria-pressed="true"], .scene-more button[aria-pressed="true"]');
      chipTerm = pressed ? (pressed.getAttribute('data-scene') || '') : '';
    }
    var parts = [];
    var btn = function (act, label) {
      return '<button type="button" class="e-act" data-act="' + act + '" style="font:inherit;font-size:13px;padding:2px 8px;margin:0 2px;cursor:pointer;background:transparent;border:1px solid var(--rule-2);color:var(--link)">' + esc(label) + '</button>';
    };

    if (hasChip && hasQ) {
      /* a) 两条轴同时在筛，0 行是交集。这不是用户的错，界面该替他把选择摆清楚。 */
      parts.push('现在「' + esc(chipTerm || '行业芯片') + '」和搜索词「' + esc(state.q) +
        '」同时在筛，组间是「并且」——两边都要满足才留下，所以是 0 行。' +
        '只按芯片筛有 <b>' + nChipOnly + '</b> 行，只按搜索词有 <b>' + nSearchOnly + '</b> 行：');
      if (nChipOnly) parts.push(btn('drop-q', '只看芯片（' + nChipOnly + ' 行）'));
      if (nSearchOnly) parts.push(btn('drop-chip', '只看搜索词（' + nSearchOnly + ' 行）'));
    } else if (hasChip) {
      /* b) 芯片本身是通的（实测 44/44 个词都 ≥1 行），0 行一定是后面几组筛没的。
         句子把"芯片单独能出几行"与"只留芯片能出几行"分开说 —— 用户手动松过几组时
         两者不等，混成一句就会报出一个不是芯片造成的数字。 */
      parts.push('「' + esc(chipTerm || '行业芯片') + '」这条芯片本身能筛出 <b>' + nChipOnly +
        '</b> 行；只留它、把后面几组松开是 <b>' + nChipAlone + '</b> 行。' +
        '现在是后面几组（底色／内容量／调性…）把它筛没了：');
      if (nChipAlone) parts.push(btn('drop-axes', '只留芯片，松开后面几组（' + nChipAlone + ' 行）'));
      parts.push(btn('reset', '全部清空（' + ALL.length + ' 行）'));
    } else if (hasQ) {
      /* c) 只有搜索词。行业词 → 点名芯片；不是行业词 → 直说这一层给不了。 */
      var d = (idx[state.q] && idx[state.q].direct) || [];
      var near = (idx[state.q] && idx[state.q].near) || [];
      if (d.length || near.length) {
        var chipRows = 0;
        var tmpIds = new Set(d.concat(near));
        var s2 = state.q; state.sceneIds = tmpIds; state.q = '';
        chipRows = ALL.filter(match).length;
        state.q = s2; state.sceneIds = saveIds;
        /* 这里不再重复 #e-why 已经说过的"为什么搜不到"（改前两句几乎逐字重复，
           读起来像界面结巴）。#e-why 讲原因，这里只给动作和行数。 */
        parts.push('按行业筛这一层能给出 <b>' + chipRows + '</b> 行：');
        if (chipRows) parts.push(btn('use-chip', '按「' + state.q + '」芯片筛（' + chipRows + ' 行）'));
      } else {
        parts.push('「' + esc(state.q) + '」不在这 ' + Object.keys(idx).length + ' 个行业词里，这 ' +
          ALL.length + ' 个案也没有哪一行写着它 —— 换一个词，或直接按行业挑：');
        parts.push(btn('reset', '清空筛选（' + ALL.length + ' 行）'));
      }
    } else {
      /* d) 没有任何词/芯片，纯筛选组合过窄。 */
      parts.push('没有搜索词也没有点芯片，是右侧几组筛选取「并且」取窄了。' +
        '先只留一组最在意的（比如底色），或直接清空：');
      parts.push(btn('reset', '清空筛选（' + ALL.length + ' 行）'));
    }
    box.innerHTML = parts.join(' ');

    /* 按钮全部走真实交互路径：reset 就是那个 #reset；drop-q / drop-chip / drop-axes
       只改一个轴；use-chip 与点芯片同一条路（benchSetSceneIdsParkingQuery）。
       ⚠️ 任何一个"离开搜索轴"的动作都必须同时清掉 state.qParked ——
       第一次写 use-chip 时漏了：被暂存的「餐厅」留在条子上，芯片已换成「咖啡店」，
       于是点「丢弃」后走的是"暂存词还在、搜索框空"的状态，筛出 0 行。
       探针 _empty-probe.mjs 的「丢弃后应保持 2 行，实际 0」就是这一条。 */
    $$('#e-next .e-act').forEach(function (b2) {
      b2.addEventListener('click', function () {
        var act = b2.getAttribute('data-act');
        if (act === 'reset') { $('#reset').click(); return; }
        if (act === 'drop-q') {
          clearQueryAxis(); render(); return;
        }
        if (act === 'drop-chip') {
          /* 只看搜索词：芯片让位，**q 必须留着**。
             第一次写这里时手滑调了 clearQueryAxis()，那会把用户正搜的词也清掉 ——
             按钮写着"只看搜索词"，做出来却是"两边都不看"，比原来的死路更糟。 */
          state.sceneIds = new Set();
          $$('.scene-chip').forEach(function (x) { x.setAttribute('aria-pressed', 'false'); });
          render(); return;
        }
        if (act === 'drop-axes') {
          state.ground.clear(); state.band.clear(); state.load.clear(); state.loud.clear();
          state.fr.clear(); state.thr.clear(); state.tone.clear(); state.st.clear(); state.gate.clear();
          /* 芯片这几组也得跟着灭，否则界面说"只留芯片"却亮着别的组 */
          $$('.chips button').forEach(function (x) {
            if (!x.classList.contains('scene-chip')) x.setAttribute('aria-pressed', 'false');
          });
          render(); return;
        }
        if (act === 'use-chip') {
          var t = state.q;
          var v = idx[t] || {};
          var ids = (v.direct || []).concat(v.near || []);
          /* 必须同时点亮芯片，否则界面上会出现"列表按芯片筛了、芯片却亮着别的" */
          $$('.scene-chip').forEach(function (x) {
            x.setAttribute('aria-pressed', x.getAttribute('data-scene') === t ? 'true' : 'false');
          });
          state.q = ''; $('#q').value = ''; dropParked();
          if (window.benchSetSceneIds) window.benchSetSceneIds(ids);
          else { state.sceneIds = new Set(ids); render(); }
          return;
        }
      });
    });
  }

  function render() {
    var rows = sorted(ALL.filter(match));
    ledger.innerHTML = rows.map(rowHTML).join('');
    $$('.row', ledger).forEach(function (el, i) { el.setAttribute('data-i', String(i)); });
    $('#empty').hidden = rows.length > 0;
    $('#count').textContent = '列出 ' + rows.length + ' / ' + ALL.length + ' 个方案';
    if (!rows.length) syncEmptyFacts();
    /* 挂起条每轮都同步：有暂存词时必须一直看得见 —— 它是"我打的字还在"的唯一凭据，
       也是唯一的一键放回入口。没有暂存词时它只是 hidden。 */
    syncParked();
    /* 模板层（三个大众模板）由 prompt-copy.js 渲染，这里只递事实、不判断。
     * 为什么不在本文件里直接画模板卡：
     *  1) 本文件开头的契约是「不做任何判断，也不写死任何方案信息」。哪个模板适合哪个行业
     *     是判断，模板的色板/链接也是"方案信息" —— 写进来就是自己违反契约。
     *  2) 模板**不能**进 ALL / state.sceneIds。这是实测死过的坑，不是设计洁癖：
     *     benchSetSceneIds() 是白名单过滤，只有 window.SCHEMES 里存在的 id 才会被渲染。
     *     实测 sceneIds={M02} → 0/30 行；{M02,S06,S19} → **2/30 行**（M02 被静默吞掉）。
     *     所以模板必须走独立通道：独立的 DOM 容器 + 独立的渲染函数 + 不进 #count。
     *  3) 模板数据在 prompt-copy.js（手写、且已承载「你是做什么的」这层行业 UI），
     *     与芯片同源，才不会出现"芯片说没有、模板说能套"的两套说法。
     * 传过去的三个事实都是本文件自己的状态：搜索词、筛出的行数、方案总数。 */
    if (window.onBenchRender) {
      window.onBenchRender({ q: state.q, rows: rows.length, total: ALL.length });
    }
    $$('.row', ledger).forEach(function (el) {
      var id = el.getAttribute('data-id');
      el.addEventListener('click', function () { open(id); });
      el.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(id); }
      });
    });
    syncCurrent();
    observeRows();
  }

  function syncCurrent() {
    $$('.row', ledger).forEach(function (el) {
      el.setAttribute('aria-current', el.getAttribute('data-id') === state.open ? 'true' : 'false');
    });
  }

  /* ── 详情 ─────────────────────────────────────────────── */
  var detail = $('#detail');

  /* field() 的定义在下面「长字段折叠」那一节（它要收第 4 个参数 foldHint，
     2026-10-28）。函数声明会提升，位置在调用点之后不影响求值顺序 ——
     之所以放在那一节，是因为"折还是平铺"这个决定和它的理由写在一起才好读。 */

  /* ── 折叠块（2026-10-27，面板可发现性）───────────────────────────────
   *
   * 【要解决的问题】详情面板的第一个字段原来落在 **1,362–1,464px**（1440×900，30 案实测），
   * 而面板视口只有 900px ⇒ 点开一个方案，**一个字段都看不到**。首屏被「字段之前」的东西吃掉：
   *   复制按钮 299–394 + 预览 439 + 打开原型 41 + 闸门 77 + 上站文案 300–377。
   * 字段本身一个都没多，问题全在字段之前。所以修法只能是减法。
   *
   * 【为什么用原生 <details>/<summary>】无 JS 依赖（脚本挂了也能展开）、自带键盘语义
   * （Tab 聚焦、Enter/Space 切换、焦点环由浏览器给）、状态在 open 属性上可直接断言。
   * 本仓库 `#rail-fold` 那次失败**不是** details 不好 —— index.html:66 记着真实原因是
   * 「.rail-fold-body 子元素数实测 0」，一个点开什么都没有的假控件。
   * 所以这里的硬判据是：每个 details 的 body 必须非空，且直接包住**原本就在渲染**的整段
   * HTML（不新造内容、不把别处的字搬来第二遍）。
   *
   * 【为什么 isOpen 必须显式传】「默认展开还是收起」是一个设计决定，得有人做，
   * 而且要能在代码里一眼看见。所以不允许省略参数去靠浏览器默认。
   *
   * 【为什么不做 localStorage 记忆】想过，决定不做：
   *  1) 折起来的是**预览图**。记住「收起」意味着用户下次打开同一个案，图还是不见的，
   *     而折叠条不会告诉他「这曾经是你关掉的」—— 静默隐藏比多一次点击更伤；
   *  2) 详情是 30 个案共用的一个面板：按案记忆要 30 个键，按全局记忆又会让
   *     从深链 #S07 进来的新访客继承别人的偏好；
   *  3) 这三个折叠块的默认态本身就是「面板该怎么读」的一部分（理由见各自调用点），
   *     让它随每个访客漂移，等于把设计意图交给上一次点击。
   * 真要做的话，正确的位置是 case 级的显式偏好开关，不是偷偷记在 localStorage 里。
   */
  function fold(cls, summaryHTML, bodyHTML, isOpen) {
    return '<details class="fold ' + cls + '"' + (isOpen ? ' open' : '') + '>' +
      '<summary>' + summaryHTML + '</summary>' +
      '<div class="fold-body">' + bodyHTML + '</div>' +
      '</details>';
  }

  /* 折叠条的统一排版：缩略图（可选）+ 粗体标题 + 标签 + 一行说明。
   * 说明必须写清「里面是什么」，不能写「更多」—— 用户没展开时，唯一能判断值不值得点开的
   * 信息就是这一行。所有 summary 文字都来自入参，不引入新数据。
   * 缩略图用 loading="lazy"：折叠态下的图不占首屏，不必抢带宽（与卡片缩略图不同 ——
   * 那些是页面上必须立刻可见的证据，见 shotFig 里关于不加 lazy 的注释）。 */
  function foldSum(thumbSrc, title, sub, tagsHTML) {
    return '<span class="fold-row">' +
      (thumbSrc ? '<img class="fold-thumb" src="' + esc(thumbSrc) + '" alt="" loading="lazy">' : '') +
      '<span class="fold-lab"><b>' + esc(title) + '</b>' +
        (tagsHTML ? '<span class="fold-tags">' + tagsHTML + '</span>' : '') +
        (sub ? '<span class="fold-sub">' + esc(sub) + '</span>' : '') +
      '</span></span>';
  }

  /* ── 「当前有效配色」这一行：给 palette[0] 标「底色」、palette[1] 标「主色」──
     2026-10-27。
     为什么只加标签、不新增字段：`primary` 恒等于 `palette[1]`（30/30，逐案比对；
     这是构造不变量 —— collect-schemes.mjs:411-415 先 push bg 再 push primary）。
     也就是说主色**早就在这一行里打印着**，只是没标出哪个是主色，用户看到
     `#EFE7D7　#C1121F　#1A1614　#6E6A5E` 只能猜。给它建独立字段会让同一个 HEX
     在相邻两处出现两次，所以只在原处加两个字。
     长度口径（实测 30 案）：palette 长度 3 的 5 案、4 的 25 案 —— 没有 1/2 色的案。
     但代码仍按规格写：长度 ≥2 才标主色，长度 1 时**一个标签都不加**（否则同一个色
     既是底色又是主色，标签互相打脸）。
     底色标签用 palette[0] 而不是 r.bg：两者 30/30 相等（palette[0] === bg）。
     万一将来数据层让它们分叉，这里把 r.bg 用括号补回去 —— 宁可多一句，
     也不让「页面底色」这个事实静默消失。 */
  function paletteLine(r) {
    var p = (r.palette || []).slice();
    if (!p.length) return r.bg || '';
    var out;
    if (p.length === 1) {
      out = p[0];
    } else {
      out = '底色 ' + p[0] + '　主色 ' + p[1] + (p.length > 2 ? '　' + p.slice(2).join('　') : '');
    }
    if (r.bg && p[0] !== r.bg) out += '　（底色 ' + r.bg + '）';
    return out;
  }

  /* ── 字段 8「去 AI 味审查点」的取文：**这里曾经有一刀，2026-10-27 删掉了** ─────
   *
   * 【曾经有什么】这里有过一段：
   *     var AUDIT_CUT_AT = { S13: '反套路改造三指标' };
   *     if (mark) { var i = t.indexOf(mark); if (i > 0) t = t.slice(0, i); }
   * 用来在 UI 层把 S13 的 `audit` 从 780 字切到 307 字 —— 那 473 字（60.6%）是混进来的
   * 评审清单（「反套路改造三指标…供 V-11 / R-40 逐条打勾」），是给评审员打勾的工件，
   * 不是给选型用户看的方案内容。
   *
   * 【为什么现在不需要了】数据层已经修好：`collect-schemes.mjs` 现在按标记切，
   * `data.js` 里 S13 的 `audit` 已经是 **306 字**、且**不含**「反套路改造三指标」这个串。
   * 实测（2026-10-27，本轮）：
   *     s13.audit.length = 306
   *     s13.audit.indexOf('反套路改造三指标') = -1
   * 于是上面那个 `if (i > 0)` **永远不成立** —— 白名单成了死代码。独立验证 Agent 也是
   * 这么判的：它逐案跑过 `indexOf`，返回 −1。
   * 死代码比删掉更贵：下一个读到这里的人会以为「S13 的数据里还有 473 字污染」，
   * 于是去查 data.js、查不到，再怀疑是不是自己看错了文件 —— 一段注释骗走半小时。
   *
   * 【如果将来又出现同类污染，怎么办】**在 `collect-schemes.mjs` 里修，不要在 UI 层打补丁。**
   * 理由不是洁癖，是这一刀本身的代价：白名单只对 S13 一例生效，`AUDIT_CUT_AT` 里多一个
   * 案子就要多读一遍那个案子的 `.md` 才能确认切点；而真正的病根（md 字段切分器只把
   * 「**加粗编号**」当字段起点，无编号的加粗小节整段被吞进上一个字段）不在 UI 层，
   * 在抽取层。修抽取层，30 案一起对；修 UI 层，你只是在给自己看不见的第 31 案留坑。
   * 这条教训留在这里而不是删掉，是因为本仓库的风格就是把犯过的错留在原地：
   * 一个「数据层修好了、UI 层补丁还在」的死代码，只有写清来龙去脉才不会再长出来。 */
  function auditText(r) {
    return r.audit || '';
  }

  /* summary 里的 N 怎么数：从内容里的编号符现算，不写死。
     实测 30 案的编号形态分三派（互不混用）：
       S01–S10  ①②③    （各 3 条）
       S11–S20  第一，第二，第三，第四，      （各 4 条）
       S21–S30  （1）（2）（3）（4）        （各 4 条）
     所以取三种数法的**最大值**，而不是相加 —— 相加会把 `steps(4)` 里的
     半角「(4)」也算成一条（S11 实测：四字序号 4 条 + steps(4) 1 条 = 5，错），
     而取最大值得 4，正确。同理 S21 的 `steps(1)`。
     另外要求编号从 1 开始连续（runLength），避免正文里孤零零一个「（4）」
     被当成「有 4 条」。 */
  var CIRCLED = '①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳';
  var CN_NUM = { '一': 1, '二': 2, '三': 3, '四': 4, '五': 5, '六': 6, '七': 7, '八': 8, '九': 9, '十': 10 };

  function runLength(nums) {
    if (!nums.length) return 0;
    var set = {}, n = 1;
    nums.forEach(function (v) { set[v] = 1; });
    while (set[n]) n++;
    return n - 1;
  }

  function countPoints(t) {
    if (!t) return 0;
    var i, m;
    var circ = [];
    for (i = 0; i < t.length; i++) {
      var k = CIRCLED.indexOf(t[i]);
      if (k >= 0 && circ.indexOf(k + 1) < 0) circ.push(k + 1);
    }
    var di = [], reDi = /第([一二三四五六七八九十])[，,、]/g;
    while ((m = reDi.exec(t))) if (di.indexOf(CN_NUM[m[1]]) < 0) di.push(CN_NUM[m[1]]);
    var num = [], reNum = /[（(](\d{1,2})[）)]/g;
    while ((m = reNum.exec(t))) { var n = +m[1]; if (num.indexOf(n) < 0) num.push(n); }
    return Math.max(runLength(circ), runLength(di), runLength(num));
  }

  /* 折叠块本体（字段 8「去 AI 味审查点」，规格里的原名，不改名）。
     2026-10-27 接通。字数实测（当日 data.js，30 案）：**30/30 有值，合计 10,065 字**，
     最短 276 / 中位 324 / 最长 444；此前 UI 零消费。
     为什么不做成第 10 个平铺字段：实测平铺会让详情面板涨 257–594px；
     折叠形态的代价是 30 案恒定的 **45.8px**（summary 20.8 + 上下内边距，2026-10-27
     1440×900 实测，S01/S07/S13 三案同为 45.8）——
     用户没主动展开时不为它付费，展开后一个字不截。

     【位置：2026-10-27 从 risk 之后搬到 risk 之前】
     原来写的是「risk 是前瞻、audit 是回溯，互为背面，相邻才读得通」，把它们排在
     risk 之后。裁决 Agent 判定这个顺序错了，理由是对的：**audit 是 risk 的前提**，
     不是它的反面。一句话说清这层因果 ——
       audit：「这案**故意反了**哪几条 AI 陈词」→ 因此才需要
       risk ：「照抄它的时候，**最容易做错成什么样**」。
     先读完「它反的是什么」，才可能理解「你抄的时候会踩什么」；反过来读，risk 里那些
     「别把 X 做成 Y」的句子没有前文可指。数据层的键序也已经按这个顺序改了
     （`audit` idx=14 < `risk` idx=15），UI 跟上即可。
     实测（1440×900，折叠块默认收起，只挪 DOM 顺序、不动文本，差就只来自顺序）：
       S01  audit top 2,263.1 → 排在 risk 之后是 2,416.7（晚 153.6px）
       S07  audit top 2,289.0 → 2,468.5（晚 179.5px）
       S13  audit top 2,677.6 → 2,883.0（晚 205.4px）
     三案方向一致：排在 risk 后面就要多滚 154–205px 才看到「凭什么说它反了 AI 味」，
     而那恰恰是该先读的一段。数字随内容长度变，但**方向是结构性的**，不是这一版的巧合。

     为什么不塞进提示词：那 10,065 字里 77 处是 C-x.y 条款编号，对模型是噪声；
     对人却是「这案的反 AI 是真做了还是嘴上说」的唯一证据。 */
  function auditFold(r) {
    var t = auditText(r);
    if (!t) return '';
    var n = countPoints(t);
    return '<div class="field field-fold">' +
      '<details>' +
        '<summary>去 AI 味审查点' + (n ? '（' + n + ' 条）' : '') + '</summary>' +
        '<p class="fold-body">' + esc(t) + '</p>' +
      '</details>' +
    '</div>';
  }

  /* ── 长字段折叠：每个字段自己一条折叠条（2026-10-28）────────────────────
   *
   * 【要解决的问题：390 档 30 案全在 3.5–5.5 屏】实测（`deliverables/67-exec/_lab/p1-baseline.mjs`，
   *   2026-10-28，390×844 / dsf1 / 显式 setViewport）：
   *     scrollHeight 3538–4668（avg 4208），屏数 4.19–5.53，24/30 超 3800。
   *   拆开看，字段区占 3516（83.5%），字段区之外只有 690.4（min 664 / max 728）。
   *   也就是说：**面板再长也长在字段里，不在折叠块、不在 CTA。**
   *   而字段区内部有恒定 551.8px 是纯布局（12×`padding:12px 0`=288 + 12×dt=251.8 + 12×线=12），
   *   与内容无关；真正长的是正文：30 案里最长的 4 段正文合计 avg 1642 字 / 1177–1966。
   *
   * 【实测过的六种压法，只有折长字段这一条既达标又不动排版】
   *   （`_lab/p2-variants.mjs`，30 案全量，390 档，阈值 ≤3000）：
   *     V0 现状            3538–4668 (4208)   0/30 达标
   *     VB 只压内距        3468–4546 (4114)   0/30   —— 只省 94px，压内距是零头
   *     VC 字段导航条      3583–4713 (4253)   0/30   —— **净亏 +45px**，首屏完整字段 0.9→0.5
   *     VD 渐进披露 9 折    1491–1688 (1581)  30/30   —— 达标但面板变成目录，pass
   *     VA 折 4 长字段      2260–2820 (2542)  30/30   —— **选它**
   *     VE VA+压内距       2198–2732 (2475)  30/30   —— 多省 67px，代价是动内距
   *   选 VA 的理由不是"它最短"，而是**它一个排版值都没动**：字号仍 16px、行高仍 1.62、
   *   内距仍 12px、正文宽仍 355px。可读性的三个变量全部原封不动，只是把 4 段长文的
   *   **默认可见性**改了。这也是本仓库一贯的取舍顺序：先减法，再动排版，最后才删内容。
   *   （VA 与 VE 的 67px 差距换不来一档可读性，所以不取。）
   *
   * 【为什么是这 4 个字段】按 390 档实测高度排序，它们稳定是「最长 5 个」里的前 4 个
   *   （layout 491 / landing 485 / visuals 456 / motion 420，字体策略 427 排第五）。
   *   为什么不把「字体策略」也折（VH 实测 1972–2403，更短）：它 30 案 avg 427px、
   *   **正文 345 字**，是"扫一眼就知道这案用什么字"的选型判据之一；而折掉它只能再省 186px，
   *   在已经 30/30 ≤3000 的前提下，这 186px 不值得多一次点击。**够了就停。**
   *   为什么不是「反 AI 味风险」那些：它们 avg 128–268px，折了收益小、点击成本一样。
   *
   * 【summary 写什么，以及为什么这样写】用户收起时唯一能判断"值不值得点开"的信息就是这一行。
   *   所以 summary 三件事缺一不可：
   *     ① 字段名（原 dt 的字面量，一个字不改，全站 12 段的命名体系不变）
   *     ② 字数（现算，不是写死的常量 —— 数据改了它自己会跟着变）
   *     ③ 一句"里面是什么"的说明（`longField` 的 4 个调用点各给一句，见 renderDetail 里的入参）
   *   实测 summary 高 **25.8px**（内距 2px + 13px/1.6 一行），比 24px 的 WCAG 2.2 AA 2.5.8
   *   下限高 1.8px ⇒ **不靠间距豁免也合规**。上一版「去 AI 味审查点」的 summary 只有 20.8px，
   *   是靠"24px 圆不与其它目标相交"的豁免过的（见 66-audit/mobile-390.md §6.2）；
   *   这里既然要新增 4 条，就不该再添 4 个靠豁免的控件，所以内距给到 2px + 1.6 行高。
   *   ⚠️ 试过在 summary 里加"首句摘要"，实测（`_lab/p3-foldshape.mjs` F3/F4）
   *   390 档**没有一行变两行**（25.8px，行数 2 = 三角算一行），但 1440 档会把
   *   「布局与网格」那条挤到需要横向挤压；而且首句摘要经常是"12 栏，基线 8px"这种
   *   脱离上下文的碎片，比没有更误导。**放弃了，只留字段名 + 字数 + 一句说明。**
   *
   * 【内容是"折"不是"删"，有实测】把 4 条全展开后，390 档 S01/S13/S26/S29 分别是
   *   3569 / 4372 / 4657 / 4699，比现状（3538 / 4341 / 4626 / 4668）**高 31px** ——
   *   31px 就是 4 条 summary 自己的高度（4×25.8−4×18.2≈30.4，取整 31）。
   *   也就是说：**展开后的内容一字不少，多出来的只是折叠条本身。**
   *
   * 【和「去 AI 味审查点」那条折叠块的关系】那条是 auditFold()，直接返回 .field，
   *   结构是 `<div class="field field-fold"><details><summary>…`；
   *   这里返回的也是 .field（内容模型不变：`<dl class="fields">` 的子元素全部是 div），
   *   但用的是 **dt/dd 的原位改折**（把 dt/dd 移进 details），因为它的 summary 需要
   *   同时容纳"字段名 + 字数 + 说明"三段，而 auditFold 的 summary 只有一段标题。
   *   两条路径共用 `.field-fold` 的外观（style.css 里同一套 summary 规则），不必各写一套。
   *
   * 【为什么入口是 field() 的第 4 个参数，而不是另起一个 longField()】
   *   `prototypes/_build/check-docs.mjs` 的 panel/fields 断言是这么算字段数的
   *   （check-docs.mjs:437）：`field('` 字面量调用数 + auditFold 1 = README 里写的 12 段。
   *   我第一版把 4 个调用点改名成 longField()，结果 check-docs 数出 7+1=8 段，
   *   当场报「README 写 12 段字段，app.js 实测 8 段」——那条断言**没有错**，
   *   它守的是"README 说的字段数与页面渲染的字段数一致"，而页面渲染的确实还是 12 段。
   *   所以正确的修法不是去改检查器口径（那正是这个仓库反复记的病：把不达标改写成另一个口径），
   *   而是让入口保持一个：field() 收第 4 个参数 foldHint，有它就折、没它就平铺。
   *   这样"11 个 field() + auditFold 1 = 12 段"这条不变量继续成立，且**它仍然是真的**。
   */
  function field(label, val, cls, foldHint) {
    if (!val) return '';
    if (foldHint) {
      /* 字数口径：去掉空白后计数。理由与 auditText 那边一致 —— 中文正文不靠空格分词，
         空白（含换行、全角空格）算进"字数"会让同一个字段在不同数据版本间跳动，
         而这个数字印在 summary 上是给人判断"这段有多长"的，必须稳定可复算。
         实测 30 案：4 段合计 avg 1,642 字（1,177–1,966），不是写死的常量。 */
      var n = String(val).replace(/\s/g, '').length;
      return '<div class="field field-fold field-long">' +
        '<details>' +
          '<summary>' +
            '<span class="fl-lab">' + esc(label) + '</span>' +
            '<span class="fl-num">' + n + ' 字</span>' +
            '<span class="fl-hint">' + esc(foldHint) + '</span>' +
          '</summary>' +
          '<p class="fold-body">' + esc(val) + '</p>' +
        '</details>' +
      '</div>';
    }
    return '<div class="field ' + (cls || '') + '"><dt>' + esc(label) + '</dt><dd>' + esc(val) + '</dd></div>';
  }

  /* ── 打开 / 关闭详情：焦点跟着内容走（2026-10-27 修）────────────────────
   *
   * 【修的是什么】审计 deliverables/66-audit/mobile-390.md §6.5 实测：
   *   打开详情后 document.activeElement **仍是 body**（body.detail-open 已挂上，面板
   *   900px 高、display:flex 都在，只有焦点没跟过来）。后果是键盘用户展开一个案之后，
   *   还得再从头 Tab 一遍才够得着面板里的任何控件。
   *
   * 【87 / 86 / 30 这三个数各是什么，别混用】都实测过，口径不同，都写在这里免得下一个人
   *   照着一个错数字去改：
   *     · **87** = 纯 DOM 顺序下标：95 个可聚焦元素里，#detail 内第一个排在 87。
   *       这是审计 m7-tabindex.mjs 的算法，我用同一套选择器复现，得到的也是 87（含 1 起算）。
   *     · **86** = 从页首第一个可聚焦元素真按 Tab，数到踏进 #detail 的次数。与 87 的 1 之差
   *       就是"下标从 1 起算"这件事，两个数其实在说同一件事。
   *     · **30** = 打开 S01 之后，焦点停在 S01 行卡上，从**那里**继续按 Tab 进面板的次数。
   *       这才是"用户刚点开一个案"的真实代价 —— 比 86 小，但仍然是 30 次。
   *   修好之后同一路径是 **1 次**（焦点已在 .detail-head，再按一次 Tab 就是「收起」）。
   *   所以"87 次"不必改口，只是要标明它是全页口径；用户实际遭遇的是 30 次。
   *   反向的一半同样缺：关闭后焦点落回 body，用户被踢回页面顶部，得重新找刚才那一行。
   *
   * 【为什么焦点落在 .detail-head 而不是第一个可聚焦控件（#d-close）】
   *   1) 面板是"换了一个阅读上下文"，不是弹出一个确认框。焦点进入的落点应该先说出
   *      「你现在看的是哪个案」，而 .detail-head 的文本正是 `S01` + 中文名 + 英文名/结构型；
   *      屏读器聚焦容器时会把这段读出来。#d-close 读出来只有「收起」两个字，等于什么都没说。
   *   2) Tab 顺序天然正确：head 之后紧跟的就是 #d-close（DOM 里就是它的下一个兄弟），
   *      所以"进面板按一次 Tab 就能收起"这条路径没有任何成本。
   *   3) tabindex="-1" 只让它可以被**程序**聚焦，不进入 Tab 序列 —— 不会多出一个 Tab 站。
   *
   * 【为什么焦点移动要能被关掉（opts.focus === false）】
   *   带 #S07 直接进来的首次加载不能抢焦点：页面正在载入，用户（和屏读器）应该从页首开始读，
   *   一进来就把焦点扔进右下角的面板是"我还没让你跳"。所以只有**用户动作**（点行卡、
   *   行卡上按 Enter/Space、J/K、改 hash）才移焦点；boot 那条路显式传 focus:false。
   *
   * 【关闭时为什么能"还回触发它的行卡"】
   *   不记"是谁点的"，而是用 state.open 反查：`ledger.querySelector('.row[data-id=…]')`。
   *   这比记 activeElement 可靠 —— J/K 换案时 activeElement 是 body 或面板内部，
   *   但"我读到的是哪个案、该还回哪一行"始终由 state.open 唯一决定。
   *   还回时用 preventScroll 再显式 scrollIntoView({block:'nearest'})：
   *   前者避免整页跳一下，后者保证那一行真的在视口里（J/K 跨很远时它可能在屏幕外）。
   *
   * 【不给键盘用户抢焦点的情况】面板本来就没开时调 close()（比如什么都没展开就按 Esc，
   *   全局 keydown 会无条件调 close）必须什么都不做。判据是"关之前面板是否真的开着"
   *   加上"焦点此刻是否在面板里或 body 上"。两条都成立才抢 —— 否则会把焦点从用户
   *   正在操作的地方（比如 rail 里某颗芯片）拽走，那是拿新缺陷换旧缺陷。
   */
  var FOCUS_TARGET = '.detail-head';

  function focusIntoDetail() {
    var head = $(FOCUS_TARGET, detail);
    if (!head) return;
    /* tabindex 写在 JS 里而不是 index.html：本轮的改动面被限定在 app.js / style.css，
       而 tabindex="-1" 是纯行为语义（"可被程序聚焦，不进 Tab 序列"），放在行为层更合适。 */
    if (!head.hasAttribute('tabindex')) head.setAttribute('tabindex', '-1');
    head.focus({ preventScroll: true });
  }

  function focusBackToRow(id) {
    var row = id ? ledger.querySelector('.row[data-id="' + id + '"]') : null;
    /* 行卡可能已经不在清单里（面板开着时改了搜索词/筛选，而 render() 重铺了 ledger）。
       这时退回搜索框 —— 它是主工作区的起点，总比把焦点丢给 body 强。 */
    var target = row || $('#q');
    if (!target) return;
    target.focus({ preventScroll: true });
    if (row && row.scrollIntoView) row.scrollIntoView({ block: 'nearest' });
  }

  function open(id, opts) {
    var r = ALL.filter(function (x) { return x.id === id; })[0];
    if (!r) return;
    opts = opts || {};
    state.open = id;
    state.vp = 'desktop';
    state.shotIdx = 0;
    renderDetail(r);
    detail.hidden = false;
    document.body.classList.add('detail-open');
    if (location.hash !== '#' + id) history.replaceState(null, '', '#' + id);
    syncCurrent();
    /* 焦点必须在 detail.hidden = false 之后移：display:none 的元素聚不上焦。 */
    if (opts.focus !== false) focusIntoDetail();
  }

  function close(opts) {
    opts = opts || {};
    var wasOpen = !detail.hidden;
    var id = state.open;
    var a = document.activeElement;
    var focusWasOurs = !!a && (a === document.body || detail.contains(a));
    state.open = null;
    detail.hidden = true;
    document.body.classList.remove('detail-open');
    if (location.hash) history.replaceState(null, '', location.pathname + location.search);
    syncCurrent();
    if (wasOpen && opts.restoreFocus !== false && focusWasOurs) focusBackToRow(id);
  }

  function renderDetail(r) {
    $('#d-no').textContent = r.id;
    $('#d-cn').textContent = r.cn;
    $('#d-en').textContent = r.en + (r.fr ? '　·　' + r.fr + ' 型／' + r.structure : '');

    var g = r.gate || {};
    var gateBox = '<div class="gate-box"><div class="gate-line">' + gateTags(r) +
      (r.gate ? '<span>桌面 ' + g.screens + ' 屏 · 真实图 ' + g.realPictures + ' · 横向溢出 ' + g.overflow + ' · 字数 ' + g.words + '</span>' : '') +
      '</div>';
    if (r.gate) {
      gateBox += '<p class="gate-rules">' +
        (g.failIds.length ? 'FAIL：<b>' + esc(g.failIds.join(' ')) + '</b>' : 'FAIL：无') +
        (g.warnIds.length ? '　　WARN：<i>' + esc(g.warnIds.join(' ')) + '</i>' : '') +
        '<br>报告时间 ' + esc(g.at || '—') + '</p>';
    }
    gateBox += '</div>';

    var proto = r.built
      ? '<a class="open-proto" href="../' + esc(r.dir) + '/index.html" target="_blank" rel="noopener">打开原型 ' + esc(r.dir) + ' ↗</a>'
      : '<span class="open-proto" aria-disabled="true">原型尚未建立</span>';

    /* ── 预览块改成默认收起的折叠条（2026-10-27，见 fold() 的注释）──────────
     * 实测（1440×900，30 案）：这块 439px，是字段之前最贵的一段。
     * 为什么**连视口切换按钮一起**收进去，而不是把 tabs 留在外面：
     *   tabs 是「换一档看这张图」的控件，图收起来之后它们没有作用对象。实测留外面要多付
     *   33px（tabs 30 + margin 8），把移动端首字段从 668 顶到 709 —— 只剩 11px 余量，
     *   一次字体回退就破线。留在里面既省钱又不制造「点了没反应」的空按钮。
     * 为什么默认**收起**：卡片列表上每一行已经有一张桌面首屏大图（.shots），
     *   详情里这块是「再看大一点 + 三档对照」，不是首次曝光。默认收起后，
     *   用户打开详情第一眼看到的是**字段**，要看图点一下（summary 上就有一张缩略图，
     *   所以"这案长什么样"并没有被藏起来）。
     * scrollTop 归零在 paintViewer 里做，收起状态下也照样执行，展开后位置正确。 */
    /* ⚠️ `.viewer` 这层容器必须留着（2026-10-27 实测踩过）：
     * 第一版把 tabs/stage/strip/note 直接放进折叠块的 body 里，`.viewer` 就消失了。
     * 后果：`style.css` 里 `.viewer{margin-bottom}` 失效、`#d-body > *` 的结构断言里
     * 少了一类、任何按 `.viewer` 定位的探针读到 null（我自己那支 measure 脚本就先撞上）。
     * 折叠只是把它**包起来**，不是把它删掉。 */
    var viewerHTML = '<div class="viewer">' +
      '<div class="viewer-tabs" role="group" aria-label="切换视口">' +
        ['desktop:1440×900', 'tablet:768×1024', 'mobile:390×844'].map(function (v) {
          var k = v.split(':')[0], lab = v.split(':')[1];
          return '<button type="button" data-vp="' + k + '" aria-pressed="' + (state.vp === k ? 'true' : 'false') + '">' + lab + '</button>';
        }).join('') +
      '</div>' +
      '<div class="viewer-stage" id="stage"></div>' +
      '<div class="viewer-strip" id="strip"></div>' +
      '<p class="viewer-note" id="vnote"></p>' +
    '</div>';

    var viewer = fold('fold-view',
      foldSum((r.shots[state.vp] || [])[0], '原型截图预览',
        '点开看 1440 / 768 / 390 三档大图，限高可滚动',
        '<span class="fold-tag">' + esc((r.shots[state.vp] || []).length + ' 张') + '</span>'),
      viewerHTML, false);

    /* ── 闸门信息：默认收起，但结论留在 summary 上 ────────────────────────
     * 这块 77px。折它的前提是**不丢结论**：FAIL / WARN 的标签原样印在 summary 上，
     * 展开后才看报告时间与逐条明细。收起状态下用户仍能判断「这案过没过闸门」。
     *
     * ⚠️ summary 只能有一行（实测教训）：第一版把「桌面 N 屏 · 真实图 N · 报告时间 …」
     * 也塞进 summary，390 档折成 3 行、高 100px，把首字段顶到 817 —— 比不折还糟。
     * 现在 summary 只留「闸门与报告 + FAIL/WARN 标签 + 一句展开提示」；
     * 屏数/真实图这些定量信息在 body 里，和报告时间一起，本来就属于"细节"。
     * ISO 时间戳（2026-10-24T08:30:44.549Z）也不该出现在收起态，它需要被格式化才有用。 */
    var gateSub = r.gate ? '展开看屏数、真实图、报告时间与逐条 FAIL/WARN' : '这个案还没有闸门报告';
    var gate = fold('fold-gate',
      foldSum(null, '闸门与报告', gateSub, gateTags(r)),
      gateBox, false);

    /* ── 上站文案 4 段：默认收起 ─────────────────────────────────────────
     * 这块 300–377px，比闸门高四倍。4 段一条不少地放进 body，summary 里点名是哪四段 ——
     * 用户不展开也知道里面有什么、够不够他去判断。
     * 为什么默认收起：这 4 段是「这个案子上线时会写什么」的样例，属于选定之后的参考，
     * 不属于选型时要读的第一层信息；而它恰好排在字段前面的必经之路上。 */
    var partsHTML = '';
    if (r.copyParts && (r.copyParts.claim || r.copyParts.button || r.copyParts.empty || r.copyParts.error)) {
      var li = [];
      if (r.copyParts.claim) li.push('<li><span>主张句</span>' + esc(r.copyParts.claim) + '</li>');
      if (r.copyParts.button) li.push('<li><span>按钮</span>' + esc(r.copyParts.button) + '</li>');
      if (r.copyParts.empty) li.push('<li><span>空状态</span>' + esc(r.copyParts.empty) + '</li>');
      li.push('<li><span>错误状态' + (r.copyParts.error ? '' : '（源文件缺，错误码为 Lead 补入）') + '</span>' +
        (r.copyParts.error ? esc(r.copyParts.error) : '错误码 <code>' + esc(r.errorCode || '—') + '</code>：' + esc(r.errorCodeSource || '')) + '</li>');
      partsHTML = '<ul class="parts">' + li.join('') + '</ul>';
    }
    var parts = partsHTML
      ? fold('fold-parts',
          foldSum(null, '上站文案 ' + li.length + ' 段', '主张句 / 按钮 / 空状态 / 错误状态', ''),
          partsHTML, false)
      : '';

    var fields = '<dl class="fields">' +
      field('一句话视觉定义', r.def) +
      field('美学家族与参考', r.family) +
      /* 配色行（2026-10-27 改）：原来只给底色标了「（底色 …）」，主色混在四个 HEX 里
         没有名字。现在由 paletteLine() 统一生成「底色 … 主色 … 其余 …」，
         零新增字数（只是把已有的 HEX 挪到标签后面），理由见 paletteLine 的注释。 */
      field('当前有效配色', paletteLine(r)) +
      field('字体策略', r.fontsSpec) +
      /* ↓ 以下 4 段带第 4 个参数（2026-10-28）：默认收起，展开后一字不截。
       * 为什么这 4 个而不是别的、为什么不连「字体策略」一起折、summary 上印什么，
       * 完整理由与实测数字都写在 field() 上面那段长注释里（含 VA/VE/VH/VF 四个方案的对比）。
       * 教训照抄一遍放在调用点，免得下一个读到这里的人以为"漏折了字体策略"是 bug：
       *   字体策略 avg 427px / 345 字，是"扫一眼就知道用什么字"的判据，折了只再省 186px，
       *   而面板已经 30/30 ≤3000。**够了就停，多折一次就是多一次点击。** */
      field('布局与网格', r.layout, '', '栏数、基线、断点、留白') +
      /* 「可落地要点」（2026-10-27 加）——这是作者逐案写的 CSS 实现思路 + 性能预算 + 字体子集，
       * 30/30 有值共 13,962 字，此前**零 UI 消费者**：data.js 里一直有、页面上一个字看不到。
       * 上一轮修的是"赋值"那一半（collect-schemes.mjs 的 landing: 赋值），
       * 这一轮补的是"展示"那一半 —— 同一个字段，两次都死在"少一行"上。
       * 放在「布局与网格」之后、「关键视觉元素」之前：它讲的是 CSS 怎么实现，
       * 与布局同属"实现层"，而关键视觉元素讲的是观感，顺序上不该插在两者中间。
       * 取不到就整段不渲染（field() 对空值返回空串），不留一个空标题。 */
      field('可落地要点', r.landing, '', 'CSS 思路、字体子集、性能预算') +
      field('关键视觉元素', r.visuals, '', '母题、线宽、图标规则、禁用项') +
      field('动效与交互', r.motion, '', '滚动、悬停、加载、转场') +
      /* 「去 AI 味审查点」（2026-10-27 接通，折叠形态）。
         ⚠️ 位置在 **risk 之前**（2026-10-27 搬过来的，原在 risk 之后）。别按"risk 是前瞻、
         audit 是回溯、互为背面"去搬回去 —— 正确的因果是 **audit 是 risk 的前提**：
         audit 讲「这案故意反了哪几条 AI 陈词」，risk 讲「所以照抄时最容易做错成什么样」。
         先有"它反什么"，才轮得到"你会踩什么"。实测把 audit 放 risk 后面时它的 top 约
         2,150px（risk 已在约 1,900px），用户要滚 2.4 屏才看到"凭什么说它反了 AI 味"。
         数据层键序已同步（audit idx=14 < risk idx=15）。
         为什么用折叠、S13 那 473 字去哪了，写在 auditFold() / auditText() 的注释里。
         注意它返回的也是一个 <div class="field">，所以 <dl class="fields"> 里
         "全部子元素都是 div" 这个内容模型没有破 —— 插一个裸 <details> 才会破。 */
      auditFold(r) +
      field('反 AI 味风险与规避', r.risk) +
      field('适用场景', r.scenes) +
      field('设计师签名式怪癖', r.quirk) +
      '</dl>';

    $('#d-body').innerHTML = viewer + proto + gate + parts + fields;

    /* 复制提示词按钮：必须放在 innerHTML 赋值**之后**，且只调一次。
       踩过的坑（子 Agent 端到端实测抓到）：原来插在 L351 那个 .map() 回调里，
       既会每案跑 3 次，又是在 innerHTML 右侧求值过程中 append 到旧 DOM，
       紧接着被整树覆盖 ⇒ 页面上按钮 0 个。 */
    if (window.mountPromptButton) window.mountPromptButton($('#d-body'), r.id);

    $$('.viewer-tabs button', detail).forEach(function (b) {
      b.addEventListener('click', function () {
        state.vp = b.getAttribute('data-vp');
        state.shotIdx = 0;
        paintViewer(r);
      });
    });
    paintViewer(r);
  }

  function paintViewer(r) {
    var list = r.shots[state.vp] || [];
    if (state.shotIdx >= list.length) state.shotIdx = 0;
    var stage = $('#stage'), strip = $('#strip'), note = $('#vnote');
    if (!list.length) {
      stage.innerHTML = '<p class="empty" style="padding:24px">这个视口还没有渲染产物。</p>';
      strip.innerHTML = '';
      note.textContent = '跑 prototypes/_build/render-scheme.mjs ' + r.dir + ' 生成。';
      return;
    }
    stage.innerHTML = '<img src="' + esc(list[state.shotIdx]) + '" alt="' + esc(r.id + ' ' + r.cn + ' 第 ' + (state.shotIdx + 1) + ' 张截图') + '">';
    stage.scrollTop = 0;
    strip.innerHTML = list.map(function (s, i) {
      return '<button type="button" data-i="' + i + '" aria-pressed="' + (i === state.shotIdx ? 'true' : 'false') + '"><img src="' + esc(s) + '" alt=""></button>';
    }).join('');
    $$('#strip button').forEach(function (b) {
      b.addEventListener('click', function () {
        state.shotIdx = +b.getAttribute('data-i');
        paintViewer(r);
      });
    });
    var base = list[state.shotIdx].split('/').pop();
    note.textContent = base + '　·　第 ' + (state.shotIdx + 1) + ' / ' + list.length + ' 张　·　' +
      (state.vp === 'desktop' ? '1440×900' : state.vp === 'tablet' ? '768×1024' : '390×844') +
      '-fold 是首屏，page-* 是滚动分屏';
    $$('.viewer-tabs button', detail).forEach(function (b) {
      b.setAttribute('aria-pressed', b.getAttribute('data-vp') === state.vp ? 'true' : 'false');
    });
    /* 折叠条上那张缩略图也要跟着视口走。
       不更新的话：用户在展开态切到 390，再收起，summary 上仍是桌面图 —— 图与实际
       选中的视口对不上，而 summary 是收起后**唯一**可见的图。 */
    var thumb = $('.fold-view .fold-thumb', detail);
    if (thumb) thumb.src = list[state.shotIdx];
    var cnt = $('.fold-view .fold-tag', detail);
    if (cnt) cnt.textContent = list.length + ' 张';
  }

  /* ── 交互接线 ─────────────────────────────────────────── */
  /* 包一层而不是直接传 close：addEventListener 会把 MouseEvent 当第一个参数递进去，
     而 close 现在收 opts（{restoreFocus}）。直接用会让"事件对象"被当成配置读 ——
     今天恰好每个字段都是 undefined 所以不出错，但那是运气，不是约定。 */
  $('#d-close').addEventListener('click', function () { close(); });

  /* ── Esc 在折叠条（<summary>）上不该关掉整个面板（2026-10-27 修）────────────
   *
   * 【修的是什么】审计 §6.5 实测：焦点停在详情里的任意 <summary> 上按 Esc，
   *   document 上的全局 keydown 无条件调 close() ⇒ 整个面板 hidden、hash 清空、
   *   焦点掉回 body。用户的意图是"收起这个折叠块"，代价却是丢掉整个阅读上下文
   *   与滚动位置 —— 而面板要重新打开才能回来，且回来时停在顶部。
   *
   * 【为什么在 detail 上监听、而不是给每个 summary 单独绑】
   *   面板内容是每次 open() 用 innerHTML 重铺的（renderDetail），逐个绑会在下一次
   *   渲染后全部失效，而且 30 个案 × 每案 4 个折叠条 = 120 次绑定。挂在 detail 上
   *   用事件委托，一次就够，且对新出现的 summary 自动生效。
   *
   * 【为什么放在 detail 的冒泡阶段就够】事件路径是 summary → details → … → #detail
   *   → body → document。detail 的监听器先于 document 的跑，这里 stopPropagation
   *   之后全局那一条根本收不到，不需要去改那个"总开关"的判断条件 ——
   *   那个条件还必须保持"任何地方按 Esc 都能收起面板"，否则键盘用户会没有退路。
   *
   * 【为什么落点是面板头，而不是 blur()】
   *   审计的建议是"只 blur 不关闭"。blur() 会把焦点丢给 body —— 那正是缺陷 2 刚修掉的
   *   症状（焦点在 body ⇒ 想回到刚才的折叠条要重新 Tab 整个页面）。所以这里改成
   *   "退到面板头"：Esc 变成一条有方向的阶梯 ——
   *     折叠条上按 Esc → 焦点退到面板头（面板还开着，当前是哪个案仍读得出来）
   *     再按一次 Esc  → 面板关闭，焦点还回触发的行卡（见 close()）
   *   两级都能反悔，且任何一级都不会把焦点扔回 body。
   *   与 prompt-copy.js:881 那处输入框 Esc 的处理同一个思路（stopPropagation 后再收焦点），
   *   区别是那里 blur 是合理的（输入框 blur 后焦点还在用户刚点过的按钮上），
   *   这里 blur 没有合理落点，所以要显式指定。 */
  detail.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    var s = e.target && e.target.closest ? e.target.closest('summary') : null;
    if (!s || !detail.contains(s)) return;
    e.preventDefault();
    e.stopPropagation();
    focusIntoDetail();
  });

  $('#q').addEventListener('input', function (e) {
    state.q = e.target.value.trim().toLowerCase();
    /* 打字**不**动芯片（2026-10-27 决定，且必须先说清为什么不）。
       一开始我让"打字"顺手取消芯片，理由是"更近的一次意图应该赢"。实测后否掉了：
       那会让「点了咖啡店芯片，再在框里打『白色』」变成"把芯片悄悄关掉、只按白色筛"，
       芯片的 aria-pressed 自己灭掉 —— 用户没有点它，它却变了，这是新的静默改动。
       而且「组间是并且」这句是这张台子的基本语义（rail-lead 上就写着），q 也只是
       其中一组筛选：先点芯片再打词，本来就该是**在这几个里继续缩小**，这是真·精筛。
       筛成 0 行时由空状态给出带行数的两个按钮（只看芯片 / 只看搜索词），一键可退 ——
       所以"先点后搜"不是死路，只是"缩得太狠"，而缩得太狠本来就要允许。
       真正的死路只有一条：点芯片把用户已经打好的词**替换**掉却不告诉他。那条在
       parkQuery() 里修了（词被挂起、可见、可放回）。 */
    render();
  });
  $('#sort').addEventListener('change', function (e) { state.sort = e.target.value; render(); });
  $('#reset').addEventListener('click', function () {
    /* ⚠️ 四个新轴必须一起清。
       我加"要亮底还是暗底 / 底色属于哪条带 / 要装多少内容 / 要安静还是要扎眼"这四组筛选时，
       只加了 state 集合与芯片，**漏了加进这个 reset**。后果是：筛到 0 命中之后点"清空筛选"，
       命中数**仍然是 0**，而 32 颗芯片全部显示未选中 —— **界面主动说谎**。
       更糟的是空状态给的恢复建议正好指向这个坏按钮。
       （由选型台信息架构审查员实测抓出：0 命中下点清空 → 仍 0；aria-pressed=true 计数 0。）

       ⚠️⚠️ 第二次（2026-10-25，实测抓出）：上面这段注释写完的同一个函数里，我又漏了
       **state.sceneIds**。根因是它不在 state 的「筛选集合」那一段里，而是单独定义在
       L28 附近（给 prompt-copy.js 的「你是做什么的」芯片用），我照着"九组 Set"数一遍
       就以为齐了。实测（CDP，1440×900）：
         initial       列出 30 / 30
         点「咖啡店」   列出 4 / 30
         点「清空筛选」 列出 4 / 30   ← BUG，芯片全灭但场景轴还活着
       而 `.chips button` 只覆盖 #flt-* 那 9 组，场景芯片是 `.scene-chip`（由 prompt-copy.js
       用 className 挂上去的），原来的通配选择器**根本选不到它们**。
       所以这里分两步：清 state.sceneIds，再把 .scene-chip 的 aria-pressed 逐颗压成 false。 */
    state.q = '';
    state.ground.clear(); state.band.clear(); state.load.clear(); state.loud.clear();
    state.fr.clear(); state.thr.clear(); state.tone.clear(); state.st.clear(); state.gate.clear();
    /* 场景轴：必须赋新 Set 而不是 .clear()。
       对外接口 benchSetSceneIds 是**替换**整个 Set（state.sceneIds = new Set(ids)），
       这里若只 clear 旧对象，语义上没问题但和 benchClearSceneIds 走两条不同的路径；
       统一成"替换"，让 reset 与"再点一次芯片取消"产生完全一致的状态。 */
    state.sceneIds = new Set();
    /* 暂存词也要一起清（2026-10-27）：「清空筛选」的语义是"回到初始界面"，
       留着一条「已暂存「咖啡店」」的条子会让用户以为还有筛选在生效 —— 而按钮
       一键就能把那颗子弹再打回来。reset 之后 30/30，条子必须消失。 */
    state.qParked = null;
    $('#q').value = ''; $('#sort').value = state.sort = 'n';
    /* .chips button 覆盖 rail 里 9 组筛选芯片；.scene-chip 必须单独列 ——
       它们虽然也在 .chips 容器里（#flt-scene），但 reset 时不能只靠 .chips 这个前缀选择器
       去碰它们，因为"界面回到未筛"这个断言是按 .scene-chip[aria-pressed="true"] 计数的，
       两处都写一遍才不会再次出现"列表回去了、芯片还亮着"。
       另外 .chips button 也顺带覆盖了 .scene-chip（它们同在 #flt-scene 的 .chips 里），
       这里显式再选一次是为了在 .scene-chip 被挪出 .chips 时仍然成立。 */
    $$('.chips button, .scene-chip').forEach(function (b) { b.setAttribute('aria-pressed', 'false'); });
    /* 清完必须校验：如果清空后命中数不是全部，说明还有没被清掉的轴 —— 宁可当场暴露，
       也不要再出现"芯片全灭但列表全空"这种自相矛盾的界面。 */
    var n = ALL.filter(match).length;
    if (n !== ALL.length && window.console) {
      console.warn('[选型台] reset 之后命中 ' + n + '/' + ALL.length + '，还有轴没被清掉');
    }
    render();
    /* render() 之后把场景芯片的 aria-pressed 再压一遍：场景芯片由 prompt-copy.js 在
       DOMContentLoaded 之后挂载，若它晚于本函数首次绑定（理论上不会，但事件顺序不该靠猜），
       列表与芯片就会错位。这一次在 render 完成后执行，且只碰 aria-pressed，不动筛选状态。 */
    $$('.scene-chip').forEach(function (b) { b.setAttribute('aria-pressed', 'false'); });
  });

  document.addEventListener('keydown', function (e) {
    var tag = (e.target.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'select' || tag === 'textarea') {
      if (e.key === 'Escape') e.target.blur();
      return;
    }
    /* ⚠️ `<button>` 也必须排除。
       原判据只排除了 input/select/textarea，漏了 button。
       后果：焦点落在任意一颗筛选芯片上（键盘 `Tab` 到那儿是常规操作）再按 `J`，
       会**同时触发两件事**——芯片激活 + 打开第一个方案的详情。
       实测（选型台可用性辩护员）：焦点在"亮底"芯片上按 J →
       `active:"亮底22"` + `detailHidden:false` + `dNo:"S01"`。
       button 上的 J/K/`/` 本来就该由浏览器正常处理（J 在按钮上无默认行为，
       但用户此刻的意图显然是"操作这颗芯片"，不是"跳到下一个方案"）。 */
    if (tag === 'button' || e.target.isContentEditable) {
      if (e.key === 'Escape') e.target.blur();
      return;
    }
    var rows = sorted(ALL.filter(match));
    var i = rows.findIndex(function (r) { return r.id === state.open; });
    if (e.key === '/') { e.preventDefault(); $('#q').focus(); return; }
    if (e.key === 'Escape') { close(); return; }
    if (e.key === 'j' || e.key === 'J' || e.key === 'ArrowDown') {
      e.preventDefault();
      var n1 = rows[Math.min(i + 1, rows.length - 1)] || rows[0];
      if (n1) { open(n1.id); scrollTo(n1.id); }
      return;
    }
    if (e.key === 'k' || e.key === 'K' || e.key === 'ArrowUp') {
      e.preventDefault();
      var n2 = rows[Math.max(i - 1, 0)] || rows[0];
      if (n2) { open(n2.id); scrollTo(n2.id); }
      return;
    }
    if (state.open && ['1', '2', '3'].indexOf(e.key) >= 0) {
      var vp = ['desktop', 'tablet', 'mobile'][+e.key - 1];
      var r = ALL.filter(function (x) { return x.id === state.open; })[0];
      state.vp = vp; state.shotIdx = 0;
      if (r) paintViewer(r);
      e.preventDefault();
    }
  });

  function scrollTo(id) {
    var el = ledger.querySelector('.row[data-id="' + id + '"]');
    if (el && el.scrollIntoView) el.scrollIntoView({ block: 'nearest' });
  }

  window.addEventListener('hashchange', function () {
    var id = (location.hash || '').replace('#', '');
    /* 改 hash 是用户动作（点行卡会写 hash，浏览器前进/后退也会）⇒ 这里可以抢焦点。
       close() 不传 restoreFocus:false 也一样：hash 被用户清掉等于"退出详情"，还回行卡是对的。 */
    if (!id) { close(); return; }
    if (/^S\d{2}$/.test(id)) open(id);
  });

  render();

  var h = (location.hash || '').replace('#', '');
  /* 首次加载**不抢焦点**（focus:false）：带 #S07 进来时，用户（和屏读器）应该从页首开始读。
     一载入就把焦点扔进右下角面板，等于替他做了一次他没做的跳转。 */
  if (/^S\d{2}$/.test(h)) open(h, { focus: false });

  /* 对外接口：给 prompt-copy.js 的场景芯片用。
     只暴露「按 id 集合筛选」这一个动作，不让外部直接碰 state 内部结构。 */
  window.benchSetSceneIds = function (ids) {
    state.sceneIds = new Set(ids || []);
    render();
  };
  window.benchClearSceneIds = function () {
    state.sceneIds = new Set();
    render();
  };
  /* 2026-10-27 新增两个原子动作，给芯片的 click handler 用。
     为什么不复用上面两个再各配一次"清输入框"：那需要两处 DOM 操作（改 #q.value 与调
     benchSetSceneIds），两次都各自 render()，中间会闪过一帧"词还在、芯片已生效"的 0 行状态。
     这两个函数把「挂起搜索词 + 换掉场景白名单」合成**一次**渲染，界面不会说出半句话。
     —— 死路修法的实现在 app.js（parkQuery 的长注释），prompt-copy.js 只负责调用。 */
  window.benchParkQuery = function () {
    return parkQuery();          // 只改状态与输入框，不 render（由下面两个接口统一渲染）
  };
  /* 点芯片时调用：先挂起搜索词，再换白名单，一次渲染。
     ids 为空 = 取消芯片（此时不动搜索框里用户自己打的字）。 */
  window.benchSetSceneIdsParkingQuery = function (ids) {
    var parked = parkQuery();
    state.sceneIds = new Set(ids || []);
    render();
    return { parked: parked, parkedText: state.qParked };
  };
  window.benchClearSceneIdsKeepQuery = function () {
    state.sceneIds = new Set();
    render();
  };
  window.benchParked = function () { return state.qParked; };
})();
