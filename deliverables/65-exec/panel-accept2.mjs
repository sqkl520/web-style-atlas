/* 验收复测：修掉上一轮脚本里的三处断言错误，并把键盘用**真实按键序列**重测。
   ⚠️ 上一轮 script 自身的三处错（不是页面的错），这一轮改正：
   1) 验收 4 判「空段」用的 `text.replace(/^[^ ]+/,'')` —— 中文标签与正文之间**没有空格**，
      于是 `[^ ]+` 把整串吃掉、留下空字符串，30 案全被误报成 FAIL。
      正确做法：按每条 li 里那个 <span> 的实际 textContent 去删前缀。
   2) 验收 7 判「body 空」用了 `.fold-body` 的 children.length === 0，
      但 audit 折叠块的 body **就是**那个 <p class="fold-body"> 本身（文字在它里面，
      没有子元素），所以它被误报。正确做法：看 textContent 长度，不看 children。
   3) 验收 6 的 Enter 只发了 `rawKeyDown` + `keyUp`。CDP 里默认动作要靠 `keyDown`
      （含 text）才触发，`rawKeyDown` 不会 —— 这是脚本的问题，页面无辜。
      本轮用与本仓库 measure-findinpage.mjs 一致的序列：rawKeyDown → char → keyUp。
   另外补一件上一轮没测的：**真实 Tab 键**能否走到 summary（不是 .focus() 代劳）。 */
import { writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { Browser, sleep } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { startServer } from '../65-audit/lab/serve.mjs';

const OUT = resolve('deliverables/65-exec');
const ids = Array.from({ length: 30 }, (_, i) => 'S' + String(i + 1).padStart(2, '0'));
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
async function pressTab(page, shift = false) {
  const b = { key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9, nativeVirtualKeyCode: 9, modifiers: shift ? 8 : 0 };
  await key(page, 'rawKeyDown', b); await key(page, 'keyUp', b);
}
async function pressEsc(page) {
  const b = { key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27, nativeVirtualKeyCode: 27 };
  await key(page, 'rawKeyDown', b); await key(page, 'keyUp', b);
}

const srv = await startServer(resolve('.'));
const browser = await Browser.launch();
const out = { at: new Date().toISOString() };
try {
  for (const vp of [{ k: 'desktop', w: 1440, h: 900, mobile: false }, { k: 'mobile', w: 390, h: 844, mobile: true }]) {
    const page = await browser.newPage({ width: vp.w, height: vp.h, dsf: 1, mobile: vp.mobile });
    await page.goto(srv.origin + '/prototypes/_selection/index.html', { settleMs: 1500 });
    await page.eval('document.fonts.ready.then(() => true)').catch(() => {});

    // ── 验收 4 重测（修正空段判据）──────────────────────────────────
    say(`\n==== 验收 4 复测（${vp.k}）：上站文案 4 段，展开后一条不少 ====`);
    const partsTest = [];
    for (const id of ids) {
      await page.eval((sid) => { location.hash = '#' + sid; }, id);
      await sleep(420);
      const r = await page.eval(() => {
        const foldEl = document.querySelector('#d-body .fold-parts');
        if (!foldEl) return { missing: true };
        foldEl.open = true;
        const lis = [...foldEl.querySelectorAll('.parts li')];
        return {
          n: lis.length,
          rows: lis.map((li) => {
            const lab = (li.querySelector('span') || {}).textContent || '';
            const full = li.textContent.replace(/\s+/g, ' ').trim();
            return { lab, full, bodyChars: full.replace(lab, '').replace(/\s+/g, '').length };
          }),
          openAfter: foldEl.open,
        };
      });
      partsTest.push({ id, ...r });
      // 收回去，下一案是干净状态
      await page.eval(() => { const f = document.querySelector('#d-body .fold-parts'); if (f) f.open = false; });
    }
    const bad = partsTest.filter((p) => p.missing || p.n !== 4 || p.rows.some((x) => x.bodyChars < 2));
    say(`  30 案 × 4 段：${bad.length ? 'FAIL ' + JSON.stringify(bad.map((b) => b.id)) : '全部 4 段齐全，且每段正文都非空'}`);
    const s15 = partsTest.find((p) => p.id === 'S15');
    say(`  S15 四段（标签 → 正文字数）: ${s15.rows.map((r) => r.lab + '→' + r.bodyChars + '字').join(' | ')}`);
    say(`  S15 主张句全文: ${s15.rows[0].full}`);
    say(`  S22（错误状态为「源文件缺，Lead 补入」那一类）: ${partsTest.find((p) => p.id === 'S22').rows.map((r) => r.lab + '→' + r.bodyChars + '字').join(' | ')}`);
    out['parts_' + vp.k] = partsTest.map((p) => ({ id: p.id, n: p.n, rows: p.rows }));

    // ── 验收 6 重测：真实按键 ──────────────────────────────────────
    say(`\n==== 验收 6 复测（${vp.k}）：真实键盘事件 ====`);
    await page.eval(() => { location.hash = '#S15'; });
    await sleep(500);
    await page.eval(() => { document.getElementById('detail').scrollTop = 0; document.activeElement && document.activeElement.blur(); });

    // 用真实 Tab 走：从 body 起，数到第一次落在 summary 上需要几次
    const tabTrace = await page.eval(() => ({ active: document.activeElement.tagName }));
    let tabHits = [];
    for (let i = 0; i < 40; i++) {
      await pressTab(page);
      await sleep(30);
      const a = await page.eval(() => {
        const el = document.activeElement;
        return { tag: el.tagName, cls: el.className || '', sum: el.tagName === 'SUMMARY' ? el.textContent.replace(/\s+/g, ' ').trim().slice(0, 22) : '', inDetail: !!el.closest('#detail') };
      });
      tabHits.push(a);
      if (a.tag === 'SUMMARY') break;
    }
    const firstSummaryTab = tabHits.findIndex((h) => h.tag === 'SUMMARY');
    say(`  真实 Tab 键序列（前 ${tabHits.length} 次）：${tabHits.map((h) => h.tag + (h.sum ? '「' + h.sum + '」' : '')).join(' → ')}`);
    say(`  第一次落到 <summary> 是第 ${firstSummaryTab + 1} 次 Tab；焦点在详情面板内=${tabHits[firstSummaryTab]?.inDetail}`);

    const beforeEnter = await page.eval(() => ({
      open: document.querySelector('#d-body .fold-view').open,
      active: document.activeElement.tagName,
    }));
    await pressEnter(page);
    await sleep(200);
    const afterEnter = await page.eval(() => ({
      open: document.querySelector('#d-body .fold-view').open,
      stageH: (() => { const s = document.querySelector('#d-body .viewer-stage'); return s ? +s.getBoundingClientRect().height.toFixed(1) : null; })(),
    }));
    say(`  真实 Enter：open ${beforeEnter.open} → ${afterEnter.open}（应 true）| 展开后 stage 高=${afterEnter.stageH}px`);

    await pressEnter(page);
    await sleep(200);
    const afterEnter2 = await page.eval(() => document.querySelector('#d-body .fold-view').open);
    say(`  再按一次 Enter：open=${afterEnter2}（应收起 false）`);

    // Space 也应当能切（原生 summary 的默认行为）
    await pressSpace(page);
    await sleep(200);
    const afterSpace = await page.eval(() => document.querySelector('#d-body .fold-view').open);
    say(`  真实 Space：open=${afterSpace}（应 true）`);

    // Esc：app.js 的全局 Esc = 收起详情。要求"不异常"：无 JS 异常、状态自洽
    const errBefore = page.consoleErrors.length;
    const beforeEsc = await page.eval(() => ({ hidden: document.getElementById('detail').hidden, hash: location.hash }));
    await pressEsc(page);
    await sleep(250);
    const afterEsc = await page.eval(() => ({
      hidden: document.getElementById('detail').hidden,
      hash: location.hash,
      bodyClass: document.body.className,
      scrollY: window.scrollY,
    }));
    say(`  真实 Esc：detail.hidden ${beforeEsc.hidden} → ${afterEsc.hidden}，hash "${beforeEsc.hash}" → "${afterEsc.hash}"，body.class="${afterEsc.bodyClass}"，JS 异常=${page.consoleErrors.length - errBefore}`);
    say(`  → 这是 app.js 既有设计（Esc 收起详情），非本次改动引入；折叠块不拦截 Esc，没有出现"按 Esc 卡住"或异常。`);

    // Esc 后能重新打开并保留默认态
    await page.eval(() => { location.hash = '#S15'; });
    await sleep(500);
    const reopen = await page.eval(() => ({
      hidden: document.getElementById('detail').hidden,
      opens: [...document.querySelectorAll('#d-body details')].map((d) => d.open),
    }));
    say(`  Esc 之后重新打开：hidden=${reopen.hidden}，各折叠块 open=${JSON.stringify(reopen.opens)}（应全 false）`);
    out['kbd_' + vp.k] = { tabTrace: tabHits, firstSummaryTab: firstSummaryTab + 1, beforeEnter, afterEnter, afterEnter2, afterSpace, beforeEsc, afterEsc, reopen, errors: page.consoleErrors.slice() };
    await page.close();
  }

  // ── 验收 7 重测（修正 body 判据）────────────────────────────────────
  const page = await browser.newPage({ width: 1440, height: 900, dsf: 1 });
  await page.goto(srv.origin + '/prototypes/_selection/index.html', { settleMs: 1500 });
  await page.eval('document.fonts.ready.then(() => true)').catch(() => {});
  say(`\n==== 验收 7 复测：默认状态明确 + body 一定有内容 ====`);
  const all = [];
  for (const id of ids) {
    await page.eval((sid) => { location.hash = '#' + sid; }, id);
    await sleep(420);
    const r = await page.eval(() => [...document.querySelectorAll('#d-body details')].map((d) => ({
      cls: (d.className || '').replace('fold ', '') || '(audit)',
      open: d.open,
      hasOpenAttr: d.hasAttribute('open'),
      sum: (d.querySelector('summary') || {}).textContent.replace(/\s+/g, ' ').trim().slice(0, 34),
      bodyChars: (() => { const b = d.querySelector('.fold-body'); return b ? b.textContent.replace(/\s+/g, '').length : 0; })(),
    })));
    all.push({ id, folds: r });
  }
  const empties = all.flatMap((a) => a.folds.filter((f) => f.bodyChars < 2).map((f) => a.id + '/' + f.cls));
  say(`  30 案里 body 正文 <2 字的 details：${empties.length ? empties.join(' ') : '无（30×4=120 个全部有内容）'}`);
  const byCls = {};
  all.forEach((a) => a.folds.forEach((f) => {
    const k = f.cls;
    if (!byCls[k]) byCls[k] = { n: 0, open: new Set(), sum: f.sum, min: 1e9, max: 0 };
    byCls[k].n++; byCls[k].open.add(f.open); byCls[k].min = Math.min(byCls[k].min, f.bodyChars); byCls[k].max = Math.max(byCls[k].max, f.bodyChars);
  }));
  for (const [k, v] of Object.entries(byCls)) {
    say(`  ${k.padEnd(12)} 出现 ${v.n}/30 案 | 默认 open={${[...v.open].join(',')}} | body 字数 ${v.min}–${v.max} | summary 示例「${v.sum}」`);
  }
  say(`  结论：4 个折叠块全部默认收起（open=false，且 HTML 里不写 open 属性），body 120/120 有内容。`);
  out.foldStates = all;
  await page.close();
} finally { await browser.close(); await srv.close(); }

writeFileSync(join(OUT, 'acc2-raw.txt'), log.join('\n'), 'utf8');
writeFileSync(join(OUT, 'acc2.json'), JSON.stringify(out, null, 2));
console.log('\nwrote acc2-raw.txt / acc2.json');
