// 探针 6：0.4px / 0.8px 这类亚像素线宽到底能不能被量到？
// getComputedStyle 已证实会取整（0.4→1px），本探针测另外三条路：
//   1) Typed OM: el.computedStyleMap().get('border-top-width') → CSSUnitValue(.value=0.4, .unit='px')
//   2) CSSOM 声明值: stylesheet 规则里的 getPropertyValue('border-top-width')
//   3) 自定义属性 token: getComputedStyle(el).getPropertyValue('--hair') → "0.4px"
import http from 'node:http';
import { readFileSync, existsSync, statSync, readdirSync, writeFileSync } from 'node:fs';
import { join, extname } from 'node:path';
import { Browser, sleep } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';

const ROOT = 'D:/Web/style/prototypes';
const OUT = 'D:/Web/style/deliverables/69-audit';
const PORT = 8514;
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.jpg': 'image/jpeg', '.png': 'image/png', '.woff2': 'font/woff2', '.svg': 'image/svg+xml' };
const server = http.createServer((req, res) => {
  const p = decodeURIComponent(req.url.split('?')[0]);
  const f = join(ROOT, p);
  if (!existsSync(f) || !statSync(f).isFile()) { res.writeHead(404); res.end('no'); return; }
  res.writeHead(200, { 'Content-Type': MIME[extname(f).toLowerCase()] || 'application/octet-stream' });
  res.end(readFileSync(f));
});
await new Promise((r) => server.listen(PORT, r));
const b = await Browser.launch({ width: 1440, height: 900 });

/* ── 1. Typed OM 能力测试 ── */
const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
:root{--hair:0.4px;--bold:0.8px;--mid:1.25px}
.d1{border-top:0.4px solid #000}
.d2{border-top:0.8px solid #000}
.d3{border-top:1.25px solid #000}
.d4{border-top:5.5px solid #000}
.d5{outline:0.8px solid #000}
</style></head><body>
<div class="d1">1</div><div class="d2">2</div><div class="d3">3</div><div class="d4">4</div><div class="d5">5</div>
</body></html>`;
{
  const p = await b.newPage({ width: 800, height: 600 });
  await p.send('Page.navigate', { url: 'data:text/html;charset=utf-8,' + encodeURIComponent(html) });
  await sleep(400);
  const r = await p.eval(() => {
    const hasMap = typeof Element !== 'undefined' && !!Element.prototype.computedStyleMap;
    const o = { hasMap, typed: {}, cssom: {}, custom: {} };
    for (const cl of ['d1', 'd2', 'd3', 'd4', 'd5']) {
      const el = document.querySelector('.' + cl);
      try {
        const m = el.computedStyleMap();
        const w = m.get('border-top-width');
        const ow = m.get('outline-width');
        o.typed[cl] = {
          borderTop: w ? (w.value !== undefined ? w.value + ' ' + w.unit : String(w)) : null,
          outline: ow ? (ow.value !== undefined ? ow.value + ' ' + ow.unit : String(ow)) : null,
          // 也测 pixel 化后的 rect：1px 高？
        };
      } catch (e) { o.typed[cl] = 'ERR ' + e.message; }
    }
    // CSSOM 声明值
    for (const sh of document.styleSheets) {
      let rules; try { rules = sh.cssRules; } catch { continue; }
      for (const rule of rules || []) {
        if (!rule.style || !rule.selectorText) continue;
        const bw = rule.style.getPropertyValue('border-top-width') || rule.style.getPropertyValue('border-top');
        if (bw && o.cssom[rule.selectorText] === undefined) o.cssom[rule.selectorText] = bw;
      }
    }
    // 自定义属性 token
    const cs = getComputedStyle(document.documentElement);
    for (const v of ['--hair', '--bold', '--mid']) o.custom[v] = cs.getPropertyValue(v).trim();
    return o;
  });
  console.log('=== Typed OM ===');
  console.log(JSON.stringify(r, null, 1));
  await p.close();
}

/* ── 2. 在真实案上跑：S19（声称 0.4/0.8/1/3）与 S15（声称 0.5/0.8/1/1.7/3）与 S13 ── */
const cases = ['S19', 'S15', 'S13', 'S10', 'S27', 'S02'];
const real = {};
for (const id of cases) {
  const dir = readdirSync(ROOT).find((d) => d.startsWith(id + '-'));
  const p = await b.newPage({ width: 1440, height: 900 });
  await p.goto(`http://127.0.0.1:${PORT}/${dir}/index.html`, { settleMs: 1000 });
  real[id] = await p.eval(() => {
    const widths = new Map(); // "0.4px" -> {n, where:[]}
    const add = (v, where) => {
      const s = String(v).trim();
      if (!s || s === '0px' || s === 'medium' || s === 'none') return;
      if (!widths.has(s)) widths.set(s, { n: 0, where: new Set() });
      const r = widths.get(s); r.n++; if (r.where.size < 4) r.where.add(where);
    };
    const sel = (el) => el.tagName.toLowerCase() + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : '');
    let typedOk = 0, typedErr = 0;
    for (const el of document.querySelectorAll('*')) {
      const cs = getComputedStyle(el);
      for (const side of ['Top', 'Right', 'Bottom', 'Left']) {
        if (parseFloat(cs['border' + side + 'Width']) > 0 && cs['border' + side + 'Style'] !== 'none') {
          try {
            const v = el.computedStyleMap().get('border-' + side.toLowerCase() + '-width');
            add(v && v.value !== undefined ? v.value + 'px' : String(v), sel(el));
            typedOk++;
          } catch (e) { typedErr++; }
        }
      }
      if (cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0) {
        try { const v = el.computedStyleMap().get('outline-width'); add(v && v.value !== undefined ? v.value + 'px' : String(v), sel(el) + ':outline'); } catch (e) { typedErr++; }
      }
    }
    // 自定义属性里的长度 token（有些案把线宽存在 --line-hair 之类）
    const customLens = [];
    for (const sh of document.styleSheets) {
      let rules; try { rules = sh.cssRules; } catch { continue; }
      const walk = (rs) => {
        for (const rule of rs || []) {
          if (rule.cssRules) { walk(rule.cssRules); continue; }
          if (!rule.style) continue;
          const n = rule.style.length || 0;
          for (let i = 0; i < n; i++) {
            const prop = rule.style[i];
            if (!prop.startsWith('--')) continue;
            const v = rule.style.getPropertyValue(prop).trim();
            if (/^\d*\.?\d+px$/.test(v)) customLens.push({ prop, v, rule: rule.selectorText });
          }
        }
      };
      walk(rules);
    }
    return {
      typedWidths: [...widths.entries()].map(([w, v]) => ({ w, n: v.n, where: [...v.where] }))
        .sort((a, b) => parseFloat(a.w) - parseFloat(b.w)),
      typedOk, typedErr, customLens: customLens.slice(0, 20),
    };
  });
  console.log(id, 'typed widths =', real[id].typedWidths.map((x) => x.w + '(' + x.n + ')').join(' '),
    '| ok=' + real[id].typedOk, 'err=' + real[id].typedErr,
    '| 自定义长度变量=' + real[id].customLens.map((c) => c.prop + '=' + c.v).join(','));
  await p.close();
}
await b.close(); server.close();
writeFileSync(join(OUT, 'width-precision.json'), JSON.stringify(real, null, 1), 'utf8');
