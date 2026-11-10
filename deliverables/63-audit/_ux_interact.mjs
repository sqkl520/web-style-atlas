import http from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { join, extname, normalize } from 'node:path';
import { Browser, sleep } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';

const ROOT = 'D:/Web/style';
const PORT = 9612;
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
const SEL = `http://127.0.0.1:${PORT}/prototypes/_selection/index.html`;
const WIZ = `http://127.0.0.1:${PORT}/prototypes/_selection/wizard.html`;

const b = await Browser.launch({ width: 1440, height: 900 });
const R = {};

async function key(p, k, opts = {}) {
  // use Input.dispatchKeyEvent via CDP through page.eval is not possible; use raw CDP
  const code = opts.code || k;
  const keyCode = opts.keyCode || k.toUpperCase().charCodeAt(0);
  await p.send('Input.dispatchKeyEvent', { type: 'keyDown', key: k, code, windowsVirtualKeyCode: keyCode, nativeVirtualKeyCode: keyCode, text: opts.text });
  await p.send('Input.dispatchKeyEvent', { type: 'keyUp', key: k, code, windowsVirtualKeyCode: keyCode, nativeVirtualKeyCode: keyCode });
}

// 1440: keyboard conflicts
{
  const p = await b.newPage({ width: 1440, height: 900 });
  await p.goto(SEL, { settleMs: 2600 });

  // 1) "/" focuses search
  await p.eval(`document.body.focus()`);
  await p.send('Input.dispatchKeyEvent', { type: 'keyDown', key: '/', code: 'Slash', windowsVirtualKeyCode: 191, text: '/' });
  await p.send('Input.dispatchKeyEvent', { type: 'keyUp', key: '/', code: 'Slash', windowsVirtualKeyCode: 191 });
  await sleep(150);
  const slash = await p.eval(`({tag:document.activeElement.tagName,id:document.activeElement.id})`);

  // type "S07" into search (typing should not trigger shortcuts)
  await p.eval(`(()=>{const q=document.getElementById('q');q.value='S07';q.dispatchEvent(new Event('input',{bubbles:true}));return true})()`);
  await sleep(300);
  const afterType = await p.eval(`({count:document.getElementById('count').textContent, rows:document.querySelectorAll('.row').length, detailHidden:document.getElementById('detail').hidden})`);

  // clear and test J from search focus (should be ignored)
  await p.eval(`(()=>{const q=document.getElementById('q');q.value='';q.dispatchEvent(new Event('input',{bubbles:true}));q.focus();return true})()`);
  await sleep(200);
  await p.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'j', code: 'KeyJ', windowsVirtualKeyCode: 74, text: 'j' });
  await p.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'j', code: 'KeyJ', windowsVirtualKeyCode: 74 });
  await sleep(300);
  const jFromSearch = await p.eval(`({detailHidden:document.getElementById('detail').hidden, active:document.activeElement.tagName+'#'+document.activeElement.id})`);

  // 2) J from body opens S01
  await p.eval(`document.activeElement.blur(); document.body.focus();`);
  await p.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'j', code: 'KeyJ', windowsVirtualKeyCode: 74, text: 'j' });
  await p.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'j', code: 'KeyJ', windowsVirtualKeyCode: 74 });
  await sleep(500);
  const jBody = await p.eval(`({detailHidden:document.getElementById('detail').hidden, active:document.activeElement.tagName+'.'+document.activeElement.className, hash:location.hash, no:document.getElementById('d-no').textContent})`);

  // 3) after open, tab through detail and see if focus escapes to page behind
  const tabSeq = [];
  for (let i = 0; i < 25; i++) {
    await p.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
    await p.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
    await sleep(30);
    const st = await p.eval(`(()=>{const a=document.activeElement;const d=document.getElementById('detail');return {t:a.tagName,cls:String(a.className).split(' ')[0],txt:(a.textContent||'').trim().slice(0,14),inDetail:d.contains(a)};})()`);
    tabSeq.push(st);
  }
  // 4) focus on a summary inside detail: press ArrowDown -> should it open next scheme?
  await p.eval(`(()=>{const s=document.querySelector('#d-body .field-fold summary'); if(s) s.focus(); return document.activeElement.tagName;})()`);
  const beforeArrow = await p.eval(`({no:document.getElementById('d-no').textContent, active:document.activeElement.tagName})`);
  await p.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'ArrowDown', code: 'ArrowDown', windowsVirtualKeyCode: 40 });
  await p.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'ArrowDown', code: 'ArrowDown', windowsVirtualKeyCode: 40 });
  await sleep(400);
  const afterArrow = await p.eval(`({no:document.getElementById('d-no').textContent, scrollY:window.scrollY, hash:location.hash})`);

  // 5) Escape from summary -> focus to head (not close)
  await p.eval(`(()=>{const s=document.querySelector('#d-body .field-fold summary'); if(s) s.focus();})()`);
  await p.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
  await p.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
  await sleep(250);
  const escSummary = await p.eval(`({detailHidden:document.getElementById('detail').hidden, active:document.activeElement.className})`);
  // second Escape closes
  await p.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
  await p.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
  await sleep(250);
  const esc2 = await p.eval(`({detailHidden:document.getElementById('detail').hidden, active:document.activeElement.tagName+'.'+String(document.activeElement.className).split(' ')[0], hash:location.hash})`);

  // 6) copy button announcement: click and sample text + aria-live nodes
  await p.eval(`document.querySelector('.row').click()`);
  await sleep(400);
  const copyBefore = await p.eval(`(()=>{const b=document.querySelector('.prompt-copy');return {txt:b.textContent, live:b.getAttribute('aria-live'), role:b.getAttribute('role'), parentLive:b.closest('[aria-live]')?b.closest('[aria-live]').id:'none'};})()`);
  // programmatic click (not a trusted gesture) -> clipboard likely fails -> fallback dialog
  await p.eval(`document.querySelector('.prompt-copy').click()`);
  await sleep(600);
  const copyAfter = await p.eval(`(()=>{const b=document.querySelector('.prompt-copy');const fb=document.getElementById('prompt-fallback');return {txt:b.textContent, fb:!!fb, fbRole:fb?fb.getAttribute('role'):null, fbModal:fb?fb.getAttribute('aria-modal'):null, active:document.activeElement.tagName};})()`);
  // is the manual dialog focus-trapped?
  const fbTab = [];
  if (copyAfter.fb) {
    for (let i=0;i<4;i++){
      await p.send('Input.dispatchKeyEvent',{type:'keyDown',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});
      await p.send('Input.dispatchKeyEvent',{type:'keyUp',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});
      await sleep(40);
      const st=await p.eval(`(()=>{const a=document.activeElement;const fb=document.getElementById('prompt-fallback');return {t:a.tagName,cls:String(a.className).split(' ')[0],inFb:fb?fb.contains(a):null};})()`);
      fbTab.push(st);
    }
  }

  // 7) deep-link cold load #S07
  const p2 = await b.newPage({ width: 1440, height: 900 });
  await p2.goto(SEL + '#S07', { settleMs: 2600 });
  const deep = await p2.eval(`({detailHidden:document.getElementById('detail').hidden, no:document.getElementById('d-no').textContent, hash:location.hash, active:document.activeElement.tagName, scrollY:window.scrollY, rowCurrent:(document.querySelector('.row[aria-current="true"]')||{}).getAttribute?document.querySelector('.row[aria-current="true"]').getAttribute('data-id'):null})`);
  await p2.close();

  // 8) search miss state
  const p3 = await b.newPage({ width: 1440, height: 900 });
  await p3.goto(SEL, { settleMs: 2600 });
  await p3.eval(`(()=>{const q=document.getElementById('q');q.value='餐厅';q.dispatchEvent(new Event('input',{bubbles:true}));return true})()`);
  await sleep(700);
  const miss = await p3.eval(`(()=>{const e=document.getElementById('empty');const r=e.getBoundingClientRect();return {emptyHidden:e.hidden, emptyText:(e.innerText||'').slice(0,240), emptyTop:+r.top.toFixed(1), emptyVisible:r.top<innerHeight&&r.bottom>0, eNext:!!document.getElementById('e-next'), count:document.getElementById('count').textContent, rows:document.querySelectorAll('.row').length, tplStripHidden:document.getElementById('tpl-strip').hidden, tplEmptyHidden:document.getElementById('empty-tpl').hidden};})()`);
  await p3.close();
  await p.close();

  R.keyboard = { slash, afterType, jFromSearch, jBody, tabSeq, beforeArrow, afterArrow, escSummary, esc2, copyBefore, copyAfter, fbTab, deep, miss };
}

