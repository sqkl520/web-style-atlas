// 任务 B：字号层级。按**文本节点**逐段量，不按元素 —— 一个 <p> 里可以有 <strong>、<code>、
// <span class="meta"> 三种字号，元素级会全部塌成最外层的字号（这是上一轮的错法）。
//
// 口径：
//  - 单位是「字符数」而不是节点数：一个 2000 字的正文段落与一个 3 字的标签，
//    对「这页看起来多大字」的贡献完全不同。
//  - 只统计「可见 + 有墨迹矩形」的文本节点。
//  - 用途判定：先看元素语义（h1..h6 / p / li / button / code / label…），
//    再看 class 名里的词根（meta|label|caption|kicker|cap|note|fig…），最后看字号在页面里的分位。
import { startServer, launch, gotoStable, cases, writeJson, sleep } from './lib.mjs';
import { HELPERS } from './inpage.mjs';

const PORT = 8620;
const VP = process.argv.includes('--vp768') ? { w: 768, h: 1024 } : { w: 1440, h: 900 };

const COLLECT_TEXT = String.raw`
(function () {
  const M = window.__M;
  const out = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
    acceptNode: function (n) {
      if (!n.nodeValue || !n.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    }
  });
  let node;
  while ((node = walker.nextNode())) {
    const el = node.parentElement;
    if (!el) continue;
    if (!M.vis(el)) continue;
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') continue;
    const rg = document.createRange();
    rg.selectNodeContents(node);
    const rects = rg.getClientRects();
    let ink = 0, wsum = 0;
    for (const r of rects) if (r.width > 0 && r.height > 0) { ink += r.width * r.height; wsum += r.width; }
    if (ink <= 0) continue;
    const t = node.nodeValue.replace(/\s+/g, ' ').trim();
    out.push({
      text: t,
      chars: t.length,
      px: parseFloat(cs.fontSize),
      font: cs.fontFamily.split(',')[0].replace(/["']/g, '').trim(),
      weight: cs.fontWeight,
      lineHeight: cs.lineHeight,
      letterSpacing: cs.letterSpacing,
      color: cs.color,
      tag: el.tagName.toLowerCase(),
      cls: (el.getAttribute('class') || '').slice(0, 40),
      // 祖先里最近的一个标题/语义容器，帮助判用途
      anc: (function () {
        let p = el, hops = 0;
        while (p && p !== document.body && hops < 3) {
          const c = (p.getAttribute && p.getAttribute('class') || '');
          if (/^(h[1-6])$/.test(p.tagName.toLowerCase()) || c) return p.tagName.toLowerCase() + (c ? '.' + c.split(/\s+/)[0] : '');
          p = p.parentElement; hops++;
        }
        return '';
      })(),
      ink: ink,
      inkW: wsum,
    });
  }
  return { nodes: out, dpr: devicePixelRatio, vw: innerWidth };
})()
`;

function classifyUse(level, all) {
  const t = level.tag;
  const cls = (level.sampleCls || '').toLowerCase();
  const anc = (level.sampleAnc || '').toLowerCase();
  if (/^h1$/.test(t)) return '标题 H1';
  if (/^h2$/.test(t)) return '小标题 H2';
  if (/^h3$/.test(t)) return '小标题 H3';
  if (/^h[4-6]$/.test(t)) return '小标题 H4-6';
  if (/^(button|a)$/.test(t) || /btn|button|cta/.test(cls + anc)) return '按钮/链接';
  if (/^(code|kbd|samp|pre)$/.test(t) || /mono|num|code/.test(cls + anc)) return '等宽数据';
  if (/^(label|figcaption|th|dt)$/.test(t)) return '标签';
  if (/meta|kicker|eyebrow|cap|caption|note|foot|small|credit|src/.test(cls + anc)) return '元信息';
  if (/^(li|dd)$/.test(t)) return '列表项';
  return '正文';
}

const server = await startServer(PORT);
const browser = await launch();
const page = await browser.newPage();
await page.setViewport({ width: VP.w, height: VP.h, mobile: false });

