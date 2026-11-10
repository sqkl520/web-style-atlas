// Executable version of the acceptance criteria in §8 of ia-discoverability.md.
//
//   node deliverables/65-audit/lab/verify-acceptance.mjs            # against the live repo (?lab=ren optional)
//   node deliverables/65-audit/lab/verify-acceptance.mjs --lab=ren   # against the lab overlay
//   node deliverables/65-audit/lab/verify-acceptance.mjs --lab=ren --keep   # keep failures visible
//
// Exit code 0 = every check passed. 1 = at least one failed.
// Checks that only make sense once collapsing exists are skipped (reported SKIP) when --lab is absent
// and the page has no <details> at all.
import { resolve, join } from 'node:path';
import { Browser, sleep } from '../../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { startLabServer } from './serve-lab.mjs';

const args = process.argv.slice(2);
const lab = (args.find((a) => a.startsWith('--lab=')) || '').split('=')[1] || '';
const LAB = resolve('deliverables/65-audit/lab');

const srv = await startLabServer({
  root: resolve('.'), labDir: join(LAB, 'variants'),
  overrides: [{ prefix: '/prototypes/_selection/', dir: join(LAB, 'snapshot') }],
});
const browser = await Browser.launch();

let pass = 0, fail = 0, skip = 0;
const failures = [];
function check(id, desc, ok, actual, expected) {
  if (ok === 'skip') { skip++; console.log(`SKIP  ${id}  ${desc}`); return; }
  if (ok) { pass++; console.log(`ok    ${id}  ${desc}  (${actual})`); }
  else { fail++; failures.push({ id, desc, actual, expected }); console.log(`FAIL  ${id}  ${desc}  actual=${actual} expected=${expected}`); }
}

async function openCase(page, scheme) {
  await page.goto(srv.origin + '/prototypes/_selection/index.html' + (lab ? '?lab=' + lab : ''), { settleMs: 900 });
  await page.eval((s) => { document.querySelector('.row[data-id="' + s + '"]').click(); }, scheme);
  await sleep(800);
  await page.eval('document.fonts.ready.then(() => true)').catch(() => {});
  await page.eval(() => { document.getElementById('detail').scrollTop = 0; });
  await sleep(250);
}

// ── desktop probes ──────────────────────────────────────────────────────────
const page = await browser.newPage({ width: 1440, height: 900 });
await openCase(page, 'S15');

