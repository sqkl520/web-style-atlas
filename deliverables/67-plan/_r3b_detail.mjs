// _r3b_detail.mjs — 修正版：把折叠/收紧写成**函数对象**（cdp.eval 传字符串只会求值表达式，不会调用）
import { Browser, sleep } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const PAGE = 'file:///' + join(ROOT, 'prototypes', '_selection', 'index.html').replace(/\\/g, '/');
const IDS = ['S01', 'S08', 'S14', 'S26', 'S29'];

const MEASURE = () => {
  const d = document.getElementById('detail');
  const body = document.getElementById('d-body');
  const scrollH = d.scrollHeight, clientH = d.clientHeight;
  const fields = Array.from(body.querySelectorAll('.fields .field'));
  const rows = fields.map((f) => {
    const dt = f.querySelector('dt'), dd = f.querySelector('dd');
    const b = f.getBoundingClientRect();
    const db = dd ? dd.getBoundingClientRect() : null;
    const cs = dd ? getComputedStyle(dd) : null;
    const lh = cs ? parseFloat(cs.lineHeight) : null;
    const txt = dd ? dd.textContent.replace(/\s+/g, '') : '';
    const lines = (db && lh) ? Math.round(db.height / lh) : null;
    return {
      name: dt ? dt.textContent.trim() : (f.querySelector('summary')?.textContent.trim() || null),
      h: +b.height.toFixed(1), top: +b.top.toFixed(0),
      chars: txt.length, ddW: db ? +db.width.toFixed(1) : null, ddH: db ? +db.height.toFixed(1) : null,
      fs: cs ? cs.fontSize : null, lhRaw: cs ? cs.lineHeight : null, lines,
      cpl: lines && txt.length ? +(txt.length / lines).toFixed(1) : null,
      inDetails: !!f.querySelector('details'),
    };
  });
  const live = rows.filter((r) => !r.inDetails);
  const totChars = rows.reduce((a, r) => a + r.chars, 0);
  const totLines = live.reduce((a, r) => a + (r.lines || 0), 0);
  const head = document.querySelector('.detail-head');
  return {
    scrollH, clientH, screens: +(scrollH / clientH).toFixed(2),
    fieldCount: fields.length, foldedCount: rows.length - live.length,
    totalChars: totChars, liveLines: totLines,
    avgCplLive: totLines ? +(live.reduce((a, r) => a + r.chars, 0) / totLines).toFixed(1) : null,
    rows, firstFieldTop: rows.length ? +document.querySelector('.fields .field').getBoundingClientRect().top.toFixed(0) : null,
    headH: +head.getBoundingClientRect().height.toFixed(1),
    headText: head.textContent.replace(/\s+/g, ' ').trim(),
    navLike: document.querySelectorAll('#d-body nav, #d-body [class*=toc], #d-body [class*=anchor], #d-body [class*=nav]').length,
    detailsCount: body.querySelectorAll('details').length,
  };
};

const BOOT = () => {
  window.__foldNodes = function (names) {
    const body = document.getElementById('d-body');
    const fields = Array.from(body.querySelectorAll('.fields .field'));
    let n = 0;
    fields.forEach((f) => {
      const dt = f.querySelector('dt');
      if (!dt) return;
      if (names !== null && names.indexOf(dt.textContent.trim()) < 0) return;
      const det = document.createElement('details');
      det.setAttribute('data-lab', '1');
      const sum = document.createElement('summary');
      sum.style.cssText = 'cursor:pointer;padding:2px 0;min-height:24px;list-style-position:inside';
      sum.textContent = dt.textContent.trim();
      const kids = Array.from(f.childNodes).filter((c) => c !== dt && !(c.nodeType === 3 && !c.textContent.trim()));
      dt.remove();
      det.appendChild(sum);
      kids.forEach((k) => det.appendChild(k));
      f.appendChild(det);
      n++;
    });
    return n;
  };
  return 1;
};
const FOLD2 = () => {
  const body = document.getElementById('d-body');
  const arr = Array.from(body.querySelectorAll('.fields .field')).filter((f) => f.querySelector('dt'))
    .map((f) => ({ f, h: f.querySelector('dd').getBoundingClientRect().height }))
    .sort((a, b) => b.h - a.h).slice(0, 2);
  const names = arr.map((o) => o.f.querySelector('dt').textContent.trim());
  return window.__foldNodes(names);
};
const FOLD4 = () => window.__foldNodes(['布局与网格', '可落地要点', '关键视觉元素', '动效与交互']);
const TIGHT = () => {
  const s = document.createElement('style');
  s.setAttribute('data-lab', '1');
  s.textContent = '.fields .field dd{line-height:1.5}.fields .field{padding:8px 0}'
    + '.fields .field dt{margin-bottom:2px}'
    + '@media (max-width:620px){.detail-body{padding:12px 10px 60px}}';
  document.head.appendChild(s);
  return 1;
};
const CTA_FOLD = () => {
  // 把 .prompt-cta 的输入区（不是复制按钮）折起
  const cta = document.querySelector('.prompt-cta');
  if (!cta) return 0;
  const kids = Array.from(cta.children).filter((c) => c.tagName !== 'BUTTON' && !/button/i.test(c.className));
  if (kids.length < 1) return 0;
  const det = document.createElement('details');
  det.setAttribute('data-lab', '1');
  const sum = document.createElement('summary');
  sum.style.cssText = 'cursor:pointer;padding:4px 0;min-height:28px';
  sum.textContent = '填写提示词开头（不填也能复制）';
  det.appendChild(sum);
  kids.forEach((k) => det.appendChild(k));
  cta.appendChild(det);
  return kids.length;
};