const result = {};
for (const c of cases()) {
  await gotoStable(page, `http://127.0.0.1:${PORT}/prototypes/${c.dir}/index.html`, 1000);
  const d = await page.eval(HELPERS + COLLECT_TEXT);
  if (!d || !d.nodes) { console.log(c.id + ': 失败'); continue; }
  const nodes = d.nodes.filter((n) => n.chars > 0 && n.px > 0);

  // 按 px 聚合
  const byPx = new Map();
  for (const n of nodes) {
    const k = Math.round(n.px * 100) / 100;
    let e = byPx.get(k);
    if (!e) { e = { px: k, chars: 0, nodes: 0, ink: 0, uses: {}, fonts: {}, weights: {}, samples: [], colors: {} }; byPx.set(k, e); }
    e.chars += n.chars; e.nodes++; e.ink += n.ink;
    e.fonts[n.font] = (e.fonts[n.font] || 0) + n.chars;
    e.weights[n.weight] = (e.weights[n.weight] || 0) + n.chars;
    e.colors[n.color] = (e.colors[n.color] || 0) + n.chars;
    if (e.samples.length < 3 && n.chars >= 6) e.samples.push(n.text.slice(0, 40));
    const u = classifyUse({ tag: n.tag, sampleCls: n.cls, sampleAnc: n.anc }, null);
    e.uses[u] = (e.uses[u] || 0) + n.chars;
  }
  const totalChars = [...byPx.values()].reduce((s, e) => s + e.chars, 0);
  const levels = [...byPx.values()].sort((a, b) => b.px - a.px).map((e) => {
    const useTop = Object.entries(e.uses).sort((a, b) => b[1] - a[1]);
    return {
      px: e.px,
      chars: e.chars,
      share: +(e.chars / totalChars).toFixed(4),
      nodes: e.nodes,
      inkShare: +(e.ink / [...byPx.values()].reduce((s, x) => s + x.ink, 0)).toFixed(4),
      use: useTop[0] ? useTop[0][0] : '?',
      useMix: e.uses,
      font: Object.entries(e.fonts).sort((a, b) => b[1] - a[1])[0][0],
      weights: Object.keys(e.weights),
      colors: Object.keys(e.colors),
      samples: e.samples,
    };
  });

  const h1el = await page.eval(`(() => {
    const h = document.querySelector('h1');
    if (!h) return null;
    const cs = getComputedStyle(h);
    return { text: h.textContent.replace(/\\s+/g,' ').trim().slice(0,60), px: parseFloat(cs.fontSize),
             font: cs.fontFamily.split(',')[0].replace(/["']/g,'').trim(), weight: cs.fontWeight,
             lh: cs.lineHeight, ls: cs.letterSpacing };
  })()`);

  // 正文主力档：字符数最多的那一档
  const bodyLevel = levels.slice().sort((a, b) => b.chars - a.chars)[0];
  result[c.id] = {
    id: c.id, dir: c.dir, viewport: VP,
    totalChars, distinct: levels.length,
    levels,
    bodyPx: bodyLevel ? bodyLevel.px : null,
    h1: h1el,
    ramp: levels.map((l) => l.px),
    // 「层级跨度」：最大字 / 正文主力字
    ratioMaxToBody: levels.length && bodyLevel ? +(levels[0].px / bodyLevel.px).toFixed(2) : null,
    tinyChars: levels.filter((l) => l.px < 11).reduce((s, l) => s + l.chars, 0),
  };
  console.log(`${c.id}: ${levels.length} 档, 总字符 ${totalChars}, 正文 ${bodyLevel ? bodyLevel.px : '?'}px, 最大 ${levels[0].px}px, H1 ${h1el ? h1el.px : '-'}px`);
}

writeJson(VP.w === 768 ? 'typescale-30-768.json' : 'typescale-30.json', result);
console.log(`\n完成 ${Object.keys(result).length} 案`);
await browser.close();
server.close();
