/* S35 灰蓝终端报 — 逐行输出。
 *
 * 签名机制：每条"命令 + 输出"像终端一样一行行打出来。
 * 入场：命令块从上到下依次淡入，每条之间 40ms。
 *
 * 探针（vendor/inspect.mjs:77）认 inline style 里的 opacity/transform。
 * 这里只用 opacity —— 位移会让"终端输出"变成"卡片飞入"，那不是这台机器的语气。
 */
(function () {
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var all = [].slice.call(document.querySelectorAll('.cmd, .note, .note-k, .actions .btn, .head-meta li, footer .foot-k'));

  all.forEach(function (el) {
    el.style.opacity = '0';
    el.style.transition = 'opacity ' + (reduce ? '1ms' : '240ms') + ' linear';
  });

  var step = reduce ? 0 : 40;
  all.forEach(function (el, i) {
    window.setTimeout(function () {
      el.style.opacity = '1';
      el.classList.add('is-in');
    }, i * step);
  });
})();
