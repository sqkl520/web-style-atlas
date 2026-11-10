// 探针 25e：给「集合外颜色」定性 —— 它们是真缺陷、还是判据误伤？
// 分四类，逐类给出可复核的数量：
//   A. 落在 <code>/<pre> 上（字面代码，闸门自己也豁免等宽/配色）
//   B. 落在 SVG 显式 fill/stroke 上（图形，闸门认为"用位图或几何做"不算规避）
//   C. 落在元素背景/边框/文字上（真·版面用色）
//   D. alpha 变体（同色不同透明度）
import { Browser, sleep } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { writeFileSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const read = (p) => readFileSync(join(ROOT, p), 'utf8').replace(/^\uFEFF/, '');
const sb = {
  console,
  document: { readyState: 'complete', addEventListener() {}, removeEventListener() {}, getElementById() { return null; }, querySelector() { return null; }, querySelectorAll() { return []; }, createElement() { return { style: {}, setAttribute() {}, appendChild() {}, addEventListener() {}, classList: { toggle() {} } }; }, body: { appendChild() {}, removeChild() {} } },
  navigator: {}, setTimeout, clearTimeout,
};
sb.window = sb; sb.globalThis = sb;
const ctx = vm.createContext(sb);
vm.runInContext(read('prototypes/_selection/data.js'), ctx);
vm.runInContext(read('prototypes/_selection/prompts.js'), ctx);
vm.runInContext(read('prototypes/_selection/prompt-copy.js'), ctx);
const schemes = sb.STYLE_PROMPTS.schemes;
const bp = sb.buildStylePrompt;
const claim = {};
for (const s of schemes) {
  const t = bp(s.id, { biz: '', action: '' });
  const pl = t.split('\n').find((l) => /^1\. 配色只用这几个值/.test(l)) || '';
  claim[s.id] = { dir: s.dir, palette: [...new Set((pl.match(/#[0-9A-Fa-f]{6}/g) || []).map((x) => x.toUpperCase()))] };
}

const MEASURE = () => {
  const hex = (v) => {
    const m = String(v).match(/rgba?\(([^)]+)\)/);
    if (!m) return null;
    const p = m[1].split(',').map((x) => parseFloat(x));
    if (p.length > 3 && p[3] === 0) return null;
    return '#' + p.slice(0, 3).map((x) => Math.round(x).toString(16).padStart(2, '0')).join('').toUpperCase();
  };
  const rec = new Map(); // hex -> {n, classes:Set, code:0, svg:0}
  const bump = (h, cat, el) => {
    if (!h) return;
    const r = rec.get(h) || { n: 0, code: 0, svg: 0, other: 0, samples: [] };
    r.n++;
    if (cat === 'svg') r.svg++;
    else if (el.closest('code,pre,kbd,samp')) r.code++;
    else r.other++;
    if (r.samples.length < 3) r.samples.push((el.tagName + '.' + String(el.className)).slice(0, 26));
    rec.set(h, r);
  };
  for (const el of document.querySelectorAll('*')) {
    if (/^(HTML|HEAD|META|TITLE|LINK|STYLE|SCRIPT|BASE)$/.test(el.tagName)) continue;
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') continue;
    const ownText = [...el.childNodes].some((n) => n.nodeType === 3 && n.nodeValue.trim());
    if (ownText) bump(hex(cs.color), 'css', el);
    if (cs.backgroundColor !== 'rgba(0, 0, 0, 0)') bump(hex(cs.backgroundColor), 'css', el);
    for (const s of ['Top', 'Right', 'Bottom', 'Left']) if (cs['border' + s + 'Style'] !== 'none' && parseFloat(cs['border' + s + 'Width']) > 0) bump(hex(cs['border' + s + 'Color']), 'css', el);
    if (el.namespaceURI === 'http://www.w3.org/2000/svg' && (el.hasAttribute('fill') || el.hasAttribute('stroke'))) {
      if (cs.fill && cs.fill !== 'none') bump(hex(cs.fill), 'svg', el);
      if (cs.stroke && cs.stroke !== 'none') bump(hex(cs.stroke), 'svg', el);
    }
  }
  return [...rec.entries()].map(([h, v]) => ({ hex: h, ...v }));
};

const br = await Browser.launch({ width: 1440, height: 900 });
const rows = [];
for (const id of Object.keys(claim)) {
  const p = await br.newPage({ width: 1440, height: 900, dsf: 1 });
  await p.goto('file:///' + join(ROOT, 'prototypes', claim[id].dir, 'index.html').replace(/\\/g, '/'), { settleMs: 1600 });
  await p.eval('document.fonts.ready.then(()=>1)');
  await sleep(120);
  const m = await p.eval(MEASURE);
  await p.close();
  const pal = new Set(claim[id].palette);
  const extra = m.filter((x) => !pal.has(x.hex) && x.n >= 3);
  const real = extra.filter((x) => x.other >= 3);          // 真·版面用色
  const onlyCode = extra.filter((x) => x.other < 3 && x.svg < 3); // 只在代码片段上
  const onlySvg = extra.filter((x) => x.other < 3 && x.svg >= 3);
  rows.push({ id, claimed: claim[id].palette, extra: extra.map((x) => ({ hex: x.hex, n: x.n, code: x.code, svg: x.svg, other: x.other, samples: x.samples })), real: real.length, onlyCode: onlyCode.length, onlySvg: onlySvg.length });
  console.log(`${id}  集合外 ${String(extra.length).padStart(2)}（真版面 ${real.length} / 仅代码 ${onlyCode.length} / 仅SVG ${onlySvg.length}）  ${real.map((x) => x.hex + '@' + x.samples[0]).join(' ') || ''}`);
}
await br.close();
const dirty = rows.filter((r) => r.real > 0);
console.log('\n=== 定性汇总（只算"真·版面用色"，即 >=3 个非代码非 SVG 元素）===');
console.log(`  违反提示词第 1 条的案：${dirty.length}/30`);
console.log(`  守住：${30 - dirty.length}/30 → ${rows.filter((r) => r.real === 0).map((r) => r.id).join(' ')}`);
console.log(`  真·版面用色的集合外颜色总数：${rows.reduce((a, r) => a + r.real, 0)} 个`);
console.log('  最多的 6 案：' + dirty.sort((a, b) => b.real - a.real).slice(0, 6).map((r) => `${r.id}(${r.real})`).join(' '));
if (dirty.length) {
  console.log('\n  逐案明细（前 3 案）：');
  for (const r of dirty.slice(0, 3)) {
    console.log(`  ${r.id}:`);
    for (const e of r.extra.filter((x) => x.other >= 3)) console.log(`    ${e.hex}  ${e.n} 处（非代码 ${e.other}）  ${e.samples.join(' | ')}`);
  }
}
writeFileSync(join(HERE, 'p10-palette30.json'), JSON.stringify(rows, null, 1), 'utf8');
