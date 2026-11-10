// 验收 1–8 的实跑脚本。全部读数来自真实 Chromium（CDP）+ 磁盘上的 data.js。
// 用法：node deliverables/65-exec/accept-audit.mjs
//
// 每一条都会打印 PASS/FAIL 与原始读数，FAIL 时进程退出码为 1。
import { resolve, join } from 'node:path';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { Browser, sleep } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { startServer } from '../65-audit/lab/serve.mjs';

const SHOTS = resolve('deliverables/65-exec/shots-audit');
mkdirSync(SHOTS, { recursive: true });

const load = (p) => JSON.parse(readFileSync(p, 'utf8').replace(/^[\s\S]*?window\.SCHEMES\s*=\s*/, '').replace(/;\s*$/, ''));
const B = load('prototypes/_selection/data.js');
const byId = Object.fromEntries(B.map((r) => [r.id, r]));
const IDS = B.map((r) => r.id);

let fails = 0;
const ok = (cond, label, extra) => {
  if (!cond) fails++;
  console.log(`  ${cond ? 'PASS' : 'FAIL'}  ${label}${extra === undefined ? '' : '  ' + extra}`);
};

const openCase = (id) => {
  const row = document.querySelector('.row[data-id="' + id + '"]');
  if (row) row.click();
  return !document.getElementById('detail').hidden;
};

// 展开：点 summary 的父级 details（用 .open = true 模拟不了用户点击，所以直接派发 click）
const expandFold = () => {
  const d = document.querySelector('#detail .field-fold details');
  if (!d) return null;
  const s = d.querySelector('summary');
  s.click();
  return d.open;
};
const collapseFold = () => {
  const d = document.querySelector('#detail .field-fold details');
  if (d && d.open) d.querySelector('summary').click();
  return d ? d.open : null;
};

// 量折叠块的完整状态（含展开后的字数、与原文是否逐字相同）
const probeFold = () => {
  const d = document.querySelector('#detail .field-fold details');
  if (!d) return null;
  const s = d.querySelector('summary');
  const body = d.querySelector('.fold-body');
  const det = document.getElementById('detail');
  return {
    summary: s.textContent,
    open: d.open,
    textLen: body.textContent.length,
    text: body.textContent,
    contentH: det.scrollHeight,
    // 位置断言用：折叠块前后两个 field 的 label
    prevLabel: (() => {
      const dl = d.closest('.fields');
      const kids = [...dl.children];
      const i = kids.indexOf(d.closest('.field-fold'));
      const p = kids[i - 1], n = kids[i + 1];
      return p ? p.querySelector('dt').textContent : null;
    })(),
    nextLabel: (() => {
      const dl = d.closest('.fields');
      const kids = [...dl.children];
      const i = kids.indexOf(d.closest('.field-fold'));
      const n = kids[i + 1];
      return n ? n.querySelector('dt').textContent : null;
    })(),
    isFieldChild: d.closest('.field-fold').parentNode.tagName.toLowerCase() === 'dl',
    // 展开态的高度代价
    expandedH: null,
    overflowX: det.scrollWidth - det.clientWidth,
  };
};

const probePalette = () => {
  const fields = [...document.querySelectorAll('#detail .field')];
  const el = fields.filter((f) => (f.querySelector('dt') || {}).textContent === '当前有效配色')[0];
  if (!el) return null;
  return { text: el.querySelector('dd').textContent, h: +el.getBoundingClientRect().height.toFixed(1) };
};