const d = await page.eval(() => {
  const detail = document.getElementById('detail');
  const head = document.querySelector('.detail-head');
  const headH = head.getBoundingClientRect().height;
  const H = detail.clientHeight;
  const dRect = detail.getBoundingClientRect();
  const rel = (el) => { const r = el.getBoundingClientRect(); return { top: +(r.top - dRect.top).toFixed(1), bottom: +(r.bottom - dRect.top).toFixed(1), h: +r.height.toFixed(1) }; };

  const fields = [...document.querySelectorAll('#d-body .field')].map((el) => {
    const b = rel(el);
    return { label: el.querySelector('dt').textContent.trim(), ...b, full: b.top >= headH && b.bottom <= H, part: b.bottom > headH && b.top < H };
  });

  const visibleChars = () => {
    const w = document.createTreeWalker(document.getElementById('d-body'), NodeFilter.SHOW_TEXT);
    let n = 0; const range = document.createRange();
    while (w.nextNode()) {
      const node = w.currentNode;
      for (let i = 0; i < node.nodeValue.length; i++) {
        if (!/\S/.test(node.nodeValue[i])) continue;
        range.setStart(node, i); range.setEnd(node, i + 1);
        const r = range.getBoundingClientRect();
        if (r.width === 0 && r.height === 0) continue;
        const t = r.top - dRect.top, b = r.bottom - dRect.top;
        if (b > headH && t < H) n++;
      }
    }
    return n;
  };

  const summaries = [...document.querySelectorAll('#d-body summary')].map((s) => ({
    text: (s.textContent || '').replace(/\s+/g, ' ').trim(),
    h: +s.getBoundingClientRect().height.toFixed(1),
  }));
  const details = [...document.querySelectorAll('#d-body details')];
  const closedFields = [...document.querySelectorAll('#d-body details:not([open]) .field > dt')].map((x) => x.textContent.trim());

  const promptBtn = [...document.querySelectorAll('#d-body button, #d-body a')].find((b) => /复制 AI 提示词|已复制/.test(b.textContent || ''));

  const tapSmall = [...document.querySelectorAll('#detail button, #detail a[href], #detail summary')]
    .filter((e) => e.getBoundingClientRect().height > 0)
    .map((e) => ({ t: (e.textContent || '').trim().slice(0, 24), h: +e.getBoundingClientRect().height.toFixed(1) }))
    .filter((x) => x.h < 24);

  // do the folded field names actually appear in some summary?
  const summaryTextAll = summaries.map((s) => s.text).join(' | ');

  return {
    headH: +headH.toFixed(1), H, contentH: detail.scrollHeight,
    screens: +(detail.scrollHeight / H).toFixed(2),
    panelHOverflow: detail.scrollWidth - detail.clientWidth,
    docOverflowX: document.documentElement.scrollWidth - innerWidth,
    fields,
    fullCount: fields.filter((f) => f.full).length,
    partCount: fields.filter((f) => f.part && !f.full).length,
    defTop: (fields.find((f) => f.label === '一句话视觉定义') || {}).top,
    firstScreenChars: visibleChars(),
    promptBtnTop: promptBtn ? rel(promptBtn).top : null,
    summaries, summaryCount: summaries.length,
    maxSummaryH: summaries.length ? Math.max(...summaries.map((s) => s.h)) : 0,
    closedFieldCount: closedFields.length,
    closedFieldNames: closedFields,
    summaryTextAll,
    allOpenH: (() => { const was = details.map((x) => x.open); details.forEach((x) => { x.open = true; }); const h = detail.scrollHeight; details.forEach((x, i) => { x.open = was[i]; }); return h; })(),
    tapSmall,
    bodyOverflow: getComputedStyle(document.body).overflow,
    maxScroll: detail.scrollHeight - detail.clientHeight,
    stepsToLast: Math.max(0, Math.ceil((Math.max(...fields.map((f) => f.bottom)) - H) / (H - headH))),
    lastBottom: Math.max(...fields.map((f) => f.bottom)),
    hasScenesSplit: !!document.body.innerText.match(/不适合|别用在这/),
    hasPalette: /#[0-9A-Fa-f]{6}/.test(document.getElementById('d-body').innerText),
  };
});

console.log(`\n── A. 首屏 1440×900 / S15  (lab=${lab || 'live'}) ──`);
check('A1', '.detail-head 高度 80–120px', d.headH >= 80 && d.headH <= 120, d.headH, '80–120');
check('A2', '首屏完整可见字段数 ≥ 1', d.fullCount >= 1, d.fullCount, '≥1');
check('A3', '「一句话视觉定义」top < 620', d.defTop != null && d.defTop < 620, d.defTop, '<620');
check('A4', '首屏内可见文本字数 ≥ 500', d.firstScreenChars >= 500, d.firstScreenChars, '≥500');
check('A5', '「复制 AI 提示词」top < 250', d.promptBtnTop != null && d.promptBtnTop < 250, d.promptBtnTop, '<250');
check('A6', '首屏出现「一句话视觉定义」', d.fields.some((f) => f.label === '一句话视觉定义' && f.part), d.fields.filter((f) => f.part).map((f) => f.label).join(',') || 'none', '含定义');
check('A7', '首屏含配色值与「不适合/别用在这」', d.hasPalette && d.hasScenesSplit, `palette=${d.hasPalette} unfit=${d.hasScenesSplit}`, 'both');

console.log('\n── B. 深度 ──');
check('B1', 'scrollHeight < 1800', d.contentH < 1800, d.contentH, '<1800');
check('B2', '屏数 < 2.1', d.screens < 2.1, d.screens, '<2.1');
check('B3', '满屏步进到最后字段 ≤ 3 次', d.stepsToLast <= 3, d.stepsToLast, '≤3');
check('B4', '最后字段底部 < 2400', d.lastBottom < 2400, d.lastBottom, '<2400');

