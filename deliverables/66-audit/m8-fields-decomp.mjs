// m8-fields-decomp.mjs — 字段区 2852px 的成分拆解：dt 标签 / dd 正文 / 内距 / 分隔线
// 目的：复核「字段本体占 81–84% 是内容长度，不是布局浪费」。
import { Browser } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const PAGE = 'file:///' + join(ROOT, 'prototypes', '_selection', 'index.html').replace(/\\/g, '/');

const DECOMP = () => {
  const d = document.getElementById('detail');
  const dl = document.querySelector('#d-body .fields');
  const dlH = dl.getBoundingClientRect().height;
  let dtSum = 0, ddSum = 0, padSum = 0, foldSum = 0;
  const rows = [];
  for (const f of dl.children) {
    const cs = getComputedStyle(f);
    const pad = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom);
    const bTop = parseFloat(cs.borderTopWidth), bBot = parseFloat(cs.borderBottomWidth);
    const dt = f.querySelector(':scope > dt');
    const dd = f.querySelector(':scope > dd');
    const det = f.querySelector('details');
    const sum = det ? det.querySelector(':scope > summary') : null;
    const dtH = dt ? dt.getBoundingClientRect().height : 0;
    const sumH = sum ? sum.getBoundingClientRect().height : 0;
    const ddH = dd ? dd.getBoundingClientRect().height : 0;
    const bodyH = det && det.querySelector('.fold-body') ? det.querySelector('.fold-body').getBoundingClientRect().height : 0;
    const fH = f.getBoundingClientRect().height;
    const lab = (dt || sum || { textContent: '?' }).textContent.trim().replace(/（.*$/, '');
    dtSum += (dtH + sumH);
    ddSum += (ddH + bodyH);
    padSum += pad;
    foldSum += (bTop + bBot);
    rows.push({
      label: lab, fieldH: +fH.toFixed(1), labH: +(dtH + sumH).toFixed(1), bodyH: +(ddH + bodyH).toFixed(1),
      pad: +pad.toFixed(1), border: +(bTop + bBot).toFixed(1),
      implied: +(fH - dtH - sumH - ddH - bodyH - pad - bTop - bBot).toFixed(1),
      chars: ((dd || {}).textContent || (det ? det.textContent : '') || '').replace(/\s+/g, '').length,
      lineH: dd ? getComputedStyle(dd).lineHeight : null,
      fontSize: dd ? getComputedStyle(dd).fontSize : null,
    });
  }
  const ddObj = {
    dlH: +dlH.toFixed(1),
    labelsSum: +dtSum.toFixed(1),
    bodySum: +ddSum.toFixed(1),
    padSum: +padSum.toFixed(1),
    borderSum: +foldSum.toFixed(1),
    rows,
    // 纯文本的"每字高度"：用来判断 390 与 1440 的换行成本
    charsPerPx: null,
  };
  // 面板与文本的可读宽度
  const body = document.querySelector('#d-body');
  const ddEl = dl.querySelector('.field dd');
  const cs = getComputedStyle(ddEl);
  ddObj.bodyPad = getComputedStyle(body).padding;
  ddObj.textWidth = +ddEl.getBoundingClientRect().width.toFixed(1);
  ddObj.lineHeightPx = cs.lineHeight;
  ddObj.fontSize = cs.fontSize;
  ddObj.letterSpacing = cs.letterSpacing;
  return ddObj;
};

const browser = await Browser.launch({ width: 1440, height: 900 });
const out = {};
for (const vp of [{ k: '390', w: 390, h: 844, m: true }, { k: '1440', w: 1440, h: 900, m: false }]) {
  const p = await browser.newPage({ width: vp.w, height: vp.h, dsf: 2, mobile: vp.m });
  await p.goto(PAGE, { settleMs: 1700 });
  out[vp.k] = {};
  for (const id of ['S01', 'S08', 'S13', 'S15', 'S26']) {
    await p.eval((sid) => { const r = document.querySelector('.row[data-id="' + sid + '"]'); if (r) r.click(); document.getElementById('detail').scrollTop = 0; }, id);
    await new Promise((r) => setTimeout(r, 220));
    const m = await p.eval(DECOMP);
    m.id = id;
    m.scrollH = await p.eval(() => document.getElementById('detail').scrollHeight);
    out[vp.k][id] = m;
    console.log(`[${vp.k}] ${id} scrollH=${m.scrollH} dl=${m.dlH} labels=${m.labelsSum} body=${m.bodySum} pad=${m.padSum} textW=${m.textWidth} fs=${m.fontSize} lh=${m.lineHeightPx}`);
  }
  await p.close();
}
writeFileSync(join(HERE, 'data-m8-fields-decomp.json'), JSON.stringify(out, null, 1));
await browser.close();
console.log('written data-m8-fields-decomp.json');
