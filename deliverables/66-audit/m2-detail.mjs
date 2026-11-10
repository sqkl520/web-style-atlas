// m2-detail.mjs — 详情面板 30 案 × 390×844 / 414×896 / 1440×900 全量测量
// 输出 data-m2-detail.json
import { Browser } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const PAGE = 'file:///' + join(ROOT, 'prototypes', '_selection', 'index.html').replace(/\\/g, '/');

const VPS = [
  { name: '390', w: 390, h: 844, mobile: true },
  { name: '414', w: 414, h: 896, mobile: true },
  { name: '1440', w: 1440, h: 900, mobile: false },
];

const probe = () => {
  const detail = document.querySelector('#detail');
  const dr = detail.getBoundingClientRect();
  const st = detail.scrollTop;
  const rel = (el) => {
    if (!el) return null;
    const b = el.getBoundingClientRect();
    return { top: +(b.top - dr.top + st).toFixed(1), h: +b.height.toFixed(1), bottom: +(b.bottom - dr.top + st).toFixed(1) };
  };
  const body = document.querySelector('#d-body');
  const kids = body ? Array.from(body.children) : [];
  const lab = (el) => {
    const dt = el.querySelector(':scope > dt');
    const su = el.querySelector(':scope > details > summary');
    return (dt ? dt.textContent : su ? su.textContent : el.className).trim();
  };
  const fieldsDl = document.querySelector('#d-body .fields');
  const fieldEls = fieldsDl ? Array.from(fieldsDl.children) : [];
  const fieldData = fieldEls.map((el) => {
    const dd = el.querySelector(':scope > dd');
    const fb = el.querySelector('.fold-body');
    const txt = dd ? dd.textContent : fb ? fb.textContent : '';
    return {
      label: lab(el), ...rel(el),
      chars: txt.replace(/\s+/g, '').length,
      isFold: el.classList.contains('field-fold'),
      foldOpen: el.querySelector('details') ? el.querySelector('details').open : null,
    };
  });
  const folds = Array.from(document.querySelectorAll('#d-body .fold')).map((f) => {
    const s = f.querySelector(':scope > summary');
    return {
      cls: f.className.replace('fold ', ''), open: f.open,
      ...rel(f), sumH: s ? +s.getBoundingClientRect().height.toFixed(1) : null,
      sumText: s ? s.textContent.replace(/\s+/g, ' ').trim().slice(0, 90) : '',
    };
  });
  const fieldFold = document.querySelector('#d-body .field-fold details');
  const firstField = fieldData[0] || null;
  return {
    detail: {
      scrollHeight: detail.scrollHeight, clientHeight: detail.clientHeight,
      scrollTop: st,
      screens: +(detail.scrollHeight / detail.clientHeight).toFixed(2),
      width: +dr.width.toFixed(1), rectTop: +dr.top.toFixed(1),
    },
    head: rel(document.querySelector('.detail-head')),
    bodyRect: rel(body),
    kids: kids.map((k) => ({ tag: k.tagName, cls: (k.className || '').toString().slice(0, 40), ...rel(k) })),
    folds,
    promptCta: rel(document.querySelector('.prompt-cta')),
    openProto: rel(document.querySelector('.open-proto')),
    fieldsDl: rel(fieldsDl),
    fieldCount: fieldData.length,
    firstFieldTop: firstField ? firstField.top : null,
    fieldFoldRect: fieldFold ? rel(fieldFold.closest('.field')) : null,
    fields: fieldData,
    totalChars: fieldData.reduce((a, b) => a + b.chars, 0),
    docScrollH: document.documentElement.scrollHeight,
    overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  };
};

const browser = await Browser.launch({ width: 1440, height: 900 });
const out = { measuredAt: new Date().toISOString(), vps: {} };

for (const vp of VPS) {
  const p = await browser.newPage({ width: vp.w, height: vp.h, dsf: 2, mobile: vp.mobile });
  await p.goto(PAGE, { settleMs: 1800 });
  const list = [];
  for (let i = 1; i <= 30; i++) {
    const id = 'S' + String(i).padStart(2, '0');
    const ok = await p.eval((sid) => {
      const row = document.querySelector('.row[data-id="' + sid + '"]');
      if (!row) return false;
      row.click();
      const d = document.querySelector('#detail');
      d.scrollTop = 0;
      return true;
    }, id);
    await new Promise((r) => setTimeout(r, 260));
    if (!ok) { console.log('missing row', id); continue; }
    const d = await p.eval(probe);
    d.id = id;
    list.push(d);
    console.log(`[${vp.name}] ${id} scrollH=${d.detail.scrollHeight} clientH=${d.detail.clientHeight} screens=${d.detail.screens} firstField=${d.firstFieldTop}`);
  }
  // 关掉详情再测下一档
  await p.eval(() => document.querySelector('#d-close').click());
  out.vps[vp.name] = list;
  await p.close();
}

writeFileSync(join(HERE, 'data-m2-detail.json'), JSON.stringify(out, null, 1));
await browser.close();
console.log('written data-m2-detail.json');
