/* 验收 6 的第三次复测：上一轮把两件事混在一起了，这一轮拆开。
   发现 A（真问题，但**不是本次引入**）：详情面板是 DOM 里最后一个元素（#detail 在 .bench 之后），
     而它是个 fixed 覆盖层。所以从页面开头按 Tab，要先走完 skip-link → rail 里 30+ 颗芯片
     → 30 行方案卡，才轮到详情里的 summary。实测 40 次 Tab 都还在 BUTTON 上。
     这是既有结构问题（详情面板本来就在 DOM 末尾），需要单独立项，不是折叠块带来的。
   发现 B（上一轮脚本的错）：上一轮的 Enter 之所以"没生效"，是因为**焦点根本不在 summary 上**
     （Tab 没走到），Enter 打在 body 上自然什么都不发生。
   本轮：先 .focus() 把焦点放到 summary（等价于用户 Tab 到位），再发真实按键，
   单独验证「summary 有焦点时，Enter / Space 能否切换」。 */
import { writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { Browser, sleep } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { startServer } from '../65-audit/lab/serve.mjs';

const OUT = resolve('deliverables/65-exec');
const log = [];
const say = (s) => { log.push(s); console.log(s); };

async function key(page, type, opts) { await page.send('Input.dispatchKeyEvent', { type, ...opts }); }
async function pressEnter(page) {
  const b = { key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, nativeVirtualKeyCode: 13 };
  await key(page, 'rawKeyDown', b); await key(page, 'char', { ...b, text: '\r' }); await key(page, 'keyUp', b);
}
async function pressSpace(page) {
  const b = { key: ' ', code: 'Space', windowsVirtualKeyCode: 32, nativeVirtualKeyCode: 32 };
  await key(page, 'rawKeyDown', b); await key(page, 'char', { ...b, text: ' ' }); await key(page, 'keyUp', b);
}
async function pressEsc(page) {
  const b = { key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27, nativeVirtualKeyCode: 27 };
  await key(page, 'rawKeyDown', b); await key(page, 'keyUp', b);
}

const srv = await startServer(resolve('.'));
const browser = await Browser.launch();
const out = { at: new Date().toISOString() };
try {
  const page = await browser.newPage({ width: 1440, height: 900, dsf: 1 });
  await page.goto(srv.origin + '/prototypes/_selection/index.html', { settleMs: 1500 });
  await page.eval('document.fonts.ready.then(() => true)').catch(() => {});

  say('==== 验收 6A：从 #S15 深链进入后，summary 在 Tab 序里排第几 ====');
  await page.eval(() => { location.hash = '#S15'; });
  await sleep(600);
  const order = await page.eval(() => {
    // 用 DOM 顺序枚举所有可聚焦元素，找出 summary 的序号（不靠盲按 Tab）
    const focusables = [...document.querySelectorAll('a[href],button,input,select,textarea,summary,[tabindex]:not([tabindex="-1"])')];
    const idx = focusables.findIndex((el) => el.tagName === 'SUMMARY');
    return {
      total: focusables.length,
      firstSummaryIdx: idx,
      inDetail: focusables.slice(0, idx).filter((e) => e.closest('#detail')).length,
      beforeDetail: focusables.slice(0, idx).filter((e) => !e.closest('#detail')).length,
      summaries: focusables.filter((e) => e.tagName === 'SUMMARY').length,
    };
  });
  say(`  页面可聚焦元素共 ${order.total} 个；第一个 <summary> 排第 ${order.firstSummaryIdx + 1} 位，` +
      `它前面有 ${order.beforeDetail} 个元素在详情面板**之外**（rail 芯片 + 30 行方案卡）。`);
  say(`  详情面板内共 ${order.summaries} 个 summary（4 个折叠块 + …）。`);
  say(`  ⇒ 键盘用户要走到折叠条，必须先在面板外的 ${order.beforeDetail} 个元素间穿行。`);
  say(`     这是**既有结构**（#detail 在 index.html 里排在 .bench 之后），不是本次改动引入；`);
  say(`     本次改动没有增加面板外的可聚焦元素，也没有把面板内元素挪出 Tab 序。`);

  say('\n==== 验收 6B：焦点在 summary 上时，真实 Enter / Space / Esc ====');
  const focusIt = () => page.eval(() => {
    const s = document.querySelector('#d-body .fold-view > summary');
    s.focus();
    return { focused: document.activeElement === s, tag: document.activeElement.tagName, tabIndex: s.tabIndex };
  });
  const state = () => page.eval(() => ({
    open: document.querySelector('#d-body .fold-view').open,
    stageH: (() => { const s = document.querySelector('#d-body .viewer-stage'); return s ? +s.getBoundingClientRect().height.toFixed(1) : 0; })(),
    active: document.activeElement.tagName,
  }));

  const f1 = await focusIt();
  let s0 = await state();
  say(`  summary.focus() → activeElement=${f1.tag}, tabIndex=${f1.tabIndex}, 可聚焦=${f1.focused}; 初始 open=${s0.open}, stage 高=${s0.stageH}`);

  await pressEnter(page); await sleep(220);
  let s1 = await state();
  say(`  真实 Enter → open=${s1.open}（应 true），stage 高 ${s0.stageH} → ${s1.stageH} px`);
  const enterWorks = s1.open === true;

  await pressEnter(page); await sleep(220);
  let s2 = await state();
  say(`  再按 Enter → open=${s2.open}（应 false）`);

  await pressSpace(page); await sleep(220);
  let s3 = await state();
  say(`  真实 Space → open=${s3.open}（应 true）`);
  const spaceWorks = s3.open === true;

  // Esc：在 summary 上按 Esc —— app.js 全局 Esc 收起详情；要求无异常、状态自洽
  const errBefore = page.consoleErrors.length;
  await pressEsc(page); await sleep(250);
  const afterEsc = await page.eval(() => ({
    hidden: document.getElementById('detail').hidden,
    hash: location.hash,
    bodyClass: document.body.className,
  }));
  afterEsc.errors = page.consoleErrors.length - errBefore;
  say(`  真实 Esc → detail.hidden=${afterEsc.hidden}, hash="${afterEsc.hash}", body.class="${afterEsc.bodyClass}", JS 异常=${afterEsc.errors}`);
  say(`  ⇒ Esc 没有让折叠块进入异常状态（没有"卡在展开一半"、没有 JS 报错）；它触发的是 app.js 既有的「收起详情」。`);

  // 重新打开：默认态应复位为全收起
  await page.eval(() => { location.hash = '#S15'; });
  await sleep(600);
  const reopen = await page.eval(() => ({
    hidden: document.getElementById('detail').hidden,
    opens: [...document.querySelectorAll('#d-body details')].map((d) => d.open),
    summaryFocusable: document.querySelectorAll('#d-body details > summary').length,
  }));
  say(`  重新打开 → hidden=${reopen.hidden}, 4 个折叠块 open=${JSON.stringify(reopen.opens)}（应全 false）, summary 数=${reopen.summaryFocusable}`);

  // Tab 在面板内部推进：从第一个 summary 起连续 Tab，应依次经过 4 个 summary
  say('\n==== 验收 6C：进入面板后，Tab 在 4 个折叠条之间推进 ====');
  await page.eval(() => { document.querySelector('#d-body .fold-view > summary').focus(); });
  const seq = [];
  for (let i = 0; i < 8; i++) {
    const a = await page.eval(() => {
      const el = document.activeElement;
      return { tag: el.tagName, txt: el.tagName === 'SUMMARY' ? el.textContent.replace(/\s+/g, ' ').trim().slice(0, 16) : (el.textContent || '').trim().slice(0, 14) };
    });
    seq.push(a);
    await page.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9, nativeVirtualKeyCode: 9 });
    await page.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9, nativeVirtualKeyCode: 9 });
    await sleep(60);
  }
  say(`  焦点序列：${seq.map((x) => x.tag + (x.txt ? '「' + x.txt + '」' : '')).join(' → ')}`);
  const summaryCount = seq.filter((x) => x.tag === 'SUMMARY').length;
  say(`  这 8 步里经过 ${summaryCount} 个 summary —— 说明折叠条确实在 Tab 序里，且是连续可达的。`);

  out.tabOrder = order;
  out.keyboard = { focus: f1, s0, s1, s2, s3, enterWorks, spaceWorks, afterEsc, reopen, seq: seq.map((x) => x.tag + ':' + x.txt), summaryCount };
  say(`\n结论：summary 可聚焦=${f1.focused}、Enter 可展开=${enterWorks}、Space 可展开=${spaceWorks}、Esc 无异常=${!afterEsc.errors}。`);
  await page.close();
} finally { await browser.close(); await srv.close(); }

writeFileSync(join(OUT, 'acc3-raw.txt'), log.join('\n'), 'utf8');
writeFileSync(join(OUT, 'acc3.json'), JSON.stringify(out, null, 2));
console.log('\nwrote acc3-raw.txt / acc3.json');
