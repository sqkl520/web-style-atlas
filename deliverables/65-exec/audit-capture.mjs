// 详情面板 / 行卡实测采集器（CDP 真跑）。
// 用法：node deliverables/65-exec/audit-capture.mjs <out.json> [--shots]
//
// 两个用途：
//   1) 改动前先跑一次存 baseline.json —— 验收第 8 条「面板 scrollHeight ≤ +60px」必须有改动前的原始读数，
//      不能事后用推算的数字冒充实测；
//   2) 改动后再跑一次存 after.json，两个 JSON 逐案相减。
//
// 它只读页面，不写仓库里任何被验收的文件；截图可选（--shots）。
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { Browser, sleep } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { startServer } from '../65-audit/lab/serve.mjs';

const OUT = resolve(process.argv[2] || 'deliverables/65-exec/audit-capture.json');
const SHOTS = !!process.argv.includes('--shots');
const SHOTDIR = resolve('deliverables/65-exec/shots-audit');
mkdirSync(dirname(OUT), { recursive: true });
if (SHOTS) mkdirSync(SHOTDIR, { recursive: true });

// ── 页面内探针：必须自包含（CDP 会把它 toString 后注入）────────────────────────
function probeAll() {
  const d = document.getElementById('detail');
  const head = document.querySelector('.detail-head');
  const headH = head ? head.getBoundingClientRect().height : 0;
  const fields = [...document.querySelectorAll('#d-body .field')].map((el) => {
    const dt = el.querySelector('dt');
    const dd = el.querySelector('dd');
    return {
      label: dt ? dt.textContent.trim() : '',
      text: dd ? dd.textContent : '',
      h: +el.getBoundingClientRect().height.toFixed(1),
    };
  });
  // #d-body 的直接子块顺序：用来断言折叠块落在 risk 与 scenes **之间**
  const order = [...document.querySelectorAll('#d-body > *')].map((el) => {
    const t = el.tagName.toLowerCase();
    if (t === 'dl') {
      return { kind: 'dl', labels: [...el.querySelectorAll('.field > dt')].map((x) => x.textContent.trim()) };
    }
    if (t === 'details') {
      const s = el.querySelector('summary');
      const b = el.querySelector('.fold-body');
      return {
        kind: 'details',
        summary: s ? s.textContent.trim() : '',
        open: !!el.open,
        text: b ? b.textContent : '',
      };
    }
    return { kind: t, cls: String(el.className || '') };
  });
  const details = [...d.querySelectorAll('details')].map((el) => {
    const s = el.querySelector('summary');
    const b = el.querySelector('.fold-body');
    return { summary: s ? s.textContent.trim() : '', open: !!el.open, text: b ? b.textContent : '' };
  });
  return {
    hidden: d.hidden,
    contentH: d.scrollHeight,
    clientH: d.clientHeight,
    headH: +headH.toFixed(1),
    maxScroll: d.scrollHeight - d.clientHeight,
    panelOverflowX: d.scrollWidth - d.clientWidth,
    order,
    fields,
    details,
    // 配色行（label = 当前有效配色）的原始文本，任务 3 的验收直接读它
    palette: (fields.find((f) => f.label === '当前有效配色') || {}).text || null,
    familyField: (fields.find((f) => f.label === '美学家族与参考') || {}).text || null,
    rowFamilyText: (() => {
      const r = document.querySelector('.row[data-id="' + (document.getElementById('d-no').textContent || '') + '"]');
      const f = r && r.querySelector('.row-family');
      return f ? f.textContent : null;
    })(),
  };
}

function probeRows() {
  return [...document.querySelectorAll('.row')].map((row) => {
    const fam = row.querySelector('.row-family');
    const main = row.querySelector('.row-main');
    const meta = row.querySelector('.row-meta');
    return {
      id: row.getAttribute('data-id'),
      rowH: +row.getBoundingClientRect().height.toFixed(1),
      mainH: +main.getBoundingClientRect().height.toFixed(1),
      metaH: +meta.getBoundingClientRect().height.toFixed(1),
      famH: +fam.getBoundingClientRect().height.toFixed(1),
      famText: fam.textContent,
      // 行内横向溢出：family 变长后如果撑出列宽，这里 > 0
      mainOverflowX: main.scrollWidth - main.clientWidth,
    };
  });
}

const IDS = Array.from({ length: 30 }, (_, i) => 'S' + String(i + 1).padStart(2, '0'));
const CASES = [
  { label: 'desktop', w: 1440, h: 900, mobile: false },
  { label: 'mobile', w: 390, h: 844, mobile: true },
];

const srv = await startServer(resolve('.'));
const browser = await Browser.launch();
const out = { at: new Date().toISOString(), url: srv.origin, viewports: [] };
try {
  for (const c of CASES) {
    const page = await browser.newPage({ width: c.w, height: c.h, dsf: 1, mobile: c.mobile });
    await page.goto(srv.origin + '/prototypes/_selection/index.html', { settleMs: 1200 });
    await page.eval('document.fonts.ready.then(() => true)').catch(() => {});
    await sleep(400);
    const rowsBefore = await page.eval(probeRows);
    const vp = { label: c.label, w: c.w, h: c.h, rows: rowsBefore, cases: [] };

    for (const id of IDS) {
      await page.eval((sid) => {
        const row = document.querySelector('.row[data-id="' + sid + '"]');
        if (row) row.click();
        return true;
      }, id);
      await sleep(260);
      const m = await page.eval(probeAll);
      m.id = id;
      vp.cases.push(m);

      if (SHOTS && (id === 'S13' || id === 'S15')) {
        await page.screenshot({ path: join(SHOTDIR, `${c.label}-${c.w}-${id}-closed.jpg`), quality: 86 });
        await page.eval(() => {
          document.querySelectorAll('#detail details').forEach((d) => { d.open = true; });
          const d = document.getElementById('detail');
          d.scrollTop = 0;
          return true;
        });
        await sleep(280);
        await page.screenshot({ path: join(SHOTDIR, `${c.label}-${c.w}-${id}-open.jpg`), quality: 86 });
        await page.eval(() => {
          document.querySelectorAll('#detail details').forEach((d) => { d.open = false; });
          return true;
        });
      }
    }
    // 行卡高度在关掉详情后再测一次：详情打开时 body.detail-open 会压缩台面宽度（≥981px），
    // 那会让行卡列宽变化，不是验收要的场景。
    await page.eval(() => { document.getElementById('d-close').click(); return true; });
    await sleep(200);
    vp.rowsClosed = await page.eval(probeRows);
    out.viewports.push(vp);
    await page.close();
  }
} finally {
  await browser.close();
  await srv.close();
}

writeFileSync(OUT, JSON.stringify(out, null, 2));
console.log('wrote ' + OUT);
for (const v of out.viewports) {
  console.log(`\n=== ${v.label} ${v.w}×${v.h} ===`);
  console.log('  rows 总高(关详情后) ' + v.rowsClosed.reduce((a, r) => a + r.rowH, 0).toFixed(0) +
    ' / 行高 min ' + Math.min(...v.rowsClosed.map((r) => r.rowH)) +
    ' max ' + Math.max(...v.rowsClosed.map((r) => r.rowH)));
  console.log('  面板 contentH 逐案：' + v.cases.map((x) => x.id + '=' + x.contentH).join(' '));
  console.log('  details 数：' + v.cases.map((x) => x.id + '=' + x.details.length).join(' '));
  console.log('  配色行样本 S01：' + JSON.stringify(v.cases[0].palette));
}
