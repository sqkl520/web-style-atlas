// 铅灰油墨目录 · 透印层、渗墨与状态
(function () {
  'use strict';
  var rows = [].slice.call(document.querySelectorAll('.toc .e, .toc li'));
  var pages = document.querySelector('.pages');
  var ghost = document.querySelector('.ghost');
  var seamBar = document.getElementById('seep-bar');
  var seamText = document.getElementById('seep-text');
  var errBox = document.getElementById('state-error');
  var MIRROR_BUDGET = 46;               // 镜像文本上限：超过就在第 47 行截断
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  var NS = 'http://www.w3.org/2000/svg';

  // 目录行 → 纸背镜像文本。只取可见的目录行，不复制整篇正文。
  function buildGhost(extra) {
    var box = pages.getBoundingClientRect();
    var W = Math.round(box.width), H = Math.round(box.height);
    ghost.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    ghost.setAttribute('width', W);
    ghost.setAttribute('height', H);
    ghost.setAttribute('preserveAspectRatio', 'none');
    while (ghost.firstChild) ghost.removeChild(ghost.firstChild);
    var g = document.createElementNS(NS, 'g');
    g.setAttribute('transform', 'translate(' + W + ',1) scale(-1,1)'); // 1px 纸张厚度
    var items = [];
    rows.forEach(function (li) {
      var t = li.querySelector('.t') || li;
      var r = t.getBoundingClientRect();
      var cs = getComputedStyle(t);
      items.push({ left: Math.round(r.left - box.left), top: Math.round(r.top - box.top), text: t.textContent.trim(), size: parseFloat(cs.fontSize) });
    });
    if (extra) for (var k = 0; k < extra; k++) items.push({ left: 24, top: H - 60 - k * 28, text: '1953 年缺期：待补录', size: 16, missing: true });
    var overflow = items.length > MIRROR_BUDGET;
    items.slice(0, MIRROR_BUDGET).forEach(function (it, i) {
      var tx = document.createElementNS(NS, 'text');
      tx.setAttribute('x', it.left);
      tx.setAttribute('y', it.top + it.size * 0.82);
      tx.setAttribute('font-size', it.size);
      tx.setAttribute('class', 'g-line');
      tx.setAttribute('data-row', i);
      tx.textContent = it.text;
      g.appendChild(tx);
    });
    ghost.appendChild(g);
    return { overflow: overflow, lines: items.length };
  }

  function setInk(v) { document.body.setAttribute('data-ink', String(v)); if (pages) pages.style.setProperty('--ghost-o', (v / 100).toFixed(3)); }

  // 滚动：透印在 8% 到 14% 之间线性加深，页面中段最深
  function deepen() {
    if (!pages) return;
    if (reduce.matches) { setInk(8); return; }
    var box = pages.getBoundingClientRect();
    var p = (window.innerHeight / 2 - box.top) / Math.max(1, box.height);
    p = Math.max(0, Math.min(1, p));
    setInk(Math.round((8 + 6 * (1 - Math.abs(2 * p - 1))) * 10) / 10);
  }

  // 载入：纸色先铺满，油墨自左向右逐行渗入，每行 70ms，两步落墨
  function seep() {
    var total = rows.length;
    if (reduce.matches) { seamText.textContent = '已按减少动态偏好静态呈现：纸色与油墨一次性就位，只保留 120ms 不透明度切换。'; if (seamBar) seamBar.setAttribute('aria-valuenow', String(total)); document.documentElement.classList.remove('loading'); return; }
    document.documentElement.classList.add('loading');
    var i = 0;
    (function step() {
      i += 1;
      if (seamBar) seamBar.setAttribute('aria-valuenow', String(Math.min(i, total)));
      if (i < total) { seamText.textContent = '油墨自左向右渗入：第 ' + i + ' 行落墨，每行 70ms，两步落墨。'; setTimeout(step, 70); }
      else { seamText.textContent = '全 ' + total + ' 行落墨完毕。透印层当前 ' + document.body.getAttribute('data-ink') + '%，随滚动加深到 14%。'; document.documentElement.classList.remove('loading'); }
    })();
  }

  // 悬停：正面下划线 + 对应纸背行升到 14%
  rows.forEach(function (li, i) {
    li.style.setProperty('--i', String(i));
    li.addEventListener('mouseenter', function () {
      var gl = ghost.querySelector('[data-row="' + i + '"]');
      if (gl) gl.classList.add('hot');
    });
    li.addEventListener('mouseleave', function () {
      var gl = ghost.querySelector('[data-row="' + i + '"]');
      if (gl) gl.classList.remove('hot');
    });
    li.addEventListener('focusin', function () { var gl = ghost.querySelector('[data-row="' + i + '"]'); if (gl) gl.classList.add('hot'); });
    li.addEventListener('focusout', function () { var gl = ghost.querySelector('[data-row="' + i + '"]'); if (gl) gl.classList.remove('hot'); });
  });

  // 转场：换栏目时镜子层先行，正面滞后 60ms，错位 12px 后归位
  document.querySelectorAll('.bar-nav a').forEach(function (a) {
    a.addEventListener('click', function () {
      if (reduce.matches) return;
      ghost.classList.add('lead');
      setTimeout(function () { pages.classList.add('lag'); }, 60);
      setTimeout(function () { ghost.classList.remove('lead'); }, 260);
      setTimeout(function () { pages.classList.remove('lag'); }, 420);
    });
  });

  // 错误状态：把 1953 年缺的 3 期也算进目录 → 49 行，超过 46 行上限，第 47 行截断
  document.getElementById('rerun').addEventListener('click', function () {
    var res = buildGhost(3);
    if (res.overflow) {
      errBox.hidden = false;
      document.getElementById('err-text').textContent = '这页的透印层没生成：镜像文本共 ' + res.lines + ' 行，脚本在第 ' + (MIRROR_BUDGET + 1) + ' 行截断，错误码 MIR-47。先读正面，或者按页码直接翻到第 118 页。';
      errBox.setAttribute('role', 'alert');
      errBox.scrollIntoView({ block: 'center' });
      seamText.textContent = '透印层重算失败：镜像行数超限，已按 46 行截断。';
    } else {
      errBox.hidden = true;
      seamText.textContent = '透印层重算完成，共 ' + res.lines + ' 行镜像。';
    }
    deepen();
  });

  var first = buildGhost(0);
  if (first.overflow) { errBox.hidden = false; }
  deepen();
  seep();
  window.addEventListener('scroll', function () { window.requestAnimationFrame(deepen); }, { passive: true });
  window.addEventListener('resize', function () { buildGhost(0); deepen(); });
  reduce.addEventListener('change', function () { buildGhost(0); seep(); });
})();
