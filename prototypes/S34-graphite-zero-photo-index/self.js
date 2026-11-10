/* S34 石墨零图索引 — 七块漂移。
 *
 * 签名机制：七块文字的左边缘各不相同（0/6/11/4/14/8/2%），不共享基线。
 * 入场：逐块淡入，但**每块的延迟不同**（26ms × 序号 + 块自身的重量偏差），
 * 让它们在时间上也"不齐"——空间与时间的不对齐是同一个意思。
 *
 * 探针（vendor/inspect.mjs:77）认 inline style 里的 opacity/transform。
 * 这里用 opacity，不用 transform：位移会把窄档的溢出风险带进来。
 */
(function () {
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var blocks = [].slice.call(document.querySelectorAll('.drift-block'));
  var extras = [].slice.call(document.querySelectorAll('.actions .btn, footer .foot-k, .declare p'));

  var all = blocks.concat(extras);
  all.forEach(function (el) {
    el.style.opacity = '0';
    el.style.transition = 'opacity ' + (reduce ? '1ms' : '300ms') + ' linear, border-color ' + (reduce ? '1ms' : '180ms') + ' linear';
  });

  /* 每块延迟 = 序号 × 26ms，再叠加一个由文本长度决定的偏移（0–40ms）——
     让"重的块沉得慢"这件事在时间上成立。 */
  var base = reduce ? 0 : 26;
  all.forEach(function (el, i) {
    var weight = Math.min(40, Math.floor((el.textContent || '').length / 12));
    var d = reduce ? 0 : i * base + weight;
    window.setTimeout(function () {
      el.style.opacity = '1';
      el.classList.add('is-in');
    }, d);
  });
})();
