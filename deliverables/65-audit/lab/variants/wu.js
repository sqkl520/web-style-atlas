/* 戊 · 推荐组合：先给"够判断就停"的结论卡 → 3 个核心字段展开 → 其余按"你接下来要干什么"折叠，
   折叠条的 summary 把里面藏着的字段名逐字列出，并给出字数与字段数。
   与丙的区别：戊的摘要卡只做判断用（不是全文照搬），折叠组按**任务**命名而不是按内容类型命名，
   并且把「实现」这一层压到最后一组（用户读到时已经决定"就是这个案"了）。 */
(function () {
  'use strict';
  if (!window.LAB) return;

  var CORE = ['一句话视觉定义', '关键视觉元素', '适用场景'];

  LAB.onDetail(function (body, detail) {
    if (body.querySelector('[data-lab="wu"]')) return;
    var dl = body.querySelector('.fields');
    if (!dl) return;
    var map = LAB.byLabel({
      '一句话视觉定义': 1, '美学家族与参考': 1, '当前有效配色': 1, '字体策略': 1,
      '布局与网格': 1, '可落地要点': 1, '关键视觉元素': 1, '动效与交互': 1,
      '反 AI 味风险与规避': 1, '适用场景': 1, '设计师签名式怪癖': 1,
    });
    function text(l) { var dd = map[l] && map[l].querySelector('dd'); return dd ? dd.textContent.trim() : ''; }
    function len(l) { return text(l).length; }

    var host = LAB.el('div', 'lab-w');
    host.setAttribute('data-lab', 'wu');

    // ── 结论卡：四行，每行都是"能不能用"这一层的判断 ──
    var scenes = text('适用场景');
    var noIdx = scenes.search(/不适合[:：]/);
    var fit = noIdx > 0 ? scenes.slice(0, noIdx).replace(/[。；;]\s*$/, '') : scenes;
    var unfit = noIdx > 0 ? scenes.slice(noIdx).replace(/^不适合[:：]\s*/, '') : '';
    var brief = LAB.el('div', 'lab-brief');
    brief.innerHTML =
      '<h3>够判断就停在这里</h3>' +
      '<p>' + (text('一句话视觉定义') || '—') + '</p>' +
      '<dl>' +
        '<div><dt>配色</dt><dd>' + (text('当前有效配色') || '—') + '</dd></div>' +
        '<div><dt>适合</dt><dd>' + (fit || '—') + '</dd></div>' +
        (unfit ? '<div><dt>别用在这</dt><dd>' + unfit + '</dd></div>' : '') +
      '</dl>' +
      '<p class="lab-note">下面三段是全文：视觉定义、关键视觉元素、适用场景。再往下是按任务分的三组，收起时标题里写着里面有什么。</p>';
    host.appendChild(brief);

    CORE.forEach(function (l) { if (map[l]) host.appendChild(map[l]); });

    var GROUPS = [
      { k: '它为什么长这样', n: '美学家族与参考对象、字体策略', f: ['美学家族与参考', '字体策略'] },
      { k: '会动什么、哪里容易滑向 AI 味', n: '动效与交互、反 AI 味风险与规避、作者故意留的怪癖', f: ['动效与交互', '反 AI 味风险与规避', '设计师签名式怪癖'] },
      { k: '要动手做：网格、CSS 思路、性能预算', n: '布局与网格、可落地要点（含字体子集与 LCP 预算）', f: ['布局与网格', '可落地要点'] },
    ];
    GROUPS.forEach(function (g) {
      var names = g.f.filter(function (l) { return map[l]; });
      if (!names.length) return;
      var chars = names.reduce(function (a, l) { return a + len(l); }, 0);
      var d = LAB.group(g.k, names, false, g.n + '　·　' + names.length + ' 段 / 约 ' + chars + ' 字');
      var box = LAB.el('div', 'lab-grp-body');
      names.forEach(function (l) { box.appendChild(map[l]); });
      d.appendChild(box);
      host.appendChild(d);
    });

    dl.replaceWith(host);
    LAB.ready();
  });
})();
