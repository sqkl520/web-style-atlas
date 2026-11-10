import http from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, extname, normalize } from 'node:path';
import { Browser } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
const ROOT = 'D:/Web/style'; const PORT = 9765;
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json; charset=utf-8', '.woff2': 'font/woff2', '.woff': 'font/woff' };
const server = http.createServer((req, res) => { let p = decodeURIComponent(req.url.split('?')[0]); if (p === '/') p = '/prototypes/_selection/index.html'; const f = normalize(join(ROOT, p)); if (!f.startsWith(normalize(ROOT)) || !existsSync(f) || !statSync(f).isFile()) { res.writeHead(404); res.end('no'); return; } res.writeHead(200, { 'Content-Type': MIME[extname(f)] || 'application/octet-stream' }); res.end(readFileSync(f)); });
await new Promise(r => server.listen(PORT, r));
const BASE = `http://127.0.0.1:${PORT}`;
const out = {};

// --- 1. execCopySync focus path (stub clipboard to succeed) ---
{
  const b = await Browser.launch({ width: 1440, height: 900 });
  const p = await b.newPage({ width: 1440, height: 900 });
  await p.goto(`${BASE}/prototypes/_selection/index.html`, { settleMs: 3000 });
  out.copySyncFocus = await p.eval(`(() => {
    // force the writeText path to succeed so showManual never runs
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: () => Promise.resolve() }, configurable: true });
    document.querySelector('.row').click();
    return new Promise(res => setTimeout(() => {
      const btn = document.querySelector('.prompt-copy');
      btn.focus();
      const before = document.activeElement === btn;
      btn.click();
      setTimeout(() => {
        const a = document.activeElement;
        res({
          focusOnBtnBefore: before,
          activeAfterCopy: a.tagName + '#' + (a.id||'') + '.' + (a.className||'').slice(0,30),
          focusLost: a !== btn,
          isBody: a === document.body,
          btnText: btn.textContent,
          anyLive: [...document.querySelectorAll('[aria-live]')].map(e=>e.id),
          // Is there any announcement element near the button?
          ariaStatus: !!document.querySelector('[role=status],[role=alert]')
        });
      }, 400);
    }, 900));
  })()`);
  await b.close();
}

// --- 2. AX subtree for a row: is content hidden behind role=button? ---
{
  const b = await Browser.launch({ width: 1440, height: 900 });
  const p = await b.newPage({ width: 1440, height: 900 });
  await p.goto(`${BASE}/prototypes/_selection/index.html`, { settleMs: 3000 });
  const doc = await p.send('DOM.getDocument', { depth: -1 });
  let rowNodeId = null;
  async function find(node, depth) {
    if (rowNodeId) return;
    if (node.nodeName === 'LI' && (node.attributes||[]).includes('row')) { rowNodeId = node.nodeId; return; }
    for (const c of (node.children||[])) await find(c, depth+1);
  }
  await find(doc.root, 0);
  if (rowNodeId) {
    const ax = await p.send('Accessibility.getPartialAXTree', { nodeId: rowNodeId, fetchRelatives: false });
    out.rowAX = ax.nodes.map(n => ({ role: n.role && n.role.value, name: n.name && n.name.value, ignored: n.ignored,
      props: (n.properties||[]).filter(p=>['level','pressed','focusable','labelledby'].includes(p.name)).map(p=>p.name+'='+p.value.value) }));
  }
  // Count how many AX nodes exist under the ledger
  const full = await p.send('Accessibility.getFullAXTree', {});
  const names = (full.nodes||[]).map(n => n.name && n.name.value).filter(Boolean);
  out.axHasRowDefText = names.some(n => /红黑斜排报/.test(n));
  out.axRowButtonNames = (full.nodes||[]).filter(n=>n.role&&n.role.value==='button').map(n=>(n.name||{}).value).slice(0,8);
  out.axStaticTextSample = (full.nodes||[]).filter(n=>n.role&&n.role.value==='StaticText').map(n=>(n.name||{}).value).slice(0,6);
  await b.close();
}

