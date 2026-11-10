// 量化"路 A"的代价：把 8 处单边 1px 全改 2px，在浏览器里注入同一条覆盖规则，
// 量详情面板高度 / 首字段位置 / 列表首屏。不改文件。
import { Browser } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { createServer } from 'node:http';
import { createReadStream, statSync } from 'node:fs';
import { resolve, join, extname, sep } from 'node:path';

const ROOT = resolve('.');
const server = createServer((req, res) => {
  try {
    let f = resolve(join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname)));
    if (f !== ROOT && !f.startsWith(ROOT + sep)) { res.writeHead(403); return res.end(); }
    if (statSync(f).isDirectory()) f = join(f, 'index.html');
    res.writeHead(200, { 'content-type': extname(f) === '.css' ? 'text/css; charset=utf-8' : extname(f) === '.js' ? 'text/javascript; charset=utf-8' : 'text/html; charset=utf-8', 'content-length': statSync(f).size });
    createReadStream(f).pipe(res);
  } catch { res.writeHead(404); res.end('x'); }
});
await new Promise((r) => server.listen(8243, '127.0.0.1', r));

// 8 处单边 1px 的等价选择器（全改 2px）
const ROUTE_A = `
.tpl-card{border-top-width:2px}
.viewer-tabs button:last-child{border-right-width:2px}
.field{border-bottom-width:2px}
.field-fold{border-bottom-width:2px}
.parts li{border-bottom-width:2px}
.prompt-fill{border-top-width:2px}
.mast-fold{border-top-width:2px}
.mast-facts{border-top-width:2px}
`;

const MEASURE_LIST = () => {
  const rows = [...document.querySelectorAll('.ledger .row')];
  const vh = innerHeight;
  const boxes = rows.map((r) => r.getBoundingClientRect());
  return {
    firstTop: +boxes[0].top.toFixed(1), firstH: +boxes[0].height.toFixed(1), firstBottom: +boxes[0].bottom.toFixed(1),
    complete: boxes.filter((b) => b.top >= -0.5 && b.bottom <= vh + 0.5).length,
    docH: document.documentElement.scrollHeight,
    ovX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  };
};

// 打开第一行详情，量面板：内容高、首字段 top、字段数、.parts 高
const MEASURE_DETAIL = async () => {
  const row = document.querySelector('.ledger .row');
  row.click();
  await new Promise((r) => setTimeout(r, 600));
  const d = document.querySelector('#detail');
  const body = document.querySelector('#d-body');
  const fields = [...document.querySelectorAll('#d-body .field')];
  const parts = [...document.querySelectorAll('#d-body .parts li')];
  const head = document.querySelector('.detail-head');
  return {
    hidden: d.hidden,
    bodyScrollH: body.scrollHeight,
    bodyClientH: body.clientHeight,
    fieldCount: fields.length,
    firstFieldTop: fields.length ? +fields[0].getBoundingClientRect().top.toFixed(1) : null,
    partsCount: parts.length,
    partsH: parts.length ? +document.querySelector('#d-body .parts').getBoundingClientRect().height.toFixed(1) : null,
    headH: +head.getBoundingClientRect().height.toFixed(1),
    panelScrollH: d.scrollHeight,
  };
};

const browser = await Browser.launch({ width: 1440, height: 900 });
const out = {};
for (const vp of [{ k: '1440', w: 1440, h: 900, mobile: false }, { k: '390', w: 390, h: 844, mobile: true }]) {
  out[vp.k] = {};
  for (const variant of ['B', 'A']) {
    const p = await browser.newPage({ width: vp.w, height: vp.h, dsf: 1, mobile: vp.mobile });
    await p.goto('http://127.0.0.1:8243/prototypes/_selection/', { settleMs: 1600 });
    if (vp.k === '390') {
      // 390 档列表先量，再开详情
      await p.eval(`(async()=>{const s=document.querySelector('#sort');s.value='gate';s.dispatchEvent(new Event('change',{bubbles:true}));})()`);
      await new Promise((r) => setTimeout(r, 300));
    }
    if (variant === 'A') await p.eval(`(()=>{const st=document.createElement('style');st.textContent=${JSON.stringify(ROUTE_A)};document.head.appendChild(st);return true;})()`);
    await new Promise((r) => setTimeout(r, 200));
    const list = await p.eval(MEASURE_LIST);
    const det = await p.eval(MEASURE_DETAIL);
    out[vp.k][variant] = { list, det };
    await p.close();
  }
}
await browser.close(); server.close();

for (const k of ['1440', '390']) {
  const B = out[k].B, A = out[k].A;
  console.log(`\n===== ${k} （B=现状 1px，A=全改 2px）=====`);
  console.log(`  列表(排序=gate) 首卡 top  ${B.list.firstTop} → ${A.list.firstTop}   (Δ${(A.list.firstTop - B.list.firstTop).toFixed(1)})`);
  console.log(`                 首卡 bottom ${B.list.firstBottom} → ${A.list.firstBottom}   完整卡 ${B.list.complete} → ${A.list.complete}`);
  console.log(`                 docH ${B.list.docH} → ${A.list.docH} (Δ${A.list.docH - B.list.docH})`);
  console.log(`  详情面板       body.scrollH ${B.det.bodyScrollH} → ${A.det.bodyScrollH} (Δ${A.det.bodyScrollH - B.det.bodyScrollH})`);
  console.log(`                 首字段 top   ${B.det.firstFieldTop} → ${A.det.firstFieldTop} (Δ${(A.det.firstFieldTop - B.det.firstFieldTop).toFixed(1)})`);
  console.log(`                 字段数 ${B.det.fieldCount}  .parts li ${B.det.partsCount}  .parts 高 ${B.det.partsH} → ${A.det.partsH}`);
  console.log(`                 panel.scrollH ${B.det.panelScrollH} → ${A.det.panelScrollH} (Δ${A.det.panelScrollH - B.det.panelScrollH})`);
}
