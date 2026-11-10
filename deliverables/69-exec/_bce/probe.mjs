// B/C/E measurement harness for 69-exec.
// usage: node probe.mjs <port> <tag>     e.g. node probe.mjs 9311 before
// Writes deliverables/69-exec/_bce/data-<tag>.json
import { Browser } from '../../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { writeFileSync } from 'node:fs';

const PORT = process.argv[2] || '9311';
const TAG = process.argv[3] || 'before';
const BASE = `http://127.0.0.1:${PORT}/prototypes/_selection/`;
const OUT = `deliverables/69-exec/_bce/data-${TAG}.json`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const TIERS = [
  { w: 360, h: 640, m: true },
  { w: 375, h: 667, m: true },
  { w: 375, h: 812, m: true },
  { w: 390, h: 844, m: true },
  { w: 414, h: 896, m: true },
  { w: 768, h: 1024, m: true },
  { w: 1024, h: 900, m: false },
  { w: 1440, h: 900, m: false },
];
const SORTS = [['n', '方案号'], ['fr', '结构类型'], ['thr', '认知门槛'], ['gate', '闸门'], ['built', '未建在前']];

async function openPage(browser, t) {
  const page = await browser.newPage({ width: t.w, height: t.h, dsf: 1, mobile: false });
  await page.setViewport({ width: t.w, height: t.h, mobile: t.m, dsf: 1 });
  await page.goto(BASE, { settleMs: 1400 });
  await page.eval('document.fonts && document.fonts.ready ? document.fonts.ready.then(()=>1) : 1');
  await sleep(1500);   // pitfall 3
  return page;
}

const MEASURE = `(() => {
  const vh = innerHeight, vw = innerWidth;
  const rows = [...document.querySelectorAll('#ledger .row')];
  const ft = rows.length ? rows[0].getBoundingClientRect().top + scrollY : null;
  const fh = rows.length ? +rows[0].getBoundingClientRect().height.toFixed(1) : null;
  const full = rows.filter(el => { const b = el.getBoundingClientRect(); return b.top >= -0.5 && b.bottom <= vh + 0.5; }).length;
  const part = rows.filter(el => { const b = el.getBoundingClientRect(); return b.bottom > 0 && b.top < vh; }).length;
  const fold = document.getElementById('rail-fold');
  return {
    vw, vh, rows: rows.length,
    firstId: rows.length ? rows[0].dataset.id : null,
    firstTop: ft === null ? null : +ft.toFixed(1),
    firstH: fh,
    slack: ft === null ? null : +(vh - (ft + fh)).toFixed(1),
    full, part,
    sh: document.documentElement.scrollHeight,
    screens: +(document.documentElement.scrollHeight / vh).toFixed(3),
    overflowX: document.documentElement.scrollWidth - vw,
    railOpen: fold ? fold.open : null,
    railH: fold ? +fold.getBoundingClientRect().height.toFixed(1) : null,
    railTop: fold ? +(fold.getBoundingClientRect().top + scrollY).toFixed(1) : null,
    count: (document.getElementById('count') || {}).textContent,
    parked: !!document.getElementById('q-parked') && !document.getElementById('q-parked').hidden,
  };
})()`;

const out = { tag: TAG, port: PORT, matrix: [], coffee: null, coffeeFullPath: null, tplStrip: [], empty: {}, detail: {}, clearReset: null, extra: {} };
const browser = await Browser.launch({ width: 1200, height: 900 });

