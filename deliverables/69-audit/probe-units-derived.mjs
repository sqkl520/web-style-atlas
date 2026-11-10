// 探针 13：两个可能让我误判的量法问题
//  A. SVG stroke-width 的 computed 值到底是"用户单位"还是"px 绝对长度"？
//     若答案是用户单位，那我拿它去比提示词里写的 px 就是把两个单位混为一谈 →
//     19 个 line-widths FAIL 全部作废。
//  B. "ua-or-derived" 的那些颜色，是不是 color-mix()/相对颜色语法派生出来的？
//     派生色不是作者"新增"的彩色，只是声称色之间的插值 → 判决要降级。
import http from 'node:http';
import { readFileSync, existsSync, statSync, readdirSync, writeFileSync } from 'node:fs';
import { join, extname } from 'node:path';
import { Browser, sleep } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';

const ROOT = 'D:/Web/style/prototypes';
const OUT = 'D:/Web/style/deliverables/69-audit';
const PORT = 8520;
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.jpg': 'image/jpeg', '.png': 'image/png', '.woff2': 'font/woff2', '.svg': 'image/svg+xml' };
const server = http.createServer((req, res) => {
  const f = join(ROOT, decodeURIComponent(req.url.split('?')[0]));
  if (!existsSync(f) || !statSync(f).isFile()) { res.writeHead(404); res.end('no'); return; }
  res.writeHead(200, { 'Content-Type': MIME[extname(f).toLowerCase()] || 'application/octet-stream' });
  res.end(readFileSync(f));
});
await new Promise((r) => server.listen(PORT, r));
const b = await Browser.launch({ width: 1440, height: 900 });

/* ═══ A. stroke-width 单位 ═══ */
const svgTest = `<!DOCTYPE html><html><body style="margin:0">
<svg width="120" height="120" viewBox="0 0 24 24"><path id="p1" d="M2 2h20v20H2z" fill="none" stroke="#000" stroke-width="2"/></svg>
<svg width="240" height="240" viewBox="0 0 24 24"><path id="p2" d="M2 2h20v20H2z" fill="none" stroke="#000" stroke-width="2"/></svg>
<svg width="120" height="120" viewBox="0 0 24 24"><path id="p3" d="M2 2h20v20H2z" fill="none" stroke="#000" stroke-width="2" vector-effect="non-scaling-stroke"/></svg>
<svg width="120" height="120"><path id="p4" d="M2 2h100v100H2z" fill="none" stroke="#000" stroke-width="2"/></svg>
</body></html>`;
{
  const p = await b.newPage({ width: 400, height: 400 });
  await p.send('Page.navigate', { url: 'data:text/html;charset=utf-8,' + encodeURIComponent(svgTest) });
  await sleep(400);
  const r = await p.eval(() => {
    const o = {};
    for (const id of ['p1', 'p2', 'p3', 'p4']) {
      const el = document.getElementById(id);
      const cs = getComputedStyle(el);
      o[id] = {
        computedStrokeWidth: cs.strokeWidth,
        attrStrokeWidth: el.getAttribute('stroke-width'),
        // 元素实际像素尺寸 / viewBox 尺寸 = 缩放比
        bbox: (() => { const b = el.getBBox(); return { w: +b.width.toFixed(2), h: +b.height.toFixed(2) }; })(),
        screen: (() => { const b = el.getBoundingClientRect(); return { w: +b.width.toFixed(2), h: +b.height.toFixed(2) }; })(),
      };
    }
    return o;
  });
  console.log('=== A. stroke-width 单位 ===');
  for (const [k, v] of Object.entries(r)) {
    const scale = v.screen.w / v.bbox.w;
    console.log(k, 'computed=' + v.computedStrokeWidth, 'attr=' + v.attrStrokeWidth,
      'bbox=' + v.bbox.w + ' screen=' + v.screen.w, '缩放比=' + scale.toFixed(2),
      '若computed是用户单位则实际渲染宽度=' + (parseFloat(v.computedStrokeWidth) * scale).toFixed(2) + 'px');
  }
  await p.close();
}

