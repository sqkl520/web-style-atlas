// r5-smalltext.mjs — 复现 probe.mjs 的 smallText 判据（size<13 且 chars>=12 且不在 [data-ui]/code 里）
// 输出每一处的选择器 / 字号 / 字符数，用来核对「30 个 <13px 文字块」到底是哪些。
import { Browser } from '../../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..', '..');
const PAGE = 'file:///' + join(ROOT, 'prototypes', '_selection', 'index.html').replace(/\\/g, '/');

const EXPR = `
(function () {
  var out = [];
  var all = document.querySelectorAll('body *');
  Array.prototype.forEach.call(all, function (el) {
    var cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') return;
    var r = el.getBoundingClientRect();
    if (!r.width || !r.height) return;
    var fs = parseFloat(cs.fontSize);
    if (fs >= 13) return;
    if (el.closest('[data-ui]') || el.closest('pre') || el.closest('code') || el.closest('kbd')) return;
    // 只算"自己有直属文本"的元素（与 probe 的 texts 采集口径大致一致）
    var direct = '';
    Array.prototype.forEach.call(el.childNodes, function (n) { if (n.nodeType === 3) direct += n.nodeValue; });
    var t = (direct || '').replace(/\\s+/g, ' ').trim();
    if (t.length < 12) return;
    var c = (el.getAttribute('class') || '').trim();
    out.push({
      el: el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (c ? '.' + c.split(/\\s+/).join('.') : ''),
      fs: fs, chars: t.length, text: t.slice(0, 40)
    });
  });
  // 汇总
  var bySel = {};
  out.forEach(function (o) { bySel[o.el] = (bySel[o.el] || 0) + 1; });
  return JSON.stringify({ count: out.length, bySel: bySel, samples: out.slice(0, 8) }, null, 1);
})()
`;

const browser = await Browser.launch();
try {
  for (const [w, h] of [[1440, 900], [768, 1024], [390, 844]]) {
    const page = await browser.newPage({ width: w, height: h, mobile: w <= 620 });
    await page.setViewport({ width: w, height: h, mobile: w <= 620 });
    await page.goto(PAGE, { settleMs: 1200 });
    await page.eval(`(async () => { if (document.fonts && document.fonts.ready) { try { await document.fonts.ready; } catch (e) {} } return 1; })()`);
    console.log(`\n===== ${w}x${h} =====`);
    console.log(await page.eval(EXPR));
    await page.close();
  }
} finally { await browser.close(); }
