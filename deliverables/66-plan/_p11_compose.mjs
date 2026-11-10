// P11：390 档详情面板的组成分解 —— 从顶到第一个字段之间装了什么，复制按钮在哪
import { Browser } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { HERE, ROOT, ids, median } from './_lib.mjs';

const PAGE = 'file:///' + join(ROOT, 'prototypes', '_selection', 'index.html').replace(/\\/g, '/');
const b = await Browser.launch({ width: 1440, height: 900 });

for (const [w, h, mob] of [[390, 844, true], [1440, 900, false]]) {
  const p = await b.newPage({ width: w, height: h, dsf: 1, mobile: mob });
  await p.goto(PAGE, { settleMs: 1700 });
  const rows = [];
  for (const id of ids()) {
    const r = await p.eval(async (sid) => {
      location.hash = '#' + sid;
      document.dispatchEvent(new HashChangeEvent('hashchange'));
      await new Promise((r) => setTimeout(r, 240));
      const d = document.getElementById('detail');
      if (!d) return null;
      const dr = d.getBoundingClientRect();
      const top = (el) => (el ? Math.round(el.getBoundingClientRect().top - dr.top + d.scrollTop) : null);
      const hgt = (el) => (el ? Math.round(el.getBoundingClientRect().height) : 0);
      const firstField = d.querySelector('.field');
      const copyBtn = [...d.querySelectorAll('button')].find((x) => /复制/.test(x.textContent));
      const promptWrap = d.querySelector('.prompt-copy-wrap, .prompt-fill')?.closest('div');
      const details = [...d.querySelectorAll('details')];
      const out = {
        id: sid, h: d.scrollHeight, client: d.clientHeight,
        copyBtnTop: top(copyBtn),
        promptBlockH: hgt(promptWrap),
        firstFieldTop: top(firstField),
        details: details.map((x) => ({ sum: (x.querySelector('summary') || {}).textContent?.trim().slice(0, 12) || '', h: hgt(x), open: x.open })),
        detailsH: details.reduce((a, x) => a + x.getBoundingClientRect().height, 0),
      };
      location.hash = '';
      document.dispatchEvent(new HashChangeEvent('hashchange'));
      return out;
    }, id);
    if (r) rows.push(r);
  }
  await p.close();
  writeFileSync(join(HERE, `p11-panel-${w}.json`), JSON.stringify(rows, null, 1), 'utf8');
  console.log(`\n===== ${w}×${h} =====  案数 ${rows.length}`);
  console.log('scrollHeight: min=%d med=%s max=%d  (%.2f 屏 / %.2f 屏 / %.2f 屏)',
    Math.min(...rows.map((r) => r.h)), median(rows.map((r) => r.h)), Math.max(...rows.map((r) => r.h)),
    Math.min(...rows.map((r) => r.h)) / h, median(rows.map((r) => r.h)) / h, Math.max(...rows.map((r) => r.h)) / h);
  console.log('复制按钮顶距: min=%d med=%s max=%d', Math.min(...rows.map((r) => r.copyBtnTop)), median(rows.map((r) => r.copyBtnTop)), Math.max(...rows.map((r) => r.copyBtnTop)));
  console.log('提示词块高度: min=%d med=%s max=%d', Math.min(...rows.map((r) => r.promptBlockH)), median(rows.map((r) => r.promptBlockH)), Math.max(...rows.map((r) => r.promptBlockH)));
  console.log('第一个字段顶距: min=%d med=%s max=%d', Math.min(...rows.map((r) => r.firstFieldTop)), median(rows.map((r) => r.firstFieldTop)), Math.max(...rows.map((r) => r.firstFieldTop)));
  console.log('折叠块高度合计: min=%d med=%s max=%d', Math.min(...rows.map((r) => r.detailsH)), median(rows.map((r) => r.detailsH)), Math.max(...rows.map((r) => r.detailsH)));
  console.log('折叠块: ' + JSON.stringify(rows[0].details));
  // 3800 相当于几屏
  console.log('3800 / %d = %.2f 屏', h, 3800 / h);
}
await b.close();