// 现有「wayfinding」实测：滚到不同位置，看用户能不能知道自己在哪
const WAYFIND = () => {
  const d = document.getElementById('detail');
  const head = d.querySelector('.detail-head');
  const fields = Array.from(d.querySelectorAll('.fields .field'));
  const out = [];
  const max = Math.round(d.scrollHeight - d.clientHeight);
  for (let y = 0; y <= max; y += 400) {
    d.scrollTop = y;
    let atTop = null;
    for (const f of fields) {
      const b = f.getBoundingClientRect();
      if (b.bottom > head.getBoundingClientRect().height) { atTop = f.querySelector('dt')?.textContent.trim() || '(折叠)'; break; }
    }
    out.push({ y, atTop, headText: head.textContent.replace(/\s+/g, ' ').trim().slice(0, 60) });
  }
  d.scrollTop = 0;
  return out;
};

const out = { at: new Date().toISOString(), cases: {} };
const br = await Browser.launch({ width: 1440, height: 900 });
async function fresh() {
  const p = await br.newPage({ width: 390, height: 844, dsf: 2, mobile: true });
  return p;
}
for (const id of IDS) {
  const rec = {};
  let p = await fresh();
  await p.goto(PAGE + '#' + id, { settleMs: 2200 });
  await p.eval('document.fonts.ready.then(()=>1)');
  rec.base = await p.eval(MEASURE);
  rec.wayfind = await p.eval(WAYFIND);
  await p.close();

  p = await fresh(); await p.goto(PAGE + '#' + id, { settleMs: 1700 });
  await p.eval('document.fonts.ready.then(()=>1)'); await p.eval(BOOT);
  rec.fold2 = { n: await p.eval(FOLD2) }; await sleep(250);
  Object.assign(rec.fold2, await p.eval(MEASURE)); await p.close();

  p = await fresh(); await p.goto(PAGE + '#' + id, { settleMs: 1700 });
  await p.eval('document.fonts.ready.then(()=>1)'); await p.eval(BOOT);
  rec.fold4only = { n: await p.eval(FOLD4) }; await sleep(250);
  Object.assign(rec.fold4only, await p.eval(MEASURE)); await p.close();

  p = await fresh(); await p.goto(PAGE + '#' + id, { settleMs: 1700 });
  await p.eval('document.fonts.ready.then(()=>1)'); await p.eval(BOOT);
  rec.r2 = { n: await p.eval(FOLD4), cta: await p.eval(CTA_FOLD) };
  await p.eval(TIGHT); await sleep(300);
  Object.assign(rec.r2, await p.eval(MEASURE)); await p.close();

  p = await fresh(); await p.goto(PAGE + '#' + id, { settleMs: 1700 });
  await p.eval('document.fonts.ready.then(()=>1)');
  rec.ctaOnly = { cta: await p.eval(CTA_FOLD) }; await sleep(250);
  Object.assign(rec.ctaOnly, await p.eval(MEASURE)); await p.close();

  out.cases[id] = rec;
  console.log(id,
    'base', rec.base.scrollH, rec.base.screens + '屏', 'chars', rec.base.totalChars, 'cpl', rec.base.avgCplLive,
    '| ctaOnly', rec.ctaOnly.scrollH,
    '| fold2', rec.fold2.scrollH, '(n=' + rec.fold2.n + ')',
    '| fold4', rec.fold4only.scrollH, '(n=' + rec.fold4only.n + ')',
    '| fold4+cta+tight', rec.r2.scrollH, rec.r2.screens + '屏', 'cpl', rec.r2.avgCplLive, 'fs', rec.base.rows[0].fs);
}
await br.close();
writeFileSync(join(HERE, '_r3b_detail.json'), JSON.stringify(out, null, 1), 'utf8');
