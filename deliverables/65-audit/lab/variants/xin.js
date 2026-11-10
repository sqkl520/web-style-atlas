/* 辛 · 推荐方案（前导收缩 + 字段分级 + 折叠组标题列出全部字段名）
 *
 * 这一版是为了回答实测逼出来的那个问题：**只折字段没有用**。
 * 面板里字段正文从 1156px 开始，桌面首屏可用高度只有 900px（头部 88px 之后 812px），
 * 前导（复制按钮 + 预览器 + 打开原型 + 闸门 + 四处文案）本身占了 131.5% 的首屏。
 * 所以这里先压前导，再给字段分级。
 *
 * 具体动作：
 *  1. 预览器折成一条（默认收起，标题写着当前档位与"点开看三档截图"）→ 439px → 45px
 *  2. 「主张句/按钮/空状态/错误状态」这块 parts 移到「复制提示词」旁边，默认折叠
 *     （它们本来就是提示词的配料，放在提示词按钮下面才成组）
 *  3. 字段：3 段核心展开 + 3 组折叠，折叠组的 summary 逐字列出组内字段名
 */
(function () {
  'use strict';
  if (!window.LAB) return;

  var CORE = ['一句话视觉定义', '关键视觉元素', '适用场景'];

  LAB.onDetail(function (body) {
    if (body.querySelector('[data-lab="xin"]')) return;

    // ── 1. 前导收缩：预览器 + parts 折成两条 ────────────────────────────
    var viewer = body.querySelector('.viewer');
    if (viewer) {
      var vpBtn = viewer.querySelector('.viewer-tabs button[aria-pressed="true"]');
      var note = viewer.querySelector('.viewer-note');
      var d0 = document.createElement('details');
      d0.className = 'lab-viewer';
      d0.setAttribute('data-lab', 'xin-viewer');
      var s0 = document.createElement('summary');
      s0.innerHTML = '<span class="lab-grp-t">原型预览</span>' +
        '<span class="lab-grp-n">' + (vpBtn ? vpBtn.textContent.trim() : '1440×900') +
        '　·　' + (note ? note.textContent.trim().split('　·　')[0] : '') + '　·　点开看三档截图</span>';
      d0.appendChild(s0);
      var b0 = LAB.el('div', 'lab-viewer-body');
      viewer.parentNode.insertBefore(d0, viewer);
      b0.appendChild(viewer);
      d0.appendChild(b0);
    }

    var parts = body.querySelector('.parts');
    if (parts) {
      var d1 = document.createElement('details');
      d1.className = 'lab-viewer lab-parts';
      var s1 = document.createElement('summary');
      s1.innerHTML = '<span class="lab-grp-t">文案配件</span>' +
        '<span class="lab-grp-n">主张句 · 按钮 · 空状态 · 错误状态（已并进上面的提示词，点开单看）</span>';
      d1.appendChild(s1);
      var b1 = LAB.el('div', 'lab-viewer-body');
      parts.parentNode.insertBefore(d1, parts);
      b1.appendChild(parts);
      d1.appendChild(b1);
    }

    // ── 2. 字段分级 ────────────────────────────────────────────────────
    var dl = body.querySelector('.fields');
    if (!dl) return;
    var map = {};
    LAB.fieldEls().forEach(function (f) { map[LAB.labelOf(f)] = f; });
    function text(l) { var dd = map[l] && map[l].querySelector('dd'); return dd ? dd.textContent.trim() : ''; }
    function len(l) { return text(l).length; }

    var host = LAB.el('div', 'lab-x');
    host.setAttribute('data-lab', 'xin');

    // 结论卡：四行，都是"能不能用"这一层
    var scenes = text('适用场景');
    var noIdx = scenes.search(/不适合[:：]/);
    var fit = noIdx > 0 ? scenes.slice(0, noIdx).replace(/[。；;]\s*$/, '') : scenes;
    var unfit = noIdx > 0 ? scenes.slice(noIdx).replace(/^不适合[:：]\s*/, '') : '';

    var brief = LAB.el('div', 'lab-brief');
    brief.innerHTML =
      '<h3>够判断就停在这</h3>' +
      '<p>' + (text('一句话视觉定义') || '—') + '</p>' +
      '<dl>' +
        '<div><dt>配色</dt><dd>' + (text('当前有效配色') || '—') + '</dd></div>' +
        '<div><dt>适合</dt><dd>' + (fit || '—') + '</dd></div>' +
        (unfit ? '<div><dt>别用在这</dt><dd>' + unfit + '</dd></div>' : '') +
      '</dl>';
    host.appendChild(brief);

    CORE.forEach(function (l) { if (map[l]) host.appendChild(map[l]); });

    var GROUPS = [
      { k: '它为什么长这样', f: ['美学家族与参考', '字体策略'] },
      { k: '会动什么、哪里容易滑向 AI 味', f: ['动效与交互', '反 AI 味风险与规避', '设计师签名式怪癖'] },
      { k: '要动手做：网格、CSS 思路、性能预算', f: ['布局与网格', '可落地要点'] },
    ];
    GROUPS.forEach(function (g) {
      var names = g.f.filter(function (l) { return map[l]; });
      if (!names.length) return;
      var chars = names.reduce(function (a, l) { return a + len(l); }, 0);
      var d = LAB.group(g.k, names, false, names.length + ' 段 · 约 ' + chars + ' 字 · 点开读全文');
      var box = LAB.el('div', 'lab-grp-body');
      names.forEach(function (l) { box.appendChild(map[l]); });
      d.appendChild(box);
      host.appendChild(d);
    });

    dl.replaceWith(host);

    // 结论卡里的"下面还有什么"要如实：报出折叠组数与总字数
    var folded = GROUPS.reduce(function (a, g) { return a + g.f.filter(function (l) { return map[l]; }).length; }, 0);
    LAB.ready();
  });
})();
