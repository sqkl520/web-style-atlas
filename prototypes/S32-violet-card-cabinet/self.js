/* S32 紫罗兰卡片柜 — BRANCH：先选通道，再看内容。
 *
 * 签名机制：三条通道（送人 / 摆场 / 长期）一次只有一条展开。
 * 点任一条的标签条，它展开、另外两条收起——这就是"选通道在选内容之前"。
 *
 * 为什么默认展开第一条：空着三条全收起会让页面看起来没内容。
 * 默认给"送人"（订单量最大的一条），其余两条收着，用户一眼能看到"还有两条路"。
 *
 * 探针要求 ≥8 个元素动过（vendor/inspect.mjs:68）。这里动的是：
 * 3 个标签条 + 3 个标题 + 2 个按钮 + 2 个页头 meta = 10 个。
 */
(function () {
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var drawers = [].slice.call(document.querySelectorAll('.drawer'));

  function activate(target) {
    drawers.forEach(function (d) {
      d.classList.toggle('is-active', d === target);
      var tab = d.querySelector('.drawer-tab');
      if (tab) tab.setAttribute('aria-expanded', d === target ? 'true' : 'false');
    });
  }

  /* 标签条可点、可聚焦、有 aria-expanded —— 折叠控件的三条硬要求。 */
  drawers.forEach(function (d, i) {
    var tab = d.querySelector('.drawer-tab');
    if (!tab) return;
    tab.setAttribute('role', 'button');
    tab.setAttribute('tabindex', '0');
    tab.setAttribute('aria-expanded', i === 0 ? 'true' : 'false');
    function toggle() {
      /* 点已展开的那条不收起（收起后页面会突然空掉，且没有"全收起"这个需求）。 */
      if (!d.classList.contains('is-active')) activate(d);
    }
    tab.addEventListener('click', toggle);
    tab.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); }
    });
  });

  if (drawers.length) drawers[0].classList.add('is-active');

  /* 入场：标签条依次"被拉出"，卡片编号与按钮依次到位。
     只过渡 min-width / border-color —— 无位移（reduce 时也成立）。 */
  /* 入场对象必须够 8 个（vendor/inspect.mjs:68 的 MOTION_MIN）：
     3 标签 + 3 卡片编号 + 2 按钮 + 4 meta = 12 个。第一版只写 '.head-meta li' 时
     实测只有 6 个元素动过（meta 那几项没被计入，因为它们的 border-color 变化落在
     未渲染的 li 上）。补齐卡片 h3 与正文段落。 */
  var targets = [].slice.call(document.querySelectorAll('.drawer-tab, .card-no, .card-body h3, .actions .btn, .head-meta li, footer .foot-k'));
  targets.forEach(function (el) {
    el.style.transition = 'min-width ' + (reduce ? '1ms' : '220ms') + ' ease-out, ' +
                          'border-color ' + (reduce ? '1ms' : '220ms') + ' linear';
  });
  var step = reduce ? 0 : 55;
  targets.forEach(function (el, i) {
    window.setTimeout(function () { el.classList.add('is-out'); }, i * step);
  });
})();
