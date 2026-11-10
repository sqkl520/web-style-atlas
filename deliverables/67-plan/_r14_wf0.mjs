// _r14_wf0.mjs — 「字段定位」到底有没有 0px 的位置？
// 头是 grid: auto | 1fr | auto，三个槽位都试一遍，量 head 高度 delta 与是否换行
import { Browser, sleep } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const PAGE = 'file:///' + join(ROOT, 'prototypes', '_selection', 'index.html').replace(/\\/g, '/');

const HEAD = () => {
  const d = document.getElementById('detail');
  const head = d.querySelector('.detail-head');
  const no = head.querySelector('.detail-no');
  const en = head.querySelector('.detail-title p');
  const h2 = head.querySelector('.detail-title h2');
  const box = (e) => e ? { h: +e.getBoundingClientRect().height.toFixed(1), w: +e.getBoundingClientRect().width.toFixed(1) } : null;
  return {
    headH: +head.getBoundingClientRect().height.toFixed(1),
    no: box(no), en: box(en), h2: box(h2),
    noText: no.textContent, enText: en ? en.textContent : null,
    scrollH: d.scrollHeight,
  };
};

// 方案 F：把定位塞进 .detail-title 的第二行（英文名那行），用 CSS 限制不换行
const F = () => {
  const d = document.getElementById('detail');
  const head = d.querySelector('.detail-head');
  const en = head.querySelector('.detail-title p');
  en.style.whiteSpace = 'nowrap'; en.style.overflow = 'hidden'; en.style.textOverflow = 'ellipsis';
  const base = en.textContent;
  const fields = Array.from(d.querySelectorAll('.fields .field'));
  const total = fields.length;
  const tail = document.createElement('span');
  tail.setAttribute('data-lab', 'wf');
  tail.style.cssText = 'font-variant-numeric:tabular-nums';
  en.appendChild(tail);
  const upd = () => {
    const hb = head.getBoundingClientRect();
    let cur = null, idx = 0;
    for (let i = 0; i < fields.length; i++) {
      if (fields[i].getBoundingClientRect().bottom > hb.bottom + 2) { cur = fields[i]; idx = i + 1; break; }
    }
    const name = cur ? (cur.querySelector('dt')?.textContent.trim() || cur.querySelector('summary')?.textContent.trim() || '').slice(0, 4) : '';
    tail.textContent = cur ? '  ·  ' + idx + '/' + total + ' ' + name : '  ·  完';
  };
  d.addEventListener('scroll', upd, { passive: true });
  upd();
  return total;
};

const SCROLLTO = (y) => { const d = document.getElementById('detail'); d.scrollTop = y; return d.querySelector('.detail-title p').textContent; };

const br = await Browser.launch({ width: 1440, height: 900 });
const out = {};
for (const id of ['S01', 'S26']) {
  const rec = {};
  for (const [tag, js] of [['base', null], ['F-titleLine', F]]) {
    const p = await br.newPage({ width: 390, height: 844, dsf: 2, mobile: true });
    await p.goto(PAGE + '#' + id, { settleMs: 2100 });
    await p.eval('document.fonts.ready.then(()=>1)');
    if (js) { await p.eval(js); await sleep(180); }
    rec[tag] = await p.eval(HEAD);
    if (js) {
      rec[tag].at = [];
      for (const y of [0, 700, 1400, Math.min(2100, rec[tag].scrollH - 900)]) rec[tag].at.push({ y, txt: await p.eval(SCROLLTO, y) });
    }
    await p.close();
  }
  out[id] = rec;
}
await br.close();
writeFileSync(join(HERE, '_r14_wf0.json'), JSON.stringify(out, null, 1), 'utf8');
for (const k of Object.keys(out)) {
  const r = out[k];
  console.log('===', k, '=== base headH', r.base.headH, 'scrollH', r.base.scrollH, '| en', JSON.stringify(r.base.en));
  console.log('    F     headH', r['F-titleLine'].headH, 'Δ=' + (r['F-titleLine'].headH - r.base.headH).toFixed(1), 'scrollH', r['F-titleLine'].scrollH, 'Δ=' + (r['F-titleLine'].scrollH - r.base.scrollH), '| en高', r['F-titleLine'].en.h, '(base', r.base.en.h + ')');
  (r['F-titleLine'].at || []).forEach((x) => console.log('      y=' + x.y, '→', x.txt));
}
