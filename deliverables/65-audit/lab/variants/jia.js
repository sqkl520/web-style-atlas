/* 甲 · 字段分组 + 折叠（字段本身仍平铺，不拆）
   5 组，2 组默认展开。折叠组的 summary 列出组内全部字段名 —— 收起不等于藏起来。 */
(function () {
  'use strict';
  if (!window.LAB) return;

  var OPEN = { '观感': 1, '版式': 1 };

  var GROUPS = [
    { k: '观感', n: '（看它是什么风格）', f: ['一句话视觉定义', '美学家族与参考', '当前有效配色', '字体策略'] },
    { k: '版式', n: '（怎么排的）', f: ['布局与网格', '关键视觉元素'] },
    { k: '实现细节', n: '（怎么用 CSS 做出来、性能预算、字体子集）', f: ['可落地要点'] },
    { k: '动效与风险', n: '（会动什么、哪里会滑向 AI 味）', f: ['动效与交互', '反 AI 味风险与规避'] },
    { k: '用在哪儿', n: '（适合与不适合、作者的签名怪癖）', f: ['适用场景', '设计师签名式怪癖'] },
  ];

  LAB.onDetail(function (body) {
    if (body.querySelector('[data-lab="jia"]')) return;
    var dl = body.querySelector('.fields');
    if (!dl) return;
    var els = LAB.fieldEls();
    var map = {};
    els.forEach(function (f) { map[LAB.labelOf(f)] = f; });
    var host = LAB.el('div', 'lab-groups');
    host.setAttribute('data-lab', 'jia');

    GROUPS.forEach(function (g) {
      var names = g.f.filter(function (l) { return map[l]; });
      if (!names.length) return;
      var d = LAB.group(g.k, names, !!OPEN[g.k], g.n);
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
