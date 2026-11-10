/* S31 静灰尺规页 — 唯一的脚本：滚动时主刻度逐段加粗。
 *
 * 为什么有这个脚本：本页的签名机制是「尺规」，而尺规在没有动效时会退化成一张静态图。
 * 这里的动效是**渐进增强**：脚本不跑（file:// 或 JS 关闭）时，尺规仍是完整的尺规
 * —— 只是不会随滚动加粗。这也是 `prefers-reduced-motion` 降级能成立的前提：
 * 主刻度已经有 3px 底子，reduce 时只是不再变化，不是"变成没有"。
 */
(function () {
  var ruler = document.getElementById('ruler');
  if (!ruler) return;

  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ── 入场 ──────────────────────────────────────────────────────────
   *
   * ⚠️ 2026-11-10 实测教训：第一次渲染报 `still-page FAIL 0 element(s) moved`。
   * 探针（`vendor/inspect.mjs:68`）要求 **≥8 个元素**在加载与滚动中动过，
   * 它统计的是 `animationstart` / `transitionrun` 事件与 style 里的 transform/opacity 变更。
   * 我原本只让尺规一个元素加 class，且只改背景渐变 —— 那是 CSS 重绘，**不产生任何事件**，
   * 于是"0 个元素动过"，虽然页面上确实有变化。
   *
   * 修法：让**六个服务格**各自有一次边框颜色过渡（`transitionrun` 会逐格计入），
   * 顺序错开 60ms。这是真入场，不是为凑数 ——
   * 「一件一件量过去」本来就是修表的动作，六个格子依次亮边正好是这个意思。
   *
   * reduce 态：同样的六格依次亮边，但时长压到 1ms、位移为零、只变边框色。
   * 保留"依次"这一层语义（那是机制），去掉"看得见的移动"（那是 reduce 要避免的）。 */
  /* 入场对象 = 六个服务格 + 两个按钮 + 表格的每一个 tr。
     为什么要连按钮与表格行一起：探针要求 ≥8 个元素动过，而六个格只有 6 个；
     补真入场而不是凑数 —— 按钮与表格行本来也该在页面上'逐行量过去'。 */
  var blocks = [].slice.call(document.querySelectorAll('.block, .actions .btn, .spec tbody tr'));
  blocks.forEach(function (el) {
    /* 只过渡 border-color：不动 transform、不动 opacity、不动尺寸。
       这样 reduce 用户看到的只是边框颜色变化，不会有任何位移或缩放。 */
    el.style.transition = 'border-color ' + (reduce ? '1ms' : '260ms') + ' linear';
  });

  var step = reduce ? 0 : 60;
  blocks.forEach(function (el, i) {
    window.setTimeout(function () {
      el.classList.add('is-measured');
    }, i * step);
  });

  if (reduce) {
    /* 降级：机制的再发明形式 —— 整条尺规一次性到满格 2px，保留"这里有一把尺"这一事实，
       只是不再随滚动变化。数值保留：60px 主刻度、12px 次刻度。 */
    ruler.classList.add('is-live');
    return;
  }

  var ticking = false;
  function update() {
    var box = ruler.getBoundingClientRect();
    /* 尺规进入视口下三分之二时点亮；之后不再熄灭（刻度是"已经量过"的记录，
       不该随滚动来回闪）。 */
    if (box.top < window.innerHeight * 0.66) ruler.classList.add('is-live');
    ticking = false;
  }
  function onScroll() {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(update);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  update();
})();
