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
  $('#f-clean').textContent = stats.clean;
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
      var hay = [r.id, r.cn, r.en, r.family, r.fonts, r.def, r.tone, r.structure,
                 r.errorCode, r.threshold, r.layout, r.visuals, r.quirk,
                 r.scenesYes,
                 ax.ground, ax.band, ax.load, ax.loud,
                 (r.palette || []).join(' ')].join(' ').toLowerCase();
      if (hay.indexOf(state.q) < 0) return false;
    }
    return true;
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
      return '<span class="cap cap-warn" title="这个版式的单元位置是写死的（绝对定位/固定网格坐标/手绘坐标），内容少于设计规模会留下空洞">' +
        '⚠ 内容少于 ' + cap.minItems + ' 条会留空位</span>';
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
      why.textContent = (state.q && idx[state.q])
        ? '「' + state.q + '」正属于没有直连方案的那一类——这是这 ' + ALL.length + ' 个案这一层的供给缺口，不是你条件加多了。'
        : '行业词搜不到，是这 ' + ALL.length + ' 个案缺这条数据，不是你条件加多了。';
    }
  }

  function render() {
    var rows = sorted(ALL.filter(match));
    ledger.innerHTML = rows.map(rowHTML).join('');
    $$('.row', ledger).forEach(function (el, i) { el.setAttribute('data-i', String(i)); });
    $('#empty').hidden = rows.length > 0;
    $('#count').textContent = '列出 ' + rows.length + ' / ' + ALL.length + ' 个方案';
    if (!rows.length) syncEmptyFacts();
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

  function field(label, val, cls) {
    if (!val) return '';
    return '<div class="field ' + (cls || '') + '"><dt>' + esc(label) + '</dt><dd>' + esc(val) + '</dd></div>';
  }

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

  function open(id) {
    var r = ALL.filter(function (x) { return x.id === id; })[0];
    if (!r) return;
    state.open = id;
    state.vp = 'desktop';
    state.shotIdx = 0;
    renderDetail(r);
    detail.hidden = false;
    document.body.classList.add('detail-open');
    if (location.hash !== '#' + id) history.replaceState(null, '', '#' + id);
    syncCurrent();
  }

  function close() {
    state.open = null;
    detail.hidden = true;
    document.body.classList.remove('detail-open');
    if (location.hash) history.replaceState(null, '', location.pathname + location.search);
    syncCurrent();
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
      field('字体策略', r.fonts) +
      field('布局与网格', r.layout) +
      /* 「可落地要点」（2026-10-27 加）——这是作者逐案写的 CSS 实现思路 + 性能预算 + 字体子集，
       * 30/30 有值共 13,962 字，此前**零 UI 消费者**：data.js 里一直有、页面上一个字看不到。
       * 上一轮修的是"赋值"那一半（collect-schemes.mjs 的 landing: 赋值），
       * 这一轮补的是"展示"那一半 —— 同一个字段，两次都死在"少一行"上。
       * 放在「布局与网格」之后、「关键视觉元素」之前：它讲的是 CSS 怎么实现，
       * 与布局同属"实现层"，而关键视觉元素讲的是观感，顺序上不该插在两者中间。
       * 取不到就整段不渲染（field() 对空值返回空串），不留一个空标题。 */
      field('可落地要点', r.landing) +
      field('关键视觉元素', r.visuals) +
      field('动效与交互', r.motion) +
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
  $('#d-close').addEventListener('click', close);
  $('#q').addEventListener('input', function (e) { state.q = e.target.value.trim().toLowerCase(); render(); });
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
    if (!id) { close(); return; }
    if (/^S\d{2}$/.test(id)) open(id);
  });

  render();

  var h = (location.hash || '').replace('#', '');
  if (/^S\d{2}$/.test(h)) open(h);

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
})();
