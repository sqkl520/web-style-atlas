/* 丁 · 两个 tab：「看设计」/「看实现」。
   设计页：一句话定义、美学家族、配色、字体策略、关键视觉元素、动效、风险、适用场景、怪癖。
   实现页：布局与网格、可落地要点。
   tab 是真实按钮 + aria-selected，切换=显隐，默认停在「看设计」。 */
(function () {
  'use strict';
  if (!window.LAB) return;

  var DESIGN = ['一句话视觉定义', '美学家族与参考', '当前有效配色', '字体策略',
                '关键视觉元素', '动效与交互', '反 AI 味风险与规避', '适用场景', '设计师签名式怪癖'];
  var BUILD = ['布局与网格', '可落地要点'];

  LAB.onDetail(function (body) {
    if (body.querySelector('[data-lab="ding"]')) return;
    var dl = body.querySelector('.fields');
    if (!dl) return;
    var map = LAB.byLabel({});
    LAB.fieldEls().forEach(function (f) { map[LAB.labelOf(f)] = f; });

    var host = LAB.el('div', 'lab-d');
    host.setAttribute('data-lab', 'ding');
    var bar = LAB.el('div', 'lab-tabs');
    bar.setAttribute('role', 'tablist');

    var tabs = [{ k: 'design', t: '看设计', f: DESIGN }, { k: 'build', t: '看实现', f: BUILD }];
    tabs.forEach(function (tab) {
      var b = document.createElement('button');
      b.type = 'button'; b.textContent = tab.t;
      b.setAttribute('role', 'tab');
      b.addEventListener('click', function () {
        tabs.forEach(function (o) {
          o.pane.hidden = o !== tab;
          o.btn.setAttribute('aria-selected', o === tab ? 'true' : 'false');
        });
        document.getElementById('detail').scrollTop = 0;
      });
      tab.btn = b;
      bar.appendChild(b);
      tab.pane = LAB.el('div', 'lab-pane fields');
      tab.pane.id = 'lab-pane-' + tab.k;
      tab.f.forEach(function (l) { if (map[l]) tab.pane.appendChild(map[l]); });
      host.appendChild(tab.pane);
    });

    dl.replaceWith(host);
    host.insertBefore(bar, host.firstChild);
    tabs[0].btn.click();
    LAB.ready();
  });
})();
