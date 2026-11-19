/* 选型向导的打分逻辑。
   铁律：**不替方案打主观分**。五个问题的答案都映射到方案上**已经实测出来的值**：
     内容量 = report.json 里的正文字数
     图片量 = report.json 里的真实图片张数
     彩度   = 调色板里最高的那个饱和度（从 HEX 现算）
     门槛   = 该案声明的认知门槛（低/中/高）
     记忆点 = 调性 + 彩度，合成一个"敢不敢被记住"的代理值
   我做的唯一一件事是"把实测值归一化到同一把尺子上"，然后算距离。 */

(function () {
  'use strict';

  var ALL = (window.SCHEMES || []).filter(function (r) { return r.gate; });
  if (!ALL.length) {
    document.getElementById('wz-out').hidden = false;
    document.getElementById('wz-out').innerHTML = '<p class="wz-note">读不到 data.js —— 请通过 HTTP 打开这个页面（不要双击文件）。</p>';
    return;
  }

  /* ── 颜色工具 ───────────────────────────────────────── */
  function satOf(hex) {
    if (!hex) return 0;
    var m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
    if (!m) return 0;
    var n = parseInt(m[1], 16);
    var r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
    var mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    if (mx === mn) return 0;
    var l = (mx + mn) / 2;
    return l > 0.5 ? (mx - mn) / (2 - mx - mn) : (mx - mn) / (mx + mn);
  }
  function loudnessOf(palette) {
    var best = 0;
    (palette || []).forEach(function (h) { var s = satOf(h); if (s > best) best = s; });
    return best;                      // 0..1
  }

  /* ── 调性 → 记忆点倾向（0 稳、1 中、2 敢） ─────────────── */
  var TONE_BOLD = {
    '混乱活力 / 街头': 2,
    '荒诞幽默 / 玩心': 2,
    '奢华暗黑 / 高定': 1.5,
    '温暖手作 / 人味': 1,
    '机能冷峻 / 工业': 1,
    '冷静克制 / 工程感': 0.5,
    '学术档案 / 严肃出版': 0.5,
  };

  /* ── 把每案算成 5 维向量，各维归一到 0..2 ─────────────── */
  function num(v, d) { return typeof v === 'number' ? v : d; }

  var words = ALL.map(function (r) { return num(r.gate.words, 0); });
  var pics = ALL.map(function (r) { return num(r.gate.realPictures, 0); });
  var louds = ALL.map(function (r) { return loudnessOf(r.palette); });

  function stretch(arr, v) {           // 用全库的 min/max 做线性归一，映射到 0..2
    var mn = Math.min.apply(null, arr), mx = Math.max.apply(null, arr);
    if (mx === mn) return 1;
    return (v - mn) / (mx - mn) * 2;
  }
  var THR = { '低': 0, '中': 1, '高': 2 };

  /* ── 参照行里的数字，现算（2026-11-05）─────────────────────
   * 三行"参照"原来全是手写的，且全部过期：
   *   · 正文「179–1212，中位 509」→ 实测 78–1188，中位 478
   *   · 图片「4–15，中位 6.5」   → 实测 0–15，中位 6
   *   · 门槛「11 低 / 12 中 / 7 高」→ 实测 14 / 14 / 7
   * 三个数字的合计都是 30，而方案是 35 —— 它们是扩容前的快照，之后无人重算。
   * 这几行不是旁注：它们就挂在题干下面，是用户回答这一题时唯一的参照系。
   * 尤其图片那行，「4 张起」会把整批"零图/单图"的新案（S31–S35）从选项里劝退，
   * 而那批案子正是为"手上没有摄影素材"的店主做的。
   * 所以不写死任何数，一律现算 —— 与选型台 fillDerived() 同一个原则。 */
  function median(a) {
    var s = a.slice().sort(function (x, y) { return x - y; });
    var n = s.length;
    if (!n) return 0;
    return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2;
  }
  function fillWzFacts() {
    var by = function (k) {
      var m = {};
      ALL.forEach(function (r) { var v = r[k]; if (v) m[v] = (m[v] || 0) + 1; });
      return m;
    };
    var thr = by('threshold');
    var vals = {
      'total': ALL.length,
      'rest': Math.max(0, ALL.length - 3),
      'words-min': Math.min.apply(null, words),
      'words-max': Math.max.apply(null, words),
      'words-med': median(words),
      'pics-min': Math.min.apply(null, pics),
      'pics-max': Math.max.apply(null, pics),
      'pics-med': median(pics),
      'thr-low': thr['低'] || 0,
      'thr-mid': thr['中'] || 0,
      'thr-high': thr['高'] || 0
    };
    var nodes = document.querySelectorAll('[data-wz]');
    for (var i = 0; i < nodes.length; i++) {
      var k = nodes[i].getAttribute('data-wz');
      if (vals[k] === undefined) continue;
      nodes[i].textContent = String(vals[k]);
      nodes[i].setAttribute('data-filled', '1');
    }
  }
  fillWzFacts();

  var V = ALL.map(function (r) {
    var loud = stretch(louds, loudnessOf(r.palette));
    var toneBold = TONE_BOLD[r.tone];
    if (toneBold === undefined) toneBold = 1;
    return {
      r: r,
      load: stretch(words, num(r.gate.words, 0)),
      img: stretch(pics, num(r.gate.realPictures, 0)),
      loud: loud,
      guide: THR[r.threshold] === undefined ? 1 : THR[r.threshold],
      fear: Math.min(2, loud * 0.6 + toneBold * 0.4),
      words: num(r.gate.words, 0),
      pics: num(r.gate.realPictures, 0),
      loudRaw: Math.round(loudnessOf(r.palette) * 100),
      tone: r.tone,
      threshold: r.threshold,
    };
  });

  /* ── 五个问题的答案 ─────────────────────────────────── */
  var ORDER = ['load', 'img', 'loud', 'guide', 'fear'];
  var ans = {};

  var qs = ORDER.map(function (k) { return document.querySelector('.wz-q[data-q="' + k + '"]'); });
  function showOnly(i) {
    qs.forEach(function (el, j) { if (el) el.hidden = j > i; });
  }
  showOnly(0);

  qs.forEach(function (el, i) {
    if (!el) return;
    var k = ORDER[i];
    el.querySelectorAll('.wz-opts button').forEach(function (b) {
      b.addEventListener('click', function () {
        ans[k] = +b.getAttribute('data-v');
        el.querySelectorAll('.wz-opts button').forEach(function (o) { o.setAttribute('aria-pressed', 'false'); });
        b.setAttribute('aria-pressed', 'true');
        if (i + 1 < qs.length) { showOnly(i + 1); qs[i + 1].scrollIntoView({ block: 'start' }); }
        if (ORDER.every(function (x) { return ans[x] !== undefined; })) render();
      });
    });
  });

  /* ── 打分 ───────────────────────────────────────────── */
  var W = { load: 1, img: 1, loud: 1, guide: 1, fear: 1 };   // 五问等权；第 5 问通过 fear 轴体现

  /* 契约 §9.15 的豁免判定（2026-11-05）——与 app.js 的 gateVerdict 同一套判据。
   *
   * 【要修的死路】向导原来只按五项距离排序，**完全不看闸门**。
   * 穷举 162 个答案组合：26.5% 的推荐里有 FAIL>0 的方案，7 组三个全给。
   * 而那 5 个 FAIL 案（S31–S35）的 17 条 FAIL token 逐条对契约 §9.15 允许表
   * 比对，**100% 落在允许表内**，且它们的 minPics 是 1,1,1,0,1——全库最低，
   * 正是为"手上没有摄影素材"的店主做的。
   *
   * 但问题不止于此：Q2 有一档"基本不用图"，而全库 realPictures ≤ 2 的五案
   * 恰好就是这五个。也就是说**一个说"我没有照片"的店主，会被系统性地
   * 判给这五个案**——这在数据上是必然的，不是随机。所以不能靠"标一行字"
   * 解决，必须让排序知道这件事。
   *
   * 【判据】与 app.js 逐字相同（minPics ≤ 2 判 few-pictures/hairline 豁免；
   * mono/font-count/palette-terracotta 无条件豁免）。两处判据必须同源，
   * 否则同一个案在主台显示"契约允许"、在向导里被当成缺陷 —— 那正是
   * 审计里说的"两个入口对同一件事给出不同答案"。
   * check-ui-copy 的断言 6 盯着这两份数据源，它们分叉会红。 */
  function minPicsOf(r) {
    var P = window.STYLE_PROMPTS;
    if (!P || !P.schemes) return null;
    for (var i = 0; i < P.schemes.length; i++) {
      var s = P.schemes[i];
      if (s.id === r.id && s.capacity && typeof s.capacity.minPics === 'number') return s.capacity.minPics;
    }
    return null;
  }
  function isExempt(id, r) {
    var pics = minPicsOf(r);
    var lowPic = pics !== null && pics <= 2;
    if (id === 'mono' || id === 'font-count' || id === 'palette-terracotta') return true;
    if (id === 'few-pictures' || id === 'hairline') return lowPic;
    return false;
  }
  function realFailCount(r) {
    var ids = (r.gate && r.gate.failIds) || [];
    var n = 0;
    for (var i = 0; i < ids.length; i++) if (!isExempt(ids[i], r)) n++;
    return n;
  }

  /* 排序分（2026-11-05 加第 4 项）。
     前三项是五项距离，第 4 项是**真缺陷惩罚**：有真缺陷的案排在
     契约允许的案之后。为什么用加法而不是过滤掉：向导的承诺是
     "从全部方案里挑 3 个"，把一个案整个删掉会让总数对不上
     （方法行写着"参与排序的方案 35 个"）。惩罚系数取 1000，
     远大于五项距离的最大值（5 轴 × 权重 1 × 差 2² = 20），
     所以它等价于"永远排在后面"，但保留了"如果只剩它了还能被选中"的语义。 */
  function score(v) {
    var d = 0;
    ORDER.forEach(function (k) { var diff = v[k] - ans[k]; d += W[k] * diff * diff; });
    return d + realFailCount(v.r) * 1000;
  }

  /* 讲理由要分两种方向，这里原来写反过：
     推荐卡要讲"它哪里对上了你"，排除卡才讲"它哪里对不上"。
     之前两处都只讲不匹配，于是推荐卡上会出现"认知门槛「高」（你要的是「低」）"
     这种把落差当成推荐依据的句子。 */
  var LABEL = {
    load: function (v) { return v.words + ' 字正文'; },
    img: function (v) { return v.pics + ' 张真实图片'; },
    loud: function (v) { return '彩度 ' + v.loudRaw + '%'; },
    guide: function (v) { return '认知门槛「' + v.threshold + '」'; },
    fear: function (v) { return '调性「' + v.tone + '」'; },
  };
  var ASK = {
    load: function () { return ['一屏说清', '三五屏', '很多栏目'][ans.load]; },
    img: function () { return ['基本不用图', '几张就够', '图是主角'][ans.img]; },
    loud: function () { return ['很安静', '有态度不吵', '要扎眼'][ans.loud]; },
    guide: function () { return ['三秒知道点哪', '愿意读进去'][ans.guide]; },
    fear: function () { return ['怕做错', '两头都不偏', '怕没记忆点'][ans.fear]; },
  };

  /* ⚠️ 「对上你要的」这句曾经大面积是假的。红队遍历 162 个答案组合实测出来的。
   *
   * 原判据：`x.d <= TIGHT`（TIGHT=0.75），而 x.d 是**连续归一化值之差**。
   * 连续值的问题：`img` 这一问是 stretch(真实图片数, 4..15)，于是"6 张图"= 0.18、
   * "7 张图"= 0.27，与用户答"基本不用图"(0) 的差只有 0.18–0.27 —— 远小于 0.75，
   * 于是卡片写出「6 张真实图片（对上你要的「基本不用图」）」。可 6 张图在 30 案里
   * 高于中位数，用户明确说了"基本不用图"。
   * 全量遍历：203 条「对上你要的」断言里 128 条事实错误（63.1%）。
   *
   * 根因是**用连续距离去回答一个档位问题**。用户的五个答案本来就是离散档位
   * （3/3/3/2/3 档），所以"对上"必须是**档位相等**，不是"浮点距离够近"。
   * 修法：每个方案的连续值先**映射回它自己所在的档位**（与用户答案同一把尺），
   * 再判档位是否相同。这样"6 张图"会落到中间档，与"基本不用图"档不同 → 不说对上。
   */
  var NQ = { load: 3, img: 3, loud: 3, guide: 2, fear: 3 };   // 各问档位数
  /* 连续值 → 档位。档位数 n 时，[0,1] 被切成 n 档，取最近的一档。 */
  function toSlot(v, n) {
    var idx = Math.round(v * (n - 1));
    return Math.max(0, Math.min(n - 1, idx));
  }
  function diffs(v) {
    return ORDER.map(function (k) {
      var slot = toSlot(v[k], NQ[k]);
      var want = ans[k];
      return { k: k, slot: slot, want: want, d: Math.abs(slot - want), raw: slot - want };
    }).sort(function (a, b) { return a.d - b.d; });
  }
  /* 真的"对上"吗：**档位相同**才算。差一档就是差一档，不拿"接近"粉饰。 */
  function isMatch(x) {
    return x.d === 0;
  }
  function reasonsFor(v, wantMatch) {
    var list = diffs(v).filter(function (x) { return wantMatch ? isMatch(x) : !isMatch(x); });
    if (!list.length) {
      /* ⚠️ 这里原来是 `return wantMatch ? '五项都落在你要的档位里' : ...` ——
       * 语义反了。`list` 是**匹配上的轴**（wantMatch 时）或**没匹配上的轴**（!wantMatch 时）。
       * 对推荐卡（wantMatch=true）走这个分支，意味着**一条都没匹配上**，
       * 却返回"五项都落在你要的档位里"——把 0/5 说成 5/5。
       * 独立验证 Agent 真机跑完 162 个组合，抓到 5 处这样的假称：
       * 组合(0,0,0,0,1)→S05，五个轴全不匹配（329 字 vs 一屏说清、6 张图 vs 基本不用图、
       * 彩度 47% vs 很安静、门槛中 vs 三秒知道点哪、机能冷峻 vs 两头都不偏），
       * 卡片却写"五项都落在你要的档位里"。
       * 正确做法：推荐卡若一条都没对上，就**如实说一条都没对上**；
       * 排除卡若一条都没排除，如实说它其实都接近。
       */
      return wantMatch
        ? '五项没有一项落在你要的档位里——它能被排进推荐只是因为相对最接近，逐项看都是落差'
        : '五项都和你要的档位接近——它被排到排除区，只是因为别人更近';
    }
    return list.slice(0, 3).map(function (x) {
      return wantMatch
        ? LABEL[x.k](v) + '（对上你要的「' + ASK[x.k]() + '」）'
        : LABEL[x.k](v) + '，你要的是「' + ASK[x.k]() + '」';
    }).join('　·　');
  }

  function card(v, isAvoid) {
    var r = v.r;
    var sw = (r.palette || []).slice(0, 4).map(function (h) {
      return '<i style="background:' + h + '" title="' + h + '"></i>';
    }).join('');
    var why = reasonsFor(v, !isAvoid);
    /* 闸门标注（2026-11-05 重写）。
     *
     * 【历史】这里原来写「⚠ 机械闸门有 N 项不达标：…（向导不会因此改排名）」。
     * 那句"如实标注"确实渲染了，但它把**契约明文允许**的东西叫成"不达标" ——
     * 而主台那边同一个案显示的是「检查 3 · 契约允许」。
     * 两个入口对同一件事给出相反说法，这正是审计里点名的那种病。
     *
     * 实测事实：全库 35 案的 failIds 逐条对 §9.15 允许表比对，**17 条 FAIL token
     * 100% 落在允许表内**，真缺陷数 0。也就是说"不达标"这个词在这里始终是错的：
     * S31–S35 的 mono/hairline/few-pictures 是契约明文豁免的（minPics ≤ 2），
     * 不是没做好。
     *
     * 现在的文案跟着**真缺陷**走：
     *   · real > 0  —— 才说"有 N 项没达标"，并明确建议别选（这种情况目前 0 个；
     *     一旦出现，说明契约表与新案真的对不上了，那本来就该醒目）；
     *   · real = 0 但 exempt > 0 —— 说"有 N 项常规检查项，契约里已注明为什么
     *     对这类案不适用"，别用"不达标"；
     *   · 都没有 —— 不显示这一行。
     * 同时把"向导不会因此改排名"删掉：现在 score() 里带了真缺陷惩罚，
     * 那句话已经不成立，留着就是新的假话。 */
    var g = r.gate || {};
    var allFails = (g.failIds || []);
    var realN = 0, exemptIds = [];
    for (var fi = 0; fi < allFails.length; fi++) {
      if (isExempt(allFails[fi], r)) exemptIds.push(allFails[fi]); else realN++;
    }
    var gateNote = '';
    if (realN > 0) {
      gateNote = '<p class="wz-gate wz-gate-real">⚠ 这个案有 ' + realN +
        ' 项没达到机械闸门的要求（不在契约豁免表内）：' + allFails.join('、') +
        '　—　选型台上也会红标同一件事。</p>';
    } else if (exemptIds.length) {
      gateNote = '<p class="wz-gate">它有 ' + exemptIds.length + ' 项机械闸门检查没通过（' +
        exemptIds.join('、') + '），但**契约 §9.15 已注明这几项对这类案不适用**' +
        '（例如"少图"案本来就该只有 1–2 张图），不是质量缺陷。</p>';
    }
    return '<li class="wz-card">' +
      '<p class="no">' + r.id + '</p>' +
      '<div>' +
        '<h3>' + r.cn + '<span class="wz-swatch">' + sw + '</span></h3>' +
        '<p class="wz-en">' + (r.en || '') + (r.fr ? '　·　' + r.fr + ' 型／' + r.structure : '') + '</p>' +
        '<p>' + (r.def || '').slice(0, 96) + '…</p>' +
        '<p class="wz-why">' + (isAvoid ? '为什么排除：' : '为什么是它：') + why + '</p>' +
        gateNote +
        /* ⚠️ 这里原本是 './#index-' + r.id —— **死链**。
           app.js 的 hashchange 处理只认 `#S23` 这种形态（`location.hash.replace('#','')` 后要与 `r.id` 相等），
           而 index.html 里**根本没有任何 `id="index-*"` 的锚点**（出现 0 次）。
           后果：向导推荐卡上"到选型台看它的三档截图"点了不开详情、只回到列表顶部 ——
           而这是**向导通向证据的唯一链路**。选型台信息架构审查员用 SHA256 证明了这一点：
           点过这个链接之后的落地截图，与"从未打开过选型台"逐字节相同（B06B00C10C2B0B31）。 */
        '<a href="./#' + r.id + '">到选型台看它的三档截图 →</a>' +
      '</div></li>';
  }

  function render() {
    var ranked = V.slice().sort(function (a, b) { return score(a) - score(b); });
    var pick = ranked.slice(0, 3);
    var avoid = ranked.slice(-3).reverse();

    document.getElementById('wz-pick').innerHTML = pick.map(function (v) { return card(v, false); }).join('');
    document.getElementById('wz-avoid').innerHTML = avoid.map(function (v) { return card(v, true); }).join('');

    document.getElementById('wz-method').innerHTML =
      '你这五个答案是：内容量 ' + ['一屏说清', '三五屏', '很多栏目'][ans.load] +
      '　·　图片 ' + ['基本不用', '几张就够', '图是主角'][ans.img] +
      '　·　安静度 ' + ['很安静', '有态度不吵', '要扎眼'][ans.loud] +
      '　·　首屏引导 ' + ['三秒知道点哪', '愿意读进去'][ans.guide] +
      '　·　更怕 ' + ['做错', '两头都不偏', '没记忆点'][ans.fear] +
      '<br>参与排序的方案 ' + ALL.length + ' 个（有渲染报告的）。' +
      '五项等权、按欧氏距离排序，全部输入来自实测值：正文字数、真实图片张数、调色板最高饱和度、声明的认知门槛、以及"调性＋彩度"合成的记忆点代理值。' +
      '这套权重未经真人回放测试——所以别只信"推荐"：<strong>"排除"那三条更硬</strong>，它们逐条写明落差在哪；' +
      '拿不准就两个都看，或直接回选型台用九组筛选自己排。' +
      '<em>只想要拿来就能用的？<a href="./#tpl-exit">三个大众模板在这里</a>，向导不覆盖那一层。</em>';

    var out = document.getElementById('wz-out');
    out.hidden = false;
    document.getElementById('wz-share').hidden = false;
    out.scrollIntoView({ block: 'start' });
  }

  /* ── 重来 / 分享 ───────────────────────────────────── */
  document.getElementById('wz-reset').addEventListener('click', function () {
    ans = {};
    document.querySelectorAll('.wz-opts button').forEach(function (b) { b.setAttribute('aria-pressed', 'false'); });
    document.getElementById('wz-out').hidden = true;
    document.getElementById('wz-share').hidden = true;
    showOnly(0);
    window.scrollTo({ top: 0 });
  });

  document.getElementById('wz-share').addEventListener('click', function () {
    var q = ORDER.map(function (k) { return k + '=' + ans[k]; }).join('&');
    var url = location.origin + location.pathname + '?' + q;
    history.replaceState(null, '', '?' + q);
    var btn = this;
    var done = function () { btn.textContent = '已复制：' + url; };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(done, function () { btn.textContent = url; });
    } else { btn.textContent = url; }
  });

  /* 支持带答案的链接回放（?load=1&img=2…） */
  (function replay() {
    var p = new URLSearchParams(location.search);
    /* 2026-11-04 修：原来只判 `p.has(k) && p.get(k) !== ''`，于是
     *   · `?load=abc` → `+'abc'` = NaN → score() 每一项都是 NaN →
     *     比较函数永远返回 false → 排序退化成原数组序 → **不管答案是什么都推荐 S01/S02/S03**；
     *   · `?guide=9` / `?img=-1` → 越界值算进距离，推荐结果无声地错掉；
     *   · 页面上还把这串非法值原样印成「你的答案是 undefined」。
     * 现在逐个校验：必须是 0–2 的整数，否则整条重放作废（当作没带参数，让用户从第一题开始）。 */
    function pick(k) {
      if (!p.has(k)) return null;
      var raw = p.get(k);
      if (raw === null || raw === '') return null;
      if (!/^[0-2]$/.test(raw)) return null;   // 只接受单字符 0/1/2：挡掉 NaN、负数、小数、越界
      return +raw;
    }
    var vals = ORDER.map(pick);
    if (vals.some(function (v) { return v === null; })) return;   // 有一项不合法就整体不重放

    ORDER.forEach(function (k, i) {
      ans[k] = vals[i];
      var el = document.querySelector('.wz-q[data-q="' + k + '"] .wz-opts button[data-v="' + ans[k] + '"]');
      if (el) el.setAttribute('aria-pressed', 'true');
    });
    qs.forEach(function (el) { if (el) el.hidden = false; });
    render();
  })();
})();
