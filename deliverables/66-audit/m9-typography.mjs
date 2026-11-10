// m9-typography.mjs — 排版收紧的收益（不改字、只改字号/行高/内距），30 案全量
// 目的：验证「字段区 81–84% 是纯内容长度、没有布局浪费」这个判断。
import { Browser } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const PAGE = 'file:///' + join(ROOT, 'prototypes', '_selection', 'index.html').replace(/\\/g, '/');

const V = {
  T0: { label: '现状 16px / 1.62 / 字段内距 12px', css: '' },
  T1: { label: '15px / 1.55 / 内距 8px（不动字号档位里的"正文级"）', css: '#detail .field{padding:8px 0}#detail .field dd{font-size:15px;line-height:1.55}' },
  T2: { label: '15px / 1.5 / 内距 8px / dt 与 dd 间距 4→2', css: '#detail .field{padding:8px 0}#detail .field dd{font-size:15px;line-height:1.5}#detail .field dt{margin-bottom:2px}' },
  T3: { label: '16px / 1.45 / 内距 8px（只压行高，字号不动）', css: '#detail .field{padding:8px 0}#detail .field dd{line-height:1.45}#detail .field dt{margin-bottom:2px}' },
  T4: { label: '15px / 1.55 + 面板内边距 16→10（正文宽 +12px）', css: '#detail .field{padding:8px 0}#detail .field dd{font-size:15px;line-height:1.55}#d-body{padding-left:10px;padding-right:10px}' },
  T5: { label: 'T1 + 正文去掉两端字距（letter-spacing:-.01em）', css: '#detail .field{padding:8px 0}#detail .field dd{font-size:15px;line-height:1.55;letter-spacing:-.01em}' },
};

const browser = await Browser.launch({ width: 1440, height: 900 });
const out = { measuredAt: new Date().toISOString(), defs: Object.fromEntries(Object.entries(V).map(([k, v]) => [k, v.label])), data: {} };
const IDS = Array.from({ length: 30 }, (_, i) => 'S' + String(i + 1).padStart(2, '0'));

const p = await browser.newPage({ width: 390, height: 844, dsf: 2, mobile: true });
await p.goto(PAGE, { settleMs: 1700 });
for (const id of IDS) {
  out.data[id] = {};
  for (const [k, v] of Object.entries(V)) {
    await p.eval((sid) => {
      document.querySelectorAll('style[data-lab]').forEach((s) => s.remove());
      const r = document.querySelector('.row[data-id="' + sid + '"]');
      if (r) r.click();
      document.getElementById('detail').scrollTop = 0;
    }, id);
    await new Promise((r) => setTimeout(r, 150));
    if (v.css) {
      await p.eval((css) => {
        const st = document.createElement('style'); st.setAttribute('data-lab', '1'); st.textContent = css; document.head.appendChild(st);
      }, v.css);
      await new Promise((r) => setTimeout(r, 90));
    }
    const m = await p.eval(() => {
      const d = document.getElementById('detail');
      const dl = document.querySelector('#d-body .fields');
      const dd = dl.querySelector('.field dd');
      const ff = dl.querySelector('.field');
      return {
        scrollH: d.scrollHeight, fieldsH: +dl.getBoundingClientRect().height.toFixed(1),
        firstFieldTop: +ff.getBoundingClientRect().top.toFixed(1),
        textWidth: +dd.getBoundingClientRect().width.toFixed(1),
        hOv: d.scrollWidth - d.clientWidth,
        fs: getComputedStyle(dd).fontSize, lh: getComputedStyle(dd).lineHeight,
      };
    });
    out.data[id][k] = m;
  }
  const row = out.data[id];
  console.log(`${id} ` + Object.entries(row).map(([k, v]) => `${k}=${v.scrollH}`).join(' ') + ` | T1 fs=${row.T1.fs}/${row.T1.lh} w=${row.T1.textWidth}`);
}
await p.close();
writeFileSync(join(HERE, 'data-m9-typography.json'), JSON.stringify(out, null, 1));
await browser.close();
console.log('written data-m9-typography.json');