// ── 1. 8 断点 × 5 排序 ────────────────────────────────────────────────
for (const t of TIERS) {
  const label = `${t.w}x${t.h}`;
  const page = await openPage(browser, t);
  const rec = { label, vw: t.w, vh: t.h, perSort: {} };
  for (const [val, sl] of SORTS) {
    await page.eval(`(() => { const s=document.querySelector('#sort'); s.value=${JSON.stringify(val)}; s.dispatchEvent(new Event('change',{bubbles:true})); window.scrollTo(0,0); return 1; })()`);
    await sleep(650);
    const m = await page.eval(MEASURE);
    rec.perSort[val] = { ...m, sortLabel: sl };
    console.log(label.padEnd(10), val.padEnd(6), `full=${m.full}`, `first=${m.firstId}(${m.firstH})`, `top=${m.firstTop}`, `slack=${m.slack}`, `sh=${m.sh}`, `ovf=${m.overflowX}`);
  }
  // 模板带几何（有行时的 #tpl-strip）：点一颗有模板角标的芯片让它出现
  await page.eval(`(() => { const s=document.querySelector('#sort'); s.value='n'; s.dispatchEvent(new Event('change',{bubbles:true})); return 1; })()`);
  await sleep(500);
  out.matrix.push(rec);
  await page.close();
}

// ── 2. 芯片路径（真 CDP 鼠标点）─────────────────────────────────────────
for (const t of TIERS) {
  const label = `${t.w}x${t.h}`;
  const page = await openPage(browser, t);
  const narrow = t.w <= 980;
  // 窄档：先展开筛选栏（用户本来就要先展开才看得见芯片）
  if (narrow) {
    await page.eval(`(() => { document.getElementById('rail-fold').open = true; return 1; })()`);
    await sleep(700);
  }
  const chipBox = await page.eval(`(() => {
    const b = [...document.querySelectorAll('#flt-scene button')].find(x => (x.getAttribute('data-scene')||'') === '咖啡店');
    if (!b) return null;
    b.scrollIntoView({ block: 'center' });
    const r = b.getBoundingClientRect();
    return { x: Math.round(r.left + r.width/2), y: Math.round(r.top + r.height/2), w: +r.width.toFixed(1), h: +r.height.toFixed(1), text: b.textContent.trim() };
  })()`);
  if (!chipBox) { console.log(label, 'NO COFFEE CHIP'); await page.close(); continue; }
  await sleep(300);
  await page.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: chipBox.x, y: chipBox.y, button: 'left', clickCount: 1 });
  await page.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: chipBox.x, y: chipBox.y, button: 'left', clickCount: 1 });
  await sleep(1000);
  await page.eval('window.scrollTo(0,0)');
  await sleep(350);
  const m = await page.eval(MEASURE);
  // 首卡在第几屏
  const detail = await page.eval(`(() => {
    const rows=[...document.querySelectorAll('#ledger .row')], vh=innerHeight;
    const st=document.getElementById('tpl-strip');
    const stBox = st && !st.hidden ? (()=>{const r=st.getBoundingClientRect();return {top:+(r.top+scrollY).toFixed(1),h:+r.height.toFixed(1)};})() : null;
    return { ids: rows.map(r=>r.dataset.id),
      screens: +(document.documentElement.scrollHeight/vh).toFixed(3),
      firstTopScreens: rows.length ? +((rows[0].getBoundingClientRect().top+scrollY)/vh).toFixed(3) : null,
      tplStrip: stBox,
      tplStripOpen: st ? st.open : null,
      tplStripTag: st ? st.tagName : null,
      tplStripSumText: (st && document.getElementById('tpl-strip-sum')) ? (document.getElementById('tpl-strip-sum').innerText||'').trim() : null,
      tplStripText: st && !st.hidden ? (document.getElementById('tpl-strip-lead').innerText||'').replace(/\\s+/g,' ').slice(0,200) : null,
      railOpen: document.getElementById('rail-fold').open,
      railH: +document.getElementById('rail-fold').getBoundingClientRect().height.toFixed(1),
      counter: (document.getElementById('count')||{}).textContent,
      pressed: [...document.querySelectorAll('.scene-chip[aria-pressed="true"]')].map(x=>x.getAttribute('data-scene')),
    };
  })()`);
  out.coffee = out.coffee || {};
  out.coffee[label] = { narrow, chipBox, measured: m, ...detail };
  console.log('COFFEE', label.padEnd(10), `rows=${m.rows}`, `full=${m.full}`, `firstTop=${m.firstTop}`, `firstTopScreens=${detail.firstTopScreens}`, `screens=${detail.screens}`, `railOpen=${detail.railOpen}`, `railH=${detail.railH}`);
  await page.close();
}

