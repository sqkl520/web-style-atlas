// 探针 16（线宽 · 终局口径）：三个坑都绕开之后的重测。
//
// 沿途踩到的三个坑（每一个都单独验证过）：
//  坑 1  computed 取整：0.4/0.8/1.25 全报 1px，5.5 报 5px，14.5 报 14px（probe 6 的 data URL 实测）。
//  坑 2  SVG stroke-width 是**用户单位**：同一条 stroke-width:2 在 24 单位 viewBox 缩到 100px 时
//        渲染成 10px，缩到 200px 时 20px（probe 14 的 A 段）。拿它比 px 是单位错误。
//        例外：vector-effect:non-scaling-stroke。
//  坑 3  含 var() 的**简写**在 CSSOM 里读出来是空串（probe 15 实测：
//        `border-bottom: 3px solid var(--pencil)` 的 border-bottom-width 返回 ""）。
//        S15 的 15 条线宽声明因此整批丢失，只剩 2px 一个值。
//
// 终局口径 = **原始样式表文本里作者真的写了什么**（var() 用 :root 的 computed 值展开），
// 只统计"确实至少有 1 个元素在用它"的宽度（用 computed 的整数集合做存在性交叉验证）。
import http from 'node:http';
import { readFileSync, existsSync, statSync, readdirSync, writeFileSync } from 'node:fs';
import { join, extname } from 'node:path';
import { Browser } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';

