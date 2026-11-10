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
    meta.push('<span class="row-family">' + esc((r.family || '').split('。')[0].split('：').pop().slice(0, 34)) + '</span>');
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

    var parts = '';
    if (r.copyParts && (r.copyParts.claim || r.copyParts.button || r.copyParts.empty || r.copyParts.error)) {
      var li = [];
      if (r.copyParts.claim) li.push('<li><span>主张句</span>' + esc(r.copyParts.claim) + '</li>');
      if (r.copyParts.button) li.push('<li><span>按钮</span>' + esc(r.copyParts.button) + '</li>');
      if (r.copyParts.empty) li.push('<li><span>空状态</span>' + esc(r.copyParts.empty) + '</li>');
      li.push('<li><span>错误状态' + (r.copyParts.error ? '' : '（源文件缺，错误码为 Lead 补入）') + '</span>' +
        (r.copyParts.error ? esc(r.copyParts.error) : '错误码 <code>' + esc(r.errorCode || '—') + '</code>：' + esc(r.errorCodeSource || '')) + '</li>');
      parts = '<ul class="parts">' + li.join('') + '</ul>';
    }

    var fields = '<dl class="fields">' +
      field('一句话视觉定义', r.def) +
      field('美学家族与参考', r.family) +
      field('当前有效配色', (r.palette || []).join('　') + (r.bg ? '　（底色 ' + r.bg + '）' : '')) +
      field('字体策略', r.fonts) +
      field('布局与网格', r.layout) +
      field('关键视觉元素', r.visuals) +
      field('动效与交互', r.motion) +
      field('反 AI 味风险与规避', r.risk) +
      field('适用场景', r.scenes) +
      field('设计师签名式怪癖', r.quirk) +
      '</dl>';

    $('#d-body').innerHTML =
      '<div class="viewer">' +
        '<div class="viewer-tabs" role="group" aria-label="切换视口">' +
          ['desktop:1440×900', 'tablet:768×1024', 'mobile:390×844'].map(function (v) {
            var k = v.split(':')[0], lab = v.split(':')[1];
            return '<button type="button" data-vp="' + k + '" aria-pressed="' + (state.vp === k ? 'true' : 'false') + '">' + lab + '</button>';
          }).join('') +
        '</div>' +
        '<div class="viewer-stage" id="stage"></div>' +
        '<div class="viewer-strip" id="strip"></div>' +
        '<p class="viewer-note" id="vnote"></p>' +
      '</div>' +
      proto + gateBox + parts + fields;

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