// --- 3. Wizard: proper progressive click + a11y + share/replay edge cases ---
{
  const b = await Browser.launch({ width: 1440, height: 900 });
  const p = await b.newPage({ width: 1440, height: 900 });
  await p.goto(`${BASE}/prototypes/_selection/wizard.html`, { settleMs: 2000 });
  const steps = [];
  for (let i = 0; i < 5; i++) {
    const r = await p.eval(`(() => {
      const qs = [...document.querySelectorAll('.wz-q')];
      const q = qs[${i}];
      const vis = q && !q.hidden;
      const fwd = q ? q.querySelectorAll('.wz-opts button')[1] || q.querySelector('.wz-opts button') : null;
      const label = fwd ? fwd.textContent.trim().slice(0,18) : null;
      if (fwd) fwd.click();
      return { qVisible: vis, label };
    })()`);
    await new Promise(r => setTimeout(r, 250));
    steps.push({ step: i, ...r, ...(await p.eval(`(() => ({
      visibleQ: [...document.querySelectorAll('.wz-q')].filter(e=>!e.hidden).length,
      outHidden: document.getElementById('wz-out').hidden,
      ariaPressCount: document.querySelectorAll('.wz-opts button[aria-pressed=true]').length,
      live: document.querySelectorAll('[aria-live]').length,
      statusRole: document.querySelectorAll('[role=status],[role=alert]').length,
      focus: document.activeElement.tagName+'.'+(document.activeElement.className||'').slice(0,24),
      scrollY: Math.round(scrollY)
    }))()`)) });
  }
  out.wizardSteps = steps;
  out.wizardResult = await p.eval(`(() => {
    const pick = [...document.querySelectorAll('#wz-pick .wz-card')].map(c=>({ id:(c.querySelector('.no')||{}).textContent, h3:(c.querySelector('h3')||{}).textContent, why:(c.querySelector('.wz-why')||{}).textContent, gate:(c.querySelector('.wz-gate')||{}).textContent||null, link:(c.querySelector('a')||{}).getAttribute&&c.querySelector('a').getAttribute('href') }));
    const avoid = [...document.querySelectorAll('#wz-avoid .wz-card')].map(c=>({ id:(c.querySelector('.no')||{}).textContent, why:(c.querySelector('.wz-why')||{}).textContent }));
    const share = document.getElementById('wz-share');
    return { pick, avoid, shareHidden: share.hidden, shareText: share.textContent, hash: location.search,
      outTop: Math.round(document.getElementById('wz-out').getBoundingClientRect().top),
      method: document.getElementById('wz-method').innerText.slice(0,400) };
  })()`);
  // share click
  out.wizardShare = await p.eval(`(() => {
    const s = document.getElementById('wz-share'); s.click();
    return new Promise(res => setTimeout(() => res({ text: s.textContent, search: location.search }), 400));
  })()`);
  // reset
  out.wizardReset = await p.eval(`(() => {
    document.getElementById('wz-reset').click();
    return new Promise(res => setTimeout(() => {
      const s = document.getElementById('wz-share');
      return res({ outHidden: document.getElementById('wz-out').hidden, shareHidden: s.hidden, shareText: s.textContent,
        ariaPress: document.querySelectorAll('.wz-opts button[aria-pressed=true]').length,
        visibleQ: [...document.querySelectorAll('.wz-q')].filter(e=>!e.hidden).length,
        scrollY: Math.round(scrollY), focus: document.activeElement.tagName+'.'+(document.activeElement.className||'').slice(0,20),
        focusTop: Math.round(document.activeElement.getBoundingClientRect ? document.activeElement.getBoundingClientRect().top : -1) });
    }, 400));
  })()`);
  await b.close();
}

// --- 4. Wizard replay edge cases ---
for (const qs of ['?load=1&img=2&loud=3&guide=1&fear=2', '?load=1&img=2', '?load=abc&img=1&loud=1&guide=1&fear=1', '?load=9&img=9&loud=9&guide=9&fear=9', '?load=&img=&loud=&guide=&fear=']) {
  const b = await Browser.launch({ width: 1440, height: 900 });
  const p = await b.newPage({ width: 1440, height: 900 });
  await p.goto(`${BASE}/prototypes/_selection/wizard.html${qs}`, { settleMs: 1800 });
  out['replay_' + qs] = await p.eval(`(() => ({
    outHidden: document.getElementById('wz-out').hidden,
    pickCount: document.querySelectorAll('#wz-pick .wz-card').length,
    pickIds: [...document.querySelectorAll('#wz-pick .wz-card .no')].map(e=>e.textContent),
    method: (document.getElementById('wz-method')||{}).innerText ? document.getElementById('wz-method').innerText.slice(0,200) : null,
    visibleQ: [...document.querySelectorAll('.wz-q')].filter(e=>!e.hidden).length,
    pressed: document.querySelectorAll('.wz-opts button[aria-pressed=true]').length
  }))()`);
  await b.close();
}

console.log(JSON.stringify(out, null, 1));
server.close();
