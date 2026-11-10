/* 验收脚本（取证工具，不是交付物本体）：任务 2 / 3 的浏览器实测。1440×900，CDP 真开页面。
 *
 * 量三件事：
 *   A. 默认（收起）状态下「去 AI 味审查点」折叠块的 top 与「反 AI 味风险与规避」的 top
 *      —— 判据是 foldTop < riskTop（任务 3）。
 *   B. 把折叠块在 DOM 里挪回 risk 之后（等价于改动前的顺序），再量一次 top
 *      —— 这是"位置调整前后"的对照，同一页面、同一字体、同一轮渲染，差异只来自顺序。
 *   C. 展开折叠块后 body 的字符数（S13 期望 306，且不含「反套路改造三指标」）
 *      —— 证明 AUDIT_CUT_AT 删干净了、数据层已是终态（任务 2）。
 *
 * 为什么 B 用 DOM 换序而不是 git stash：改前那版 app.js 里 audit 在 risk 之后，
 * 但还有 AUDIT_CUT_AT（会改字数）。两个变量混在一起，量出来的差就不只是"位置"了。
 * 只挪 DOM 不动文本，才能把"位置"这一件事单独量出来。
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { Browser, sleep } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { startServer } from '../65-audit/lab/serve.mjs';

const OUT = resolve('deliverables/65-exec');
mkdirSync(join(OUT, 'shots-panel'), { recursive: true });
const PICK = ['S01', 'S07', 'S13'];

const srv = await startServer(resolve('.'));
const browser = await Browser.launch();
const page = await browser.newPage({ width: 1440, height: 900 });
const rows = [];
try {
  await page.goto(srv.origin + '/prototypes/_selection/index.html', { settleMs: 2000 });

  for (const id of PICK) {
    await page.eval(`(() => { const r = document.querySelector('.row[data-id="${id}"]'); if (r) r.click(); })()`);
    await sleep(800);

    const row = await page.eval(`(() => {
      const detail = document.getElementById('detail');
      const dr = detail.getBoundingClientRect();
      const abs = (el) => +(el.getBoundingClientRect().top - dr.top + detail.scrollTop).toFixed(1);
      const foldField = document.querySelector('#d-body .field-fold');
      const fold = foldField ? foldField.querySelector('details') : null;
      const riskDd = [...document.querySelectorAll('#d-body .fields .field dt')]
        .find(dt => dt.textContent.trim() === '反 AI 味风险与规避');
      const riskField = riskDd ? riskDd.closest('.field') : null;
      if (!foldField || !riskField) return { id: '${id}', error: 'fold or risk missing' };

      // ── A. 默认（收起）状态
      const out = {
        id: '${id}',
        foldOpenByDefault: fold.open,
        summary: fold.querySelector('summary').textContent.trim(),
        summaryH: +fold.querySelector('summary').getBoundingClientRect().height.toFixed(1),
        foldFieldH_closed: +foldField.getBoundingClientRect().height.toFixed(1),
        foldTop_closed: abs(foldField),
        riskTop_closed: abs(riskField),
        order_ok: abs(foldField) < abs(riskField),
        detailScrollH_closed: detail.scrollHeight,
        clientH: detail.clientHeight,
      };

      // ── B. 等价于改动前：把 foldField 挪到 riskField 之后
      const parent = riskField.parentNode;
      parent.insertBefore(foldField, riskField.nextSibling);
      out.foldTop_before = abs(foldField);
      out.riskTop_before = abs(riskField);
      out.orderBefore_ok = abs(riskField) < abs(foldField);
      // 挪回去（原位置在 riskField 之前）
      parent.insertBefore(foldField, riskField);
      out.restored_ok = abs(foldField) < abs(riskField);

      // ── C. 展开后字数
      fold.open = true;
      const pb = fold.querySelector('.fold-body');
      const t = pb ? pb.textContent : '';
      out.bodyLen = t.length;
      out.markerInBody = t.indexOf('反套路改造三指标');
      out.bodySample = t.slice(0, 42);
      return out;
    })()`);
    rows.push(row);
    await page.screenshot({ path: join(OUT, `shots-panel/${id}-audit-before-risk.jpg`), format: 'jpeg', quality: 70 });
    await page.eval(`(() => { document.querySelector('#d-body .field-fold details').open = false; })()`);
  }
} finally {
  await page.close();
  await browser.close();
  await srv.close();
}

const summary = {
  at: new Date().toISOString(),
  viewport: '1440x900',
  rows,
  all_order_ok: rows.every((r) => r.order_ok === true),
  all_orderBefore_ok: rows.every((r) => r.orderBefore_ok === true),
  s13_len_306: (rows.find((r) => r.id === 'S13') || {}).bodyLen === 306,
  all_marker_absent: rows.every((r) => r.markerInBody === -1),
};
console.log(JSON.stringify(summary, null, 2));
writeFileSync(join(OUT, 'audit-position.json'), JSON.stringify(summary, null, 2), 'utf8');
