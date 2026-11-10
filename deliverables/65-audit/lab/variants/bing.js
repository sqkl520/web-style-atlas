/* 丙 · 字段分级：顶部摘要卡 + 核心 3 段展开 + 其余折叠。
   摘要卡只放"能不能用"这一层判断（一句话定义 / 底色 / 适合与不适合的首句），
   全文仍在下面的折叠组里，一个字都不删。 */
(function () {
  'use strict';
  if (!window.LAB) return;

  var CORE = ['一句话视觉定义', '当前有效配色', '适用场景'];

  LAB.onDetail(function (body) {
    if (body.querySelector('[data-lab="bing"]')) return;
    var dl = body.querySelector('.fields');
    if (!dl) return;
    var map = LAB.byLabel({
      '一句话视觉定义': 1, '美学家族与参考': 1, '当前有效配色': 1, '字体策略': 1,
      '布局与网格': 1, '可落地要点': 1, '关键视觉元素': 1, '动效与交互': 1,
      '反 AI 味风险与规避': 1, '适用场景': 1, '设计师签名式怪癖': 1,
    });
    function text(l) { var dd = map[l] && map[l].querySelector('dd'); return dd ? dd.textContent.trim() : ''; }

    var host = LAB.el('div', 'lab-c');
    host.setAttribute('data-lab', 'bing');

    // ── 摘要卡 ──
    var scenes = text('适用场景');
    var noIdx = scenes.search(/不适合[:：]/);
    var fit = noIdx > 0 ? scenes.slice(0, noIdx).replace(/[。；;]\s*$/, '') : scenes;
    var unfit = noIdx > 0 ? scenes.slice(noIdx).replace(/^不适合[:：]\s*/, '') : '';

    var brief = LAB.el('div', 'lab-brief');
    brief.innerHTML =
      '<h3>先看这三行，够判断就先别往下滚</h3>' +
      '<p>' + (text('一句话视觉定义') || '—') + '</p>' +
      '<dl>' +
        '<div><dt>配色</dt><dd>' + (text('当前有效配色') || '—') + '</dd></div>' +
        '<div><dt>适合</dt><dd>' + (fit || '—') + '</dd></div>' +
        (unfit ? '<div><dt>不适合</dt><dd>' + unfit + '</dd></div>' : '') +
      '</dl>';
    host.appendChild(brief);

    // ── 核心 3 段（展开，全文）──
    CORE.forEach(function (l) { if (map[l]) host.appendChild(map[l]); });

    // ── 其余折叠，summary 列出里面的字段名 ──
    var rest = [
      { k: '风格出处与字体', n: '为什么长这样、用了哪几款字', f: ['美学家族与参考', '字体策略'] },
      { k: '实现：排版骨架', n: '网格、栏宽、断点', f: ['布局与网格'] },
      { k: '实现：CSS 与性能预算', n: '作者写的落地要点、字体子集、LCP 预算', f: ['可落地要点'] },
      { k: '观感细节与动效', n: '关键视觉元素、动效与交互', f: ['关键视觉元素', '动效与交互'] },
      { k: '风险与签名怪癖', n: '哪里会滑向 AI 味、作者故意留的怪癖', f: ['反 AI 味风险与规避', '设计师签名式怪癖'] },
    ];
    rest.forEach(function (g) {
      var names = g.f.filter(function (l) { return map[l]; });
      if (!names.length) return;
      var d = LAB.group(g.k, names, false, g.n);
      var box = LAB.el('div', 'lab-grp-body');
      names.forEach(function (l) { box.appendChild(map[l]); });
      d.appendChild(box);
      host.appendChild(d);
    });

    dl.parentNode.insertBefore(host, dl);
    dl.parentNode.removeChild(dl);
    LAB.ready();
  });
})();
