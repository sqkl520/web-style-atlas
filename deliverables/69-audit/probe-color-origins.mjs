// 探针 10：给每个"未声称但上屏"的颜色找**出处**，区分四种来源：
//   UA   = 浏览器默认（#000 黑、#0000EE 未访问链接）→ 不是作者的谎
//   attr = HTML 表现属性（<svg fill="#xxx">、<rect stop-color>）→ 作者写了，但没进 CSS 调色板
//   inline = style="" 内联 → 同上
//   css  = 样式表规则里的字面量 → 真·调色板外的新色
// 同时记录：承载文字？面积估算（元素框面积 > 视口 0.3% 才叫"看得见"）。
import http from 'node:http';
import { readFileSync, existsSync, statSync, readdirSync, writeFileSync } from 'node:fs';
import { join, extname } from 'node:path';
import { Browser } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';

const ROOT = 'D:/Web/style/prototypes';
const OUT = 'D:/Web/style/deliverables/69-audit';
const PORT = 8518;
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.jpg': 'image/jpeg', '.png': 'image/png', '.woff2': 'font/woff2', '.svg': 'image/svg+xml' };
const server = http.createServer((req, res) => {
  const f = join(ROOT, decodeURIComponent(req.url.split('?')[0]));
  if (!existsSync(f) || !statSync(f).isFile()) { res.writeHead(404); res.end('no'); return; }
  res.writeHead(200, { 'Content-Type': MIME[extname(f).toLowerCase()] || 'application/octet-stream' });
  res.end(readFileSync(f));
});
await new Promise((r) => server.listen(PORT, r));

const con = JSON.parse(readFileSync(OUT + '/constraints.json', 'utf8'));
const dirs = readdirSync(ROOT).filter((d) => /^S\d\d-/.test(d)).sort();
const b = await Browser.launch({ width: 1440, height: 900 });
const out = {};