console.log('\n── C. 折叠件正确性 ──');
const noCollapse = d.summaryCount === 0;
check('C1', '折叠组数量 3–7 组（含预览器/配件等辅助折叠）', noCollapse ? 'skip' : (d.summaryCount >= 3 && d.summaryCount <= 7), d.summaryCount, '3–7');
check('C2', '8 个被折叠字段名逐个出现在某条 summary 中',
  d.closedFieldCount === 0 ? 'skip' : d.closedFieldNames.every((n) => d.summaryTextAll.includes(n)),
  `${d.closedFieldNames.filter((n) => d.summaryTextAll.includes(n)).length}/${d.closedFieldCount}`, 'all');
check('C3', '被折叠字段数 ≤ 8', noCollapse ? 'skip' : d.closedFieldCount <= 8, d.closedFieldCount, '≤8');
check('C4', '单条 summary 高度 ≤ 120px', noCollapse ? 'skip' : d.maxSummaryH <= 120, d.maxSummaryH, '≤120');
check('C5', '全展开 scrollHeight ≤ 5200', noCollapse ? 'skip' : d.allOpenH <= 5200, d.allOpenH, '≤5200');
check('C7', '所有可点元素高 ≥ 24px', d.tapSmall.length === 0, JSON.stringify(d.tapSmall), 'none <24');

// C6 — folded text still in the browser's text index
await page.send('DOM.enable').catch(() => {});
const TERMS = [['landing', 'shape-rendering'], ['motion', '阻尼'], ['layout', '图例悬挂']];
const idx = {};
for (const [k, term] of TERMS) {
  const r = await page.send('DOM.performSearch', { query: term }).catch(() => ({ resultCount: 0 }));
  idx[k] = r.resultCount;
  if (r.searchId) await page.send('DOM.discardSearchResults', { searchId: r.searchId }).catch(() => {});
}
check('C6', '折叠字段仍在文本索引（每词 resultCount ≥ 1）', Object.values(idx).every((n) => n >= 1), JSON.stringify(idx), '≥1 each');

console.log('\n── C8. 滚动穿透（建议顺手修，现状即有）──');
await page.eval(() => { const x = document.getElementById('detail'); x.scrollTop = x.scrollHeight; });
await page.wheel(500, { step: 200, pauseMs: 60 });
await sleep(350);
const bleed = await page.eval(() => ({ pageY: window.scrollY, bodyOverflow: getComputedStyle(document.body).overflow }));
check('C8', '面板滚到底后继续滚轮，背景页不移动（⚠ 现状即有缺陷，非本方案引入）', bleed.pageY === 0, `pageY=${bleed.pageY} body.overflow=${bleed.bodyOverflow}`, 'pageY=0');

await page.close();

// ── mobile ──────────────────────────────────────────────────────────────────
const mpage = await browser.newPage({ width: 390, height: 844, mobile: true });
await openCase(mpage, 'S15');
const m = await mpage.eval(() => {
  const detail = document.getElementById('detail');
  const headH = document.querySelector('.detail-head').getBoundingClientRect().height;
  const H = detail.clientHeight;
  const dRect = detail.getBoundingClientRect();
  const rel = (el) => { const r = el.getBoundingClientRect(); return { top: +(r.top - dRect.top).toFixed(1), bottom: +(r.bottom - dRect.top).toFixed(1) }; };
  const fields = [...document.querySelectorAll('#d-body .field')].map((el) => {
    const b = rel(el);
    return { label: el.querySelector('dt').textContent.trim(), ...b, full: b.top >= headH && b.bottom <= H };
  });
  const cta = document.querySelector('#d-body button, #d-body a');
  const viewer = document.querySelector('#d-body .viewer, #d-body details');
  const gate = document.querySelector('.gate-box, .lab-meta');
  return {
    docOverflowX: document.documentElement.scrollWidth - innerWidth,
    panelOverflowX: detail.scrollWidth - detail.clientWidth,
    fullCount: fields.filter((f) => f.full).length,
    defTop: (fields.find((f) => f.label === '一句话视觉定义') || {}).top,
    contentH: detail.scrollHeight, H,
    screens: +(detail.scrollHeight / H).toFixed(2),
    topChrome: gate ? rel(gate).bottom : null,
    lastBottom: Math.max(...fields.map((f) => f.bottom)),
  };
});
console.log('\n── D. 移动 390×844 / S15 ──');
check('D1', 'documentElement 无横向滚动', m.docOverflowX === 0, m.docOverflowX, 0);
check('D2', '面板无横向滚动', m.panelOverflowX === 0, m.panelOverflowX, 0);
check('D3', '首屏完整字段数 ≥ 1', m.fullCount >= 1, m.fullCount, '≥1');
check('D4', '「一句话视觉定义」top < 700', m.defTop != null && m.defTop < 700, m.defTop, '<700');
check('D5', '顶部控件（到闸门为止）总高 < 520', m.topChrome != null && m.topChrome < 520, m.topChrome, '<520');
check('D6', '移动 scrollHeight < 2300', m.contentH < 2300, m.contentH, '<2300');
check('D7', '移动屏数 < 2.7', m.screens < 2.7, m.screens, '<2.7');
check('D8', '移动满屏步进到最后字段 ≤ 4 次',
  Math.max(0, Math.ceil((m.lastBottom - m.H) / (m.H - 95))) <= 4,
  Math.max(0, Math.ceil((m.lastBottom - m.H) / (m.H - 95))), '≤4');

