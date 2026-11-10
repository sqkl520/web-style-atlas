/**
 * p1-pixel-share.mjs —— 缺陷 1 的判决性证据：集合外颜色在**真实浏览器渲染**里到底占多少面积。
 *
 * 为什么必须做这一层（上一轮 69 的全部结论都停在「出现次数」）：
 *   出现 247 次不等于视觉重要 —— 247 次可能全在 12px 的小标签上，也可能是整页正文。
 *   Lead 的 69-plan/LEAD-color-violation-finding.md §三 已经把这标为「规划 Agent 的第一件事」：
 *   「抽 2 案逐色核，证明 247 次的 #5E5443 是正文色，不是测量噪声」。
 *
 * 做法（三层，缺一层都判不了）：
 *   ① **像素层**：CDP 截 fullPage PNG → decodePng → 逐像素精确匹配到该案「实画色集合」
 *      → 每个 hex 的像素数 / 总像素。这是"视觉面积"。
 *   ② **元素层**：对每个 hex，找出所有 computedStyle 精确等于它的元素，取 union 的
 *      getBoundingClientRect 面积、字号、是否正文（p/li/td/dd/blockquote）、伪元素、
 *      SVG stroke/fill 分类。这解释"像素面积是被谁画出来的"。
 *   ③ **文本层**：某 hex 覆盖的**字符数**（innerText 长度汇总，去重父元素）。
 *      这是"正文色"最硬的判据：一个色如果画了 4000 个正文字符，它就是正文色。
 *
 * 判定规则（写进报告，可被反驳）：
 *   isBodyText   = 该 hex 覆盖字符数 ≥ 全文字符数的 20%，且 ≥ 300 字符
 *   visuallySig  = 像素占比 ≥ 1.0%  或  union 元素面积占比 ≥ 5%
 *   结论分三类：A 正文/骨架色（必须补进提示词）/ B 装饰或深淡变体 / C 噪声（<0.1% 像素且无文本）
 *
 * 用法：node deliverables/70-plan/probes/p1-pixel-share.mjs [--json out.json] [--only S19,S14]
 * 依赖：node 22+（内置 WebSocket）、本机 Chrome。零 npm 依赖。
 */
import { Browser, sleep } from '../../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { decodePng } from '../../69-exec/png.mjs';
import { createServer } from 'node:http';
import { readFileSync, existsSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, extname, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '../../..');
const PROMPTS = join(ROOT, 'prototypes/_selection/prompts.js');

const argv = process.argv.slice(2);
const argVal = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; };
const OUT = argVal('--json', join(HERE, 'p1-pixel-share.json'));
const ONLY = (argVal('--only', '') || '').split(',').map(s => s.trim()).filter(Boolean);
const VIEWPORT = 1440;

const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp',
  '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.otf': 'font/otf',
};

/* ── 静态服务器（file:// 下字体/CORS 会坏，必须 http）────────────────────── */
function serve(port = 8731) {
  const srv = createServer((req, res) => {
    const u = decodeURIComponent(req.url.split('?')[0]);
    const p = join(ROOT, u);
    if (!p.startsWith(ROOT) || !existsSync(p)) { res.writeHead(404); res.end('nf'); return; }
    res.writeHead(200, { 'Content-Type': MIME[extname(p).toLowerCase()] || 'application/octet-stream' });
    res.end(readFileSync(p));
  });
  return new Promise(r => srv.listen(port, '127.0.0.1', () => r(srv)));
}

/* ── 从 prompts.js 取「提示词声称的色板」：直接跑生成器，不手抄 ───────────── */
function loadPrompts() {
  const src = readFileSync(PROMPTS, 'utf8');
  const sandbox = { window: {} };
  // prompts.js 是 `window.STYLE_PROMPTS = {...};`，在 vm 里跑比正则可复算
  vm.runInNewContext(src, sandbox, { filename: 'prompts.js' });
  return sandbox.window.STYLE_PROMPTS;
}

