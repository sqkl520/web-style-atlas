/* 本地使用记录（2026-11-11，Q4）
 *
 * ═══ 这个东西是什么，不是什么 ═════════════════════════════════════════
 *
 * 【是】用户自己的一个小本子：记下「我复制过哪几个案、什么时候」，
 *      存在**用户自己浏览器的 localStorage 里**，可以随时导出成文件、随时清空。
 *
 * 【不是】埋点。没有第三方请求、没有 server、没有任何数据离开这台机器 ——
 *      除非用户自己点了「导出」，然后**主动**把那个文件发给项目。
 *
 * ═══ 为什么需要它 ═════════════════════════════════════════════════════
 *
 * `00-MASTER-PLAN.md` 里所有"哪个案该归档"的决策都依赖一件事：
 * **哪个案真的被复制了**。而站点曾经完全不知道这件事。
 * Q4 的归档触发条件写的是"连续两个季度被复制次数排末位 5"——
 * 没有数据这一条永远无法计算。
 *
 * 计划给的另一条路是 Cloudflare Analytics，但那条与「数据不出本机」
 * 的自我描述冲突，需要业主单独批准。业主要求的是"零第三方方案"。
 *
 * ═══ 三条硬约束（缺一条这个方案就不成立）═══════════════════════════════
 *
 * 1. **必须让用户知道**。第一次记录时在界面上出现一行说明，不是藏在某处。
 *    偷偷记录然后让用户"导出"，等于把用户当数据源而不告诉他。
 * 2. **必须能一键清空**，且清空后界面上真的看不到任何记录。
 * 3. **必须能导出成一个人读得懂的文件**，用户能自己先看一眼再决定发不发。
 *
 * ═══ 为什么不用 IndexedDB ══════════════════════════════════════════════
 * 实测 localStorage 在 `http://` 与 `file://` 下都可用、配额 5100KB（见
 * `deliverables/78-northstar/_probe/_ls-test.mjs`）。一条记录约 107 字节，
 * 5.1 MB 能存 4.8 万条，而一年重度使用（每天 3 次）只有 750 条。
 * localStorage 是同步的、API 更简单，没有理由用 IndexedDB。
 *
 * ═══ 失败时怎么办 ═════════════════════════════════════════════════════
 * 隐私模式、存储被禁、配额满 —— 每一种都会让 write 抛错。
 * **一律静默降级**：记录失败不影响用户复制。使用记录是"顺便收集的副产品"，
 * 它的失败不该让主功能不可用。但 `available()` 会如实返回 false，
 * 界面上不显示那行说明（避免承诺一个做不到的事）。
 */
(function () {
  var KEY = 'wsa-usage-v1';
  var META_KEY = 'wsa-usage-notice-v1';   // 用户是否已经看过说明
  var MAX_ROWS = 2000;                     // 上限，超出时丢最旧的

  function available() {
    try {
      if (typeof localStorage === 'undefined' || !localStorage) return false;
      localStorage.setItem('__wsa_t__', '1');
      localStorage.removeItem('__wsa_t__');
      return true;
    } catch (e) {
      return false;
    }
  }

  function readAll() {
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) return [];
      var arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr : [];
    } catch (e) {
      /* 数据坏了（用户手改过、或版本迁移）不许让整个页面崩。
       * 返回空数组，下一次 write 会覆盖掉坏数据。 */
      return [];
    }
  }

  function writeAll(arr) {
    try {
      var cut = arr.length > MAX_ROWS ? arr.slice(arr.length - MAX_ROWS) : arr;
      localStorage.setItem(KEY, JSON.stringify(cut));
      return true;
    } catch (e) {
      return false;
    }
  }

  /** 记一笔。action：'copy' | 'copy-prov' | 'download' */
  function record(id, cn, action, extra) {
    if (!available()) return false;
    var arr = readAll();
    arr.push({
      id: id,
      cn: cn || '',
      action: action,
      at: new Date().toISOString(),
      withProv: !!(extra && extra.withProv),
      tool: (extra && extra.tool) || 'generic',
    });
    return writeAll(arr);
  }

  function summary() {
    var arr = readAll();
    var byId = {};
    for (var i = 0; i < arr.length; i++) {
      var r = arr[i];
      if (!byId[r.id]) byId[r.id] = { id: r.id, cn: r.cn, copies: 0, downloads: 0, first: r.at, last: r.at };
      var e = byId[r.id];
      if (r.action === 'download') e.downloads++; else e.copies++;
      if (r.at < e.first) e.first = r.at;
      if (r.at > e.last) e.last = r.at;
    }
    var rows = [];
    for (var k in byId) if (Object.prototype.hasOwnProperty.call(byId, k)) rows.push(byId[k]);
    rows.sort(function (a, b) { return b.copies + b.downloads - (a.copies + a.downloads); });
    return { total: arr.length, cases: rows.length, rows: rows, raw: arr };
  }

  /** 导出成 Markdown —— 用户能先自己读一遍再决定发不发。 */
  function toMarkdown() {
    var s = summary();
    var L = [];
    L.push('# 我的选型台使用记录');
    L.push('');
    L.push('> 这份文件是**你自己浏览器里存的那份记录**导出来的。它只在你的机器上，');
    L.push('> 项目方没有收到过任何东西。要不要发给项目，由你决定。');
    L.push('');
    if (!s.total) {
      L.push('（没有任何记录）');
      return L.join('\n');
    }
    L.push('共 ' + s.total + ' 次操作，涉及 ' + s.cases + ' 个方案。');
    L.push('');
    L.push('| 案号 | 中文名 | 复制 | 下载 | 首次 | 最近 |');
    L.push('| --- | --- | --- | --- | --- | --- |');
    for (var i = 0; i < s.rows.length; i++) {
      var r = s.rows[i];
      L.push('| ' + r.id + ' | ' + (r.cn || '—') + ' | ' + r.copies + ' | ' + r.downloads + ' | ' +
        r.first.slice(0, 10) + ' | ' + r.last.slice(0, 10) + ' |');
    }
    L.push('');
    L.push('---');
    L.push('');
    L.push('下面这一段是原始记录，只在你需要排查时看：');
    L.push('');
    L.push('```json');
    L.push(JSON.stringify(s.raw, null, 1));
    L.push('```');
    return L.join('\n');
  }

  function clear() {
    try { localStorage.removeItem(KEY); return true; } catch (e) { return false; }
  }

  function seenNotice() {
    try { return localStorage.getItem(META_KEY) === '1'; } catch (e) { return true; }
  }
  function markNotice() {
    try { localStorage.setItem(META_KEY, '1'); } catch (e) { /* 记不住就算了 */ }
  }

  window.USAGE = {
    available: available,
    record: record,
    summary: summary,
    toMarkdown: toMarkdown,
    clear: clear,
    seenNotice: seenNotice,
    markNotice: markNotice,
  };
})();