// ── E. regressions ──────────────────────────────────────────────────────────
console.log('\n── E. 回归 ──');
const rpage = await browser.newPage({ width: 1440, height: 900 });
await openCase(rpage, 'S15');
const reg = await rpage.eval(() => {
  const out = {};
  const btn = [...document.querySelectorAll('#d-body button')].find((b) => /复制 AI 提示词/.test(b.textContent));
  out.hasCopyBtn = !!btn;
  // keyboard: J moves to next scheme
  const before = document.getElementById('d-no').textContent;
  document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'j', bubbles: true }));
  return { ...out, before };
});
await sleep(500);
const afterKey = await rpage.eval(() => document.getElementById('d-no').textContent);
check('E1', '「复制 AI 提示词」按钮存在', reg.hasCopyBtn, reg.hasCopyBtn, true);
check('E2a', 'J 键换到下一个方案', afterKey !== reg.before, `${reg.before}→${afterKey}`, 'changed');
// fold state resets on scheme switch
const reset = await rpage.eval(() => {
  const d = [...document.querySelectorAll('#detail details')];
  return { total: d.length, open: d.filter((x) => x.open).length };
});
check('E2b', '换方案后折叠回到默认（展开数 = 默认值）', d.summaryCount === 0 ? 'skip' : reset.open <= 2, `open=${reset.open}/${reset.total}`, '≤2');
// 1/2/3 viewport switch
const vpSwitch = await rpage.eval(() => {
  document.body.dispatchEvent(new KeyboardEvent('keydown', { key: '3', bubbles: true }));
  return new Promise((r) => setTimeout(() => {
    const pressed = [...document.querySelectorAll('.viewer-tabs button')].find((b) => b.getAttribute('aria-pressed') === 'true');
    r(pressed ? pressed.textContent.trim() : null);
  }, 400));
});
check('E3', '3 键切到 390×844 档', vpSwitch === '390×844', vpSwitch, '390×844');
// 30 schemes all render 10 fields
await rpage.close();
const all = await (async () => {
  const p = await browser.newPage({ width: 1440, height: 900 });
  await p.goto(srv.origin + '/prototypes/_selection/index.html' + (lab ? '?lab=' + lab : ''), { settleMs: 900 });
  const res = await p.eval(() => {
    const out = [];
    const ids = (window.SCHEMES || []).map((r) => r.id);
    for (const id of ids) {
      window.open && 0;
      document.querySelector('.row[data-id="' + id + '"]')?.click();
      out.push({ id, fields: document.querySelectorAll('#d-body .field').length });
    }
    return { ids: ids.length, bad: out.filter((x) => x.fields !== 11) };
  });
  await p.close();
  return res;
})();
check('E4', '30 案全部渲染 11 个字段（10 个正文字段 + 配色）', all.ids === 30 && all.bad.length === 0, `${all.ids} schemes, bad=${JSON.stringify(all.bad)}`, '30/30');

await browser.close();
await srv.close();

console.log(`\n${'─'.repeat(60)}`);
console.log(`pass ${pass}  fail ${fail}  skip ${skip}`);
if (fail) { console.log('\nfailures:'); failures.forEach((f) => console.log(`  ${f.id} ${f.desc}  actual=${f.actual} expected=${f.expected}`)); }
process.exit(fail ? 1 : 0);
