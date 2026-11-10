import http from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, extname, normalize } from 'node:path';
import { Browser } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
const ROOT = 'D:/Web/style'; const PORT = 9763;
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json; charset=utf-8', '.woff2': 'font/woff2', '.woff': 'font/woff' };
const server = http.createServer((req, res) => { let p = decodeURIComponent(req.url.split('?')[0]); if (p === '/') p = '/prototypes/_selection/index.html'; const f = normalize(join(ROOT, p)); if (!f.startsWith(normalize(ROOT)) || !existsSync(f) || !statSync(f).isFile()) { res.writeHead(404); res.end('no'); return; } res.writeHead(200, { 'Content-Type': MIME[extname(f)] || 'application/octet-stream' }); res.end(readFileSync(f)); });
await new Promise(r => server.listen(PORT, r));
const BASE = `http://127.0.0.1:${PORT}`;
const out = {};

// deep link cold load
{
  const b = await Browser.launch({ width: 1440, height: 900 });
  const p = await b.newPage({ width: 1440, height: 900 });
  await p.goto(`${BASE}/prototypes/_selection/index.html#S07`, { settleMs: 3000 });
  out.deepLinkCold = await p.eval(`(() => {
    const a = document.activeElement;
    return { hash: location.hash, detailHidden: document.getElementById('detail').hidden,
      dNo: document.getElementById('d-no').textContent,
      activeTag: a.tagName, activeClass: a.className, activeId: a.id,
      isBody: a === document.body, scrollY: Math.round(window.scrollY),
      rowTop: (()=>{const r=document.querySelector('.row[data-id=S07]'); return r?Math.round(r.getBoundingClientRect().top+window.scrollY):null})(),
      docScrollH: document.documentElement.scrollHeight };
  })()`);
  // Tab from body: how many tab stops to reach copy button
  out.tabPath = await p.eval(`(() => {
    document.body.focus();
    return { startTag: document.activeElement.tagName };
  })()`);
  // count tab stops before .prompt-copy via DOM order
  out.tabOrder = await p.eval(`(() => {
    const sel = 'a[href],button,input,select,textarea,summary,[tabindex]:not([tabindex="-1"])';
    const all = [...document.querySelectorAll(sel)].filter(e => !e.disabled && e.offsetParent !== null || getComputedStyle(e).position==='fixed');
    const copy = document.querySelector('.prompt-copy');
    const idx = all.indexOf(copy);
    const head = document.querySelector('.detail-head');
    return { total: all.length, copyIndex: idx, headIsFocusable: head.tabIndex, copyIsInDom: !!copy,
      activeInDetailIdx: all.findIndex(e => e.closest('#detail')) };
  })()`);
  await b.close();
}

// scroll hijack test: real Input.dispatchKeyEvent
{
  const b = await Browser.launch({ width: 1440, height: 900 });
  const p = await b.newPage({ width: 1440, height: 900 });
  await p.goto(`${BASE}/prototypes/_selection/index.html`, { settleMs: 3000 });
  const before = await p.eval(`({ y: Math.round(window.scrollY), hash: location.hash })`);
  await p.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: 'ArrowDown', code: 'ArrowDown', windowsVirtualKeyCode: 40, nativeVirtualKeyCode: 40 });
  await p.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'ArrowDown', code: 'ArrowDown', windowsVirtualKeyCode: 40, nativeVirtualKeyCode: 40 });
  await new Promise(r => setTimeout(r, 600));
  const after = await p.eval(`({ y: Math.round(window.scrollY), hash: location.hash, detailHidden: document.getElementById('detail').hidden })`);
  out.arrowRealKey = { before, after };
  // Page Down should still work
  const before2 = await p.eval(`({ y: Math.round(window.scrollY) })`);
  await p.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: 'PageDown', code: 'PageDown', windowsVirtualKeyCode: 34, nativeVirtualKeyCode: 34 });
  await p.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'PageDown', code: 'PageDown', windowsVirtualKeyCode: 34, nativeVirtualKeyCode: 34 });
  await new Promise(r => setTimeout(r, 500));
  const after2 = await p.eval(`({ y: Math.round(window.scrollY) })`);
  out.pageDown = { before2, after2 };
  await b.close();
}

// prompt text: is it ever visible? + chars
{
  const b = await Browser.launch({ width: 1440, height: 900 });
  const p = await b.newPage({ width: 1440, height: 900 });
  await p.goto(`${BASE}/prototypes/_selection/index.html`, { settleMs: 3000 });
  out.promptStats = await p.eval(`(() => {
    const b = [...document.querySelectorAll('button')].find(x=>/复制 AI 提示词/.test(x.textContent));
    if (!b) return { noBtn: true };
    b.closest('.row') || null;
    const row = document.querySelector('.row'); row.click();
    return new Promise(res => setTimeout(() => {
      const btn = document.querySelector('.prompt-copy');
      const fields = [...document.querySelectorAll('#d-body .prompt-field, #d-body input, #d-body textarea')].map(e=>({tag:e.tagName,id:e.id,ph:e.placeholder,label:e.getAttribute('aria-label')}));
      return res({ ctaWrapHTML: (document.querySelector('.prompt-cta')||{}).innerText, fields,
        bodyHasPromptText: /系统提示|你是|请生成/.test(document.getElementById('d-body').innerText),
        dBodyTextLen: document.getElementById('d-body').innerText.length });
    }, 800));
  })()`);
  out.promptText = await p.eval(`(() => {
    if (!window.STYLE_PROMPTS) return 'no';
    return null;
  })()`);
  await b.close();
}

// S14 is-direct/is-near in prototype (is it a co-incidence)
console.log(JSON.stringify(out, null, 1));
server.close();
