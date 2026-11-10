// _p16_twofold.mjs — 66-plan/PLAN-round6.md:346 报过「折 2 个字段就 0/30」。
// 如果它对，那 R2（折 4 + 改行高/内宽）就不是最省的路径，审计的推荐建立在错误的选项集上。
// 本探针：在 frozen HEAD 上，逐案只折**最长的 2 个**字段，排版一个值不动。
import { Browser } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const PAGE = 'file:///' + join(HERE, '_frozen', 'index.html').replace(/\\/g, '/');

const LH = `
  function addStyle(css){var s=document.createElement('style');s.setAttribute('data-lab','1');s.textContent=css;document.head.appendChild(s);}
  function foldField(f){
    var dt=f.querySelector(':scope > dt'), dd=f.querySelector(':scope > dd');
    if(!dt||!dd||f.dataset.folded)return;
    f.dataset.folded='1';
    var det=document.createElement('details');
    var s=document.createElement('summary');s.textContent=dt.textContent;
    s.style.cssText='font-size:13px;color:var(--ink-3);cursor:pointer;line-height:1.6;padding:4px 0;min-height:24px';
    dt.remove();det.appendChild(s);det.appendChild(dd);f.appendChild(det);
  }
  // 折最高的 N 个字段（按实测高度），排版不动
  function foldLongestN(n){
    var fs=Array.prototype.slice.call(document.querySelectorAll('#d-body .fields > .field'));
    var arr=fs.filter(function(f){return f.querySelector(':scope > dt') && f.querySelector(':scope > dd');})
      .map(function(f){return {f:f, h:f.getBoundingClientRect().height};})
      .sort(function(a,b){return b.h-a.h;});
    arr.slice(0,n).forEach(function(x){foldField(x.f);});
    return arr.slice(0,n).map(function(x){return x.f.querySelector('summary').textContent + '=' + Math.round(x.h);});
  }
  function foldCta(){
    var fill=document.querySelector('#d-body .prompt-fill');
    var note=document.querySelector('#d-body .prompt-fill-note');
    if(!fill||!note)return;
    var d=document.createElement('details');d.setAttribute('data-lab','1');
    var s=document.createElement('summary');s.textContent='填写提示词开头（不填也能复制）';
    s.style.cssText='font-size:13px;cursor:pointer;padding:6px 0;line-height:1.6;color:var(--ink-2);min-height:24px';
    fill.parentNode.insertBefore(d,fill);d.appendChild(s);d.appendChild(fill);d.appendChild(note);
  }
  // F2 = 只折最长 2 个，排版不动
  function F2(){ foldLongestN(2); }
  // F3 = 只折最长 3 个
  function F3(){ foldLongestN(3); }
  // F2C = 折最长 2 个 + CTA 折（CTA 折是零风险的，纯 chrome）
  function F2C(){ foldLongestN(2); foldCta(); }
`;

const DM = () => {
  const d = document.getElementById('detail');
  const vh = d.clientHeight;
  const dl = document.querySelector('#d-body .fields');
  const kids = dl ? Array.from(dl.children) : [];
  const fields = kids.map((el) => {
    const r = el.getBoundingClientRect();
    return { top: +(r.top - d.getBoundingClientRect().top).toFixed(1), h: +r.height.toFixed(1) };
  });
  const dd = dl ? dl.querySelector('.field dd') : null;
  return {
    scrollH: d.scrollHeight, screens: +(d.scrollHeight / vh).toFixed(2), vh,
    fieldsFully: fields.filter((f) => f.top >= 0 && f.top + f.h <= vh).length,
    fs: dd ? getComputedStyle(dd).fontSize : null, lh: dd ? getComputedStyle(dd).lineHeight : null,
    textW: dd ? +dd.getBoundingClientRect().width.toFixed(1) : null,
    detailsCount: d.querySelectorAll('details').length,
    // 全展开后的总高（读完全部的成本）
    openAllH: null,
    hOv: d.scrollWidth - d.clientWidth,
  };
};

const OPEN_ALL = () => {
  const d = document.getElementById('detail');
  d.querySelectorAll('details').forEach((x) => { x.open = true; });
  return { openAllH: d.scrollHeight, openAllScreens: +(d.scrollHeight / d.clientHeight).toFixed(2) };
};

const IDS = Array.from({ length: 30 }, (_, i) => 'S' + String(i + 1).padStart(2, '0'));
const browser = await Browser.launch({ width: 1440, height: 900 });
const out = { folded: {} };
const p = await browser.newPage({ width: 390, height: 844, dsf: 1, mobile: true });
await p.goto(PAGE, { settleMs: 1800 });
out['390'] = {};
for (const id of IDS) {
  out['390'][id] = {};
  for (const k of ['BASE', 'F2', 'F2C', 'F3']) {
    await p.eval((sid) => {
      document.querySelectorAll('style[data-lab]').forEach((s) => s.remove());
      document.querySelectorAll('#d-body details[data-lab]').forEach((x) => x.remove());
      document.querySelector('.row[data-id="' + sid + '"]').click();
      document.getElementById('detail').scrollTop = 0; window.scrollTo(0, 0);
    }, id);
    await new Promise((r) => setTimeout(r, 100));
    let folded = null;
    if (k !== 'BASE') folded = await p.eval((x) => { new Function(x)(); }, LH + k + '();');
    await new Promise((r) => setTimeout(r, 80));
    out['390'][id][k] = await p.eval(DM);
    if (folded) out.folded[id] = folded;
    // 全展开成本
    const oa = await p.eval(OPEN_ALL);
    out['390'][id][k].openAllH = oa.openAllH; out['390'][id][k].openAllScreens = oa.openAllScreens;
  }
}
for (const k of ['BASE', 'F2', 'F2C', 'F3']) {
  const sh = IDS.map((id) => out['390'][id][k].scrollH);
  const oa = IDS.map((id) => out['390'][id][k].openAllH);
  const ff = IDS.map((id) => out['390'][id][k].fieldsFully);
  const s = out['390'].S01[k];
  console.log(`[390] ${k.padEnd(5)} scrollH ${Math.min(...sh)}–${Math.max(...sh)} avg ${Math.round(sh.reduce((a, b) => a + b, 0) / 30)} | >3800=${sh.filter((x) => x > 3800).length}/30 | 屏max ${(Math.max(...sh) / 844).toFixed(2)} | 全展开 max ${Math.max(...oa)} | fs ${s.fs} lh ${s.lh} w ${s.textW} | 完整字段 ${(ff.reduce((a, b) => a + b, 0) / 30).toFixed(1)} | details ${s.detailsCount}`);
}
for (const k of ['F2', 'F3']) {
  const bad = IDS.filter((id) => out['390'][id][k].scrollH > 3800);
  console.log(`  ${k} >3800: ${bad.length ? bad.map((i) => i + '=' + out['390'][i][k].scrollH).join(' ') : '无'}`);
}
console.log('\n逐案折掉哪 2 个:');
for (const id of ['S01', 'S13', 'S15', 'S26', 'S29']) console.log(' ', id, JSON.stringify(out.folded[id]));
writeFileSync(join(HERE, '_p16_twofold.json'), JSON.stringify(out, null, 1));
await p.close();
await browser.close();
