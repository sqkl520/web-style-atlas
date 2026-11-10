// _p14_focus.mjs — Tab 序：数一遍可聚焦元素，核实审计的 87/91。
// 用 frozen HEAD 快照，避免并发改动影响。
import { Browser } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const PAGE = 'file:///' + join(HERE, '_frozen', 'index.html').replace(/\\/g, '/');
const out = {};
const browser = await Browser.launch({ width: 1440, height: 900 });

for (const [label, w, h, m] of [['390', 390, 844, true], ['1440', 1440, 900, false]]) {
  const p = await browser.newPage({ width: w, height: h, dsf: 1, mobile: m });
  await p.goto(PAGE, { settleMs: 1600 });
  out[label] = await p.eval(() => {
    const sel = 'a[href], button, input, select, textarea, summary, [tabindex]:not([tabindex="-1"])';
    const all = Array.from(document.querySelectorAll(sel)).filter((e) => {
      const b = e.getBoundingClientRect();
      return b.height > 0 || b.width > 0;
    });
    const detailIdx = all.findIndex((e) => e.closest('#detail'));
    const firstSummary = all.findIndex((e) => e.tagName === 'SUMMARY');
    return {
      focusableTotal: all.length,
      firstInDetailIndex: detailIdx,
      firstSummaryIndex: firstSummary,
      detailFirstTag: detailIdx >= 0 ? all[detailIdx].tagName + '.' + (all[detailIdx].className || '') : null,
      // 面板打开后是否进面板
      rowCount: document.querySelectorAll('#ledger .row').length,
      chipCount: document.querySelectorAll('.chips button').length,
      sceneChipCount: document.querySelectorAll('.scene-chip').length,
    };
  });
  console.log(`[${label}]`, JSON.stringify(out[label]));
  // 真实 Tab：从 body 开始，最多 200 次
  await p.eval(() => { document.body.setAttribute('tabindex', '-1'); document.body.focus(); });
  let found = null;
  for (let i = 1; i <= 160; i++) {
    await p.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9, nativeVirtualKeyCode: 9 });
    await p.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9, nativeVirtualKeyCode: 9 });
    const r = await p.eval(() => {
      const a = document.activeElement;
      return { inDetail: !!a.closest('#detail'), tag: a.tagName, sum: a.tagName === 'SUMMARY' };
    });
    if (r.inDetail && !found) { found = { tab: i, tag: r.tag, sum: r.sum }; break; }
  }
  out[label].realTab = found;
  console.log(`[${label}] 真实 Tab 进面板:`, JSON.stringify(found));
  await p.close();
}
writeFileSync(join(HERE, '_p14_focus.json'), JSON.stringify(out, null, 1));
await browser.close();
