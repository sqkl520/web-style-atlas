// Strip must stay fully hidden when there are rows but no template hit (no empty shell).
import { Browser } from '../../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { writeFileSync } from 'node:fs';
const PORT = process.argv[2] || '9311';
const BASE = `http://127.0.0.1:${PORT}/prototypes/_selection/`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const out = {};
const log = (k, v) => { out[k] = v; console.log(k, '=', JSON.stringify(v)); };
const browser = await Browser.launch({ width: 1200, height: 900 });
async function open(w, h, mobile) {
  const page = await browser.newPage({ width: w, height: h, dsf: 1, mobile: false });
  await page.setViewport({ width: w, height: h, mobile, dsf: 1 });
  await page.goto(BASE, { settleMs: 1400 });
  await page.eval('document.fonts && document.fonts.ready ? document.fonts.ready.then(()=>1) : 1');
  await sleep(1500);
  return page;
}
const terms = ['监控', '工业', '报纸', '游戏', '排版', '黑', 'S01', '红'];
for (const vp of [{ w: 390, h: 844, m: true }, { w: 1440, h: 900, m: false }]) {
  const page = await open(vp.w, vp.h, vp.m);
  for (const term of terms) {
    await page.eval(`(() => { const q=document.getElementById('q'); q.value=${JSON.stringify(term)}; q.dispatchEvent(new Event('input',{bubbles:true})); return 1; })()`);
    await sleep(700);
    const r = await page.eval(`(() => {
      const s=document.getElementById('tpl-strip'); const rows=document.querySelectorAll('#ledger .row').length;
      const rect=s.getBoundingClientRect();
      const cs=getComputedStyle(s);
      const shellPainted = !s.hidden && rect.height>0 && cs.display!=='none';
      return { rows, hidden:s.hidden, display:cs.display, h:+rect.height.toFixed(1), open:s.open,
        sumText:(document.getElementById('tpl-strip-sum').innerText||'').trim(),
        cards:s.querySelectorAll('.tpl-card').length,
        shellPainted,
        // a painted shell with zero cards would be the "现成模板 0 张" bug
        emptyShellWithNoCards: shellPainted && s.querySelectorAll('.tpl-card').length===0 };
    })()`);
    log(`${vp.w}:${term}`, r);
  }
  await page.close();
}
writeFileSync('deliverables/69-exec/_bce/strip-hidden.json', JSON.stringify(out, null, 2), 'utf8');
console.log('\nwrote strip-hidden.json');
await browser.close();
