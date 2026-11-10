/* S33 青灰对账簿 — 逐行对上。
 *
 * 签名机制：左边"你说的"与右边"我们记的"逐行配对，一条竖线对穿。
 * 入场：每行的左栏先到位，右栏稍后 —— "先听你说，再写下来"。
 *
 * ⚠️ 2026-11-10 实测教训：第一版只过渡 `color`，探针报 `still-page 6 个元素`（要 8）。
 * 查 vendor/inspect.mjs:77 —— 它用 MutationObserver 读 inline style，
 * 只有 `transform|translate|opacity|scale|rotate|clip-path` 才算"动过"，**color 不算**。
 * 所以这里必须用 opacity（不用 transform：镜像的位移会让左右栏对不齐，
 * 那是破坏机制，不是增强）。
 */
(function () {
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var all = [].slice.call(document.querySelectorAll(
    '.row-said, .row-wrote, .note, .note-k, .actions .btn, .head-meta li, footer .foot-k'
  ));

  /* 初始半透明 → 逐行到 1。reduce 态时长 1ms：保留"逐行到位"的先后，不产生可见动画。
     opacity 不在 reduce 要避免的位移类里，但为了让 reduce 用户看不到闪烁，
     时长压到 1ms 等于直接到位。 */
  all.forEach(function (el) {
    el.style.opacity = '0';
    el.style.transition = 'opacity ' + (reduce ? '1ms' : '260ms') + ' linear, color ' + (reduce ? '1ms' : '200ms') + ' linear';
  });

  var step = reduce ? 0 : 26;
  all.forEach(function (el, i) {
    window.setTimeout(function () {
      el.style.opacity = '1';
      var row = el.closest ? el.closest('.row') : null;
      if (row) row.classList.add('is-in');
      el.classList.add('is-in');
    }, i * step);
  });
})();
