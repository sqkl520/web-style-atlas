/* 量我的改动给详情面板加了多少高度、第一个字段被推下多少。
 *
 * 为什么要单独量：65-exec 有另一个 Agent 的 panel-measure.mjs 在追「用户点开详情后，
 * 900px 视口里第一眼能到哪」。我在 #d-body 最顶部插了两个输入框，
 * 直接抬高它下面所有内容的 top —— 那是它的指标，我不能装作没影响。
 *
 * 跑：node deliverables/65-exec/measure-panel-cost.mjs
 */
import http from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { join, extname, normalize } from 'node:path';
import { Browser } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';

const ROOT = 'D:/Web/style';
const PORT = 9726;
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.jpg': 'image/jpeg', '.png': 'image/png',
  '.svg': 'image/svg+xml', '.json': 'application/json; charset=utf-8',
  '.woff2': 'font/woff2', '.woff': 'font/woff',
};
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/') p = '/prototypes/_selection/index.html';
  const f = normalize(join(ROOT, p));
  if (!f.startsWith(normalize(ROOT)) || !existsSync(f)) { res.writeHead(404); res.end('no'); return; }
  res.writeHead(200, { 'Content-Type': MIME[extname(f)] || 'application/octet-stream' });
  res.end(readFileSync(f));
});
await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
const URL = `http://127.0.0.1:${PORT}/prototypes/_selection/index.html`;

const b = await Browser.launch({ width: 1440, height: 900 });

function measureIn(PROBE) {
  const detail = document.getElementById('detail');
  const dRect = detail.getBoundingClientRect();
  const st = detail.scrollTop;
  const rel = (el) => {
    const r = el.getBoundingClientRect();
    return { top: +(r.top - dRect.top + st).toFixed(1), h: +r.height.toFixed(1) };
  };
  const cta = document.querySelector('.prompt-cta');
  const fills = document.querySelectorAll('.prompt-f-input').length;
  const firstField = document.querySelector('#d-body .field');
  const out = {
    panelContentH: detail.scrollHeight,
    panelClientH: detail.clientHeight,
    ctaH: cta ? rel(cta).h : 0,
    fills,
    firstFieldTop: firstField ? rel(firstField).top : null,
    btnTopInViewport: (() => {
      const btn = document.querySelector('.prompt-copy');
      const r = btn.getBoundingClientRect();
      return Math.round(r.top);
    })(),
  };
  /* 再量一次「把我的新增藏起来」的状态 —— 那就是改动前面板的样子。
   * 为什么不在磁盘上留一份旧 index.html：这个仓库已经因为"两份副本静默分叉"付过代价，
   * 同一进程内切换 display 是唯一不会产生第二份真源的做法。 */
  const hide = document.createElement('style');
  hide.id = '__measure-hide-fill';
  hide.textContent = '.prompt-fill,.prompt-fill-note{display:none!important}';
  document.head.appendChild(hide);
  const cta2 = document.querySelector('.prompt-cta');
  out.ctaHWithoutFill = cta2 ? rel(cta2).h : 0;
  out.firstFieldTopWithoutFill = firstField ? rel(firstField).top : null;
  out.panelContentHWithoutFill = detail.scrollHeight;
  hide.remove();
  return out;
}

const rows = [];
for (const vp of [[1440, 900], [390, 844]]) {
  for (const id of ['S01', 'S16', 'S30']) {
    const p = await b.newPage({ width: vp[0], height: vp[1] });
    await p.goto(URL + '#' + id, { settleMs: 2200 });
    const m = await p.eval(measureIn);
    rows.push({ vp: vp.join('×'), id, ...m });
    await p.close();
  }
}
console.log('视口      案号  面板内容高(改后/改前)  提示词块高(改后/改前)  首字段top(改后/改前)  按钮top');
for (const r of rows) {
  console.log(r.vp.padEnd(9) + r.id + '  ' +
    String(r.panelContentH).padStart(6) + '/' + String(r.panelContentHWithoutFill).padStart(6) +
    String(r.ctaH).padStart(12) + '/' + String(r.ctaHWithoutFill).padStart(6) +
    String(r.firstFieldTop).padStart(14) + '/' + String(r.firstFieldTopWithoutFill).padStart(6) +
    String(r.btnTopInViewport).padStart(10));
}
console.log('');
console.log('净增高度（面板内容）：' + rows.map((r) => r.id + ' ' + (r.panelContentH - r.panelContentHWithoutFill)).join(' | '));
console.log('净增高度（首字段被推下）：' + rows.map((r) => r.id + ' ' + (r.firstFieldTop - r.firstFieldTopWithoutFill)).join(' | '));
console.log('按钮始终在视口内（top>=0 即首屏可见）：' + rows.every((r) => r.btnTopInViewport >= 0));
await b.close();
server.close();
