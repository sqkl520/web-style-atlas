// _p6_decisive.mjs — 审计的核心论证是「要保住 16px 就必须折 4 个字段」。
// 它测过 N3（15px、不折）却从没测过「16px + 同样只压排版 + CTA 折」。
// 如果这一档也能 30/30 达标，那"必须折字段"这个前提就是假的。
import { Browser } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const PAGE = 'file:///' + join(ROOT, 'prototypes', '_selection', 'index.html').replace(/\\/g, '/');

const LH = `
  function addStyle(css){var s=document.createElement('style');s.setAttribute('data-lab','1');s.textContent=css;document.head.appendChild(s);}
  function foldCta(){
    var fill=document.querySelector('#d-body .prompt-fill');
    var note=document.querySelector('#d-body .prompt-fill-note');
    if(!fill||!note)return;
    var d=document.createElement('details');d.setAttribute('data-lab','1');
    var s=document.createElement('summary');s.textContent='填写提示词开头（不填也能复制）';
    s.style.cssText='font-size:13px;cursor:pointer;padding:6px 0;line-height:1.6;color:var(--ink-2);min-height:24px';
    fill.parentNode.insertBefore(d,fill);d.appendChild(s);d.appendChild(fill);d.appendChild(note);
  }
  // T1 = 16px 不动 + 行高 1.5 + 内距 8 + dt 间距 2 + CTA 折（不折任何字段）
  function T1(){
    addStyle('#detail .field{padding:8px 0}#detail .field dd{line-height:1.5}'
      +'#detail .field dt{margin-bottom:2px}#detail .fields .field-fold{padding:8px 0}');
    foldCta();
  }
  // T2 = T1 + 内宽 16→10（正文 355→367）
  function T2(){
    addStyle('#detail .field{padding:8px 0}#detail .field dd{line-height:1.5}'
      +'#detail .field dt{margin-bottom:2px}#detail .fields .field-fold{padding:8px 0}'
      +'#d-body{padding-left:10px;padding-right:10px}');
    foldCta();
  }
  // T3 = T2 + 行高 1.45（再收一点，仍 16px）
  function T3(){
    addStyle('#detail .field{padding:8px 0}#detail .field dd{line-height:1.45}'
      +'#detail .field dt{margin-bottom:2px}#detail .fields .field-fold{padding:8px 0}'
      +'#d-body{padding-left:10px;padding-right:10px}');
    foldCta();
  }
  // N3 原配方（15px），做对照
  function N3(){
    addStyle('body{font-size:15px}#detail .field{padding:8px 0}#detail .field dd{font-size:15px;line-height:1.5}'
      +'#detail .field dt{margin-bottom:2px}#detail .fields .field-fold{padding:8px 0}');
    foldCta();
  }
  // T4 = T2 但只折 CTA，行高 1.55（保守版，看余量）
  function T4(){
    addStyle('#detail .field{padding:8px 0}#detail .field dd{line-height:1.55}'
      +'#detail .field dt{margin-bottom:2px}#detail .fields .field-fold{padding:8px 0}'
      +'#d-body{padding-left:10px;padding-right:10px}');
    foldCta();
  }
`;

const DM = () => {
  const d = document.getElementById('detail');
  const vh = d.clientHeight;
  const dl = document.querySelector('#d-body .fields');
  const kids = dl ? Array.from(dl.children) : [];
  const fields = kids.map((el) => {
    const dt = el.querySelector(':scope > dt'), su = el.querySelector(':scope > summary');
    const r = el.getBoundingClientRect();
    return { top: +(r.top - d.getBoundingClientRect().top).toFixed(1), h: +r.height.toFixed(1), label: (dt || su || { textContent: '?' }).textContent.trim() };
  });
  const dd = dl ? dl.querySelector('.field dd') : null;
  const cs = dd ? getComputedStyle(dd) : null;
  const copy = document.querySelector('#d-body .prompt-copy');
  const cb = copy ? copy.getBoundingClientRect() : null;
  return {
    scrollH: d.scrollHeight, screens: +(d.scrollHeight / vh).toFixed(2), vh,
    fieldCount: fields.length,
    fieldsFully: fields.filter((f) => f.top >= 0 && f.top + f.h <= vh).length,
    firstFieldTop: fields.length ? fields[0].top : null,
    fs: cs ? cs.fontSize : null, lh: cs ? cs.lineHeight : null, textW: dd ? +dd.getBoundingClientRect().width.toFixed(1) : null,
    copyTop: cb ? +cb.top.toFixed(1) : null,
    copyBottom: cb ? +cb.bottom.toFixed(1) : null,
    detailsCount: d.querySelectorAll('details').length,
    hOv: d.scrollWidth - d.clientWidth,
  };
};

const IDS = Array.from({ length: 30 }, (_, i) => 'S' + String(i + 1).padStart(2, '0'));
const browser = await Browser.launch({ width: 1440, height: 900 });
const out = {};

for (const vp of [{ k: '390', w: 390, h: 844, m: true }]) {
  const p = await browser.newPage({ width: vp.w, height: vp.h, dsf: 2, mobile: vp.m });
  await p.goto(PAGE, { settleMs: 1600 });
  out[vp.k] = {};
  for (const id of IDS) {
    out[vp.k][id] = {};
    for (const k of ['BASE', 'T4', 'T1', 'T2', 'T3', 'N3']) {
      await p.eval((sid) => {
        document.querySelectorAll('style[data-lab]').forEach((s) => s.remove());
        document.querySelector('.row[data-id="' + sid + '"]').click();
        document.getElementById('detail').scrollTop = 0;
      }, id);
      await new Promise((r) => setTimeout(r, 120));
      if (k !== 'BASE') { await p.eval((x) => { new Function(x)(); }, LH + k + '();'); await new Promise((r) => setTimeout(r, 100)); }
      out[vp.k][id][k] = await p.eval(DM);
    }
  }
  for (const k of ['BASE', 'T4', 'T1', 'T2', 'T3', 'N3']) {
    const sh = IDS.map((id) => out[vp.k][id][k].scrollH);
    const ff = IDS.map((id) => out[vp.k][id][k].fieldsFully);
    const s = out[vp.k].S01[k];
    const over = sh.filter((x) => x > 3800).length;
    console.log(`[${vp.k}] ${k.padEnd(5)} scrollH ${String(Math.min(...sh)).padStart(4)}–${String(Math.max(...sh)).padStart(4)} avg ${Math.round(sh.reduce((a, b) => a + b, 0) / 30)} | >3800=${String(over).padStart(2)}/30 | 屏max ${(Math.max(...sh) / 844).toFixed(2)} | fs ${s.fs} lh ${s.lh} w ${s.textW} details ${s.detailsCount} | 复制按钮 ${s.copyTop}–${s.copyBottom} | 完整字段avg ${(ff.reduce((a, b) => a + b, 0) / 30).toFixed(1)}`);
  }
  // 逐案 >3800 的清单
  for (const k of ['T1', 'T2', 'T4']) {
    const bad = IDS.filter((id) => out[vp.k][id][k].scrollH > 3800).map((id) => id + '=' + out[vp.k][id][k].scrollH);
    console.log(`  ${k} >3800 的案: ${bad.length ? bad.join(' ') : '无'}`);
  }
  await p.close();
}
writeFileSync(join(HERE, '_p6_decisive.json'), JSON.stringify(out, null, 1));
await browser.close();
