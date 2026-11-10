// 探针 11：真 Chromium 实测详情面板 —— 自己量 2991px、按钮位置、首屏可见字段数。
// 不引用 Lead 的数，全部现测。
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { Browser, sleep } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { startServer } from '../65-audit/lab/serve.mjs';

const REPO = 'D:\\Web\\style';
const OUT = join(REPO, 'deliverables/65-plan/_rt_out');
mkdirSync(OUT, { recursive: true });

function probe(arg) {
  const detail = document.getElementById('detail');
  const dRect = detail.getBoundingClientRect();
  const st = detail.scrollTop;
  const head = document.querySelector('.detail-head');
  const headH = head ? head.getBoundingClientRect().height : 0;
  const clientH = detail.clientHeight;
  const clientW = detail.clientWidth;
  const contentH = detail.scrollHeight;

  const boxTop = (el) => {
    const r = el.getBoundingClientRect();
    return +(r.top - dRect.top + st).toFixed(1);
  };
  const boxH = (el) => +el.getBoundingClientRect().height.toFixed(1);

  const fields = [...document.querySelectorAll('#d-body .field')].map((el, i) => {
    const dt = el.querySelector('dt');
    const dd = el.querySelector('dd');
    const top = boxTop(el), h = boxH(el);
    // 首屏可见字符数：逐字测 rect
    let chars = 0, inFirst = 0;
    const target = dd || el;
    const walker = document.createTreeWalker(target, NodeFilter.SHOW_TEXT);
    const range = document.createRange();
    while (walker.nextNode()) {
      const node = walker.currentNode;
      const text = node.nodeValue || '';
      for (let k = 0; k < text.length; k++) {
        if (!/\S/.test(text[k])) continue;
        chars++;
        range.setStart(node, k); range.setEnd(node, k + 1);
        const r = range.getBoundingClientRect();
        if (!r.height && !r.width) continue;
        const t = r.top - dRect.top, b = r.bottom - dRect.top;
        if (b > headH && t < clientH) inFirst++;
      }
    }
    return {
      i, label: dt ? dt.textContent.trim() : '', top, h, chars, inFirst,
      visible: top + h <= clientH ? 'full' : top < clientH ? 'partial' : 'none',
      screensBelow: +((top - clientH + headH) / (clientH - headH)).toFixed(2),
    };
  });

  const btn = document.querySelector('#d-body .prompt-cta') || document.querySelector('.prompt-cta');
  const btnTop = btn ? boxTop(btn) : null;

  return {
    panel: { clientH, clientW, contentH, headH: +headH.toFixed(1), screens: +(contentH / clientH).toFixed(2) },
    copyButtonTop: btnTop,
    copyButtonInFirstScreen: btnTop != null ? btnTop < clientH - headH : null,
    fields,
    totalFieldChars: fields.reduce((a, f) => a + f.chars, 0),
    charsInFirstScreen: fields.reduce((a, f) => a + f.inFirst, 0),
    affordances: {
      details: detail.querySelectorAll('details').length,
      summary: detail.querySelectorAll('summary').length,
      ariaExpanded: detail.querySelectorAll('[aria-expanded]').length,
      nav: detail.querySelectorAll('nav').length,
      inPageAnchorLinks: detail.querySelectorAll('a[href^="#"]').length,
    },
  };
}

const srv = await startServer(REPO);
const browser = await Browser.launch();
const out = { at: new Date().toISOString(), url: srv.origin, rows: [] };
try {
  const page = await browser.newPage({ width: 1440, height: 900, dsf: 1 });
  await page.goto(srv.origin + '/prototypes/_selection/index.html', { settleMs: 1200 });
  await page.eval('document.fonts.ready.then(()=>true)').catch(() => {});
  await sleep(600);
  const ids = await page.eval(() => [...document.querySelectorAll('.row')].map((r) => r.getAttribute('data-id')));
  for (const id of ids) {
    await page.eval((sid) => {
      const row = document.querySelector('.row[data-id="' + sid + '"]');
      if (row) row.click();
      return true;
    }, id);
    await sleep(420);
    const m = await page.eval(probe);
    m.id = id;
    out.rows.push(m);
  }
  await page.close();
} finally {
  await browser.close();
  await srv.close();
}

writeFileSync(join(OUT, 'panel-measure.json'), JSON.stringify(out, null, 1), 'utf8');

console.log('=== 详情面板实测（1440×900，逐案点开）===');
console.log('id  contentH  clientH  screens  第1屏可见字段  字段总字数  首屏字数  复制按钮 top  首屏?');
const sorted = out.rows.slice().sort((a, b) => b.panel.contentH - a.panel.contentH);
for (const r of out.rows) {
  const visFields = r.fields.filter((f) => f.visible !== 'none').length;
  console.log(`${r.id}  ${String(r.panel.contentH).padStart(8)}  ${String(r.panel.clientH).padStart(7)}  ${String(r.panel.screens).padStart(6)}  ${String(visFields).padStart(12)}  ${String(r.totalFieldChars).padStart(10)}  ${String(r.charsInFirstScreen).padStart(8)}  ${String(r.copyButtonTop).padStart(12)}  ${r.copyButtonInFirstScreen ? '✔' : '✗'}`);
}

const hs = out.rows.map((r) => r.panel.contentH).sort((a, b) => a - b);
console.log('');
console.log('contentH: 最小 ' + hs[0] + '｜中位 ' + hs[15] + '｜最大 ' + hs[hs.length - 1]);
const sc = out.rows.map((r) => r.panel.screens).sort((a, b) => a - b);
console.log('screens : 最小 ' + sc[0] + '｜中位 ' + sc[15] + '｜最大 ' + sc[sc.length - 1]);
console.log('2991px 附近的案：' + out.rows.filter((r) => Math.abs(r.panel.contentH - 2991) < 250).map((r) => r.id + '=' + r.panel.contentH).join(' ') || '无');
console.log('面板高度最大值案：' + sorted[0].id + ' = ' + sorted[0].panel.contentH + 'px（' + sorted[0].panel.screens + ' 屏）');
console.log('');
console.log('复制提示词按钮 top 分布：最小 ' + Math.min(...out.rows.map((r) => r.copyButtonTop)) + '｜最大 ' + Math.max(...out.rows.map((r) => r.copyButtonTop)));
console.log('按钮在首屏内的案：' + out.rows.filter((r) => r.copyButtonInFirstScreen).length + '/30');
console.log('');
console.log('=== 首屏可见字段数分布 ===');
const vf = {};
for (const r of out.rows) { const n = r.fields.filter((f) => f.visible !== 'none').length; vf[n] = (vf[n] || 0) + 1; }
for (const [n, c] of Object.entries(vf).sort((a, b) => a[0] - b[0])) console.log(`  ${n} 个字段：${c} 案`);
console.log('字段总数：' + out.rows[0].fields.length);
console.log('');
console.log('=== 折叠/跳转构件（全案合计）===');
const agg = out.rows.reduce((a, r) => { for (const k of Object.keys(r.affordances)) a[k] = (a[k] || 0) + r.affordances[k]; return a; }, {});
console.log(JSON.stringify(agg));
console.log('');
console.log('=== 最深的案 S15 字段明细 ===');
const s15 = out.rows.find((r) => r.id === 'S15');
for (const f of s15.fields) console.log(`  ${String(f.i).padStart(2)} ${f.label.padEnd(18)} top=${String(f.top).padStart(7)} h=${String(f.h).padStart(6)} 字数=${String(f.chars).padStart(4)} 首屏内=${String(f.inFirst).padStart(4)} ${f.visible}`);
