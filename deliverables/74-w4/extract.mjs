#!/usr/bin/env node
/* 74-w4 needsJS classifier — Step 1: script evidence extraction.
 * Throwaway analysis tool. Reads each prototypes/Snn-slug (index.html + external .js),
 * splits inline <script> bodies with real line offsets, and fires a fixed
 * signal list. No hand-maintained per-scheme table.
 *
 * Run: node deliverables/74-w4/extract.mjs > deliverables/74-w4/script-signals.json
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = 'D:/Web/style';
const PROTO = path.join(ROOT, 'prototypes');

/* --- signal definitions ---------------------------------------------------
 * Every pattern carries: id, weight class, and a regex. We record every hit
 * with its absolute line number so the report can cite file:line.
 * CLASS is the key thing: geo = creates/measures DOM|SVG|canvas geometry,
 *                         motion = reads scroll/pointer and writes geometry,
 *                         chrome = UI state / IO reveal / boilerplate.
 */
const SIGNALS = [
  // ---- geometry synthesis ----
  { id: 'createElementNS', cls: 'geo', re: /createElementNS\s*\(/g,
    note: 'synthesises an SVG node — element does not exist in HTML source' },
  { id: 'createElement', cls: 'geo', re: /document\.createElement\s*\(/g,
    note: 'synthesises a DOM node' },
  { id: 'appendChild', cls: 'geo', re: /\.appendChild\s*\(|\.append\s*\(/g,
    note: 'attaches synthesised nodes (only counts alongside createElement)' },
  { id: 'setAttribute-d', cls: 'geo', re: /setAttribute\s*\(\s*['"]d['"]/g,
    note: 'writes a path d attribute' },
  { id: 'setAttribute-other', cls: 'geo',
    re: /setAttribute\s*\(\s*['"](?:transform|points|cx|cy|r|x|y|x1|x2|y1|y2|width|height|viewBox|offset|stop-color|opacity)['"]/g,
    note: 'writes a geometric SVG attribute' },
  { id: 'trig-coords', cls: 'geo',
    re: /Math\.(?:sin|cos|atan2|tan)\s*\(/g,
    note: 'trig used to compute coordinates' },
  // ---- geometry measurement ----
  { id: 'getBoundingClientRect', cls: 'geo', re: /getBoundingClientRect\s*\(/g,
    note: 'measures rendered boxes then presumably reflows' },
  { id: 'getComputedStyle', cls: 'geo', re: /getComputedStyle\s*\(/g,
    note: 'reads computed style' },
  { id: 'offsetWidth', cls: 'geo', re: /\.offset(?:Width|Height|Left|Top)\b/g,
    note: 'reads layout metric' },
  { id: 'clientWidth', cls: 'geo', re: /\.client(?:Width|Height)\b/g,
    note: 'reads layout metric' },
  { id: 'getTotalLength', cls: 'geo', re: /getTotalLength\s*\(|getPointAtLength\s*\(/g,
    note: 'reads path geometry' },
  { id: 'canvas', cls: 'geo',
    re: /getContext\s*\(\s*['"]2d['"]|\.fillRect\s*\(|\.arc\s*\(|\.moveTo\s*\(|\.lineTo\s*\(/g,
    note: 'draws into canvas / path API' },
  // ---- motion drivers ----
  { id: 'rAF', cls: 'motion', re: /requestAnimationFrame\s*\(/g,
    note: 'animation frame loop' },
  { id: 'scrollY', cls: 'motion',
    re: /(?:window\.)?(?:pageYOffset|scrollY)|documentElement\.scrollTop|\.scrollTop\b/g,
    note: 'reads scroll offset' },
  { id: 'on-scroll', cls: 'motion',
    re: /addEventListener\s*\(\s*['"]scroll['"]/g, note: 'scroll listener' },
  { id: 'on-pointer', cls: 'motion',
    re: /addEventListener\s*\(\s*['"](?:pointermove|mousemove|pointerdown|pointerup|touchmove|mouseenter)['"]/g,
    note: 'pointer listener' },
  { id: 'on-hover', cls: 'motion',
    re: /addEventListener\s*\(\s*['"](?:pointerenter|pointerleave|mouseenter|mouseleave)['"]/g,
    note: 'hover listener (class toggle unless it writes geometry)' },
  // ---- chrome ----
  { id: 'js-class', cls: 'chrome', re: /classList\.add\s*\(\s*['"]js['"]\s*\)/g,
    note: 'one-line js-detection boilerplate — NOT a signal' },
  { id: 'IntersectionObserver', cls: 'chrome', re: /IntersectionObserver/g,
    note: 'viewport reveal' },
  { id: 'reduced-motion', cls: 'chrome',
    re: /prefers-reduced-motion|matchMedia\s*\(/g, note: 'reduced-motion branch' },
  { id: 'click', cls: 'chrome', re: /addEventListener\s*\(\s*['"]click['"]/g,
    note: 'button / business state' },
  { id: 'submit', cls: 'chrome', re: /addEventListener\s*\(\s*['"]submit['"]/g,
    note: 'form' },
  { id: 'csv-export', cls: 'chrome',
    re: /text\/csv|Blob\s*\(|URL\.createObjectURL|download\s*=/g, note: 'CSV export' },
  { id: 'class-write', cls: 'chrome',
    re: /classList\.(?:add|remove|toggle)\s*\(/g, note: 'class state change' },
  { id: 'style-write', cls: 'motion',
    re: /\.style\.(?:transform|translate|left|top|width|height|setProperty)\b/g,
    note: 'writes inline geometry/transform from script' },
];

function lineIndex(src) {
  const idx = [0];
  for (let i = 0; i < src.length; i++) if (src.charCodeAt(i) === 10) idx.push(i + 1);
  return idx;
}
const lineAt = (idx, pos) => {
  let lo = 0, hi = idx.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (idx[mid] <= pos) lo = mid; else hi = mid - 1;
  }
  return lo + 1;
};

// Extract <script> blocks with a real offset, skipping src= external refs
// (those are read from disk separately so line numbers stay honest).
function inlineScripts(html) {
  const out = [];
  const re = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(html))) {
    const attrs = m[1] || '';
    const body = m[2] || '';
    const srcMatch = /src\s*=\s*["']([^"']+)["']/i.exec(attrs);
    const bodyStart = m.index + m[0].indexOf('>') + 1;
    out.push({ src: srcMatch ? srcMatch[1] : null, body, bodyStart });
  }
  return out;
}

function scan(label, src, startLine, idxOf) {
  const idx = idxOf(src);
  const hits = [];
  for (const s of SIGNALS) {
    s.re.lastIndex = 0;
    let m;
    while ((m = s.re.exec(src))) {
      hits.push({
        signal: s.id, cls: s.cls, line: startLine + lineAt(idx, m.index) - 1,
        text: src.slice(Math.max(0, m.index - 40), m.index + 80).replace(/\s+/g, ' ').trim(),
      });
      if (m.index === s.re.lastIndex) s.re.lastIndex++;
    }
  }
  return hits;
}

const schemes = fs.readdirSync(PROTO).filter((d) => /^S\d\d-/.test(d)).sort();
const result = [];

for (const dir of schemes) {
  const id = dir.slice(0, 3);
  const htmlPath = path.join(PROTO, dir, 'index.html');
  if (!fs.existsSync(htmlPath)) { result.push({ id, dir, error: 'no index.html' }); continue; }
  const html = fs.readFileSync(htmlPath, 'utf8');
  const blocks = inlineScripts(html);
  const htmlIdx = lineIndex(html);

  let allHits = [];
  const files = [];
  for (const b of blocks) {
    if (b.src) {
      const p = path.join(PROTO, dir, b.src.replace(/^\.\//, ''));
      files.push({ file: b.src, external: true, exists: fs.existsSync(p) });
      if (fs.existsSync(p)) {
        const js = fs.readFileSync(p, 'utf8');
        const h = scan(b.src, js, 1, lineIndex);
        allHits = allHits.concat(h.map((x) => ({ ...x, file: b.src })));
      }
    } else if (b.body.trim()) {
      const startLine = lineAt(htmlIdx, b.bodyStart);
      const h = scan('index.html', b.body, startLine, lineIndex);
      allHits = allHits.concat(h.map((x) => ({ ...x, file: 'index.html' })));
    }
  }

  // Aggregate: which signal ids fired, at which lines
  const bySignal = {};
  for (const h of allHits) {
    (bySignal[h.signal] ||= { cls: h.cls, lines: [] }).lines.push(`${h.file}:${h.line}`);
  }
  for (const k of Object.keys(bySignal)) {
    bySignal[k].lines = [...new Set(bySignal[k].lines)];
    bySignal[k].count = bySignal[k].lines.length;
  }

  const has = (k) => Object.prototype.hasOwnProperty.call(bySignal, k);
  const geoSignals = ['createElementNS', 'createElement', 'setAttribute-d', 'setAttribute-other',
    'trig-coords', 'getBoundingClientRect', 'getComputedStyle', 'offsetWidth', 'clientWidth',
    'getTotalLength', 'canvas'].filter(has);
  const motionSignals = ['rAF', 'scrollY', 'on-scroll', 'on-pointer', 'style-write'].filter(has);

  result.push({
    id, dir,
    scriptBlocks: blocks.length,
    emptyBlocks: blocks.filter((b) => !b.body.trim() && !b.src).length,
    externalFiles: files,
    scriptLines: allHits.length,
    bySignal, geoSignals, motionSignals,
    geoCount: geoSignals.length, motionCount: motionSignals.length,
    chromeOnly: geoSignals.length === 0 && motionSignals.length === 0,
  });
}

const outPath = path.join(ROOT, 'deliverables/74-w4/script-signals.json');
fs.writeFileSync(outPath, JSON.stringify(result, null, 2));
console.log(`wrote ${outPath}  (${result.length} schemes)`);
for (const r of result) {
  if (r.error) { console.log(`${r.id} ERROR ${r.error}`); continue; }
  console.log(`${r.id}  geo=[${r.geoSignals.join(',')}]  motion=[${r.motionSignals.join(',')}]  hits=${r.scriptLines}`);
}
