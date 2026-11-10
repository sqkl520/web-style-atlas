// Route B UI side: open S15 / S01 / S29 via CDP, check the detail panel for the landing field.
import http from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { join, extname, normalize } from 'node:path';
import { Browser } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';

const ROOT = 'D:/Web/style';
const PORT = 9687;
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json; charset=utf-8', '.woff2': 'font/woff2', '.woff': 'font/woff' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/') p = '/prototypes/_selection/index.html';
  const f = normalize(join(ROOT, p));
  if (!f.startsWith(normalize(ROOT)) || !existsSync(f)) { res.writeHead(404); res.end('no'); return; }
  res.writeHead(200, { 'Content-Type': MIME[extname(f)] || 'application/octet-stream' });
  res.end(readFileSync(f));
});
await new Promise((r) => server.listen(PORT, r));
const URL = `http://127.0.0.1:${PORT}/prototypes/_selection/index.html`;
const out = {};

const b = await Browser.launch({ width: 1600, height: 1000 });
const p = await b.newPage({ width: 1600, height: 1000 });
await p.goto(URL, { settleMs: 2600 });

// 注意：cdp.mjs 的 eval 传函数时才会序列化调用；传字符串会被当表达式直接求值。
async function probe(id) {
  return await p.eval(async (sid) => {
    location.hash = '#' + sid;
    await new Promise((r) => setTimeout(r, 900));
    const detail = document.getElementById('detail');
    const body = document.getElementById('d-body');
    const txt = body ? body.innerText : '';
    const labels = Array.prototype.slice.call(document.querySelectorAll('#d-body .fields dt')).map((e) => e.textContent.trim());
    const cands = Array.prototype.slice.call(document.querySelectorAll('#d-body button, #d-body a'));
    const btn = cands.find((e) => (e.textContent || '').indexOf('复制') >= 0);
    const bodyRect = body ? body.getBoundingClientRect() : null;
    const btnRect = btn ? btn.getBoundingClientRect() : null;
    const idx = txt.indexOf('可落地要点');
    return {
      id: sid,
      hidden: detail ? detail.hidden : null,
      labels,
      hasLandingLabel: idx >= 0,
      landingSnippet: idx >= 0 ? txt.slice(idx, idx + 110) : null,
      hasPromptBtn: !!btn,
      promptBtnText: btn ? btn.textContent.trim().slice(0, 24) : null,
      promptBtnOffsetFromBodyTop: btnRect && bodyRect ? Math.round(btnRect.top - bodyRect.top) : null,
      promptBtnInViewport: btnRect ? btnRect.top >= 0 && btnRect.top < window.innerHeight : null,
      bodyTextLen: txt.length,
      detailScrollH: detail ? detail.scrollHeight : null,
      winH: window.innerHeight,
    };
  }, id);
}

for (const id of ['S15', 'S01', 'S29']) {
  out[id] = await probe(id);
  await p.screenshot({ path: `${ROOT}/deliverables/64-verify/shot-${id}.jpg`, quality: 70 });
}
console.log(JSON.stringify(out, null, 1));
await b.close();
server.close();
