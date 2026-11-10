// _p12_final.mjs — 修正 _p11 的 (c)（面板没打开就查 .prompt-fill，必然查不到），
// 并补两件：R2 折 CTA 的真实代价（填写区有几个输入框）、12px 的 .cap 是什么。
import { Browser } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const PAGE = 'file:///' + join(ROOT, 'prototypes', '_selection', 'index.html').replace(/\\/g, '/');
const out = {};

const browser = await Browser.launch({ width: 1440, height: 900 });

for (const [label, w, h, m] of [['1440', 1440, 900, false], ['390', 390, 844, true]]) {
  const p = await browser.newPage({ width: w, height: h, dsf: 2, mobile: m });
  await p.goto(PAGE, { settleMs: 1500 });
  await p.eval(() => { document.querySelector('.row[data-id="S01"]').click(); });
  await new Promise((r) => setTimeout(r, 450));
  out[label] = await p.eval(() => {
    const d = document.getElementById('detail');
    const q = (s) => d.querySelector(s);
    const fill = q('#d-body .prompt-fill');
    const cta = q('#d-body .prompt-cta');
    const inputs = fill ? Array.from(fill.querySelectorAll('input,textarea,select')) : [];
    const g = (e) => e ? +e.getBoundingClientRect().height.toFixed(1) : null;
    // .cap 的字号
    const cap = document.querySelector('.row .cap');
    const capCS = cap ? getComputedStyle(cap) : null;
    return {
      ctaH: g(cta), fillH: g(fill), fillExists: !!fill,
      fillInputs: inputs.map((i) => ({ tag: i.tagName, id: i.id, ph: (i.placeholder || '').slice(0, 20), h: g(i) })),
      fillNoteH: g(q('#d-body .prompt-fill-note')),
      copyBtnH: g(q('#d-body .prompt-copy')),
      copyBtnTop: (() => { const b = q('#d-body .prompt-copy'); return b ? +b.getBoundingClientRect().top.toFixed(1) : null; })(),
      // 填写区是否真的影响提示词
      fillNoteText: (q('#d-body .prompt-fill-note') || { textContent: '' }).textContent.replace(/\s+/g, ' ').trim().slice(0, 90),
      capFontSize: capCS ? capCS.fontSize : null,
      capCount: document.querySelectorAll('.row .cap').length,
      // 详情里所有 <details> 及其 summary 文本与高度
      details: Array.from(d.querySelectorAll('details')).map((x) => ({ open: x.open, sum: (x.querySelector('summary') || { textContent: '' }).textContent.replace(/\s+/g, ' ').trim().slice(0, 40), h: g(x) })),
      detailScrollH: d.scrollHeight,
    };
  });
  await p.close();
}
writeFileSync(join(HERE, '_p12_final.json'), JSON.stringify(out, null, 1));
console.log(JSON.stringify(out, null, 1));
await browser.close();
