// 探针 5：诊断 —— 区分「真的谎」和「我的量法错了」。
// 四个子实验：
//  A. border-width 的 computed 值能不能如实报出 0.4 / 0.8 / 1.25 / 5.5px？（dsf=1 与 dsf=2）
//  B. 作者样式表里字面写了哪些 hex？（与 computed 上屏色对比，找出 UA 默认色 / color-mix 派生色）
//  C. 指定的可疑案，逐个列出"未声称色"来自哪个元素、哪条规则
//  D. 表单控件的 UA 默认边框是不是我 line-widths 误报的根源
import http from 'node:http';
import { readFileSync, existsSync, writeFileSync, statSync, readdirSync } from 'node:fs';
import { join, extname } from 'node:path';
import { Browser, sleep } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';

const ROOT = 'D:/Web/style/prototypes';
const OUT = 'D:/Web/style/deliverables/69-audit';
const PORT = 8513;
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
const diag = { borderWidthProbe: {}, authorHex: {}, suspects: {}, formControls: {} };

/* ═══ A. border-width computed 精度 ═══════════════════════════════ */
const probeHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
  body{margin:0;font:16px serif;background:#fff}
  .b04{border:0 solid #000;border-top-width:0.4px;border-top-style:solid}
  .b08{border:0 solid #000;border-top-width:0.8px;border-top-style:solid}
  .b125{border:0 solid #000;border-top-width:1.25px;border-top-style:solid}
  .b15{border:0 solid #000;border-top-width:1.5px;border-top-style:solid}
  .b55{border:0 solid #000;border-top-width:5.5px;border-top-style:solid}
  .b145{border:0 solid #000;border-top-width:14.5px;border-top-style:solid}
  .b24{border:0 solid #000;border-top-width:2.4px;border-top-style:solid}
  .b08s{outline:0.8px solid #000;outline-offset:0}
  .b04s{outline:0.4px solid #000}
  .sh{box-shadow:inset 0 0 0 0.4px #000}
</style></head><body>
<div class="b04">a</div><div class="b08">a</div><div class="b125">a</div><div class="b15">a</div>
<div class="b55">a</div><div class="b145">a</div><div class="b24">a</div>
<div class="b08s">a</div><div class="b04s">a</div><div class="sh">a</div>
</body></html>`;
{
  const p = await b.newPage({ width: 800, height: 600 });
  for (const dsf of [1, 2]) {
    await p.setViewport({ width: 800, height: 600, dsf });
    await p.goto('about:blank', { settleMs: 100 });
    // 用 data: URL 加载，避免起额外路由
    await p.send('Page.navigate', { url: 'data:text/html;charset=utf-8,' + encodeURIComponent(probeHtml) });
    await sleep(500);
    diag.borderWidthProbe['dsf' + dsf] = await p.eval(() => {
      const o = {};
      for (const cl of ['b04', 'b08', 'b125', 'b15', 'b55', 'b145', 'b24', 'b08s', 'b04s', 'sh']) {
        const el = document.querySelector('.' + cl);
        const cs = getComputedStyle(el);
        o[cl] = {
          spec: cl, borderTopWidth: cs.borderTopWidth, outlineWidth: cs.outlineWidth,
          borderTopStyle: cs.borderTopStyle,
          rect: +el.getBoundingClientRect().height.toFixed(3),
          // 真实像素：截一张图数？太重。用 dpr 与 computed 对比即可
          dpr: devicePixelRatio,
        };
      }
      return o;
    });
  }
  await p.close();
}

/* ═══ B+C. 逐案：作者样式表 hex 字面量 + 未声称色的出处 ═══════════ */
const con = JSON.parse(readFileSync(OUT + '/constraints.json', 'utf8'));
const mea = JSON.parse(readFileSync(OUT + '/measured.json', 'utf8'));
const ids = Object.keys(con.per);

for (const id of ids) {
  const dir = readdirSync(ROOT).find((d) => d.startsWith(id + '-'));
  const p = await b.newPage({ width: 1440, height: 900 });
  await p.goto(`http://127.0.0.1:${PORT}/${dir}/index.html`, { settleMs: 1000 });
  const r = await p.eval(() => {
    /* B: 作者样式表里的 hex 字面量（含 var 定义与 color-mix 输入） */
    const authorHex = new Map(); // hex -> {n, sheets:Set, ctx:[]}
    const colorMix = [];
    let sheetCount = 0;
    const collect = (rules, sheetName) => {
      for (const rule of rules || []) {
        if (rule.cssRules) { collect(rule.cssRules, sheetName); continue; }
        if (!rule.style) continue;
        for (const prop of rule.style) {
          const v = rule.style.getPropertyValue(prop);
          if (!v) continue;
          if (/color-mix|oklch|oklab|lab\(|lch\(/i.test(v)) colorMix.push({ sheet: sheetName, prop, v: v.slice(0, 80) });
          const m = v.match(/#[0-9a-fA-F]{3,8}\b/g) || [];
          for (const h of m) {
            let hh = h.toUpperCase();
            if (hh.length === 4) hh = '#' + hh.slice(1).split('').map((c) => c + c).join('');
            if (hh.length === 5 || hh.length === 9) hh = hh.slice(0, 7);
            if (!authorHex.has(hh)) authorHex.set(hh, { n: 0, sheets: new Set(), ctx: [] });
            const rec = authorHex.get(hh); rec.n++;
            rec.sheets.add(sheetName);
            if (rec.ctx.length < 3) rec.ctx.push(rule.selectorText + ' { ' + prop + ': ' + v.slice(0, 50) + ' }');
          }
        }
      }
    };
    for (const sh of document.styleSheets) {
      const href = sh.href || 'inline';
      if (href && !/\/prototypes\//.test(href) && !/^inline$/.test(href) && !/\/S\d\d-/.test(href)) continue;
      if (href !== 'inline' && /_fonts\/css/.test(href)) continue; // 字体包里的颜色不算
      sheetCount++;
      try { collect(sh.cssRules, href.split('/').slice(-1)[0]); } catch (e) { /* cross-origin */ }
    }

    /* C: 每个上屏色的出处（哪个元素、什么属性、有没有可见文本） */
    const origins = new Map();
    const addO = (hex, where, hasText, tag) => {
      if (!origins.has(hex)) origins.set(hex, []);
      const a = origins.get(hex);
      if (a.length < 3) a.push({ where, hasText, tag });
    };
    const hexOf = (rgb) => {
      const m = String(rgb).match(/rgba?\(([^)]+)\)/);
      if (!m) return null;
      const pp = m[1].split(/[,\s/]+/).filter(Boolean).map(Number);
      const a = pp.length > 3 ? pp[3] : 1;
      if (a !== 1) return null;
      return '#' + pp.slice(0, 3).map((v) => Math.round(v).toString(16).padStart(2, '0')).join('').toUpperCase();
    };
    const sel = (el) => el.tagName.toLowerCase() + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : '');
    for (const el of document.querySelectorAll('*')) {
      const cs = getComputedStyle(el);
      // 只算"有内容"的：有直接文本节点，或有非透明底色，或有可见边框
      const directText = Array.from(el.childNodes).some((n) => n.nodeType === 3 && n.textContent.trim());
      const bg = hexOf(cs.backgroundColor);
      let bw = 0, bc = null;
      for (const s of ['Top', 'Right', 'Bottom', 'Left']) {
        if (parseFloat(cs['border' + s + 'Width']) > 0 && cs['border' + s + 'Style'] !== 'none') { bw = parseFloat(cs['border' + s + 'Width']); bc = hexOf(cs['border' + s + 'Color']); }
      }
      if (directText) addO(hexOf(cs.color), sel(el) + '.color', true, el.tagName);
      if (bg) addO(bg, sel(el) + '.bg', !!directText, el.tagName);
      if (bw > 0 && bc) addO(bc, sel(el) + '.border', !!directText, el.tagName);
    }
    /* D: 表单控件 —— UA 默认边框 */
    const forms = [];
    for (const el of document.querySelectorAll('input,button,select,textarea,fieldset')) {
      const cs = getComputedStyle(el);
      forms.push({
        tag: el.tagName, type: el.type || '',
        border: cs.borderTopWidth + ' ' + cs.borderTopStyle + ' ' + cs.borderTopColor,
        radius: cs.borderTopLeftRadius,
        appearance: cs.appearance,
        ownClass: el.className || '',
      });
    }
    return {
      authorHex: [...authorHex.entries()].map(([h, v]) => ({ hex: h, n: v.n, sheets: [...v.sheets], ctx: v.ctx })),
      colorMix: colorMix.slice(0, 12), colorMixN: colorMix.length, sheetCount,
      origins: [...origins.entries()].map(([h, v]) => ({ hex: h, v })),
      forms,
      uaLink: hexOf(getComputedStyle(document.querySelector('a[href]') || document.body).color),
    };
  });
  // 把 claimed 注入？改为在页内算不了，导出后离线算
  diag.authorHex[id] = r;
  await p.close();
  console.log(id, 'authorHex=' + r.authorHex.length, 'colorMix=' + r.colorMixN, 'forms=' + r.forms.length);
}

await b.close(); server.close();
writeFileSync(join(OUT, 'diagnose.json'), JSON.stringify(diag, null, 1), 'utf8');
console.log('\n=== A. border-width computed 精度 ===');
for (const [k, v] of Object.entries(diag.borderWidthProbe)) {
  console.log(k, JSON.stringify(Object.fromEntries(Object.entries(v).map(([a, c]) => [a, c.borderTopWidth + '/' + c.outlineWidth + ' rect=' + c.rect]))));
}
console.log('wrote diagnose.json');