for (const d of dirs) {
  const id = d.slice(0, 3);
  const claimed = [...new Set(con.per[id].items.filter((i) => i.kind === 'palette').map((i) => i.params.hex))];
  const p = await b.newPage({ width: 1440, height: 900 });
  await p.goto(`http://127.0.0.1:${PORT}/${d}/index.html`, { settleMs: 1200 });
  const r = await p.eval((claimedArr) => {
    const claimed = new Set(claimedArr);
    const hexOf = (v) => {
      const s = String(v);
      const m = s.match(/rgba?\(([^)]+)\)/);
      if (m) {
        const q = m[1].split(/[,\s/]+/).filter(Boolean).map(Number);
        const a = q.length > 3 ? q[3] : 1;
        if (!a) return null;
        return { hex: '#' + q.slice(0, 3).map((x) => Math.round(x).toString(16).padStart(2, '0')).join('').toUpperCase(), a: +a.toFixed(2) };
      }
      if (/^#[0-9a-fA-F]{3,8}$/.test(s)) {
        let h = s.toUpperCase();
        if (h.length === 4) h = '#' + h.slice(1).split('').map((c) => c + c).join('');
        if (h.length > 7) h = h.slice(0, 7);
        return { hex: h, a: 1 };
      }
      return null;
    };
    const sel = (el) => el.tagName.toLowerCase() + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : '');

    /* 样式表里字面写过哪些 hex（含全部规则，不分来源表） */
    const cssHex = new Set();
    const walk = (rules) => {
      for (const rule of rules || []) {
        if (rule.cssRules && rule.cssRules.length) { walk(rule.cssRules); continue; }
        if (!rule.style) continue;
        for (let i = 0; i < rule.style.length; i++) {
          const v = rule.style.getPropertyValue(rule.style[i]);
          for (const h0 of String(v).match(/#[0-9a-fA-F]{3,8}\b/g) || []) {
            let h = h0.toUpperCase();
            if (h.length === 4) h = '#' + h.slice(1).split('').map((c) => c + c).join('');
            if (h.length > 7) h = h.slice(0, 7);
            cssHex.add(h);
          }
        }
      }
    };
    for (const sh of document.styleSheets) { try { walk(sh.cssRules); } catch (e) {} }

    /* HTML 表现属性里的 hex */
    const attrHex = new Set();
    for (const el of document.querySelectorAll('*')) {
      for (const a of el.attributes || []) {
        for (const h0 of String(a.value).match(/#[0-9a-fA-F]{3,8}\b/g) || []) {
          let h = h0.toUpperCase();
          if (h.length === 4) h = '#' + h.slice(1).split('').map((c) => c + c).join('');
          if (h.length > 7) h = h.slice(0, 7);
          attrHex.add(h);
        }
      }
    }

    const vpArea = innerWidth * innerHeight;
    const found = new Map(); // key -> {hex,a, sources:Set, where[], maxAreaPx, hasText, tags:Set}
    const note = (val, el, prop) => {
      const o = hexOf(val);
      if (!o) return;
      const key = o.hex + (o.a < 1 ? '@' + o.a : '');
      if (!found.has(key)) found.set(key, { hex: o.hex, a: o.a, sources: new Set(), where: [], maxArea: 0, hasText: false, tags: new Set() });
      const rec = found.get(key);
      const rect = el.getBoundingClientRect ? el.getBoundingClientRect() : { width: 0, height: 0 };
      const area = Math.max(0, rect.width) * Math.max(0, rect.height);
      rec.maxArea = Math.max(rec.maxArea, area);
      if (rec.where.length < 4) rec.where.push(sel(el) + '.' + prop);
      rec.tags.add(el.tagName);
      if (Array.from(el.childNodes).some((n) => n.nodeType === 3 && n.textContent.trim())) rec.hasText = true;
      if (!claimed.has(o.hex)) {
        if (cssHex.has(o.hex)) rec.sources.add('css');
        else if (attrHex.has(o.hex)) rec.sources.add('attr');
        else if (el.getAttribute && /#[0-9a-fA-F]{3,8}/.test(el.getAttribute('style') || '')) rec.sources.add('inline');
        else rec.sources.add('unknown');
      }
    };
    for (const el of document.querySelectorAll('*')) {
      const cs = getComputedStyle(el);
      note(cs.color, el, 'color');
      note(cs.backgroundColor, el, 'bg');
      for (const s of ['Top', 'Right', 'Bottom', 'Left']) {
        if (parseFloat(cs['border' + s + 'Width']) > 0 && cs['border' + s + 'Style'] !== 'none') note(cs['border' + s + 'Color'], el, 'border');
      }
      if (cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0) note(cs.outlineColor, el, 'outline');
      if (cs.stroke && cs.stroke !== 'none') note(cs.stroke, el, 'stroke');
      if (cs.fill && cs.fill !== 'none') note(cs.fill, el, 'fill');
    }
    /* 非文字元素（svg 图元）的 alpha 常常 <1，单独保留 */
    const extras = [...found.values()].filter((x) => !claimed.has(x.hex))
      .map((x) => ({
        hex: x.hex, a: x.a, sources: [...x.sources], where: x.where, tags: [...x.tags],
        areaPct: +(x.maxArea / vpArea * 100).toFixed(3), hasText: x.hasText,
      }))
      .sort((p1, p2) => p2.areaPct - p1.areaPct);

    /* 声称色的实际用量 */
    const claimedUse = claimedArr.map((h) => {
      const f = found.get(h) || found.get(h + '@1');
      const anyA = [...found.values()].filter((x) => x.hex === h);
      return {
        hex: h,
        painted: anyA.length > 0,
        areas: anyA.map((x) => +(x.maxArea / vpArea * 100).toFixed(2)),
        hasText: anyA.some((x) => x.hasText),
      };
    });

    return { claimed, extras, claimedUse, cssHexN: cssHex.size, attrHexN: attrHex.size };
  }, claimed);

  out[id] = r;
  const chroma = r.extras.filter((e) => e.sources.length && (e.sources.includes('css') || e.sources.includes('attr') || e.sources.includes('unknown')));
  console.log(id, '未声称上屏色=' + r.extras.length,
    '| 有出处(css/attr/?)=' + chroma.length,
    '| 有文字的=' + r.extras.filter((e) => e.hasText).length,
    '| 面积>0.3%=' + r.extras.filter((e) => e.areaPct > 0.3).length,
    '|', r.extras.slice(0, 6).map((e) => e.hex + (e.a < 1 ? '@' + e.a : '') + '[' + e.sources.join('+') + (e.hasText ? ',txt' : '') + ',' + e.areaPct + '%]').join(' '));
  await p.close();
}
await b.close(); server.close();
writeFileSync(join(OUT, 'color-origins.json'), JSON.stringify(out, null, 1), 'utf8');
console.log('wrote color-origins.json');