// ── 3. 空状态：搜「餐厅」/「电商」/「咖啡店」─────────────────────────────
for (const term of ['餐厅', '电商', '咖啡店', '酒吧']) {
  for (const t of [{ w: 390, h: 844, m: true }, { w: 1440, h: 900, m: false }, { w: 768, h: 1024, m: true }]) {
    const label = `${t.w}x${t.h}`;
    const page = await openPage(browser, t);
    await page.eval(`(() => { const q=document.getElementById('q'); q.value=${JSON.stringify(term)}; q.dispatchEvent(new Event('input',{bubbles:true})); window.scrollTo(0,0); return 1; })()`);
    await sleep(1000);
    const m = await page.eval(`(() => {
      const vh=innerHeight, sy=scrollY;
      const box=(sel)=>{const e=document.querySelector(sel); if(!e) return null; const r=e.getBoundingClientRect(); return {top:+(r.top+sy).toFixed(1),h:+r.height.toFixed(1),bottom:+(r.bottom+sy).toFixed(1),visible:+Math.max(0,Math.min(r.bottom,vh)-Math.max(r.top,0)).toFixed(1),screens:+((r.top+sy)/vh).toFixed(3)};};
      const et=document.getElementById('empty-tpl');
      const head=document.querySelector('#empty-tpl .tpl-empty-head');
      const inline=document.querySelector('#empty-tpl a.tpl-inline');
      const openA=document.querySelector('#empty-tpl .tpl-open');
      return {
        vh, rows: document.querySelectorAll('#ledger .row').length,
        sh: document.documentElement.scrollHeight, screens: +(document.documentElement.scrollHeight/vh).toFixed(3),
        emptyHidden: document.getElementById('empty').hidden,
        emptyTplHidden: et.hidden,
        empty: box('#empty'), emptyTpl: box('#empty-tpl'),
        head: box('#empty-tpl .tpl-empty-head'),
        headText: head ? head.innerText.replace(/\\s+/g,' ').trim() : null,
        inlineLink: inline ? { ...box('#empty-tpl a.tpl-inline'), href: inline.getAttribute('href'), text: inline.innerText.trim() } : null,
        openLink: openA ? { ...box('#empty-tpl .tpl-open'), href: openA.getAttribute('href'), text: openA.innerText.trim() } : null,
        openLinkCount: document.querySelectorAll('#empty-tpl .tpl-open').length,
        tplCardCount: document.querySelectorAll('#empty-tpl .tpl-card').length,
      };
    })()`);
    out.empty[term + '@' + label] = m;
    console.log('EMPTY', term, label.padEnd(10), `rows=${m.rows}`, `inlineLinkTop=${m.inlineLink ? m.inlineLink.top : '—'}`,
      `openLinkTop=${m.openLink ? m.openLink.top : '—'}`, `openLinkScreens=${m.openLink ? m.openLink.screens : '—'}`, `docH=${m.sh}`);
    await page.close();
  }
}

