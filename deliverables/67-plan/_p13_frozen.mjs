// _p13_frozen.mjs — 在 HEAD 冻结快照上重跑「详情面板」全套，杜绝并发改动污染。
// 冻结副本：deliverables/67-plan/_frozen/（git show HEAD:prototypes/_selection/*）
import { Browser } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const PAGE = 'file:///' + join(HERE, '_frozen', 'index.html').replace(/\\/g, '/');

const LH = `
  function addStyle(css){var s=document.createElement('style');s.setAttribute('data-lab','1');s.textContent=css;document.head.appendChild(s);}
  function foldCta(){
    var fill=document.querySelector('#d-body .prompt-fill');
    var note=document.querySelector('#d-body .prompt-fill-note');
    if(!fill||!note)return false;
    var d=document.createElement('details');d.setAttribute('data-lab','1');
    var s=document.createElement('summary');s.textContent='填写提示词开头（不填也能复制）';
    s.style.cssText='font-size:13px;cursor:pointer;padding:6px 0;line-height:1.6;color:var(--ink-2);min-height:24px';
    fill.parentNode.insertBefore(d,fill);d.appendChild(s);d.appendChild(fill);d.appendChild(note);
    return true;
  }
  // T2 = 16px 不动 + 行高 1.5 + 内距 8 + dt 2px + 内宽 10 + CTA 折（不折任何字段）
  function T2(){
    addStyle('#detail .field{padding:8px 0}#detail .field dd{line-height:1.5}'
      +'#detail .field dt{margin-bottom:2px}#detail .fields .field-fold{padding:8px 0}'
      +'#d-body{padding-left:10px;padding-right:10px}');
    return foldCta();
  }
  // T3 = T2 + 行高 1.45
  function T3(){
    addStyle('#detail .field{padding:8px 0}#detail .field dd{line-height:1.45}'
      +'#detail .field dt{margin-bottom:2px}#detail .fields .field-fold{padding:8px 0}'
      +'#d-body{padding-left:10px;padding-right:10px}');
    return foldCta();
  }
  // T5 = T2 但**只折 CTA、压内距，不动行高**（最保守）
  function T5(){
    addStyle('#detail .field{padding:8px 0}#detail .field dt{margin-bottom:2px}'
      +'#detail .fields .field-fold{padding:8px 0}#d-body{padding-left:10px;padding-right:10px}');
    return foldCta();
  }
  // N3 = 15px 版（审计原方案，做对照）
  function N3(){
    addStyle('body{font-size:15px}#detail .field{padding:8px 0}#detail .field dd{font-size:15px;line-height:1.5}'
      +'#detail .field dt{margin-bottom:2px}#detail .fields .field-fold{padding:8px 0}');
    return foldCta();
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
    copyTop: cb ? +cb.top.toFixed(1) : null, copyBottom: cb ? +cb.bottom.toFixed(1) : null,
    detailsCount: d.querySelectorAll('details').length,
    hOv: d.scrollWidth - d.clientWidth,
    fieldLabels: fields.map((f) => f.label),
  };
};

const IDS = Array.from({ length: 30 }, (_, i) => 'S' + String(i + 1).padStart(2, '0'));
const browser = await Browser.launch({ width: 1440, height: 900 });
const out = {};

for (const [label, w, h, m] of [['390', 390, 844, true], ['414', 414, 896, true], ['1440', 1440, 900, false]]) {
  const p = await browser.newPage({ width: w, height: h, dsf: 1, mobile: m });
  await p.goto(PAGE, { settleMs: 1800 });
  out[label] = {};
  for (const id of IDS) {
    out[label][id] = {};
    for (const k of ['BASE', 'T5', 'T2', 'T3', 'N3']) {
      await p.eval((sid) => {
        document.querySelectorAll('style[data-lab]').forEach((s) => s.remove());
        document.querySelectorAll('#d-body details[data-lab]').forEach((x) => x.remove());
        document.querySelector('.row[data-id="' + sid + '"]').click();
        document.getElementById('detail').scrollTop = 0;
        window.scrollTo(0, 0);
      }, id);
      await new Promise((r) => setTimeout(r, 110));
      if (k !== 'BASE') { await p.eval((x) => { new Function(x)(); }, LH + k + '();'); await new Promise((r) => setTimeout(r, 90)); }
      out[label][id][k] = await p.eval(DM);
    }
  }
  for (const k of ['BASE', 'T5', 'T2', 'T3', 'N3']) {
    const sh = IDS.map((id) => out[label][id][k].scrollH);
    const ff = IDS.map((id) => out[label][id][k].fieldsFully);
    const s = out[label].S01[k];
    const over = sh.filter((x) => x > 3800).length;
    console.log(`[${label}] ${k.padEnd(5)} scrollH ${String(Math.min(...sh)).padStart(4)}–${String(Math.max(...sh)).padStart(4)} avg ${String(Math.round(sh.reduce((a, b) => a + b, 0) / 30)).padStart(4)} | >3800=${String(over).padStart(2)}/30 | 屏max ${(Math.max(...sh) / s.vh).toFixed(2)} | fs ${s.fs} lh ${s.lh} w ${s.textW} | 复制钮 ${s.copyTop} | 完整字段 ${(ff.reduce((a, b) => a + b, 0) / 30).toFixed(1)} | 字段数 ${s.fieldCount}`);
  }
  console.log('');
  await p.close();
}
writeFileSync(join(HERE, '_p13_frozen.json'), JSON.stringify(out, null, 1));
console.log('S01 BASE labels:', out['390'].S01.BASE.fieldLabels.join(' | '));
await browser.close();
