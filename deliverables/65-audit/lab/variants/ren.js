/* 壬 · 最终推荐方案
 *
 * 实测逼出的三条约束（见 report）：
 *  1. 字段正文原本从 1156px 开始，桌面首屏可用只有 812px（头部 88px 之后）——
 *     **只折字段不可能让任何字段进首屏**（甲/丙/戊实测首屏字段数都是 0）。
 *     所以必须同时压前导。
 *  2. 前导里最大的一块是预览器 439px，其次是 parts 300px。
 *  3. 结论卡不能重复「一句话视觉定义」——丙/戊/辛 都在这上面白花了 150px+。
 *
 * 这一版的动作：
 *  预览器 → 一条 62px 的条；parts → 折叠并移到字段之后（它是提示词的配料，不是"读"的东西）；
 *  打开原型 + 闸门 → 合并成一条 50px 的元信息行；
 *  字段 → 一句话视觉定义 + 配色/适合（合为一块）+ 关键视觉元素 展开，其余 3 组折叠。
 */
(function () {
  'use strict';
  if (!window.LAB) return;

  LAB.onDetail(function (body) {
    if (body.querySelector('[data-lab="ren"]')) return;

    var headH = document.querySelector('.detail-head').getBoundingClientRect().height;

    // ── 1. 预览器 → 一条 ────────────────────────────────────────────────
    var viewer = body.querySelector('.viewer');
    if (viewer) {
      var vpBtn = viewer.querySelector('.viewer-tabs button[aria-pressed="true"]');
      var note = viewer.querySelector('.viewer-note');
      var d0 = document.createElement('details');
      d0.className = 'lab-viewer';
      var s0 = document.createElement('summary');
      s0.innerHTML = '<span class="lab-grp-t">原型预览</span>' +
        '<span class="lab-grp-n">' + (vpBtn ? vpBtn.textContent.trim() : '') + '　·　' +
        (note ? note.textContent.trim().split('　·　').slice(0, 2).join('　·　') : '') + '　·　点开看三档截图</span>';
      d0.appendChild(s0);
      var b0 = LAB.el('div', 'lab-viewer-body');
      viewer.parentNode.insertBefore(d0, viewer);
      b0.appendChild(viewer);
      d0.appendChild(b0);
    }

    // ── 2. 打开原型 + 闸门 → 一条元信息行 ───────────────────────────────
    var proto = body.querySelector('.open-proto');
    var gate = body.querySelector('.gate-box');
    if (proto && gate) {
      var meta = LAB.el('div', 'lab-meta');
      var line = LAB.el('div', 'lab-meta-line');
      line.appendChild(proto);
      var tags = gate.querySelector('.gate-line');
      var rules = gate.querySelector('.gate-rules');
      if (tags) line.appendChild(tags);
      meta.appendChild(line);
      if (rules) {
        var dg = document.createElement('details');
        dg.className = 'lab-meta-more';
        var sg = document.createElement('summary');
        var g = gate.querySelectorAll('.gate-line .tag');
        var failN = 0, warnN = 0;
        gate.querySelectorAll('.tag').forEach(function (t) {
          if (/FAIL/.test(t.textContent)) failN = t.textContent.replace(/\D/g, '');
          if (/WARN/.test(t.textContent)) warnN = t.textContent.replace(/\D/g, '');
        });
        sg.textContent = '闸门明细：FAIL ' + (failN || 0) + ' / WARN ' + (warnN || 0) + '　点开看规则与报告时间';
        dg.appendChild(sg);
        dg.appendChild(rules);
        meta.appendChild(dg);
      }
      gate.parentNode.insertBefore(meta, gate);
      gate.parentNode.removeChild(gate);
    }

    // ── 3. 字段分级 ────────────────────────────────────────────────────
    var dl = body.querySelector('.fields');
    if (!dl) return;
    var map = {};
    LAB.fieldEls().forEach(function (f) { map[LAB.labelOf(f)] = f; });
    function text(l) { var dd = map[l] && map[l].querySelector('dd'); return dd ? dd.textContent.trim() : ''; }
    function len(l) { return text(l).length; }

    var host = LAB.el('div', 'lab-r');
    host.setAttribute('data-lab', 'ren');

    // 一句话视觉定义：保留它作为**字段本体**，不另写一份摘要（避免重复）
    if (map['一句话视觉定义']) host.appendChild(map['一句话视觉定义']);

    // 配色 + 适合/不适合：从两个字段里抽出"判断要用的那一行"，做成紧凑块
    var scenes = text('适用场景');
    var noIdx = scenes.search(/不适合[:：]/);
    var fit = noIdx > 0 ? scenes.slice(0, noIdx).replace(/[。；;]\s*$/, '') : scenes;
    var unfit = noIdx > 0 ? scenes.slice(noIdx).replace(/^不适合[:：]\s*/, '') : '';
    var facts = LAB.el('dl', 'lab-facts');
    facts.innerHTML =
      '<div><dt>配色</dt><dd>' + (text('当前有效配色') || '—') + '</dd></div>' +
      '<div><dt>适合</dt><dd>' + (fit || '—') + '</dd></div>' +
      (unfit ? '<div><dt>别用在这</dt><dd>' + unfit + '</dd></div>' : '');
    host.appendChild(facts);

    // 关键视觉元素：展开（这是"看得见什么"，判断风格的主体）
    if (map['关键视觉元素']) host.appendChild(map['关键视觉元素']);

    var GROUPS = [
      { k: '它为什么长这样', n: '出自哪个流派、参考了谁、用了哪几款字', f: ['美学家族与参考', '字体策略'] },
      { k: '会动什么、哪里会滑向 AI 味', n: '动效机制、最容易做坏的地方、作者故意留的怪癖', f: ['动效与交互', '反 AI 味风险与规避', '设计师签名式怪癖'] },
      { k: '要动手做：网格、CSS 思路、性能预算', n: '栏宽断点、CSS 实现要点、字体子集与 LCP 预算', f: ['布局与网格', '可落地要点'] },
      { k: '完整适用场景原文', n: '含"不适合"整段与限定条件（上面已摘要，这里是一字不改的原文）', f: ['适用场景'] },
    ];
    GROUPS.forEach(function (g) {
      var names = g.f.filter(function (l) { return map[l]; });
      if (!names.length) return;
      var chars = names.reduce(function (a, l) { return a + len(l); }, 0);
      var d = LAB.group(g.k, names, false, g.n + '　·　' + names.length + ' 段 / 约 ' + chars + ' 字');
      var box = LAB.el('div', 'lab-grp-body');
      names.forEach(function (l) { box.appendChild(map[l]); });
      d.appendChild(box);
      host.appendChild(d);
    });

    // ── 4. parts 折到最后（提示词的配料，读的时候不用看）────────────────
    var parts = body.querySelector('.parts');
    var tail = null;
    if (parts) {
      tail = document.createElement('details');
      tail.className = 'lab-viewer lab-parts';
      var s1 = document.createElement('summary');
      s1.innerHTML = '<span class="lab-grp-t">提示词里的文案配件</span>' +
        '<span class="lab-grp-n">主张句 · 按钮 · 空状态 · 错误状态　·　已经并进上面的「复制 AI 提示词」，这里只供单看</span>';
      tail.appendChild(s1);
      var b1 = LAB.el('div', 'lab-viewer-body');
      parts.parentNode.insertBefore(tail, parts);
      b1.appendChild(parts);
      tail.appendChild(b1);
    }

    dl.replaceWith(host);
    if (tail) host.appendChild(tail);

    LAB.ready();
  });
})();