// ── 4. 模板带（有行时）几何 ─────────────────────────────────────────────
for (const t of TIERS) {
  const label = `${t.w}x${t.h}`;
  const page = await openPage(browser, t);
  if (t.w <= 980) { await page.eval(`(() => { document.getElementById('rail-fold').open = true; return 1; })()`); await sleep(600); }
  const chip = await page.eval(`(() => {
    const b=[...document.querySelectorAll('#flt-scene button')].find(x=>(x.getAttribute('data-scene')||'')==='咖啡店');
    if(!b) return null; b.scrollIntoView({block:'center'});
    const r=b.getBoundingClientRect(); return {x:Math.round(r.left+r.width/2),y:Math.round(r.top+r.height/2)};
  })()`);
  if (chip) {
    await sleep(250);
    await page.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: chip.x, y: chip.y, button: 'left', clickCount: 1 });
    await page.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: chip.x, y: chip.y, button: 'left', clickCount: 1 });
    await sleep(900);
  }
  await page.eval('window.scrollTo(0,0)'); await sleep(300);
  const g = await page.eval(`(() => {
    const vh=innerHeight, sy=scrollY;
    const box=(sel)=>{const e=document.querySelector(sel); if(!e) return null; const r=e.getBoundingClientRect(); return {top:+(r.top+sy).toFixed(1),h:+r.height.toFixed(1),bottom:+(r.bottom+sy).toFixed(1),visible:+Math.max(0,Math.min(r.bottom,vh)-Math.max(r.top,0)).toFixed(1)};};
    const s=document.getElementById('tpl-strip');
    const sm=document.getElementById('tpl-strip-sum');
    // box() only counts boxes that actually paint: a closed <details>'s non-summary
    // children still report a rect, so visibility must come from the details state.
    const painted = (sel) => (!s.open && sel !== '#tpl-strip-sum' && sel !== '#tpl-strip') ? null : box(sel);
    return { vh, sh: document.documentElement.scrollHeight, screens:+(document.documentElement.scrollHeight/vh).toFixed(3),
      stripHidden: s.hidden, stripOpen: s.open, stripTag: s.tagName,
      strip: s.hidden?null:box('#tpl-strip'),
      sum: (sm && !s.hidden) ? box('#tpl-strip-sum') : null,
      sumText: (sm && !s.hidden) ? (sm.innerText||'').trim() : null,
      lead: s.hidden?null:painted('#tpl-strip-lead'), cards: s.hidden?null:painted('#tpl-cards'),
      firstCard: s.hidden?null:box('#tpl-strip .tpl-card'), openLink: s.hidden?null:box('#tpl-strip .tpl-open'),
      firstRow: box('#ledger .row'),
      rows: document.querySelectorAll('#ledger .row').length };
  })()`);
  out.tplStrip.push({ label, ...g });
  console.log('TPLSTRIP', label.padEnd(10), JSON.stringify(g));
  await page.close();
}

// ── 5. 详情面板：hard 案的 riskNote 与几何 ─────────────────────────────
for (const id of ['S15', 'S18', 'S21', 'S29', 'S01']) {
  for (const t of [{ w: 390, h: 844, m: true }, { w: 1440, h: 900, m: false }, { w: 1024, h: 900, m: false }]) {
    const label = `${t.w}x${t.h}`;
    const page = await openPage(browser, t);
    await page.eval(`(() => { const q=document.getElementById('q'); q.value=${JSON.stringify(id)}; q.dispatchEvent(new Event('input',{bubbles:true})); return 1; })()`);
    await sleep(800);
    await page.eval(`location.hash = '#${id}'`);
    await sleep(1100);
    const d = await page.eval(`(() => {
      const det=document.getElementById('detail'), vh=innerHeight;
      const hint=det.querySelector('.prompt-hint');
      const body=document.getElementById('d-body');
      const fieldAt=(name)=>{ const dl=det.querySelector('dl.fields'); if(!dl) return null; const dts=[...dl.querySelectorAll('dt')]; const dt=dts.find(x=>x.textContent.trim()===name); if(!dt) return null; const r=dt.getBoundingClientRect(); return {top:+(r.top-det.getBoundingClientRect().top).toFixed(1), h:+r.height.toFixed(1)}; };
      return {
        vh, open: !det.hidden, pos: getComputedStyle(det).position,
        detH: +det.getBoundingClientRect().height.toFixed(1),
        detScrollH: det.scrollHeight,
        detScreens: +(det.scrollHeight / det.getBoundingClientRect().height).toFixed(2),
        hintH: hint ? +hint.getBoundingClientRect().height.toFixed(1) : null,
        hintText: hint ? hint.innerText.replace(/\\s+/g,' ').trim() : null,
        scenesAt: fieldAt('适用场景'),
        tplLinks: det.querySelectorAll('a[href*="templates/"]').length,
        firstRowTop: (() => { const r=document.querySelector('#ledger .row'); return r ? +(r.getBoundingClientRect().top+scrollY).toFixed(1) : null; })(),
        docH: document.documentElement.scrollHeight,
      };
    })()`);
    out.detail[id + '@' + label] = d;
    console.log('DETAIL', id, label.padEnd(10), `hintH=${d.hintH}`, `detScrollH=${d.detScrollH}`, `detScreens=${d.detScreens}`, `scenesAt=${d.scenesAt ? d.scenesAt.top : '—'}`, `tplLinks=${d.tplLinks}`);
    await page.close();
  }
}