// wizard
{
  const p = await b.newPage({ width: 1440, height: 900 });
  await p.goto(WIZ, { settleMs: 2200 });
  const first = await p.eval(`(()=>{
    const q=s=>document.querySelector(s); const qa=s=>[...document.querySelectorAll(s)];
    const vis=q('.wz-q:not([hidden])');
    return {
      questions: qa('.wz-q').length,
      visibleQuestions: qa('.wz-q:not([hidden])').length,
      firstQ: vis?vis.querySelector('h2').textContent:null,
      opts: vis?qa('.wz-q:not([hidden]) .wz-opts button').map(b=>({t:b.querySelector('b').textContent,w:+b.getBoundingClientRect().width.toFixed(0),h:+b.getBoundingClientRect().height.toFixed(0),pressed:b.getAttribute('aria-pressed')})):null,
      outHidden: q('#wz-out').hidden,
      shareHidden: q('#wz-share').hidden,
      resetH: q('#wz-reset').getBoundingClientRect().height,
      live: qa('[aria-live]').length,
      headings: qa('h1,h2,h3').map(h=>h.tagName+':'+h.textContent.trim().slice(0,16)),
      skip: !!q('.skip'),
      focusables: qa('a[href],button,input').length,
      qButtonsAriaPressed: qa('.wz-opts button').map(b=>b.getAttribute('aria-pressed')).filter(x=>x===null).length,
      optGroupRole: qa('.wz-opts').map(g=>g.getAttribute('role')),
      optGroupAriaLabel: qa('.wz-opts').map(g=>g.getAttribute('aria-label')),
      qHiddenAttr: qa('.wz-q').map(x=>x.hidden),
    };
  })()`);

  // answer all 5 questions by clicking
  for (let i = 0; i < 5; i++) {
    await p.eval(`(()=>{const q=[...document.querySelectorAll('.wz-q')].find(x=>!x.hidden); const b=q.querySelector('.wz-opts button'); b.click(); return b.textContent;})()`);
    await sleep(220);
  }
  const done = await p.eval(`(()=>{
    const q=s=>document.querySelector(s); const qa=s=>[...document.querySelectorAll(s)];
    const out=q('#wz-out');
    return {
      outHidden: out.hidden,
      pickCount: qa('#wz-pick .wz-card').length,
      avoidCount: qa('#wz-avoid .wz-card').length,
      pickIds: qa('#wz-pick .no').map(e=>e.textContent),
      avoidIds: qa('#wz-avoid .no').map(e=>e.textContent),
      links: qa('#wz-pick a, #wz-avoid a').map(a=>({t:a.textContent.trim().slice(0,22),href:a.getAttribute('href')})),
      shareHidden: q('#wz-share').hidden,
      scrollY: window.scrollY,
      active: document.activeElement.tagName,
      outTop: +out.getBoundingClientRect().top.toFixed(0),
      allQVisible: qa('.wz-q:not([hidden])').length,
      methodTop: +q('#wz-method').getBoundingClientRect().top.toFixed(0),
      focusables: qa('a[href],button,input').length,
    };
  })()`);

  // keyboard: can you reach and operate options?
  await p.eval(`document.querySelector('.wz-q .wz-opts button').focus()`);
  const kb = await p.eval(`({active:document.activeElement.tagName+'.'+String(document.activeElement.className), text:document.activeElement.textContent.trim().slice(0,20)})`);

  // share button
  await p.eval(`document.getElementById('wz-share').click()`);
  await sleep(400);
  const share = await p.eval(`({txt:document.getElementById('wz-share').textContent, url:location.search, live:document.getElementById('wz-share').getAttribute('aria-live')})`);

  // reload with query
  await p.goto(WIZ + '?load=0&img=2&loud=1&guide=0&fear=0', { settleMs: 1800 });
  const replay = await p.eval(`({outHidden:document.getElementById('wz-out').hidden, picks:document.querySelectorAll('#wz-pick .wz-card').length, hiddenQs:[...document.querySelectorAll('.wz-q')].filter(x=>x.hidden).length})`);
  await p.close();
  R.wizard = { first, done, kb, share, replay };
}

