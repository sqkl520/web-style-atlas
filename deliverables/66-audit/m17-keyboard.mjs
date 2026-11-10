// m17-keyboard.mjs — 键盘实测：打开详情后焦点在哪、Tab 到每个折叠条要几次、Esc/焦点陷阱
import { Browser } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const PAGE = 'file:///' + join(ROOT, 'prototypes', '_selection', 'index.html').replace(/\\/g, '/');

const browser = await Browser.launch({ width: 1440, height: 900 });
const out = { measuredAt: new Date().toISOString(), vps: {} };

const TAB = async (p) => {
  await p.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9, nativeVirtualKeyCode: 9 });
  await p.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9, nativeVirtualKeyCode: 9 });
  await new Promise((r) => setTimeout(r, 40));
  return p.eval(() => {
    const a = document.activeElement;
    if (!a || a === document.body) return { tag: 'body' };
    const d = document.querySelector('#detail');
    return {
      tag: a.tagName.toLowerCase(),
      cls: (a.className || '').toString().slice(0, 30),
      text: (a.textContent || a.placeholder || '').replace(/\s+/g, ' ').trim().slice(0, 24),
      inDetail: !!(d && !d.hidden && d.contains(a)),
    };
  });
};

for (const vp of [{ k: '390', w: 390, h: 844, m: true }, { k: '1440', w: 1440, h: 900, m: false }]) {
  const p = await browser.newPage({ width: vp.w, height: vp.h, dsf: 2, mobile: vp.m });
  await p.goto(PAGE, { settleMs: 1600 });
  out[vp.k] = {};

  // 1) 用鼠标点开详情后，焦点落在哪个元素？（有没有被送进面板）
  out[vp.k].focusAfterOpenClick = await p.eval(() => {
    document.querySelector('.row[data-id="S01"]').click();
    const a = document.activeElement;
    return { tag: a.tagName.toLowerCase(), cls: (a.className || '').toString().slice(0, 30), isBody: a === document.body };
  });

  // 2) 从 body 开始 Tab，记录到每个折叠条 / 第一个字段控件的次数
  await p.eval(() => {
    if (document.activeElement.blur) document.activeElement.blur();
    window.scrollTo(0, 0);
  });
  const targets = {};
  let n = 0;
  const seq = [];
  for (let i = 0; i < 130; i++) {
    const f = await TAB(p);
    n++;
    seq.push({ n, ...f });
    if (f.tag === 'summary' && !targets.firstSummary) targets.firstSummary = n;
    if (f.tag === 'summary' && f.inDetail && !targets.firstDetailSummary) targets.firstDetailSummary = n;
    if (f.inDetail && !targets.firstInDetail) targets.firstInDetail = n;
    if (f.tag === 'summary' && f.text.includes('原型截图预览') && !targets.foldView) targets.foldView = n;
    if (f.tag === 'summary' && f.text.includes('去 AI 味') && !targets.fieldFold) targets.fieldFold = n;
    if (f.tag === 'summary' && f.text.includes('闸门') && !targets.foldGate) targets.foldGate = n;
    if (f.tag === 'input' && f.inDetail && !targets.firstInput) targets.firstInput = n;
    if (f.tag === 'a' && f.text.includes('打开原型') && !targets.openProto) targets.openProto = n;
  }
  out[vp.k].tabTargets = targets;
  out[vp.k].seqHead = seq.slice(0, 6);
  out[vp.k].seqDetail = seq.filter((s) => s.inDetail).slice(0, 20);
  out[vp.k].totalTabbablesWalked = n;

  // 3) Esc 关闭：焦点在折叠条上按 Esc 会关闭整个面板吗？
  out[vp.k].escOnSummary = await p.eval(() => {
    // 先确保详情是开的
    const d = document.getElementById('detail');
    if (d.hidden) document.querySelector('.row[data-id="S01"]').click();
    const s = document.querySelector('#detail .fold > summary');
    if (s) s.focus();
    return { focused: document.activeElement.tagName.toLowerCase(), detailHiddenBefore: d.hidden };
  });
  await p.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27, nativeVirtualKeyCode: 27 });
  await p.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27, nativeVirtualKeyCode: 27 });
  await new Promise((r) => setTimeout(r, 200));
  out[vp.k].detailHiddenAfterEscOnSummary = await p.eval(() => document.getElementById('detail').hidden);

  // 4) 焦点是否会被 Tab 移出面板（无焦点陷阱）
  out[vp.k].focusEscapesDetail = await p.eval(() => {
    const d = document.getElementById('detail');
    if (d.hidden) document.querySelector('.row[data-id="S01"]').click();
    return !d.hidden;
  });
  await p.close();
}
writeFileSync(join(HERE, 'data-m17-keyboard.json'), JSON.stringify(out, null, 1));
await browser.close();
for (const k of ['390', '1440']) {
  console.log(`[${k}] 点开后焦点=${JSON.stringify(out[k].focusAfterOpenClick)}`);
  console.log(`[${k}] Tab 次数目标=${JSON.stringify(out[k].tabTargets)}`);
  console.log(`[${k}] Esc(在折叠条上) 后 detail.hidden=${out[k].detailHiddenAfterEscOnSummary}`);
}