/* ═══ B. 派生色：查 color-mix / 相对颜色 / CSS4 颜色函数 ═══ */
const suspects = { S06: ['#5A3A1C'], S19: ['#534C3E'], S24: ['#6E8B7A', '#3C5F48', '#1B1136', '#2A1B50', '#3A276E', '#4A3390'], S23: ['#E9A9C6'], S30: ['#2B2B2B', '#4A4A4A', '#B9B9B9'], S25: ['#4A423A', '#4B453F'], S27: ['#4A4232'], S14: ['#9A968C', '#E4E0D6', '#3A3630', '#171E24'], S15: ['#4C5257', '#DDE2E0', '#C8CECC', '#F0E4D8', '#C3C9C7'] };
const deriv = {};
for (const [id, hexes] of Object.entries(suspects)) {
  const dir = readdirSync(ROOT).find((d) => d.startsWith(id + '-'));
  const p = await b.newPage({ width: 1440, height: 900 });
  await p.goto(`http://127.0.0.1:${PORT}/${dir}/index.html`, { settleMs: 1000 });
  deriv[id] = await p.eval((wantList) => {
    const want = wantList;
    const parse = (v) => {
      const m = String(v).match(/rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/i);
      if (!m) return null;
      return '#' + [m[1], m[2], m[3]].map((x) => Math.round(+x).toString(16).padStart(2, '0')).join('').toUpperCase();
    };
    // 遍历全部规则，记录所有 color-mix / oklch / rgb(... / xx%) / 具名色
    const mixes = [], fns = [], named = new Set();
    const walk = (rules) => {
      for (const rule of rules || []) {
        if (rule.cssRules && rule.cssRules.length) { walk(rule.cssRules); continue; }
        if (!rule.style) continue;
        for (let i = 0; i < rule.style.length; i++) {
          const prop = rule.style[i], v = rule.style.getPropertyValue(prop);
          if (!v) continue;
          if (/color-mix\(/i.test(v)) mixes.push({ rule: (rule.selectorText || '').slice(0, 44), prop, v: v.slice(0, 110) });
          // rgb/hsl 带 alpha 或函数式（不是 hex）
          if (/(^|[\s:,(])(rgba?|hsla?)\(/i.test(v) && !/#/.test(v)) fns.push({ rule: (rule.selectorText || '').slice(0, 44), prop, v: v.slice(0, 90) });
          // 具名色（可能产生新色）
          for (const w of String(v).match(/\b(black|white|red|blue|green|gray|grey|silver|maroon|navy|olive|purple|teal|aqua|fuchsia|lime|yellow|orange|brown|pink|gold|coral|salmon|khaki|ivory|beige|tan|indigo|violet|orchid|plum|thistle|azure|cyan|magenta)\b/gi) || []) named.add(w.toLowerCase());
        }
      }
    };
    for (const sh of document.styleSheets) { try { walk(sh.cssRules); } catch (e) {} }
    // 对每个可疑色，找出哪些元素在用它
    const hits = {};
    for (const one of want) hits[one] = [];
    const all = document.querySelectorAll('*');
    for (const el of all) {
      const cs = getComputedStyle(el);
      const sel = el.tagName.toLowerCase() + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/)[0] : '');
      const push = (v, kind) => {
        const h = parse(v);
        if (h && want.includes(h) && hits[h].length < 4) {
          hits[h].push({ sel, kind, raw: String(v).slice(0, 50), opacity: cs.opacity });
        }
      };
      push(cs.color, 'color'); push(cs.backgroundColor, 'bg');
      for (const s of ['Top']) if (parseFloat(cs['border' + s + 'Width']) > 0) push(cs['border' + s + 'Color'], 'border');
      if (el instanceof SVGElement) { push(cs.fill, 'fill'); push(cs.stroke, 'stroke'); }
    }
    // opacity 祖先链会影响观感：检查 status 类元素的 opacity
    return { mixes: mixes.slice(0, 25), mixN: mixes.length, fns: fns.slice(0, 10), fnsN: fns.length, named: [...named], hits };
  }, hexes);
  console.log('\n===' + id, 'color-mix=' + deriv[id].mixN, 'rgb函数=' + deriv[id].fnsN, '具名色=' + deriv[id].named.join(','));
  for (const m of deriv[id].mixes.slice(0, 6)) console.log('   mix:', m.rule, m.prop, m.v);
  for (const [h, arr] of Object.entries(deriv[id].hits)) {
    console.log('   ', h, '→', arr.map((x) => x.sel + ':' + x.kind + '[' + x.raw + '] op=' + x.opacity).join(' ; ') || '（本页未找到）');
  }
  await p.close();
}
await b.close(); server.close();
writeFileSync(join(OUT, 'derived-colors.json'), JSON.stringify(deriv, null, 1), 'utf8');
