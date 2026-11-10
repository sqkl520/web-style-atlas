// 探针 25d：在**修正后**的口径下，查 #000000 到底从哪个属性、哪个元素来。
import { Browser } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const TARGET = process.argv[2] || 'prototypes/S04-mango-collage-wall/index.html';

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
    const rec = (src, v) => { if (hex(v) === '#000000') hits.push({ src, tag: el.tagName, cls: String(el.className).slice(0, 24), ns: el.namespaceURI.slice(-14), text: (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 18) }); };
    const ownText = [...el.childNodes].some((n) => n.nodeType === 3 && n.nodeValue.trim());
    if (ownText) rec('color', cs.color);
    if (cs.backgroundColor !== 'rgba(0, 0, 0, 0)') rec('bg', cs.backgroundColor);
    for (const s of ['Top', 'Right', 'Bottom', 'Left']) if (cs['border' + s + 'Style'] !== 'none' && parseFloat(cs['border' + s + 'Width']) > 0) rec('border', cs['border' + s + 'Color']);
    if (cs.backgroundImage && cs.backgroundImage !== 'none') { for (const m of cs.backgroundImage.matchAll(/rgba?\([^)]+\)/g)) rec('bgImage', m[0]); }
    if (el.namespaceURI === 'http://www.w3.org/2000/svg') { if (cs.fill && cs.fill !== 'none') rec('fill', cs.fill); if (cs.stroke && cs.stroke !== 'none') rec('stroke', cs.stroke); }
  }
  return hits;
};

const br = await Browser.launch({ width: 1440, height: 900 });
const p = await br.newPage({ width: 1440, height: 900, dsf: 1 });
await p.goto('file:///' + join(ROOT, TARGET).replace(/\\/g, '/'), { settleMs: 1800 });
await p.eval('document.fonts.ready.then(()=>1)');
const hits = await p.eval(WHO);
console.log(TARGET, '→ #000000 命中', hits.length, '条');
const by = {};
for (const h of hits) { const k = h.src + '|' + h.tag + '|' + h.ns; by[k] = (by[k] || 0) + 1; }
for (const [k, v] of Object.entries(by).sort((a, b) => b[1] - a[1])) console.log(`  ${k.padEnd(34)} ${v}`);
console.log('\n明细（前 12）：');
for (const h of hits.slice(0, 12)) console.log(`  ${h.src.padEnd(8)} ${h.tag}.${h.cls}  ns=${h.ns}  「${h.text}」`);
await p.close(); await br.close();
