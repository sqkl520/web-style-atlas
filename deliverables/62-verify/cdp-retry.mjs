import http from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { join, extname, normalize } from 'node:path';
import { Browser } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';

const ROOT = 'D:/Web/style';
const PORT = 9591;
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json; charset=utf-8', '.woff2': 'font/woff2', '.woff': 'font/woff' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/') p = '/prototypes/_selection/index.html';
  const f = normalize(join(ROOT, p));
  if (!f.startsWith(normalize(ROOT)) || !existsSync(f)) { res.writeHead(404); res.end('no'); return; }
  res.writeHead(200, { 'Content-Type': MIME[extname(f)] || 'application/octet-stream' });
  res.end(readFileSync(f));
});
await new Promise(r => server.listen(PORT, r));
const URL = `http://127.0.0.1:${PORT}/prototypes/_selection/index.html`;
console.log('serving', URL);

const b = await Browser.launch({ width: 1440, height: 900 });
const out = {};

// ---------- 1. search "餐厅" ----------
{
  const p = await b.newPage({ width: 1440, height: 900 });
  await p.goto(URL, { settleMs: 2500 });
  const base = await p.eval(`(() => ({
    count: (document.getElementById('count')||{}).textContent,
    rows: document.querySelectorAll('#list .row, #list li, .row').length,
    tplHidden: (document.getElementById('tpl-strip')||{}).hidden,
    sceneChips: document.querySelectorAll('#flt-scene button[data-scene]').length,
    hasM02ChipBadge: !!document.querySelector('.scene-tpl'),
    bodyText: document.body.innerText.length
  }))()`);
  out.base = base;

  await p.eval(`(() => { const q=document.getElementById('q'); q.value='餐厅'; q.dispatchEvent(new Event('input',{bubbles:true})); return q.value; })()`);
  await new Promise(r => setTimeout(r, 900));
  out.searchRestaurant = await p.eval(`(() => ({
    countText: (document.getElementById('count')||{}).textContent,
    rowCount: document.querySelectorAll('.row').length,
    tplHidden: (document.getElementById('tpl-strip')||{}).hidden,
    tplText: (document.getElementById('tpl-strip')||{}).innerText||'',
    hasM02: /M02/.test(document.body.innerText)
  }))()`);
  console.log('餐厅 ->', JSON.stringify(out.searchRestaurant));

  // clear then click 咖啡店 chip
  await p.eval(`(() => { const q=document.getElementById('q'); q.value=''; q.dispatchEvent(new Event('input',{bubbles:true})); })()`);
  await new Promise(r => setTimeout(r, 600));
  out.afterClearSearch = await p.eval(`(document.getElementById('count')||{}).textContent`);
  console.log('cleared search ->', out.afterClearSearch);

  const chip = await p.eval(`(() => { const c=document.querySelector('#flt-scene button[data-scene="咖啡店"]'); if(!c) return {found:false}; c.click(); return {found:true, title:c.title, badge:(c.querySelector('.scene-tpl')||{}).textContent||''}; })()`);
  await new Promise(r => setTimeout(r, 900));
  out.chipCoffee = await p.eval(`(() => ({
    countText: (document.getElementById('count')||{}).textContent,
    rowCount: document.querySelectorAll('.row').length,
    tplHidden: (document.getElementById('tpl-strip')||{}).hidden,
    tplText: (document.getElementById('tpl-strip')||{}).innerText||''
  }))()`);
  out.chipCoffeeMeta = chip;
  console.log('咖啡店 chip ->', JSON.stringify(out.chipCoffee), JSON.stringify(chip));

  // clear filters button
  const clr = await p.eval(`(() => {
    const cands=[...document.querySelectorAll('button')].filter(b=>/清空/.test(b.textContent));
    if(!cands.length) return {found:false, all:[...document.querySelectorAll('button')].map(b=>b.textContent.trim()).slice(0,40)};
    cands[0].click(); return {found:true, label:cands[0].textContent.trim()};
  })()`);
  await new Promise(r => setTimeout(r, 900));
  out.afterClear = await p.eval(`(document.getElementById('count')||{}).textContent`);
  out.clearBtn = clr;
  console.log('clear ->', JSON.stringify(clr), out.afterClear);

  // overflow at 3 viewports (with nothing filtered)
  out.overflow = {};
  for (const [w, h] of [[1440, 900], [768, 1024], [390, 844]]) {
    await p.setViewport({ width: w, height: h });
    await new Promise(r => setTimeout(r, 700));
    out.overflow[w + 'x' + h] = await p.eval(`(() => ({
      docScroll: document.documentElement.scrollWidth,
      docClient: document.documentElement.clientWidth,
      overflowPx: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      bodyScroll: document.body.scrollWidth
    }))()`);
    console.log('viewport', w + 'x' + h, JSON.stringify(out.overflow[w + 'x' + h]));
  }
  // overflow per-row offenders at 390
  out.wideAt390 = await p.eval(`(() => {
    const out=[]; const vw=document.documentElement.clientWidth;
    document.querySelectorAll('*').forEach(el=>{
      const r=el.getBoundingClientRect();
      if (r.width>vw+2 && r.height>0) out.push({tag:el.tagName, cls:(el.className||'').toString().slice(0,40), w:Math.round(r.width), right:Math.round(r.right)});
    });
    return out.slice(0,12);
  })()`);
  console.log('wide els @390:', JSON.stringify(out.wideAt390));
  await p.close();
}