// 390 mobile: rail/chips/tap/detail trap
{
  const p = await b.newPage({ width: 390, height: 844, mobile: false });
  await p.goto(SEL, { settleMs: 2600 });
  const rail = await p.eval(`(()=>{
    const q=s=>document.querySelector(s);
    const f=q('#rail-fold');
    const sum=f.querySelector('summary');
    const r=sum.getBoundingClientRect();
    // open rail and measure chip taps
    f.open=true;
    const chips=[...document.querySelectorAll('#flt-scene button')].map(b=>{const x=b.getBoundingClientRect();return {t:b.textContent.trim().slice(0,10),w:+x.width.toFixed(1),h:+x.height.toFixed(1)};});
    const allSmall=chips.filter(c=>c.h<24||c.w<24).length;
    const moreBtn=q('.scene-more-toggle, #scene-more-toggle');
    return {
      summaryH:+r.height.toFixed(1), summaryW:+r.width.toFixed(1),
      directChips: chips.length, smallChips: allSmall, minChipH: Math.min(...chips.map(c=>c.h)), minChipW: Math.min(...chips.map(c=>c.w)),
      railH:+q('.rail').getBoundingClientRect().height.toFixed(1),
      moreToggle: moreBtn?{t:moreBtn.textContent.trim(),h:+moreBtn.getBoundingClientRect().height.toFixed(1)}:null,
      railScrollH: q('.rail').scrollHeight,
    };
  })()`);
  // open detail on 390 and tab out
  await p.eval(`document.querySelector('.row').click()`);
  await sleep(500);
  const tabOut = [];
  for (let i=0;i<22;i++){
    await p.send('Input.dispatchKeyEvent',{type:'keyDown',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});
    await p.send('Input.dispatchKeyEvent',{type:'keyUp',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});
    await sleep(30);
    const st=await p.eval(`(()=>{const a=document.activeElement;const d=document.getElementById('detail');return {t:a.tagName,cls:String(a.className).split(' ')[0],txt:(a.textContent||'').trim().slice(0,12),inDetail:d.contains(a)};})()`);
    tabOut.push(st);
  }
  const det390 = await p.eval(`(()=>{const d=document.getElementById('detail');const r=d.getBoundingClientRect();return {w:+r.width.toFixed(0),h:+r.height.toFixed(0),scrollH:d.scrollHeight,clientH:d.clientHeight,bodyOverflowY:getComputedStyle(d).overflowY,pageScrollY:window.scrollY,bodyH:document.body.scrollHeight};})()`);
  await p.close();
  R.mobile = { rail, tabOut, det390 };
}

console.log(JSON.stringify(R, null, 2));
await b.close();
server.close();
