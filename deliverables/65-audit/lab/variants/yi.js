/* 乙 · 顶部字段跳转条（11 个锚点，sticky 吸附在头部之下），字段全部保持展开。
   这是纯"导航"方案：不减少内容高度，只减少"找不到"的成本。 */
(function () {
  'use strict';
  if (!window.LAB) return;

  LAB.onDetail(function (body, detail) {
    if (body.querySelector('[data-lab="yi"]')) return;
    var dl = body.querySelector('.fields');
    if (!dl) return;
    var fields = LAB.fieldEls();
    if (!fields.length) return;

    var nav = LAB.el('div', 'lab-nav');
    nav.setAttribute('data-lab', 'yi');
    nav.setAttribute('role', 'navigation');
    nav.setAttribute('aria-label', '字段跳转');

    var headH = document.querySelector('.detail-head').getBoundingClientRect().height;

    fields.forEach(function (f, i) {
      var id = 'lab-f-' + i;
      f.id = id;
      var b = document.createElement('button');
      b.type = 'button';
      b.innerHTML = '<span class="n">' + (i + 1) + '</span>' + LAB.labelOf(f);
      b.addEventListener('click', function () {
        var navH = nav.getBoundingClientRect().height;
        detail.scrollTop = f.offsetTop - headH - navH - 2;
      });
      nav.appendChild(b);
    });

    nav.style.top = headH + 'px';
    dl.parentNode.insertBefore(nav, dl);
    LAB.ready();
  });
})();
