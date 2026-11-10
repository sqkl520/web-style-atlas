/* 65-exec 验收 7 条，逐条输出原文（这是交付物里那张"验收原文"表的来源）。
   每条断言都在真实 Chromium（1440×900 / 390×844）里跑，只读页面、不改仓库文件。
    1 首字段 ≤720，30 案全部成立（两档视口）
    2 面板 scrollHeight ≤3800，30 案全部成立（两档视口）
    3 预览图仍能看全：.viewer-stage 展开后可滚，且滚到底能看到图的最后一行
    4 上站文案 4 段折叠后仍能展开读到全部，一条不少（逐案比文本）
    5 390×844 无横向滚动 + 折叠交互正常
    6 键盘可达：summary 可 Tab 聚焦 / Enter 展开 / Esc 不异常
    7 所有新 details 的默认状态明确（逐案列出 open 值） */
import { writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { Browser, sleep } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { startServer } from '../65-audit/lab/serve.mjs';

const OUT = resolve('deliverables/65-exec');
const ids = Array.from({ length: 30 }, (_, i) => 'S' + String(i + 1).padStart(2, '0'));
const log = [];
const say = (s) => { log.push(s); console.log(s); };

const srv = await startServer(resolve('.'));
const browser = await Browser.launch();
const out = { at: new Date().toISOString(), acc: {} };

async function openCase(page, id) {
  await page.eval((sid) => { location.hash = '#' + sid; }, id);
  await sleep(430);
  await page.eval(() => { document.getElementById('detail').scrollTop = 0; });
  await sleep(60);
}

try {
  // ── 验收 1 / 2：30 案 × 两档 ────────────────────────────────────────
  say('==== 验收 1：第一个字段位置 ≤ 720px（0.8 屏），30 案全部成立 ====');
  for (const vp of [{ k: 'desktop', w: 1440, h: 900, lim: 720 }, { k: 'mobile', w: 390, h: 844, lim: 675 }]) {
    const page = await browser.newPage({ width: vp.w, height: vp.h, dsf: 1, mobile: vp.mobile === true });
    await page.goto(srv.origin + '/prototypes/_selection/index.html', { settleMs: 1500 });
    await page.eval('document.fonts.ready.then(() => true)').catch(() => {});
    const rows = [];
    for (const id of ids) {
      await openCase(page, id);
      const m = await page.eval(() => {
        const d = document.getElementById('detail');
        const dr = d.getBoundingClientRect();
        const f = document.querySelector('#d-body .field');
        const r = f.getBoundingClientRect();
        return { first: +(r.top - dr.top + d.scrollTop).toFixed(1), contentH: d.scrollHeight, clientH: d.clientHeight };
      });
      rows.push({ id, ...m });
    }
    const ff = rows.map((r) => r.first);
    const ch = rows.map((r) => r.contentH);
    const fail1 = rows.filter((r) => r.first > 720);
    say(`[${vp.k} ${vp.w}×${vp.h}] firstField min=${Math.min(...ff)} max=${Math.max(...ff)} avg=${Math.round(ff.reduce((a, b) => a + b, 0) / 30)}  超 720 的案: ${fail1.length ? fail1.map((r) => r.id + '=' + r.first).join(' ') : '无'}`);
    say(`  逐案: ${rows.map((r) => r.id + '=' + r.first).join(' ')}`);
    say(`[${vp.k}] scrollHeight min=${Math.min(...ch)} max=${Math.max(...ch)} avg=${Math.round(ch.reduce((a, b) => a + b, 0) / 30)}  超 3800 的案: ${rows.filter((r) => r.contentH > 3800).length ? rows.filter((r) => r.contentH > 3800).map((r) => r.id + '=' + r.contentH).join(' ') : '无'}`);
    out.acc[vp.k] = rows;
    await page.close();
  }

  // ── 验收 3 / 4 / 5 / 6 / 7：在 1440 与 390 各做一轮交互 ─────────────
  for (const vp of [{ k: 'desktop', w: 1440, h: 900, mobile: false }, { k: 'mobile', w: 390, h: 844, mobile: true }]) {
    const page = await browser.newPage({ width: vp.w, height: vp.h, dsf: 1, mobile: vp.mobile });
    await page.goto(srv.origin + '/prototypes/_selection/index.html', { settleMs: 1500 });
    await page.eval('document.fonts.ready.then(() => true)').catch(() => {});

    say(`\n==== 验收 3（${vp.k}）：预览图展开后能滚动看到完整图 ====`);
    const stageTest = [];
    for (const id of ['S01', 'S13', 'S26']) {
      await openCase(page, id);
      const r = await page.eval(() => {
        const view = document.querySelector('#d-body .fold-view');
        view.open = true;
        const st = document.querySelector('#d-body .viewer-stage');
        const img = st.querySelector('img');
        const before = { clientH: st.clientHeight, scrollH: st.scrollHeight, imgH: img ? +img.getBoundingClientRect().height.toFixed(1) : null, overflowY: getComputedStyle(st).overflowY };
        st.scrollTop = st.scrollHeight;
        const atBottom = st.scrollTop + st.clientHeight >= st.scrollHeight - 2;
        const imgRect = img.getBoundingClientRect();
        const stRect = st.getBoundingClientRect();
        const bottomVisible = imgRect.bottom <= stRect.bottom + 1.5;
        return { ...before, scrollTop: st.scrollTop, atBottom, bottomVisible, scrollable: st.scrollHeight > st.clientHeight + 2 };
      });
      stageTest.push({ id, ...r });
      say(`  ${id}: 折叠条展开 → stage clientH=${r.clientH} scrollH=${r.scrollH} imgH=${r.imgH} overflowY=${r.overflowY} 可滚=${r.scrollable} 滚到底=${r.atBottom} 图底边可见=${r.bottomVisible}`);
    }
    out.acc['stage_' + vp.k] = stageTest;

    say(`\n==== 验收 4（${vp.k}）：上站文案 4 段展开后一条不少 ====`);
    const partsTest = [];
    for (const id of ids) {
      await openCase(page, id);
      const r = await page.eval(() => {
        const foldEl = document.querySelector('#d-body .fold-parts');
        if (!foldEl) return { missing: true };
        const closedH = foldEl.getBoundingClientRect().height;
        foldEl.open = true;
        const lis = [...foldEl.querySelectorAll('.parts li')];
        const spans = lis.map((li) => (li.querySelector('span') || {}).textContent || '');
        const texts = lis.map((li) => li.textContent.replace(/\s+/g, ' ').trim());
        return { closedH: +closedH.toFixed(1), n: lis.length, spans, texts, emptyText: texts.filter((t) => t.replace(/^[^ ]+/, '').trim().length < 2).length };
      });
      partsTest.push({ id, ...r });
    }
    const bad = partsTest.filter((p) => p.missing || p.n !== 4 || p.emptyText > 0);
    say(`  30 案 × 4 段：${bad.length ? 'FAIL ' + JSON.stringify(bad) : '全部 4 段齐全、无空段'}`);
    say(`  段落标签实测（S15）：${JSON.stringify((partsTest.find((p) => p.id === 'S15') || {}).spans)}`);
    say(`  首段原文（S15）：${(partsTest.find((p) => p.id === 'S15') || {}).texts?.[0]}`);
    out.acc['parts_' + vp.k] = partsTest;

    say(`\n==== 验收 5（${vp.k}）：横向滚动 + 折叠交互 ====`);
    const hOv = await page.eval(() => {
      const d = document.getElementById('detail');
      return { detailOv: d.scrollWidth - d.clientWidth, docOv: document.documentElement.scrollWidth - innerWidth, innerW: innerWidth };
    });
    say(`  detail 横向溢出=${hOv.detailOv}px  document 横向溢出=${hOv.docOv}px  innerWidth=${hOv.innerW}`);
    // 点 summary 能展开/收起（真实 click，不是设 open 属性）
    const clickTest = await page.eval(async () => {
      const view = document.querySelector('#d-body .fold-view');
      const before = view.open;
      view.querySelector('summary').click();
      await new Promise((r) => setTimeout(r, 60));
      const after1 = view.open;
      view.querySelector('summary').click();
      await new Promise((r) => setTimeout(r, 60));
      return { before, afterClick: after1, afterSecond: view.open };
    });
    say(`  点 summary：初始 open=${clickTest.before} → 点一次 ${clickTest.afterClick} → 再点 ${clickTest.afterSecond}（交互正常=${clickTest.before === false && clickTest.afterClick === true && clickTest.afterSecond === false}）`);
    out.acc['click_' + vp.k] = clickTest;

    say(`\n==== 验收 6（${vp.k}）：键盘可达 ====`);
    const kbd = await page.eval(() => {
      const view = document.querySelector('#d-body .fold-view');
      const sum = view.querySelector('summary');
      sum.focus();
      const focused = document.activeElement === sum;
      return {
        focused,
        tag: document.activeElement.tagName,
        tabIndex: sum.tabIndex,
        role: sum.getAttribute('role') || '(native summary)',
      };
    });
    say(`  summary.focus() 生效=${kbd.focused}（activeElement=${kbd.tag}, tabIndex=${kbd.tabIndex}, role=${kbd.role}）`);
    // 真实 Enter 键（CDP Input），不是合成事件
    await page.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, nativeVirtualKeyCode: 13 });
    await page.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, nativeVirtualKeyCode: 13 });
    await sleep(180);
    const afterEnter = await page.eval(() => ({ open: document.querySelector('#d-body .fold-view').open, scrollY: window.scrollY }));
    say(`  真实 Enter 后 fold-view.open=${afterEnter.open}（应 true）, window.scrollY=${afterEnter.scrollY}`);
    // 真实 Esc：app.js 的全局 Esc 是"收起详情"，本应正常触发，不应报错
    const errBefore = page.consoleErrors.length;
    await page.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27, nativeVirtualKeyCode: 27 });
    await page.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27, nativeVirtualKeyCode: 27 });
    await sleep(200);
    const afterEsc = await page.eval(() => ({ detailHidden: document.getElementById('detail').hidden, hash: location.hash, open: (document.querySelector('#d-body .fold-view') || {}).open }));
    say(`  真实 Esc 后 detail.hidden=${afterEsc.detailHidden}（app.js 的设计行为：Esc 收起详情）, hash="${afterEsc.hash}", JS 异常数=${page.consoleErrors.length - errBefore}`);
    out.acc['kbd_' + vp.k] = { ...kbd, afterEnter, afterEsc, errors: page.consoleErrors.slice() };
    await page.close();
  }

  // ── 验收 7：默认状态 + 没有空 details ──────────────────────────────
  const page = await browser.newPage({ width: 1440, height: 900, dsf: 1 });
  await page.goto(srv.origin + '/prototypes/_selection/index.html', { settleMs: 1500 });
  await page.eval('document.fonts.ready.then(() => true)').catch(() => {});
  say(`\n==== 验收 7：所有 details 的默认状态与 body 非空 ====`);
  const foldStates = [];
  for (const id of ids) {
    await openCase(page, id);
    const r = await page.eval(() => {
      return [...document.querySelectorAll('#d-body details')].map((d) => {
        const body = d.querySelector('.fold-body');
        return {
          cls: d.className.replace('fold ', ''),
          sum: (d.querySelector('summary') || {}).textContent.replace(/\s+/g, ' ').trim().slice(0, 30),
          open: d.open,
          bodyChars: body ? body.textContent.replace(/\s+/g, '').length : 0,
          bodyChildren: body ? body.children.length : 0,
        };
      });
    });
    foldStates.push({ id, folds: r });
  }
  const emptyBody = foldStates.flatMap((f) => f.folds.filter((x) => x.bodyChars === 0 || x.bodyChildren === 0).map((x) => f.id + '/' + x.cls));
  say(`  30 案 × ${foldStates[0].folds.length} 个 details，body 空/无子元素的：${emptyBody.length ? emptyBody.join(' ') : '无'}`);
  const byCls = {};
  foldStates.forEach((f) => f.folds.forEach((x) => {
    byCls[x.cls] = byCls[x.cls] || { open: new Set(), n: 0, sum: x.sum, bodyChars: [] };
    byCls[x.cls].open.add(x.open); byCls[x.cls].n++; byCls[x.cls].bodyChars.push(x.bodyChars);
  }));
  for (const [cls, v] of Object.entries(byCls)) {
    say(`  .${cls}: ${v.n}/30 案里有 | 默认 open 取值集合={${[...v.open].join(',')}} | summary 示例「${v.sum}」| body 字数 ${Math.min(...v.bodyChars)}–${Math.max(...v.bodyChars)}`);
  }
  out.acc.foldStates = foldStates;
  out.acc.foldSummary = Object.fromEntries(Object.entries(byCls).map(([k, v]) => [k, { n: v.n, openValues: [...v.open], sample: v.sum, bodyChars: [Math.min(...v.bodyChars), Math.max(...v.bodyChars)] }]));
  await page.close();
} finally {
  await browser.close();
  await srv.close();
}

writeFileSync(join(OUT, 'acc-raw.txt'), log.join('\n'), 'utf8');
writeFileSync(join(OUT, 'acc.json'), JSON.stringify(out, null, 2));
console.log('\nwrote acc-raw.txt / acc.json');