/* #RGB / rgb() → #RRGGBB */
const normHex = (s) => {
  if (!s) return null;
  let m = String(s).match(/^#([0-9a-f]{6})$/i);
  if (m) return '#' + m[1].toUpperCase();
  m = String(s).match(/^#([0-9a-f])([0-9a-f])([0-9a-f])$/i);
  if (m) return ('#' + m[1] + m[1] + m[2] + m[2] + m[3] + m[3]).toUpperCase();
  m = String(s).match(/^rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)/i);
  if (m) return '#' + [m[1], m[2], m[3]].map(n => (+n).toString(16).padStart(2, '0')).join('').toUpperCase();
  return null;
};

const main = async () => {
  const P = loadPrompts();
  const srv = await serve();
  const browser = await Browser.launch({ width: VIEWPORT, height: 900 });
  const page = await browser.newPage();
  await page.setViewport({ width: VIEWPORT, height: 900, dsf: 1, mobile: false });

  const dirs = readdirSync(join(ROOT, 'prototypes'), { withFileTypes: true })
    .filter(d => d.isDirectory() && /^S\d{2}-/.test(d.name)).map(d => d.name).sort();

  const rows = [];
  for (const dir of dirs) {
    const id = dir.slice(0, 3);
    if (ONLY.length && !ONLY.includes(id)) continue;
    const sch = P.schemes.find(s => s.id === id);
    const claimed = [...new Set((String(sch.dna.palette).match(/#[0-9A-Fa-f]{6}/g) || []).map(h => h.toUpperCase()))];

    await page.goto(`http://127.0.0.1:8731/prototypes/${dir}/index.html`, { settleMs: 1800 });
    // 触发懒加载/滚动进场动画：滚到底再回顶，等 settle
    await page.eval(`(async()=>{const h=document.body.scrollHeight;for(let y=0;y<h;y+=600){window.scrollTo(0,y);await new Promise(r=>setTimeout(r,25));}window.scrollTo(0,0);await new Promise(r=>setTimeout(r,300));return 1;})()`);

    /* ── 元素层 + 文本层：一次 eval 取全部 ─────────────────────────────── */
    const dom = await page.eval(`(() => {
      const toHex = (s) => {
        if (!s) return null;
        const m = String(s).match(/rgba?\\((\\d+)[,\\s]+(\\d+)[,\\s]+(\\d+)(?:[,\\s/]+([\\d.]+))?/);
        if (!m) return null;
        if (m[4] !== undefined && parseFloat(m[4]) === 0) return null;
        const h = n => (+n).toString(16).padStart(2,'0');
        return ('#'+h(m[1])+h(m[2])+h(m[3])).toUpperCase();
      };
      const PROPS = ['color','backgroundColor','borderTopColor','borderRightColor','borderBottomColor','borderLeftColor','outlineColor','fill','stroke','textDecorationColor','caretColor','columnRuleColor'];
      const TEXTY = /^(P|LI|TD|TH|DD|DT|BLOCKQUOTE|H1|H2|H3|H4|H5|H6|SPAN|A|LABEL|FIGCAPTION|CAPTION|SMALL|STRONG|EM|B|I|CITE|CODE)$/;
      const rec = new Map(); // hex -> {pxArea, rects:[], chars, bodyChars, tags:{}, props:{}, pseudo, svgStroke, svgFill, sizes:{}}
      const bump = (hex, k, n) => { if (!hex) return; if (!rec.has(hex)) rec.set(hex, {pxArea:0, rects:[], chars:0, bodyChars:0, tags:{}, props:{}, pseudoEls:0, svgStroke:0, svgFill:0, sizes:{}}); const r = rec.get(hex); r[k] += n; };
      const els = [document.documentElement, document.body, ...document.querySelectorAll('*')];
      const seenTextFor = new Set();
      let totalChars = 0;
      for (const el of els) {
        if (el.closest('script,style,noscript')) continue;
        // 该元素自身的直接文本（不含子元素文本），用来算"这个色画了多少字"
        let own = '';
        for (const n of el.childNodes) if (n.nodeType === 3) own += n.nodeValue;
        own = own.replace(/\\s+/g,' ').trim();
        const inCode = !!el.closest('pre,code,kbd,samp');

        const coats = [];
        const cs = getComputedStyle(el);
        for (const p of PROPS) coats.push([p, toHex(cs[p])]);
        // 渐变里的 rgb() 也算（背景图不是伪元素）
        const bi = cs.backgroundImage || '';
        if (bi.includes('gradient')) for (const m of bi.matchAll(/rgba?\\(\\d+[,\\s]+\\d+[,\\s]+\\d+[^)]*\\)/g)) coats.push(['gradient', toHex(m[0])]);

        for (const [p, hex] of coats) {
          if (!hex) continue;
          bump(hex, 'props', 1);
          if (p === 'color') {
            if (own.length) { bump(hex, 'chars', own.length); if (!inCode && TEXTY.test(el.tagName)) bump(hex, 'bodyChars', own.length); }
          }
          if (p === 'fill') bump(hex, 'svgFill', 1);
          if (p === 'stroke') bump(hex, 'svgStroke', 1);
        }
        // 面积：只对"这个元素自己画了这个色"的情况计入，且按更小的那个算（避免父容器重复计）
        const r0 = el.getBoundingClientRect();
        const area = Math.max(0, r0.width) * Math.max(0, r0.height);
        if (area > 0) {
          const bg = toHex(cs.backgroundColor);
          if (bg) { const r = rec.get(bg); if (r) r.rects.push([Math.round(r0.width), Math.round(r0.height), el.tagName.toLowerCase()]); }
          const col = toHex(cs.color);
          if (col) { const r = rec.get(col); if (r) { const fs = parseFloat(cs.fontSize)||0; r.sizes[fs] = (r.sizes[fs]||0)+1; } }
        }
        for (const ps of ['::before','::after']) {
          const pcs = getComputedStyle(el, ps);
          if (!pcs || pcs.content === 'none' || pcs.content === 'normal') continue;
          for (const p of ['color','backgroundColor','borderTopColor','fill','stroke']) {
            const hex = toHex(pcs[p]);
            if (hex) { bump(hex, 'props', 1); bump(hex, 'pseudoEls', 1); if (p === 'color' && pcs.content) bump(hex, 'chars', (pcs.content||'').replace(/["']/g,'').length); }
          }
        }
        for (const n of el.childNodes) if (n.nodeType === 3) totalChars += n.nodeValue.replace(/\\s+/g,' ').trim().length;
      }
      const out = {};
      for (const [hex, r] of rec) {
        // union 面积：按"最大单矩形 × 出现次数上限"过于乐观，这里给两个口径
        let maxRect = 0, sumRect = 0;
        for (const [w,h] of r.rects) { const a = w*h; sumRect += a; if (a > maxRect) maxRect = a; }
        out[hex] = { props: r.props, chars: r.chars, bodyChars: r.bodyChars, maxRect, sumRect,
                     pseudoEls: r.pseudoEls, svgStroke: r.svgStroke, svgFill: r.svgFill,
                     fontSizes: Object.keys(r.sizes).map(Number).sort((a,b)=>a-b).slice(0,8) };
      }
      /* ── 正文承载度（最硬的判据）───────────────────────────────────────
       * 对每个可见文本块（有直接文本的元素），用实际渲染的行数 × 平均字宽估"墨覆盖面积"，
       * 按它自己的 color 累加到该 hex 上。单位是 CSS px²。
       * 这回答的是「谁在画正文」：一个色即使只占 3% 像素，若它画了 60% 的墨迹，它就是正文色。
       */
      const ink = {};
      const textEls = [...document.querySelectorAll('body *')].filter(el => {
        if (el.closest('script,style,noscript,svg')) return false;
        let t = ''; for (const n of el.childNodes) if (n.nodeType === 3) t += n.nodeValue;
        return t.trim().length >= 2;
      });
      for (const el of textEls) {
        const cs = getComputedStyle(el);
        const hex = toHex(cs.color); if (!hex) continue;
        const rect = el.getBoundingClientRect(); if (rect.width <= 0 || rect.height <= 0) continue;
        const fs = parseFloat(cs.fontSize) || 16;
        let chars = 0; for (const n of el.childNodes) if (n.nodeType === 3) chars += n.nodeValue.replace(/\\s+/g,' ').trim().length;
        // 行数：scrollHeight / lineHeight
        const lh = parseFloat(cs.lineHeight) || fs * 1.5;
        const lines = Math.max(1, Math.round(rect.height / lh));
        // 墨覆盖面积 ≈ 字符数 × 字号² × 典型字形填充率 0.42（含少量字间空隙）
        const inkArea = chars * fs * fs * 0.42;
        if (!ink[hex]) ink[hex] = { inkArea: 0, chars: 0, blocks: 0, lines: 0, sizes: {} };
        ink[hex].inkArea += inkArea;
        ink[hex].chars += chars;
        ink[hex].blocks += 1;
        ink[hex].lines += lines;
        ink[hex].sizes[fs] = (ink[hex].sizes[fs]||0) + chars;
      }
      const inkTotal = Object.values(ink).reduce((s,v)=>s+v.inkArea,0);
      return { colors: out, ink, inkTotal, totalChars, docW: document.documentElement.scrollWidth, docH: document.documentElement.scrollHeight };
    })()`);

    /* ── 像素层：fullPage PNG → 逐像素精确计数 ─────────────────────────── */
    const b64 = await page.screenshot({ format: 'png', fullPage: true });
    const { W, H, px } = decodePng(Buffer.from(b64, 'base64'));
    const counts = new Map();
    for (let i = 0; i < W * H; i++) {
      const o = i * 4;
      const k = (px[o] << 16) | (px[o + 1] << 8) | px[o + 2];
      counts.set(k, (counts.get(k) || 0) + 1);
    }
    const totalPx = W * H;

    /* ── 逐色记账（排除浏览器默认纯黑纯白，与 69 口径一致便于对比）───────── */
    const all = [...counts.entries()].map(([k, n]) => ({
      hex: '#' + k.toString(16).padStart(6, '0').toUpperCase(), px: n, share: n / totalPx,
    })).sort((a, b) => b.px - a.px);

    const hexSetClosest = (hex, tol = 6) => {
      // 抗锯齿会产生过渡色，给一个 ±tol 的容差桶，避免把正文色判成 0
      const t = parseInt(hex.slice(1), 16), tr = (t >> 16) & 255, tg = (t >> 8) & 255, tb = t & 255;
      let n = 0;
      for (const c of all) {
        const v = parseInt(c.hex.slice(1), 16), r = (v >> 16) & 255, g = (v >> 8) & 255, b = v & 255;
        if (Math.abs(r - tr) <= tol && Math.abs(g - tg) <= tol && Math.abs(b - tb) <= tol) n += c.px;
      }
      return n / totalPx;
    };

    /* 墨迹承载度（来自 DOM eval，单位 px²） */
    const inkTotal = dom.inkTotal || 1;

    const detail = [];
    for (const hex of Object.keys(dom.colors)) {
      if (hex === '#000000' || hex === '#FFFFFF') continue;
      const d = dom.colors[hex];
      const ik = dom.ink[hex] || { inkArea: 0, chars: 0, blocks: 0, lines: 0, sizes: {} };
      const exact = counts.get(parseInt(hex.slice(1), 16)) || 0;
      const near = hexSetClosest(hex);
      const inClaimed = claimed.includes(hex);
      const chars = d.chars + 0;
      const exactShare = exact / totalPx;
      const inkShare = ik.inkArea / inkTotal;
      /* 三档判据（写进报告，可被反驳）：
       *   inkShare ≥ 5%  → 这个色在画正文/骨架文字，漏了它 AI 做出来的正文色就是错的
       *   exactShare ≥ 1% → 这个色是主要面积之一（底色/大色块）
       *   其余            → 装饰/过渡色，漏了不影响风格可辨认
       * 为什么不用 near 容差桶判：纸色系相邻色差 4–8，桶宽 6 会把 43% 的底色邻居
       * 也算进来（实测 S19 #DCD4BD 被算成 19%），完全失去分辨力。 */
      detail.push({
        hex, inClaimed, pxExact: exact, exactShare: +(exactShare * 100).toFixed(3),
        shareNear: +(near * 100).toFixed(3),
        chars, inkShare: +(inkShare * 100).toFixed(2),
        inkChars: ik.chars, blocks: ik.blocks,
        textBearing: inkShare >= 0.05,
        areaSig: exactShare >= 0.01,
        maxRect: d.maxRect, pseudoEls: d.pseudoEls, svgStroke: d.svgStroke, svgFill: d.svgFill,
        fontSizes: d.fontSizes,
        cls: (inkShare < 0.001 && exactShare < 0.0005)
          ? 'C-noise'
          : ((inkShare >= 0.05 || exactShare >= 0.01) ? 'A-skeleton' : 'B-decoration'),
      });
    }
    detail.sort((a, b) => b.exactShare - a.exactShare);

    const outside = detail.filter(d => !d.inClaimed);
    const outsideExactShare = outside.reduce((s, d) => s + d.exactShare, 0);
    const outsideInkShare = outside.reduce((s, d) => s + d.inkShare, 0);
    rows.push({
      id, dir, claimed, claimedN: claimed.length,
      paintedN: detail.length,
      outsideN: outside.length,
      outsidePxShare: +outsideExactShare.toFixed(2),
      outsideInkShare: +outsideInkShare.toFixed(2),
      violates: outside.some(d => d.cls === 'A-skeleton'),
      textBearingOutside: outside.filter(d => d.textBearing).sort((a,b)=>b.inkShare-a.inkShare).map(d => d.hex + '(' + d.inkShare + '%墨/' + d.inkChars + '字)'),
      topOutside: outside.slice(0, 6),
      detail,
      px: { W, H, totalPx }, docTextChars: dom.totalChars,
    });
    console.log(`${id}: 声称 ${claimed.length} / 实画 ${detail.length} / 集合外 ${outside.length} (像素 ${outsideExactShare.toFixed(2)}%, 墨 ${outsideInkShare.toFixed(1)}%) 正文色=${outside.filter(d=>d.textBearing).map(d=>d.hex+':'+d.inkShare+'%').join(',')||'无'}`);
  }

  await browser.close();
  srv.close();
  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, JSON.stringify({ generatedAt: new Date().toISOString(), viewport: VIEWPORT, rows }, null, 1), 'utf8');
  console.log('\n写到 ' + OUT);

  /* ── 汇总表 ─────────────────────────────────────────────────── */
  console.log('\n=== 判决表（集合外颜色是否视觉重要）===');
  console.log('案   声称 实画 集合外 外泄像素%  外泄墨%   集合外承担正文的色');
  for (const r of rows) {
    console.log(`${r.id}   ${String(r.claimedN).padStart(2)}   ${String(r.paintedN).padStart(3)}   ${String(r.outsideN).padStart(3)}   ${String(r.outsidePxShare).padStart(8)}   ${String(r.outsideInkShare).padStart(6)}   ${r.textBearingOutside.join(' ') || '—'}`);
  }
  const v = rows.filter(r => r.violates);
  console.log(`\n判定「集合外有正文/骨架作用色」的案：${v.length}/${rows.length} → ${v.map(r => r.id).join(' ')}`);
  const t = rows.filter(r => r.outsideInkShare >= 5);
  console.log(`判定「集合外颜色承担 ≥5% 墨迹」的案：${t.length}/${rows.length} → ${t.map(r => r.id + '(' + r.outsideInkShare + '%)').join(' ')}`);
};

main().catch(e => { console.error(e); process.exit(1); });
