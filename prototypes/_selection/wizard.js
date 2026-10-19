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

  function score(v) {
    var d = 0;
    ORDER.forEach(function (k) { var diff = v[k] - ans[k]; d += W[k] * diff * diff; });
    return d;
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

  var TIGHT = 0.75;                 // 认为"对上了"的阈值
  function diffs(v) {
    return ORDER.map(function (k) { return { k: k, d: Math.abs(v[k] - ans[k]) }; })
                .sort(function (a, b) { return a.d - b.d; });
  }
  function reasonsFor(v, wantMatch) {
    var list = diffs(v).filter(function (x) { return wantMatch ? x.d <= TIGHT : x.d > TIGHT; });
    if (!list.length) {
      return wantMatch ? '五项全部落在你要的档位里' : '五项都接近你要的档位——它被排到最后是因为别人更近';
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
    return '<li class="wz-card">' +
      '<p class="no">' + r.id + '</p>' +
      '<div>' +
        '<h3>' + r.cn + '<span class="wz-swatch">' + sw + '</span></h3>' +
        '<p class="wz-en">' + (r.en || '') + (r.fr ? '　·　' + r.fr + ' 型／' + r.structure : '') + '</p>' +
        '<p>' + (r.def || '').slice(0, 96) + '…</p>' +
        '<p class="wz-why">' + (isAvoid ? '为什么排除：' : '为什么是它：') + why + '</p>' +
        '<a href="./#index-' + r.id + '">到选型台看它的三档截图 →</a>' +
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
      '这套权重是本项目做得最弱的一环——**它是拍的，没有经过真人回放测试**。如果你觉得推荐不对，请把"排除"那三条当主要参考，它们更直接地说明了落差在哪。';

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
    var ok = ORDER.every(function (k) { return p.has(k) && p.get(k) !== ''; });
    if (!ok) return;
    ORDER.forEach(function (k) {
      ans[k] = +p.get(k);
      var el = document.querySelector('.wz-q[data-q="' + k + '"] .wz-opts button[data-v="' + ans[k] + '"]');
      if (el) el.setAttribute('aria-pressed', 'true');
    });
    qs.forEach(function (el) { if (el) el.hidden = false; });
    render();
  })();
})();
