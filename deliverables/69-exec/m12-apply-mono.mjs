/* mono 修复：把「等宽字体承载的字面数据」包进 <code>，并加一条让 code 完全继承的 CSS。
 *
 * 只处理「等宽字体 + 不在 code 里 + 有文本」的叶子元素（m01 的清单），不碰结构性元素。
 * 采用**包裹式**（保留原来的 span/td/dd 与 class，只在里面套一层 <code>）而不是替换式，
 * 理由：三个案子的排版全靠 .p/.k/.code/.depth/.mono/.face-data/.slot__t/.lockbar__no/
 * .excl__no/.warn__no 这些 class 选择器；替换元素会把这些规则的匹配对象一起换掉，
 * 而包裹式只是把文本节点下移一层，所有既有选择器照旧命中。
 *
 * 每处替换都断言命中数，数目不对就整体回滚 —— 不做"部分成功"。
 */
import { readFileSync, writeFileSync } from 'node:fs';

const ROOT = 'D:/Web/style/prototypes/';
const dryRun = process.argv.includes('--dry');

const CSS_BLOCK = `\n/* 页码、日期、分类号、时刻、实测值都是可核对的字面数据，按全库惯例放进 <code>\n   （其余 26 案、合计 3048 处是同一做法）。<code> 从 UA 样式表里只带来一条\n   font-family:monospace（Chrome 实测，见 deliverables/69-exec/EXEC-mono-empty.md §3.2），\n   下面把这条与其余可能因引擎而异的默认值一并还原成继承值：换标记，不换排版。 */\ncode{font-family:inherit;font-size:inherit;font-weight:inherit;font-style:inherit;letter-spacing:inherit;line-height:inherit;color:inherit;background:none;padding:0;border:0;white-space:inherit}\n`;

/** 把 <tag ...class含 cls>content</tag> 的内容包进 <code>，返回 {html, n} */
function wrapByClass(html, tag, clsRe, expect) {
  let n = 0;
  const out = html.replace(
    new RegExp(`<(${tag})((?:\\s[^>]*)?\\bclass="${clsRe}"(?:\\s[^>]*)?)>([^<]+)</\\1>`, 'g'),
    (m, t, attrs, inner) => {
      n++;
      return `<${t}${attrs}><code>${inner}</code></${t}>`;
    },
  );
  if (n !== expect) throw new Error(`<${tag}> class~=${clsRe}: 期望 ${expect} 处，实际 ${n} 处`);
  return out;
}

const jobs = [];

/* ── S07 铅灰油墨目录 ────────────────────────────────────────────────
 * m01 实测：46×span.p（页码）、46×span.k（分类号）、6×folio span（竖排页码带）、
 * 3×span.code（缺期日期）、2×dd（辑号 46 / 编目 2026-02）。合计 103 处 = 327 字符。
 * 不包：.rng（1938–1952、1 至 462）—— 它们被 .colophon .rng{font-family:var(--text)}
 * 改成正文体，本来就不是等宽（m01 的 5 组里没有它们，这是一次交叉验证）。 */
jobs.push({
  id: 'S07-slate-ink-contents',
  expectCode: 103,
  edit(html) {
    let h = html;
    h = wrapByClass(h, 'span', 'p', 46);
    h = wrapByClass(h, 'span', 'k', 46);
    h = wrapByClass(h, 'span', 'code', 3);
    h = wrapByClass(h, 'dd', '(?:colophon-dd-never-matches)', 0); // 占位，下面单独处理无 class 的 dd
    // 无 class 的 <dd>46</dd> / <dd>2026-02</dd>：只这两个，且都在 dl.colophon 里
    let ddN = 0;
    h = h.replace(/<div><dt>(辑号|编目)<\/dt><dd>([^<]+)<\/dd><\/div>/g, (m, k, v) => { ddN++; return `<div><dt>${k}</dt><dd><code>${v}</code></dd></div>`; });
    if (ddN !== 2) throw new Error(`S07 无 class 的 dd：期望 2 处，实际 ${ddN} 处`);
    // folio：竖排页码带里的 6 个 span（无 class）
    let folN = 0;
    h = h.replace(/(<div class="folio"[^>]*>)([\s\S]*?)(<\/div>)/, (m, open, body, close) => {
      const nb = body.replace(/<span>(第 \d+ 页)<\/span>/g, (mm, t) => { folN++; return `<span><code>${t}</code></span>`; });
      return open + nb + close;
    });
    if (folN !== 6) throw new Error(`S07 .folio span：期望 6 处，实际 ${folN} 处`);
    return h;
  },
});

