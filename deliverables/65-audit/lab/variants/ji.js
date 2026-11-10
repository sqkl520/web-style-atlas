/* 己 · 只动预览器：把 .viewer 折成一条（summary 报"哪一档、第几张"），字段全部保持平铺。
   这是最便宜的实验：不改字段结构，只把首屏的 439px 还给字段。 */
(function () {
  'use strict';
  if (!window.LAB) return;

  LAB.onDetail(function (body) {
    if (body.querySelector('[data-lab="ji"]')) return;
    var viewer = body.querySelector('.viewer');
    if (!viewer) return;

    var vp = '1440×900';
    var pressed = viewer.querySelector('.viewer-tabs button[aria-pressed="true"]');
    if (pressed) vp = pressed.textContent.trim();
    var note = viewer.querySelector('.viewer-note');
    var noteText = note ? note.textContent.trim() : '';

    var d = document.createElement('details');
    d.className = 'lab-viewer';
    d.setAttribute('data-lab', 'ji');
    var s = document.createElement('summary');
    s.innerHTML = '<span class="lab-grp-t">原型预览</span>' +
      '<span class="lab-grp-n">' + vp + '　·　' + noteText.replace(/\s*·\s*第\s*/, ' · ') + '　·　点开看三档截图</span>';
    d.appendChild(s);
    var box = LAB.el('div', 'lab-viewer-body');
    viewer.parentNode.insertBefore(d, viewer);
    box.appendChild(viewer);
    d.appendChild(box);
    LAB.ready();
  });
})();
