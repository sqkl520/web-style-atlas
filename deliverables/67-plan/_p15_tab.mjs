// _p15_tab.mjs — 面板**打开后**再数 Tab 序（_p14 数不到是因为 #detail 默认 hidden，内部元素高为 0）
import { Browser } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const PAGE = 'file:///' + join(HERE, '_frozen', 'index.html').replace(/\\/g, '/');
const out = {};
const browser = await Browser.launch({ width: 1440, height: 900 });

const p = await browser.newPage({ width: 390, height: 844, dsf: 1, mobile: true });
await p.goto(PAGE, { settleMs: 1600 });
await p.eval(() => { document.querySelector('.row[data-id="S01"]').click(); });
await new Promise((r) => setTimeout(r, 600));

out.afterOpen = await p.eval(() => {
  const sel = 'a[href], button, input, select, textarea, summary, [tabindex]:not([tabindex="-1"])';
  const all = Array.from(document.querySelectorAll(sel)).filter((e) => { const b = e.getBoundingClientRect(); return b.height > 0 || b.width > 0; });
  const idx = (pred) => all.findIndex(pred);
  return {
    focusableTotal: all.length,
    detailFirstIdx: idx((e) => e.closest('#detail')),
    detailFirstTag: (() => { const e = all.find((x) => x.closest('#detail')); return e ? e.tagName + '.' + (e.className || '') : null; })(),
    firstSummaryIdx: idx((e) => e.tagName === 'SUMMARY'),
    firstSummaryText: (() => { const e = all.find((x) => x.tagName === 'SUMMARY'); return e ? e.textContent.replace(/\s+/g, ' ').trim().slice(0, 30) : null; })(),
    activeNow: document.activeElement.tagName + '.' + (document.activeElement.className || ''),
    // 面板内可聚焦总数
    inDetailCount: all.filter((e) => e.closest('#detail')).length,
  };
});
console.log('afterOpen:', JSON.stringify(out.afterOpen, null, 1));

// 真实 Tab：焦点已在 .detail-head（app.js 的 focusIntoDetail），数几次到第一个 summary
let seq = [];
for (let i = 1; i <= 20; i++) {
  await p.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9, nativeVirtualKeyCode: 9 });
  await p.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9, nativeVirtualKeyCode: 9 });
  const r = await p.eval(() => { const a = document.activeElement; return a.tagName + ':' + (a.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 24); });
  seq.push(i + '=' + r);
}
out.tabSeqFromHead = seq;
console.log('\nTab 序列（从 .detail-head 起）:\n ' + seq.join('\n '));
await p.close();
writeFileSync(join(HERE, '_p15_tab.json'), JSON.stringify(out, null, 1));
await browser.close();
