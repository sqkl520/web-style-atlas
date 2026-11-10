// Shared helpers for the lab overlays. Classic script (no modules): the bench is a plain page.
// Every variant re-arranges the *already rendered* detail DOM, so what gets measured is the real
// content, not a mock. Nothing under prototypes/ is touched.
(function () {
  'use strict';

  var FIELD_LABELS = [
    '一句话视觉定义', '美学家族与参考', '当前有效配色', '字体策略', '布局与网格',
    '可落地要点', '关键视觉元素', '动效与交互', '反 AI 味风险与规避', '适用场景', '设计师签名式怪癖',
  ];

  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }

  function fieldEls() { return $$('#d-body .fields > .field'); }
  function labelOf(f) { var dt = f.querySelector('dt'); return dt ? dt.textContent.trim() : ''; }
  function byLabel(map) {
    var out = {};
    fieldEls().forEach(function (f) { var l = labelOf(f); if (map[l] !== undefined) out[l] = f; });
    return out;
  }

  // Wait until app.js has painted a detail (fields present), then run cb once per open.
  var timer = null;
  function onDetail(cb) {
    var body = $('#d-body');
    if (!body) return;
    var run = function () {
      if (!$('#d-body .fields')) return;
      cb($('#d-body'), $('#detail'));
    };
    new MutationObserver(function () {
      clearTimeout(timer);
      timer = setTimeout(run, 0);
    }).observe(body, { childList: true });
    if ($('#d-body .fields')) run();
  }

  function el(tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }

  // A group whose summary *names every field inside it* — that is the discoverability payload:
  // a collapsed group is only honest if the user can read what it hides.
  function group(title, names, open, note) {
    var d = document.createElement('details');
    d.className = 'lab-grp';
    if (open) d.open = true;
    var s = document.createElement('summary');
    s.innerHTML = '<span class="lab-grp-t">' + title + '</span>' +
      (note ? '<span class="lab-grp-n">' + note + '</span>' : '') +
      '<span class="lab-grp-l">' + names.join(' · ') + '</span>';
    d.appendChild(s);
    return d;
  }

  function moveFields(host, data) {
    Object.keys(data).forEach(function (k) { if (data[k]) host.appendChild(data[k]); });
  }

  window.LAB = {
    FIELD_LABELS: FIELD_LABELS, $: $, $$: $$,
    fieldEls: fieldEls, labelOf: labelOf, byLabel: byLabel,
    onDetail: onDetail, el: el, group: group, moveFields: moveFields,
    ready: function () { document.documentElement.setAttribute('data-lab-ready', '1'); },
  };
})();
