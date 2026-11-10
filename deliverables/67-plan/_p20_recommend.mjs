// _p20_recommend.mjs — 验证 §9「如果只能做一件事」的两条改动是否真的成立且无副作用。
// ① .mast h1 的 font-size: clamp(30px,4vw,56px) → var(--s-h1) (=clamp(34px,5.2vw,74px))
//    - 1440 档 focal-point 是否从 FAIL 变过线？
//    - .mast 会不会变高、首卡被推下去、完整卡数会不会掉？
//    - 390 档是否真的不受影响（被 @media max-width:620px 的 26px 接管）？
// ② .cap 文本去掉 ⚠ → emoji FAIL 是否消失？布局是否变化？
import { Browser, sleep } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { probe } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/probe.mjs';
import { judge } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/rules.mjs';
import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const PAGE = 'file:///' + join(HERE, '_frozen', 'index.html').replace(/\\/g, '/');

const FIX = `
  function addStyle(css){var s=document.createElement('style');s.setAttribute('data-lab','1');s.textContent=css;document.head.appendChild(s);}
  // ① 接上 --s-h1（模拟改成 var(--s-h1)）
  function H1VAR(){ addStyle('.mast h1{font-size:var(--s-h1)}'); }
  // ② 去掉 .cap 里的 ⚠（模拟改 app.js 字面量）
  function NOEMOJI(){
    var n=0;
    document.querySelectorAll('.cap').forEach(function(e){
      if(e.textContent.indexOf('\\u26A0')>=0){ e.textContent = e.textContent.replace(/\\u26A0\\uFE0F?\\s*/g,''); n++; }
    });
    return n;
  }
`;

const M = () => {
  const g = (s) => { const e = document.querySelector(s); if (!e) return null; const b = e.getBoundingClientRect(); return { h: +b.height.toFixed(1), w: +b.width.toFixed(1), top: +b.top.toFixed(1) }; };
  const h1 = document.querySelector('.mast h1');
  const h1cs = h1 ? getComputedStyle(h1) : null;
  const rows = Array.from(document.querySelectorAll('#ledger .row'));
  const first = rows[0] ? rows[0].getBoundingClientRect() : null;
  return {
    iw: innerWidth,
    h1Size: h1cs ? h1cs.fontSize : null,
    h1Vw: h1cs ? +(parseFloat(h1cs.fontSize) / innerWidth * 100).toFixed(2) : null,
    h1H: h1 ? +h1.getBoundingClientRect().height.toFixed(1) : null,
    h1Lines: h1 ? Math.round(h1.getBoundingClientRect().height / parseFloat(h1cs.lineHeight)) : null,
    mastH: g('.mast') ? g('.mast').h : null,
    barH: g('.bar') ? g('.bar').h : null,
    firstCardTop: first ? +first.top.toFixed(1) : null,
    firstCardH: first ? +first.height.toFixed(1) : null,
    complete: rows.filter((r) => { const b = r.getBoundingClientRect(); return b.top >= 0 && b.bottom <= innerHeight; }).length,
    docH: document.documentElement.scrollHeight,
    ovX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    capHasEmoji: Array.from(document.querySelectorAll('.cap')).some((e) => e.textContent.indexOf('\u26A0') >= 0),
  };
};

const browser = await Browser.launch({ width: 1440, height: 900 });
const out = {};

for (const [label, w, h, mobil] of [['1440', 1440, 900, false], ['1180', 1180, 900, false], ['980', 980, 900, false], ['768', 768, 1024, true], ['390', 390, 844, true]]) {
  const p = await browser.newPage({ width: w, height: h, dsf: 1, mobile: mobil });
  out[label] = {};
  for (const [k, code] of Object.entries({ BASE: '', H1VAR: 'H1VAR();', BOTH: 'H1VAR();NOEMOJI();' })) {
    await p.goto(PAGE, { settleMs: 1900 });
    let removed = null;
    if (code) {
      removed = await p.eval((x) => { new Function(x)(); }, FIX + code);
      await sleep(300);
    }
    const m = await p.eval(M);
    const metrics = await p.eval(probe);
    const findings = judge(metrics, { width: w, allow: [] });
    out[label][k] = {
      ...m, removedCaps: removed,
      heroVw: metrics.hero ? metrics.hero.vw : null,
      heroSize: metrics.hero ? metrics.hero.size : null,
      smallText: metrics.type.smallText, sizeCount: metrics.type.sizeCount,
      fails: findings.filter((f) => f.level === 'FAIL').map((f) => f.id),
      warns: findings.filter((f) => f.level === 'WARN').map((f) => f.id),
    };
    const x = out[label][k];
    console.log(`[${label}] ${k.padEnd(6)} h1=${String(x.h1Size).padStart(6)} (${String(x.h1Vw).padStart(5)}vw, ${x.h1Lines}行 h=${x.h1H}) mast=${String(x.mastH).padStart(6)} 首卡top=${String(x.firstCardTop).padStart(7)} 完整=${x.complete} ovX=${x.ovX} | hero.vw=${x.heroVw} | FAIL=${x.fails.join(',') || 'none'}`);
  }
  await p.close();
}
writeFileSync(join(HERE, '_p20_recommend.json'), JSON.stringify(out, null, 1));
console.log('\n=== 关键判定 ===');
for (const l of ['1440', '390']) {
  console.log(`${l}: BASE focal-point=${out[l].BASE.fails.includes('focal-point')} → BOTH focal-point=${out[l].BOTH.fails.includes('focal-point')}`);
  console.log(`${l}: BASE emoji=${out[l].BASE.fails.includes('emoji')} → BOTH emoji=${out[l].BOTH.fails.includes('emoji')}`);
  console.log(`${l}: mast ${out[l].BASE.mastH} → ${out[l].BOTH.mastH} (Δ${(out[l].BOTH.mastH - out[l].BASE.mastH).toFixed(1)}) | 首卡 ${out[l].BASE.firstCardTop} → ${out[l].BOTH.firstCardTop} | 完整卡 ${out[l].BASE.complete} → ${out[l].BOTH.complete}`);
}
await browser.close();
