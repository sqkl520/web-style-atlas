// 探针 25b：查清 #000000 是谁画的 —— 它出现在全部 30 案里，几乎肯定是测量假阳性而非真缺陷。
import { Browser, sleep } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const TARGET = 'prototypes/S04-mango-collage-wall/index.html';

const WHO = () => {
  const hex = (v) => {
    const m = String(v).match(/rgba?\(([^)]+)\)/);
    if (!m) return null;
    const p = m[1].split(',').map((x) => parseFloat(x));
    if (p.length > 3 && p[3] === 0) return null;
    return '#' + p.slice(0, 3).map((x) => Math.round(x).toString(16).padStart(2, '0')).join('').toUpperCase();
  };
  const hits = [];
  for (const el of document.querySelectorAll('*')) {
    if (/^(HTML|HEAD|META|TITLE|LINK|STYLE|SCRIPT|BASE)$/.test(el.tagName)) continue;
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') continue;
    const rec = (src, v) => {
      const h = hex(v);
      if (h === '#000000') hits.push({ src, tag: el.tagName, cls: String(el.className).slice(0, 26), attr: el.getAttribute('fill') || el.getAttribute('stroke') || null, text: (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 20) });
    };
    const ownText = [...el.childNodes].some((n) => n.nodeType === 3 && n.nodeValue.trim());
    if (ownText) rec('color', cs.color);
    if (cs.backgroundColor !== 'rgba(0, 0, 0, 0)') rec('bg', cs.backgroundColor);
    for (const s of ['Top', 'Right', 'Bottom', 'Left']) if (cs['border' + s + 'Style'] !== 'none' && parseFloat(cs['border' + s + 'Width']) > 0) rec('border' + s, cs['border' + s + 'Color']);
    if (cs.fill && cs.fill !== 'none') rec('fill', cs.fill);
    if (cs.stroke && cs.stroke !== 'none') rec('stroke', cs.stroke);
  }
  return hits.slice(0, 40);
};

const br = await Browser.launch({ width: 1440, height: 900 });
const p = await br.newPage({ width: 1440, height: 900, dsf: 1 });
await p.goto('file:///' + join(ROOT, TARGET).replace(/\\/g, '/'), { settleMs: 1800 });
await p.eval('document.fonts.ready.then(()=>1)');
const hits = await p.eval(WHO);
console.log('黑色来源计数 =', hits.length);
const by = {};
for (const h of hits) { const k = h.src + ' ' + h.tag; by[k] = (by[k] || 0) + 1; }
for (const [k, v] of Object.entries(by).sort((a, b) => b[1] - a[1])) console.log(`  ${k.padEnd(22)} ${v}`);
console.log('\n前 10 条明细：');
for (const h of hits.slice(0, 10)) console.log(`  ${h.src.padEnd(8)} ${h.tag}.${h.cls}  fill=${h.attr}  「${h.text}」`);
await p.close(); await br.close();

