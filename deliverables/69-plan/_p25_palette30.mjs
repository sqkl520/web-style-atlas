// 探针 25：**选项 d 抓不到、真端到端才抓得到**的那一类缺陷，全量量化。
// 提示词第 1 条写着「配色只用这几个值…不新增更多彩色」。
// 判据：原型在真浏览器里**画出来的**每种颜色（文字/底/边/描边/无透明背景图）是否都在该清单里。
// 这是"提示词声称 vs 版式实际"的第一个真实分叉，也是 A 必须存在的理由。
import { Browser, sleep } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { writeFileSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');

// 提示词侧
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
  const set = new Map(); // hex -> 出现次数
  const bump = (h) => { if (h) set.set(h, (set.get(h) || 0) + 1); };
  for (const el of document.querySelectorAll('*')) {
    if (/^(HTML|HEAD|META|TITLE|LINK|STYLE|SCRIPT|BASE)$/.test(el.tagName)) continue;
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') continue;
    const ownText = [...el.childNodes].some((n) => n.nodeType === 3 && n.nodeValue.trim());
    if (ownText) bump(hex(cs.color));
    if (cs.backgroundColor !== 'rgba(0, 0, 0, 0)') bump(hex(cs.backgroundColor));
    for (const s of ['Top', 'Right', 'Bottom', 'Left']) {
      if (cs['border' + s + 'Style'] !== 'none' && parseFloat(cs['border' + s + 'Width']) > 0) bump(hex(cs['border' + s + 'Color']));
    }
    if (cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0) bump(hex(cs.outlineColor));
    if (cs.textDecorationLine !== 'none') bump(hex(cs.textDecorationColor));
    if (cs.backgroundImage && cs.backgroundImage !== 'none') {
      for (const m of cs.backgroundImage.matchAll(/rgba?\([^)]+\)/g)) bump(hex(m[0]));
    }
    // fill/stroke 只对 SVG 有意义；而且**只有显式给过颜色**的才算数。
    // 普通元素的 computed fill 恒为 rgb(0,0,0)，SVG 里没写 fill 的 <svg>/<defs>/<pattern> 也一样
    // —— 那是**默认值、不是被画出来的颜色**。不排除这一条，全 30 案都会假红出一个 #000000
    // （实测：第一版就是这么错的，40 条命中全是 fill 默认值）。
    if (el.namespaceURI === 'http://www.w3.org/2000/svg') {
      const explicit = el.hasAttribute('fill') || el.hasAttribute('stroke');
      if (explicit) {
        if (cs.fill && cs.fill !== 'none') bump(hex(cs.fill));
        if (cs.stroke && cs.stroke !== 'none') bump(hex(cs.stroke));
      }
    }
  }
  for (const img of document.images) { /* 图不算色 */ }
  return { colors: [...set.entries()].sort((a, b) => b[1] - a[1]) };
};

const br = await Browser.launch({ width: 1440, height: 900 });
const rows = [];
for (const id of Object.keys(claim)) {
  const p = await br.newPage({ width: 1440, height: 900, dsf: 1 });
  await p.goto('file:///' + join(ROOT, 'prototypes', claim[id].dir, 'index.html').replace(/\\/g, '/'), { settleMs: 1800 });
  await p.eval('document.fonts.ready.then(()=>1)');
  await sleep(150);
  const m = await p.eval(MEASURE);
  await p.close();
  const painted = m.colors.map(([h]) => h);
  const pal = new Set(claim[id].palette);
  // 只把"画了 >=3 个元素"的颜色算进来：单次出现的多半是 focus ring / 抗锯齿边界
  const solid = m.colors.filter(([, n]) => n >= 3).map(([h]) => h);
  const extra = solid.filter((h) => !pal.has(h));
  rows.push({ id, claimed: claim[id].palette.length, paintedAll: painted.length, solid: solid.length, extra, extraDetail: m.colors.filter(([h, n]) => n >= 3 && !pal.has(h)) });
  console.log(`${id}  声称 ${String(claim[id].palette.length).padStart(2)} 色   实画(≥3元素) ${String(solid.length).padStart(2)} 色   集合外 ${String(extra.length).padStart(2)}  ${extra.join(' ') || '—'}`);
}
await br.close();

const clean = rows.filter((r) => r.extra.length === 0);
const dirty = rows.filter((r) => r.extra.length > 0);
console.log('\n=== 汇总 ===');
console.log(`  30 案里，提示词第 1 条「配色只用这几个值 … 不新增更多彩色」被**自己版式**违反的：${dirty.length}/30`);
console.log(`  完全守住的：${clean.length}/30 → ${clean.map((r) => r.id).join(' ')}`);
console.log(`  集合外颜色总数：${rows.reduce((a, r) => a + r.extra.length, 0)} 个`);
console.log('  最多的 5 案：' + dirty.sort((a, b) => b.extra.length - a.extra.length).slice(0, 5).map((r) => `${r.id}(${r.extra.length})`).join(' '));
writeFileSync(join(HERE, 'p10-palette30.json'), JSON.stringify(rows, null, 1), 'utf8');

