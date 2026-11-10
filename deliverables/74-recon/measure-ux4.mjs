import http from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, extname, normalize } from 'node:path';
import { Browser } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
const ROOT = 'D:/Web/style'; const PORT = 9764;
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json; charset=utf-8', '.woff2': 'font/woff2', '.woff': 'font/woff' };
const server = http.createServer((req, res) => { let p = decodeURIComponent(req.url.split('?')[0]); if (p === '/') p = '/prototypes/_selection/index.html'; const f = normalize(join(ROOT, p)); if (!f.startsWith(normalize(ROOT)) || !existsSync(f) || !statSync(f).isFile()) { res.writeHead(404); res.end('no'); return; } res.writeHead(200, { 'Content-Type': MIME[extname(f)] || 'application/octet-stream' }); res.end(readFileSync(f)); });
await new Promise(r => server.listen(PORT, r));
const BASE = `http://127.0.0.1:${PORT}`;
const out = {};
const key = async (p, k, code, vk) => {
  await p.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: k, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk });
  await p.send('Input.dispatchKeyEvent', { type: 'keyUp', key: k, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk });
  await new Promise(r => setTimeout(r, 500));
};

{
  const b = await Browser.launch({ width: 1440, height: 900 });
  const p = await b.newPage({ width: 1440, height: 900 });
  await p.goto(`${BASE}/prototypes/_selection/index.html`, { settleMs: 3000 });
  await p.eval(`document.body.focus()`);
  out.start = await p.eval(`({y:Math.round(scrollY),hash:location.hash,detail:!document.getElementById('detail').hidden})`);
  await key(p, 'PageDown', 'PageDown', 34);
  out.afterPageDown = await p.eval(`({y:Math.round(scrollY),hash:location.hash,detail:!document.getElementById('detail').hidden})`);
  await key(p, 'ArrowDown', 'ArrowDown', 40);
  out.afterArrowDown = await p.eval(`({y:Math.round(scrollY),hash:location.hash,detail:!document.getElementById('detail').hidden, dNo:document.getElementById('d-no').textContent, focus:document.activeElement.className})`);
  await key(p, 'ArrowDown', 'ArrowDown', 40);
  out.afterArrowDown2 = await p.eval(`({y:Math.round(scrollY),hash:location.hash,dNo:document.getElementById('d-no').textContent})`);
  // Space on body
  await key(p, ' ', 'Space', 32);
  out.afterSpace = await p.eval(`({y:Math.round(scrollY),hash:location.hash})`);
  await b.close();
}

// prompt CTA + prompt text visibility
{
  const b = await Browser.launch({ width: 1440, height: 900 });
  const p = await b.newPage({ width: 1440, height: 900 });
  await p.goto(`${BASE}/prototypes/_selection/index.html`, { settleMs: 3000 });
  out.prompt = await p.eval(`(() => {
    document.querySelector('.row').click();
    return new Promise(res => setTimeout(() => {
      const wrap = document.querySelector('.prompt-cta');
      const detail = document.getElementById('detail');
      const r = wrap ? wrap.getBoundingClientRect() : null;
      const inputs = [...document.querySelectorAll('#d-body input, #d-body textarea')].map(e=>({tag:e.tagName,type:e.type,id:e.id,label:e.getAttribute('aria-label'),ph:e.placeholder,val:e.value}));
      // does any element in the page contain the generated prompt?
      const all = [...document.querySelectorAll('#d-body *')].map(e=>e.textContent||'').join('');
      return res({
        ctaExists: !!wrap, ctaTop: r?Math.round(r.top):null, ctaH: r?Math.round(r.height):null,
        ctaText: wrap ? wrap.innerText.slice(0,300) : null,
        inputs,
        detailTextLen: detail.innerText.length,
        hasPromptLikeText: /你是一个|请生成|请只|输出/.test(detail.innerText),
        promptLenFromApi: (()=>{ try { return null } catch(e){ return 'err' } })(),
        detailsOrder: [...document.querySelectorAll('#d-body > *')].map(e=>e.tagName+'.'+(e.className||'').toString().slice(0,24))
      });
    }, 900));
  })()`);
  out.promptLen = await p.eval(`(() => {
    // use the public buildPrompt? find it
    const keys = Object.keys(window).filter(k=>/prompt|Prompt|copy|Copy/.test(k));
    let len = null;
    try { if (window.buildPrompt) len = window.buildPrompt('S01', {}).length; } catch(e) { len = 'err:'+String(e).slice(0,60); }
    return { globals: keys, len };
  })()`);
  await b.close();
}

console.log(JSON.stringify(out, null, 1));
server.close();