const ROOT = 'D:/Web/style/prototypes';
const OUT = 'D:/Web/style/deliverables/69-audit';
const PORT = 8523;
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
  const p = await b.newPage({ width: 1440, height: 900 });
  await p.goto(`http://127.0.0.1:${PORT}/${d}/index.html`, { settleMs: 1200 });
  const r = await p.eval(() => {
    /* ── 1. 取原始 CSS 文本（页内 fetch 所有本地样式表） ── */
    const texts = [];
    for (const sh of document.styleSheets) {
      const href = sh.href || '';
      if (/_fonts\/css/.test(href)) continue;
      try {
        // 同源，可以同步取
        const xhr = new XMLHttpRequest();
        xhr.open('GET', href, false);
        xhr.send(null);
        if (xhr.status === 200 || xhr.status === 0) texts.push({ href, text: xhr.responseText });
      } catch (e) { /* ignore */ }
    }

    /* ── 2. :root 的 custom property（用来展开 var()），含链式 ── */
    const varsOf = (el) => {
      const cs = getComputedStyle(el);
      const o = {};
      // 从样式表里枚举所有 var 名，再取 computed 值
      for (const name of allVarNames) {
        const v = cs.getPropertyValue(name).trim();
        if (v) o[name] = v;
      }
      return o;
    };
    const allVarNames = new Set();
    for (const t of texts) for (const m of t.text.match(/--[a-zA-Z0-9_-]+\s*:/g) || []) allVarNames.add(m.replace(/\s*:$/, ''));
    const rootVars = varsOf(document.documentElement);

    const expand = (v, depth) => {
      let s = String(v);
      for (let k = 0; k < (depth || 4); k++) {
        if (!/var\(/.test(s)) break;
        s = s.replace(/var\(\s*(--[a-zA-Z0-9_-]+)\s*(?:,\s*([^)]*))?\)/g, (mm, name, fb) => {
          return rootVars[name] !== undefined ? rootVars[name] : (fb !== undefined ? fb : '/*unresolved*/');
        });
      }
      return s;
    };

    /* ── 3. 从原始文本里抽 border / outline 的 px 宽度 ── */
    const decl = new Map(); // px -> {n, where[], unresolved}
    let unresolvedN = 0;
    for (const t of texts) {
      const src = t.text.replace(/\/\*[\s\S]*?\*\//g, '');   // 去注释（注释里写着"0.4px"会误判）
      // 逐条声明：prop: value;
      const re = /(border(?:-(?:top|right|bottom|left))?(?:-width)?|outline(?:-width)?)\s*:\s*([^;}]+)[;}]/g;
      let m;
      while ((m = re.exec(src))) {
        const prop = m[1], rawV = m[2].trim();
        const v = expand(rawV);
        if (/unresolved/.test(v)) { unresolvedN++; continue; }
        // 只关心"线宽"位置上的长度：border 简写里第一个长度就是 width
        const widths = [];
        // ⚠️ 2026-10-29 修：原来把 `outline` 和 `-width` 归成一类、要求值形如 "^3px$"。
        // 但 `outline: 3px solid var(--spot-b)` 是**简写**，值不是纯 px → S25 的 3px 被漏掉，
        // 于是错判成"声称的 3px 在原型里不存在"。outline 简写必须和 border 简写同样处理。
        if (/-width$/.test(prop)) {
          const one = v.match(/^(-?\d*\.?\d+)px$/);
          if (one) widths.push(parseFloat(one[1]));
        } else {
          // 简写（border / border-top / outline）：取第一个 px 长度作为线宽
          const all = (v.match(/(?:^|\s)(-?\d*\.?\d+)px(?=\s|$)/g) || [])
            .map((s) => parseFloat(s));
          if (all.length) widths.push(all[0]);
        }
        for (const w of widths) {
          if (!(w >= 0)) continue;
          if (!decl.has(w)) decl.set(w, { n: 0, where: [], unresolved: false });
          const rec = decl.get(w); rec.n++;
          if (rec.where.length < 3) rec.where.push(prop + ':' + rawV.slice(0, 34));
        }
      }
    }

    /* ── 4. computed 整数集合（存在性验证：这些宽度真的生效了） ── */
    const comp = new Set();
    for (const el of document.querySelectorAll('*')) {
      const cs = getComputedStyle(el);
      for (const s of ['Top', 'Right', 'Bottom', 'Left']) {
        const w = parseFloat(cs['border' + s + 'Width']);
        if (w > 0 && cs['border' + s + 'Style'] !== 'none') comp.add(w);
      }
      if (cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0) comp.add(parseFloat(cs.outlineWidth));
      // SVG：非缩放线宽也算线的证据（只取 non-scaling 的，用户单位的不进这个集合）
      const sw = parseFloat(cs.strokeWidth);
      if (sw > 0 && cs.stroke && cs.stroke !== 'none' && cs.vectorEffect === 'non-scaling-stroke') comp.add(sw);
    }

    /* ── 5. SVG non-scaling 线宽（O(1) 需要单独列） ── */
    const nonScaling = new Set();
    const userUnit = [];
    for (const el of document.querySelectorAll('svg *, svg')) {
      const cs = getComputedStyle(el);
      const sw = parseFloat(cs.strokeWidth);
      if (!(sw > 0) || !cs.stroke || cs.stroke === 'none') continue;
      if (cs.vectorEffect === 'non-scaling-stroke') nonScaling.add(sw);
      else {
        const root = el.closest('svg');
        const vb = root && root.viewBox && root.viewBox.baseVal;
        const rect = root ? root.getBoundingClientRect() : null;
        const scale = vb && vb.width > 0 && rect && rect.width > 0 ? rect.width / vb.width : 1;
        userUnit.push({ sw, scale: +scale.toFixed(3), real: +(sw * scale).toFixed(3) });
      }
    }

    /* ── 3b. CSS 里的 stroke-width 声明（无单位 = 用户单位） ──
     * S15 的 `stroke-width: 0.5 / 0.8 / 1 / 1.2 / 1.7` 就是声称值的真实落点。
     * 不单独收这一路，就会把"值存在于 SVG"误判成"值根本不存在"。 */
    const strokeDecl = new Map();
    for (const t of texts) {
      const src2 = t.text.replace(/\/\*[\s\S]*?\*\//g, '');
      const re2 = /stroke-width\s*:\s*([^;}]+)[;}]/g;
      let m2;
      while ((m2 = re2.exec(src2))) {
        const v = expand(m2[1].trim());
        const one = v.match(/^(-?\d*\.?\d+)(px)?$/);   // 无单位或 px 都算同一档（px 时是绝对长度）
        if (!one) continue;
        const num = parseFloat(one[1]);
        if (!(num > 0)) continue;
        const key = one[2] ? num + 'px' : num;
        if (!strokeDecl.has(key)) strokeDecl.set(key, { n: 0, px: !!one[2] });
        strokeDecl.get(key).n++;
      }
    }

    return {
      decl: [...decl.entries()].map(([w, v]) => ({ w, n: v.n, where: v.where })).sort((a, c) => a.w - c.w),
      strokeDecl: [...strokeDecl.entries()].map(([k, v]) => ({ key: k, w: parseFloat(k), px: v.px, n: v.n })).sort((a, c) => a.w - c.w),
      unresolvedN,
      comp: [...comp].sort((a, c) => a - c),
      nonScaling: [...nonScaling].sort((a, c) => a - c),
      userUnit: userUnit.slice(0, 30),
      varN: allVarNames.size,
    };
  });
  out[id] = r;

  const claim = con.per[id].items.find((i) => i.kind === 'line-widths');
  const claimedW = claim ? claim.params.widths : [];
  // 有效宽度 = CSS 边框/outline 声明 ∪ non-scaling stroke ∪ 有单位的 stroke-width
  const eff = [...new Set([
    ...r.decl.map((x) => x.w),
    ...r.nonScaling,
    ...r.strokeDecl.filter((x) => x.px).map((x) => x.w),
  ])].filter((w) => w > 0).sort((a, c) => a - c);
  const inClaim = (v) => claimedW.some((x) => Math.abs(x - v) < 0.011);
  const extra = eff.filter((v) => !inClaim(v));
  // 声称值落地：任一路径命中即可
  const allSeen = [...new Set([...eff, ...r.strokeDecl.map((x) => x.w)])];
  const missing = claimedW.filter((v) => !allSeen.some((s) => Math.abs(s - v) < 0.011));
  console.log(id,
    '声称=[' + claimedW.join(',') + ']',
    '边框+绝对=' + (eff.length ? eff.join(',') : '—'),
    'stroke声明=' + r.strokeDecl.map((x) => x.w).join(','),
    '未落地=' + (missing.length ? missing.join(',') : '无'),
    (extra.length ? ' ⚠超纲=' + extra.join(',') : ' ok'));
  await p.close();
}
await b.close(); server.close();
writeFileSync(join(OUT, 'linewidths-v2.json'), JSON.stringify(out, null, 1), 'utf8');
console.log('wrote linewidths-v2.json');