// ── 6. 清空筛选仍然正常 ────────────────────────────────────────────────
for (const t of [{ w: 390, h: 844, m: true }, { w: 1440, h: 900, m: false }]) {
  const label = `${t.w}x${t.h}`;
  const page = await openPage(browser, t);
  if (t.w <= 980) { await page.eval(`(() => { document.getElementById('rail-fold').open = true; return 1; })()`); await sleep(600); }
  const chip = await page.eval(`(() => { const b=[...document.querySelectorAll('#flt-scene button')].find(x=>(x.getAttribute('data-scene')||'')==='咖啡店'); if(!b) return null; b.scrollIntoView({block:'center'}); const r=b.getBoundingClientRect(); return {x:Math.round(r.left+r.width/2),y:Math.round(r.top+r.height/2)}; })()`);
  if (chip) {
    await sleep(250);
    await page.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: chip.x, y: chip.y, button: 'left', clickCount: 1 });
    await page.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: chip.x, y: chip.y, button: 'left', clickCount: 1 });
    await sleep(900);
  }
  const afterChip = await page.eval(MEASURE);
  // 真点「清空筛选」（它在 #bar-fold 里，窄档 bar-fold 默认关 → 先展开）
  await page.eval(`(() => { const bf=document.getElementById('bar-fold'); if(bf) bf.open=true; const r=document.getElementById('reset'); r.scrollIntoView({block:'center'}); return 1; })()`);
  await sleep(500);
  const rb = await page.eval(`(() => { const r=document.getElementById('reset').getBoundingClientRect(); return {x:Math.round(r.left+r.width/2),y:Math.round(r.top+r.height/2),w:Math.round(r.width),h:Math.round(r.height)}; })()`);
  await page.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: rb.x, y: rb.y, button: 'left', clickCount: 1 });
  await page.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: rb.x, y: rb.y, button: 'left', clickCount: 1 });
  await sleep(900);
  await page.eval('window.scrollTo(0,0)'); await sleep(300);
  const afterReset = await page.eval(MEASURE);
  const consistency = await page.eval(`(() => ({
    count: (document.getElementById('count')||{}).textContent,
    pressedScenes: document.querySelectorAll('.scene-chip[aria-pressed="true"]').length,
    pressedChips: document.querySelectorAll('.chips button[aria-pressed="true"]').length,
    q: (document.getElementById('q')||{}).value,
    parked: !!document.getElementById('q-parked') && !document.getElementById('q-parked').hidden,
    railOpen: document.getElementById('rail-fold').open,
  }))()`);
  out.clearReset = out.clearReset || {};
  out.clearReset[label] = { afterChip: { rows: afterChip.rows, full: afterChip.full, firstTop: afterChip.firstTop, railOpen: afterChip.railOpen }, afterReset: { rows: afterReset.rows, full: afterReset.full, firstTop: afterReset.firstTop, railOpen: afterReset.railOpen }, consistency, resetBox: rb };
  console.log('RESET', label.padEnd(10), JSON.stringify(out.clearReset[label]));
  await page.close();
}

writeFileSync(OUT, JSON.stringify(out, null, 2), 'utf8');
console.log('\nwrote ' + OUT);
await browser.close();