// ---------- 2. all 30 prompts: count/consistency of rendered copy ----------
{
  const p = await b.newPage({ width: 1440, height: 900 });
  await p.goto(URL, { settleMs: 2000 });
  out.promptStats = await p.eval(`(() => {
    const P = window.STYLE_PROMPTS;
    let dbl=[], lens=[], noStack=[], countVal=[];
    P.schemes.forEach(s => {
      const t = window.buildStylePrompt(s.id);
      const n = (t.match(/标题按这个顺序取第一个可用的：/g)||[]).length;
      if (n>1) dbl.push(s.id);
      lens.push(t.length);
      const f = s.dna.fonts||{};
      if(!f.displayStack || !f.displayStack.length) noStack.push(s.id);
      const m = t.match(/我实际有 (\\d+) 个/);
      countVal.push(s.id+':'+(m?m[1]:'?'));
    });
    return { doubled: dbl, doubledCount: dbl.length, lens: [Math.min(...lens), Math.max(...lens)], noStack, countVal,
      sample: window.buildStylePrompt('S07').split('\\n').filter(l=>l.includes('字体')).join('\\n') };
  })()`);
  console.log('prompt doublings:', out.promptStats.doubledCount, out.promptStats.doubled.join(','));
  console.log('lens', out.promptStats.lens, 'noStack', out.promptStats.noStack.length);
  console.log('S07 font line:\n' + out.promptStats.sample);
  await p.close();
}

// ---------- 3. wizard ----------
{
  const p = await b.newPage({ width: 1440, height: 1000 });
  await p.goto(`http://127.0.0.1:${PORT}/prototypes/_selection/wizard.html`, { settleMs: 2000 });
  out.wizardQ = await p.eval(`(() => ({
    questions: [...document.querySelectorAll('.wz-q')].map(q=>({q:q.getAttribute('data-q'), opts:[...q.querySelectorAll('.wz-opts button')].map(b=>b.textContent.trim())})),
    visible: [...document.querySelectorAll('.wz-q')].filter(q=>!q.hidden).length
  }))()`);
  console.log('wizard questions:', JSON.stringify(out.wizardQ));

  const combos = [
    [0, 0, 0, 0, 0],
    [2, 2, 2, 1, 2],
    [1, 1, 1, 0, 1],
    [0, 2, 0, 1, 0],
    [2, 0, 2, 0, 2],
  ];
  out.wizardRuns = [];
  for (const combo of combos) {
    await p.goto(`http://127.0.0.1:${PORT}/prototypes/_selection/wizard.html`, { settleMs: 1500 });
    for (let i = 0; i < 5; i++) {
      await p.eval(`(() => {
        const qs=[...document.querySelectorAll('.wz-q')];
        const q=qs[${i}]; if(!q) return 'noq';
        const btns=[...q.querySelectorAll('.wz-opts button')];
        const b=btns[${combo[i]}]; if(!b) return 'nobtn';
        b.click(); return 'ok';
      })()`);
      await new Promise(r => setTimeout(r, 320));
    }
    await new Promise(r => setTimeout(r, 600));
    const res = await p.eval(`(() => {
      const cards=[...document.querySelectorAll('.wz-card')];
      return {
        cardCount: cards.length,
        cards: cards.map(c=>({
          id: (c.querySelector('.no')||{}).textContent,
          why: (c.querySelector('.wz-why')||{}).textContent,
          gate: (c.querySelector('.wz-gate')||{}).textContent||null
        })),
        gateNotes: document.querySelectorAll('.wz-gate').length
      };
    })()`);
    out.wizardRuns.push({ combo, res });
    console.log('combo', combo.join(''), 'cards', res.cardCount, 'gateNotes', res.gateNotes);
    res.cards.forEach(c => console.log('   ', c.id, '|', (c.why||'').slice(0, 90), '|', c.gate ? 'GATE' : '-'));
  }
  await p.close();
}

import { writeFileSync } from 'node:fs';
writeFileSync('D:/Web/style/deliverables/62-verify/cdp-retry.json', JSON.stringify(out, null, 2), 'utf8');
console.log('WROTE cdp-retry.json');
await b.close();
server.close();