/* ── S13 盲压公函 ────────────────────────────────────────────────────
 * m01 实测：7×span.depth（条款盲压深度）、11×span.mono（实测值）、
 * 10×td.mono（附件目录压深）、1×span.mono#azimuthOut。合计 29 处 = 147 字符。
 *
 * ⚠ #azimuthOut 必须单独处理，而且 **id 要挪到 <code> 上**：
 *   内联脚本写 `azimuthOut.textContent = to + '°'`。若 id 留在 span 上，
 *   一次交互就会把 <code> 子节点整个替换掉 —— 于是「点过签发按钮之后等宽又跑到 code 外」，
 *   闸门在初始态看不出来，但用户看到的是坏掉的页面。把 id 放到 code 上，
 *   textContent 写进 code 内部，交互后标记依旧成立。
 */
jobs.push({
  id: 'S13-blind-debossed-dispatch',
  expectCode: 29,
  edit(html) {
    let h = html;
    const azBefore = `<span class="mono" id="azimuthOut">135°</span>`;
    if (!h.includes(azBefore)) throw new Error('S13 找不到 <span class="mono" id="azimuthOut">135°</span>');
    h = h.replace(azBefore, `<span class="mono"><code id="azimuthOut">135°</code></span>`);
    h = wrapByClass(h, 'span', 'depth', 7);
    h = wrapByClass(h, 'span', 'mono', 11);
    h = wrapByClass(h, 'td', 'mono', 10);
    return h;
  },
});

/* ── S21 联锁释放簿 ──────────────────────────────────────────────────
 * m01 实测：51×td.face-data、6×span.slot__t.face-data、15×span.lockbar__no.face-data、
 * 3×dd.face-data、3×th.face-data、4×span.face-data.excl__no、1×span.warn__no.face-data。
 * 合计 83 处 = 228 字符。
 * 其中 4 个 .excl__no 在隐藏的 <ul hidden> 里（getBoundingClientRect 宽 0），闸门初始态
 * 不量它们；但用户展开清单后它们就在 code 外了，所以照样包。
 */
jobs.push({
  id: 'S21-interlocking-release-book',
  expectCode: 83,
  edit(html) {
    let n = 0;
    const out = html.replace(
      /<(td|th|dd|span)((?:\s[^>]*)?\bclass="[^"]*\bface-data\b[^"]*"(?:\s[^>]*)?)>([^<]+)<\/\1>/g,
      (m, t, attrs, inner) => { n++; return `<${t}${attrs}><code>${inner}</code></${t}>`; },
    );
    if (n !== 83) throw new Error(`S21 face-data：期望 83 处，实际 ${n} 处`);
    return out;
  },
});

const report = [];
for (const job of jobs) {
  const htmlPath = ROOT + job.id + '/index.html';
  const cssPath = ROOT + job.id + '/style.css';
  const html0 = readFileSync(htmlPath, 'utf8');
  const css0 = readFileSync(cssPath, 'utf8');

  const html1 = job.edit(html0);
  const codeN = (html1.match(/<code\b/g) || []).length;
  if (codeN !== job.expectCode) throw new Error(`${job.id}: <code> 总数期望 ${job.expectCode}，实际 ${codeN}`);
  if (css0.includes('code{font-family:inherit')) throw new Error(`${job.id}: style.css 里已经有这条规则，不重复加`);
  const css1 = css0.replace(/\s*$/, '\n') + CSS_BLOCK;

  // 结构完整性：标签计数不变（<code> 是新增的，其他应一模一样）
  const count = (s, t) => (s.match(new RegExp('<' + t + '\\b', 'g')) || []).length;
  for (const t of ['span', 'td', 'th', 'dd', 'div', 'li', 'a']) {
    if (count(html1, t) !== count(html0, t)) throw new Error(`${job.id}: <${t}> 数量变了`);
  }

  report.push({ id: job.id, codeBefore: (html0.match(/<code\b/g) || []).length, codeAfter: codeN, htmlGrew: html1.length - html0.length, cssGrew: css1.length - css0.length });

  if (!dryRun) {
    writeFileSync(htmlPath, html1, 'utf8');
    writeFileSync(cssPath, css1, 'utf8');
  }
}

console.log((dryRun ? '[dry] ' : '') + '完成：');
for (const r of report) console.log(`  ${r.id}: <code> ${r.codeBefore} → ${r.codeAfter}，html +${r.htmlGrew}B，css +${r.cssGrew}B`);
