// _p10_gate.mjs — 关键攻击：如果照 A5 改，选型台**自己**还过不过这道闸门？
// 直接用仓库自带的 probe.mjs + rules.mjs（judge），对真实页面在 A5 生效前后各判一次。
// 只读 prototypes/，不写任何源文件。
import { Browser, sleep } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { probe } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/probe.mjs';
import { judge } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/rules.mjs';
import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const PAGE = 'file:///' + join(ROOT, 'prototypes', '_selection', 'index.html').replace(/\\/g, '/');

const LH = `
  function addStyle(css){var s=document.createElement('style');s.setAttribute('data-lab','1');s.textContent=css;document.head.appendChild(s);}
  function railToSummary(){
    var rail=document.querySelector('.rail');
    var d=document.createElement('details');d.setAttribute('data-lab','1');
    var s=document.createElement('summary');s.textContent='筛选与场景反查 · 11 组 47 颗芯片';
    s.style.cssText='display:flex;align-items:center;font-size:14px;font-weight:600;padding:0 0 0 20px;min-height:48px;cursor:pointer;list-style-position:inside';
    var body=document.createElement('div');
    while(rail.firstChild)body.appendChild(rail.firstChild);
    d.appendChild(s);d.appendChild(body);rail.appendChild(d);
    rail.style.maxHeight='none';rail.style.overflow='visible';
    rail.style.padding='0 16px 6px';rail.style.borderBottom='2px solid var(--ink)';d.open=false;
  }
  function headFold(){
    var claim=document.querySelector('.mast-claim'),exit=document.querySelector('.mast-exit');
    var d=document.createElement('details');d.setAttribute('data-lab','1');
    var s=document.createElement('summary');s.textContent='这个图集是什么 · 想要现成模板去哪';
    s.style.cssText='font-size:13px;color:var(--ink-2);padding:6px 0;cursor:pointer;line-height:1.6;min-height:24px';
    claim.parentNode.insertBefore(d,claim);d.appendChild(s);d.appendChild(claim);d.appendChild(exit);d.open=false;
    addStyle('.mast{padding:12px 16px 10px;gap:8px}.mast-kicker{font-size:12px;margin-bottom:4px}'
      +'.mast h1{font-size:26px;line-height:1.1}.mast-wizard{margin-top:6px}.mast-wizard a{padding:6px 10px;font-size:14px}'
      +'.mast-facts{display:flex;margin-top:6px;gap:0}.mast-facts>div{flex:1 1 0;border-top:1px solid var(--ink);padding-top:3px}'
      +'.mast-facts dt{font-size:11px;line-height:1.25}.mast-facts dd{font-size:17px;margin-top:0;line-height:1.15}'
      +'.mast-claim{margin-top:10px}.mast-exit{margin-top:8px}');
  }
  function barTight(){
    addStyle('.bar{padding-bottom:8px;gap:6px 8px}.search{flex:1 1 100%}.search input{padding:6px 8px}'
      +'.bar .count{order:3;font-size:12px}.bar .sort{order:4;gap:4px}.bar .sort label{display:none}'
      +'.sort select{padding:6px 6px;font-size:13px}.btn-quiet{padding:6px 8px;font-size:13px;order:5}');
  }
  var ROWFIX='.shots .shot img{max-height:100px}.shot{position:relative}'
    +'.shot figcaption{position:absolute;right:0;bottom:0;font-size:10px;padding:1px 4px;background:rgba(220,220,214,.92)}'
    +'.row-family{-webkit-line-clamp:1}.row{padding:9px 0;gap:14px}';
  function A5(){railToSummary();headFold();barTight();addStyle(ROWFIX);}
`;

const browser = await Browser.launch({ width: 1440, height: 900 });
const out = {};
for (const [label, w, h, mobil] of [['1440', 1440, 900, false], ['390', 390, 844, true]]) {
  const p = await browser.newPage({ width: w, height: h, dsf: 1, mobile: mobil });
  out[label] = {};
  for (const [k, code] of Object.entries({ BASE: '', A5: 'A5();' })) {
    await p.goto(PAGE, { settleMs: 2200 });
    if (code) { await p.eval((x) => { new Function(x)(); }, LH + code); await sleep(500); }
    const m = await p.eval(probe);
    const findings = judge(m, { width: w, allow: [] });
    out[label][k] = {
      findings,
      heroVw: m.hero ? m.hero.vw : null, heroSize: m.hero ? m.hero.size : null,
      heroLines: m.hero ? m.hero.lines : null,
      smallText: m.type.smallText, sizeCount: m.type.sizeCount, sizes: m.type.sizes,
      bodySize: m.type.body ? m.type.body.size : null,
      buttonsInHero: m.buttons.inHero,
    };
    const f = findings.map((x) => `${x.level}:${x.id}`);
    console.log(`[${label}] ${k.padEnd(5)} hero.size=${m.hero ? m.hero.size : null} vw=${m.hero ? m.hero.vw : null} lines=${m.hero ? m.hero.lines : null} | smallText=${m.type.smallText} sizeCount=${m.type.sizeCount} body=${m.type.body ? m.type.body.size : null} btnHero=${m.buttons.inHero}`);
    console.log(`         findings: ${f.length ? f.join(' ') : 'none'}`);
  }
  await p.close();
}
writeFileSync(join(HERE, '_p10_gate.json'), JSON.stringify(out, null, 1));
console.log('\n=== 1440 A5 详情 ===');
for (const x of out['1440'].A5.findings) console.log(` ${x.level} ${x.id}: ${x.message.slice(0, 180)}`);
console.log('\n=== 390 A5 详情 ===');
for (const x of out['390'].A5.findings) console.log(` ${x.level} ${x.id}: ${x.message.slice(0, 180)}`);
console.log('\n=== 1440 BASE 详情 ===');
for (const x of out['1440'].BASE.findings) console.log(` ${x.level} ${x.id}: ${x.message.slice(0, 180)}`);
console.log('\n=== 390 BASE 详情 ===');
for (const x of out['390'].BASE.findings) console.log(` ${x.level} ${x.id}: ${x.message.slice(0, 180)}`);
await browser.close();
