// 验收第 8 条的**隔离**测法。
//
// 为什么不能直接拿改前/改后的 contentH 相减：
// 本轮的 style.css / prompt-copy.js 同时被另一个 Agent 改（复制提示词那两个输入框，
// 实测在面板顶部多出 ≈299px）。直接相减会把别人的 299px 记在我头上，
// 得到的数字既不是我的成本、也没法用来判断"≤ +60px"这条验收。
//
// 做法：在**同一个页面上**做 A/B —— 先把我的三处改动全部撤掉（还原成改前的 DOM），
// 量一次 contentH；再把它们装回去，量一次。两次之间页面其他部分完全没变，
// 差值就是我这一轮的净成本。
//
// 撤掉的三处：
//   1) <details> 折叠块（任务 1）      → 从 #d-body 里删掉 .field-fold
//   2) 配色行的「底色/主色」标签（任务 3）→ 还原成 palette.join('　') + （底色 …）
//   3) 行卡的 family 全文（任务 4）     → 不影响面板，只影响行卡，面板测量里不涉及
import { resolve } from 'node:path';
import { Browser, sleep } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { startServer } from '../65-audit/lab/serve.mjs';
import { readFileSync, writeFileSync } from 'node:fs';

const OUT = 'deliverables/65-exec/audit-isolate.json';
const load = (p) => JSON.parse(readFileSync(p, 'utf8').replace(/^[\s\S]*?window\.SCHEMES\s*=\s*/, '').replace(/;\s*$/, ''));
const B = load('prototypes/_selection/data.js');
const byId = Object.fromEntries(B.map((r) => [r.id, r]));
const IDS = B.map((r) => r.id);

const openCase = (id) => {
  const row = document.querySelector('.row[data-id="' + id + '"]');
  if (row) row.click();
  return !document.getElementById('detail').hidden;
};

const measure = () => {
  const d = document.getElementById('detail');
  const fold = d.querySelector('.field-fold');
  const dd = [...d.querySelectorAll('.field')].filter((f) => (f.querySelector('dt') || {}).textContent === '当前有效配色')[0];
  return {
    contentH: d.scrollHeight,
    clientH: d.clientHeight,
    foldH: fold ? +fold.getBoundingClientRect().height.toFixed(1) : 0,
    foldTextLen: fold ? (fold.querySelector('.fold-body') || {}).textContent.length : 0,
    foldOpen: fold ? !!fold.querySelector('details').open : null,
    summary: fold ? fold.querySelector('summary').textContent : null,
    paletteH: dd ? +dd.getBoundingClientRect().height.toFixed(1) : 0,
    paletteText: dd ? dd.querySelector('dd').textContent : null,
    overflowX: d.scrollWidth - d.clientWidth,
  };
};

// 把「改前」形态装回去（只在页面里改 DOM，不落盘）
const revertMine = (arg) => {
  const byIdMap = arg.byId;
  const d = document.getElementById('detail');
  const id = document.getElementById('d-no').textContent;
  const r = byIdMap[id] || {};
  // 1) 删掉折叠块
  [...d.querySelectorAll('.field-fold')].forEach((el) => el.remove());
  // 2) 配色行还原成改前拼法
  const dd = [...d.querySelectorAll('.field dd')].filter((x, i) => {
    const dt = x.parentNode.querySelector('dt');
    return dt && dt.textContent === '当前有效配色';
  })[0];
  if (dd && r.palette) {
    dd.textContent = r.palette.join('\u3000') + (r.bg ? '\u3000（底色 ' + r.bg + '）' : '');
  }
  return true;
};

const srv = await startServer(resolve('.'));
const browser = await Browser.launch();
const out = { at: new Date().toISOString(), cases: [] };
try {
  for (const vp of [{ label: 'desktop', w: 1440, h: 900 }, { label: 'mobile', w: 390, h: 844, m: true }]) {
    const page = await browser.newPage({ width: vp.w, height: vp.h, dsf: 1, mobile: !!vp.m });
    await page.goto(srv.origin + '/prototypes/_selection/index.html', { settleMs: 1200 });
    await page.eval('document.fonts.ready.then(() => true)').catch(() => {});
    await sleep(400);
    for (const id of IDS) {
      await page.eval(openCase, id);
      await sleep(150);
      const after = await page.eval(measure);          // 我的改动在场
      await page.eval(revertMine, { byId: byId });     // 撤掉我的改动
      await sleep(120);
      const before = await page.eval(measure);
      out.cases.push({
        vp: vp.label, id,
        beforeH: before.contentH, afterH: after.contentH,
        delta: after.contentH - before.contentH,
        foldH: after.foldH, foldTextLen: after.foldTextLen, foldOpen: after.foldOpen,
        summary: after.summary,
        paletteH_before: before.paletteH, paletteH_after: after.paletteH,
        paletteBefore: before.paletteText, paletteAfter: after.paletteText,
        overflowX: after.overflowX,
      });
      await page.eval(() => { document.getElementById('d-close').click(); return true; });
      await sleep(60);
    }
    await page.close();
  }
} finally { await browser.close(); await srv.close(); }

writeFileSync(OUT, JSON.stringify(out, null, 2));
console.log('=== 验收第 8 条：我的净成本（同页 A/B，逐案）===');
for (const vp of ['desktop', 'mobile']) {
  const g = out.cases.filter((x) => x.vp === vp);
  const ds = g.map((x) => x.delta);
  const folds = g.map((x) => x.foldH);
  console.log(`\n[${vp}] 面板 scrollHeight 增量：min ${Math.min(...ds)} / p50 ${ds.slice().sort((a, b) => a - b)[15]} / max ${Math.max(...ds)}`);
  console.log(`  折叠块高度：min ${Math.min(...folds)} / max ${Math.max(...folds)}（30 案）`);
  console.log('  逐案 Δ：' + g.map((x) => x.id + '+' + x.delta).join(' '));
  console.log('  配色行高度 before/after 一致的案数：' +
    g.filter((x) => Math.abs(x.paletteH_after - x.paletteH_before) < 0.5).length + '/30');
  console.log('  面板横向溢出 max：' + Math.max(...g.map((x) => x.overflowX)));
}
console.log('\n=== S13 / S15 的配色行与折叠块 ===');
for (const c of out.cases.filter((x) => x.vp === 'desktop' && (x.id === 'S13' || x.id === 'S15'))) {
  console.log(`\n[${c.id}] summary=${JSON.stringify(c.summary)} foldH=${c.foldH} open=${c.foldOpen} Δ=${c.delta}`);
  console.log(`  配色 before: ${c.paletteBefore}`);
  console.log(`  配色 after : ${c.paletteAfter}`);
}
