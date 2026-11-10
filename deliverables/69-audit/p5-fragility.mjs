// P5 — 首屏「1 张完整卡」的脆弱性矩阵。
// 对每种排序，找出能完整进首屏的卡数 & 最坏卡余量；
// 再测三档扰动：(a) 正文字号 +1px (b) 每卡多一行字 (c) 系统字体替换。
import { Browser, openPage, settle, measure, setSort, SORTS, sleep } from './lib.mjs';
import { writeFileSync } from 'node:fs';

const PORT = process.argv[2] || '8901';
const VPS = [
  { w: 360, h: 640, mobile: true, label: '360x640' },
  { w: 375, h: 667, mobile: true, label: '375x667' },
  { w: 390, h: 844, mobile: true, label: '390x844' },
  { w: 414, h: 896, mobile: true, label: '414x896' },
  { w: 768, h: 1024, mobile: true, label: '768x1024' },
  { w: 1440, h: 900, mobile: false, label: '1440x900' },
];

const browser = await Browser.launch({ width: 1200, height: 900 });
const rows = [];
const perturb = [];

for (const vp of VPS) {
  const page = await openPage(browser, { width: vp.w, height: vp.h, mobile: vp.mobile, dsf: 2 });
  await page.goto(`http://127.0.0.1:${PORT}/prototypes/_selection/`, { settleMs: 1200 });
  await settle(page, 1500);

  for (const [val, label] of SORTS) {
    await setSort(page, val);
    // 逐卡算「若它是首卡」的余量：slack = vh - (firstTop + cardH)
    const r = await page.eval(`(() => {
      const rows=[...document.querySelectorAll('#ledger .row')];
      const vh=innerHeight;
      const first=rows[0].getBoundingClientRect();
      const firstTop = first.top + scrollY;
      const data = rows.map(el=>({id:el.dataset.id, h:+el.getBoundingClientRect().height.toFixed(1)}));
      const slacks = data.map(d=>({id:d.id, h:d.h, slack: +(vh-(firstTop+d.h)).toFixed(1)}));
      slacks.sort((a,b)=>a.slack-b.slack);
      const full = rows.filter(el=>{const b=el.getBoundingClientRect(); return b.top>=-0.5 && b.bottom<=vh+0.5;}).length;
      return { vh:+vh, firstTop:+firstTop.toFixed(1), firstId: rows[0].dataset.id, full,
               worst: slacks[0], secondWorst: slacks[1], best: slacks[slacks.length-1],
               capacity: +(vh-firstTop).toFixed(1),
               over: slacks.filter(s=>s.slack<0).length,
               within10: slacks.filter(s=>s.slack>=0 && s.slack<10).length };
    })()`);
    rows.push({ vp: vp.label, sort: val, sortLabel: label, ...r });
    console.log(vp.label.padEnd(10), val.padEnd(6), 'full=' + r.full, 'capacity=' + String(r.capacity).padEnd(7),
      'worst=' + r.worst.id + '(' + r.worst.h + ')', 'slack=' + String(r.worst.slack).padEnd(7),
      'over=' + r.over, 'within10=' + r.within10);
  }

  // 扰动 a: 正文字号 +1px（body font-size，模拟浏览器最小字号/字体放大）
  await setSort(page, 'gate');
  const base = await page.eval(`(() => { const rows=[...document.querySelectorAll('#ledger .row')]; return {firstTop:+(rows[0].getBoundingClientRect().top+scrollY).toFixed(1), sh:document.documentElement.scrollHeight, h13:[...document.querySelectorAll('.row-foot, .row-meta')].map(e=>e.getBoundingClientRect().height).slice(0,6)}; })()`);
  await page.eval(`(() => { const s=document.createElement('style'); s.id='__p5'; s.textContent='html{font-size:17px} .row-def{font-size:17px} .row-family{font-size:17px}'; document.head.appendChild(s); return 1; })()`);
  await sleep(700);
  const afterFont = await page.eval(`(() => { const rows=[...document.querySelectorAll('#ledger .row')]; const vh=innerHeight; const ft=rows[0].getBoundingClientRect().top+scrollY; const s=rows.map(el=>({id:el.dataset.id,h:+el.getBoundingClientRect().height.toFixed(1)})).map(d=>({id:d.id,slack:+(vh-(ft+d.h)).toFixed(1)})).sort((a,b)=>a.slack-b.slack); const full=rows.filter(el=>{const b=el.getBoundingClientRect();return b.top>=-0.5&&b.bottom<=vh+0.5;}).length; return {firstTop:+ft.toFixed(1), sh:document.documentElement.scrollHeight, full, worst:s[0]}; })()`);
  await page.eval(`(() => { const s=document.getElementById('__p5'); if(s) s.remove(); return 1; })()`);
  await sleep(600);

  // 扰动 b: 每卡多一行字（给 .row-def 追加一句 ≈ 一行 16px 文本）
  await page.eval(`(() => { document.querySelectorAll('#ledger .row .row-def').forEach(p=>{ p.textContent = p.textContent + '，这一句是多出来的一行字，用来模拟内容增删。'; }); return 1; })()`);
  await sleep(700);
  const afterLine = await page.eval(`(() => { const rows=[...document.querySelectorAll('#ledger .row')]; const vh=innerHeight; const ft=rows[0].getBoundingClientRect().top+scrollY; const s=rows.map(el=>({id:el.dataset.id,h:+el.getBoundingClientRect().height.toFixed(1)})).map(d=>({id:d.id,slack:+(vh-(ft+d.h)).toFixed(1)})).sort((a,b)=>a.slack-b.slack); const full=rows.filter(el=>{const b=el.getBoundingClientRect();return b.top>=-0.5&&b.bottom<=vh+0.5;}).length; return {firstTop:+ft.toFixed(1), sh:document.documentElement.scrollHeight, full, worst:s[0], screens:+(document.documentElement.scrollHeight/vh).toFixed(3)}; })()`);

  perturb.push({ vp: vp.label, sort: 'gate', base, afterFont, afterLine });
  console.log('  PERTURB', vp.label, 'base sh=' + base.sh,
    '| font+1: full=' + afterFont.full + ' worstSlack=' + afterFont.worst.slack + ' sh=' + afterFont.sh,
    '| +1line: full=' + afterLine.full + ' worstSlack=' + afterLine.worst.slack + ' sh=' + afterLine.sh);
  await page.close();
}

writeFileSync('deliverables/69-audit/data-p5-fragility.json', JSON.stringify({ rows, perturb }, null, 2));
console.log('\nwrote data-p5-fragility.json');
await browser.close();