const srv = await startServer(resolve('.'));
const browser = await Browser.launch();
const report = { at: new Date().toISOString(), items: {} };
try {
  for (const vp of [
    { label: 'desktop', w: 1440, h: 900 },
    { label: 'mobile', w: 390, h: 844, m: true },
  ]) {
    const page = await browser.newPage({ width: vp.w, height: vp.h, dsf: 1, mobile: !!vp.m });
    await page.goto(srv.origin + '/prototypes/_selection/index.html', { settleMs: 1200 });
    await page.eval('document.fonts.ready.then(() => true)').catch(() => {});
    await sleep(400);
    console.log(`\n############ ${vp.label} ${vp.w}×${vp.h} ############`);

    const rows = [];
    // ── 验收 6：截图（每档抽 S13 / S15，折叠态 + 展开态）────────────────────
    for (const id of IDS) {
      await page.eval(openCase, id);
      await sleep(170);
      const closed = await page.eval(probeFold);
      const pal = await page.eval(probePalette);
      // 展开
      const openState = await page.eval(expandFold);
      await sleep(140);
      const opened = await page.eval(probeFold);
      await page.eval(collapseFold);
      await sleep(80);
      rows.push({ id, closed, opened, pal, openState });

      if (id === 'S13' || id === 'S15') {
        await page.eval(() => { const d = document.getElementById('detail'); d.scrollTop = 0; return d.scrollTop; });
        await sleep(180);
        await page.screenshot({ path: join(SHOTS, `${vp.label}-${vp.w}-${id}-a-collapsed.jpg`), quality: 88 });
        // 滚到折叠块，截展开态
        await page.eval(() => {
          const f = document.querySelector('#detail .field-fold');
          if (f) f.querySelector('summary').click();
          const d = document.getElementById('detail');
          if (f) d.scrollTop = f.getBoundingClientRect().top - d.getBoundingClientRect().top + d.scrollTop - 120;
          return true;
        });
        await sleep(220);
        await page.screenshot({ path: join(SHOTS, `${vp.label}-${vp.w}-${id}-b-expanded.jpg`), quality: 88 });
        await page.eval(() => {
          const f = document.querySelector('#detail .field-fold');
          if (f && f.querySelector('details').open) f.querySelector('summary').click();
          return true;
        });
      }
    }
    await page.close();
    report.items[vp.label] = rows;

    // ── 验收 1：30 案都有折叠块，summary 的 N 正确 ────────────────────────
    console.log('\n[验收 1] 30 案折叠块 + summary N');
    const noFold = rows.filter((r) => !r.closed);
    ok(noFold.length === 0, '每个案都有「去 AI 味审查点」折叠块', `${rows.length - noFold.length}/30`);
    const badLabel = rows.filter((r) => r.closed && !/^去 AI 味审查点（\d+ 条）$/.test(r.closed.summary));
    ok(badLabel.length === 0, 'summary 文本形如「去 AI 味审查点（N 条）」',
      badLabel.length ? badLabel.map((r) => r.id + '=' + r.closed.summary).join(';') : '');
    // N 的正确值：按数据独立算一遍（不复用 app.js 的函数）
    const CIRCLED = '①②③④⑤⑥⑦⑧⑨⑩';
    const expectedN = (t) => {
      const circ = [...t].filter((c) => CIRCLED.includes(c)).length;
      const di = (t.match(/第[一二三四五六七八九十][，,、]/g) || []).length;
      const full = new Set((t.match(/（\d+）/g) || []).map((x) => x.replace(/[（）]/g, '')));
      let run = 0; while (full.has(String(run + 1))) run++;
      return Math.max(circ, di, run);
    };
    const nWrong = rows.filter((r) => {
      const m = /（(\d+) 条）/.exec(r.closed.summary);
      const t = r.id === 'S13' ? byId.S13.audit.slice(0, byId.S13.audit.indexOf('反套路改造三指标')) : byId[r.id].audit;
      return !m || +m[1] !== expectedN(t);
    });
    ok(nWrong.length === 0, 'summary 的 N 与内容编号符一致',
      nWrong.length ? nWrong.map((r) => r.id + ' 期望' + expectedN(byId[r.id].audit) + ' 实得' + r.closed.summary).join(';') : '');
    console.log('  summary 逐案：' + rows.map((r) => r.id + ' ' + r.closed.summary.replace('去 AI 味审查点', '')).join(' | '));

    // ── 验收 5：默认收起 ─────────────────────────────────────────────
    console.log('\n[验收 5] 折叠块默认收起');
    ok(rows.every((r) => r.closed.open === false), 'details.open === false（30/30 刚打开时）',
      rows.filter((r) => r.closed.open === true).map((r) => r.id).join(',') || '');
    ok(rows.every((r) => r.openState === true), '点 summary 后 open 变 true（可展开）',
      rows.filter((r) => r.openState !== true).map((r) => r.id).join(',') || '');

    // ── 验收 2：S13 切分 ─────────────────────────────────────────────
    console.log('\n[验收 2] S13 显示 307 字，不含评审工件字样');
    const s13 = rows.find((r) => r.id === 'S13');
    const s13Expect = byId.S13.audit.slice(0, byId.S13.audit.indexOf('反套路改造三指标'));
    ok(s13.opened.textLen === 307, 'S13 展开后字数 = 307', '实测 ' + s13.opened.textLen);
    ok(s13.opened.text === s13Expect, 'S13 展开后与前 307 字逐字相同');
    ok(!/打勾|供 V-11|反套路改造三指标|必须存在 X|必须不存在 Y|必须可测量 Z/.test(s13.opened.text),
      'S13 展开后不含「打勾 / 供 V-11 / 反套路改造三指标 / 必须存在 X」等字样');
    console.log('  S13 展开后全文：' + JSON.stringify(s13.opened.text));

    // ── 验收 3：其余 29 案展开后与 data.js 逐字相同 ────────────────────
    console.log('\n[验收 3] 其余 29 案展开后 = data.js 原文');
    const others = rows.filter((r) => r.id !== 'S13');
    const diff = others.filter((r) => r.opened.text !== byId[r.id].audit);
    ok(diff.length === 0, '逐字相同（不含 S13）', `${others.length - diff.length}/29`);
    ok(others.length === 29, '其余 29 案都测到了', String(others.length));
    if (diff.length) diff.forEach((r) => console.log('   差异 ' + r.id + ' 长度 ' + r.opened.textLen + ' vs ' + byId[r.id].audit.length));

    // ── 验收 4：配色行有「主色」标签 ──────────────────────────────────
    console.log('\n[验收 4] 配色行的「底色 / 主色」标签');
    const palRows = rows.map((r) => ({ id: r.id, ...r.pal, len: byId[r.id].palette.length }));
    const need = palRows.filter((x) => x.len >= 2);
    const miss = need.filter((x) => !/^底色 [^　]+　主色 [^　]+/.test(x.text));
    ok(miss.length === 0, 'palette 长度 ≥2 的案都印出「底色 … 主色 …」', `${need.length - miss.length}/${need.length}`);
    const lost = need.filter((x) => !byId[x.id].palette.every((h) => x.text.includes(h)));
    ok(lost.length === 0, '每个 HEX 都还在（没被标签挤掉）', lost.length ? lost.map((x) => x.id).join(',') : '');
    const mainOk = need.filter((x) => x.text.includes('主色 ' + byId[x.id].palette[1]));
    ok(mainOk.length === need.length, '「主色」后面跟的确实是 palette[1]', `${mainOk.length}/${need.length}`);
    console.log('  抽样 3 案：');
    for (const id of ['S01', 'S15', 'S07']) {
      const x = palRows.find((y) => y.id === id);
      console.log(`    ${id} len=${x.len} → ${x.text}`);
    }

    // ── 验收 8：面板高度净成本（同页 A/B）────────────────────────────
    console.log('\n[验收 8] 面板 scrollHeight 的净成本（复用 audit-isolate.json 的实跑值）');
    const iso = JSON.parse(readFileSync('deliverables/65-exec/audit-isolate.json', 'utf8'));
    const g = iso.cases.filter((x) => x.vp === vp.label);
    const ds = g.map((x) => x.delta);
    ok(Math.max(...ds) <= 60, '折叠态每案增量 ≤ +60px', `min ${Math.min(...ds)} / max ${Math.max(...ds)}`);
    console.log('  逐案 Δ：' + g.map((x) => x.id + '+' + x.delta).join(' '));

    // 位置断言：折叠块夹在 risk 与 scenes 之间
    console.log('\n[位置] 折叠块在「反 AI 味风险与规避」之后、「适用场景」之前');
    ok(rows.every((r) => r.closed.prevLabel === '反 AI 味风险与规避'), '前一个字段是 risk',
      [...new Set(rows.map((r) => r.closed.prevLabel))].join(','));
    ok(rows.every((r) => r.closed.nextLabel === '适用场景'), '后一个字段是 scenes',
      [...new Set(rows.map((r) => r.closed.nextLabel))].join(','));
    ok(rows.every((r) => r.closed.isFieldChild), '折叠块是 <dl class="fields"> 的直接子项（DIV 包裹），未破内容模型');
  }
} finally {
  await browser.close();
  await srv.close();
}

writeFileSync('deliverables/65-exec/accept-audit.json', JSON.stringify(report, null, 2));
console.log('\n############ 汇总 ############');
console.log(fails === 0 ? '全部 PASS' : `FAIL ${fails} 条`);
process.exitCode = fails === 0 ? 0 : 1;
