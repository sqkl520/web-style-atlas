#!/usr/bin/env node
/* 74-w4 needsJS classifier — Step 1d: geometry-mutation sites with TARGET selectors.
 * The predicate needs to know not just "JS writes geometry" but "JS writes geometry
 * to the element(s) the mechanism sentence is about".
 * For each scheme, list every site that creates or mutates DOM/SVG geometry,
 * with: file:line, the driver (nearest enclosing listener / rAF / IO),
 *       the target selector (what element it writes to),
 *       and the kind (synthesise | measure-rewrite | transform-knob | path-data).
 * Run: node deliverables/74-w4/sites.mjs
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = 'D:/Web/style';
const PROTO = path.join(ROOT, 'prototypes');

const CREATE = /createElementNS|createElement\s*\(|\.cloneNode\s*\(/;
const PATHWRITE = /setAttribute\s*\(\s*['"](?:d|points|transform|cx|cy|x|y|x1|x2|y1|y2|r|width|height|viewBox)['"]/;
const MEASURE = /getBoundingClientRect|getComputedStyle|\.offset(?:Width|Height|Left|Top)|\.client(?:Width|Height)|getTotalLength|getPointAtLength/;
const STYLEWRITE = /\.style\.(?:transform|left|top|width|height|filter|translate)\s*=|setProperty\s*\(\s*['"]--/;
const TRIG = /Math\.(?:sin|cos|atan2|tan)\s*\(/;

function driverAt(lines, i) {
  // walk outwards from line i, tracking brace-free heuristic: scan 60 lines back
  // and 60 forward for the nearest listener registration / rAF / IO at low indent
  const back = lines.slice(Math.max(0, i - 60), i).join('\n');
  const cands = [];
  const push = (re, tag) => { const m = back.match(re); if (m) cands.push({ tag, idx: m.index }); };
  push(/addEventListener\s*\(\s*['"]scroll|requestAnimationFrame/g, 'scroll/rAF');
  push(/addEventListener\s*\(\s*['"](?:pointermove|mousemove|pointerenter|pointerdown|mouseenter)/g, 'pointer');
  push(/IntersectionObserver/g, 'IO-reveal');
  push(/setTimeout|setInterval/g, 'timer');
  push(/addEventListener\s*\(\s*['"](?:click|change|submit|input|keydown)/g, 'ui-event');
  push(/addEventListener\s*\(\s*['"]resize|innerWidth/g, 'resize');
  if (!cands.length) return 'load';
  cands.sort((a, b) => b.idx - a.idx);
  return cands[0].tag;
}

// crude target extraction: identifier on the LHS of the write, resolved to the
// querySelector/getElementById that defined it earlier in the same script
function targetsFor(text, i) {
  const lines = text.split('\n');
  const upto = lines.slice(Math.max(0, i - 120), i + 1).join('\n');
  const line = lines[i] || '';
  const out = [];
  const lhs = line.match(/([A-Za-z_$][\w$]*)\s*\.\s*(?:style|setAttribute|classList)/);
  if (lhs) {
    const v = lhs[1];
    const defRe = new RegExp(`(?:var\\s+)?${v}\\s*=\\s*[^;]*?(?:querySelector(?:All)?|getElementById)\\s*\\(\\s*['"]([^'"]+)['"]`, 'g');
    for (const m of upto.matchAll(defRe)) out.push(m[1]);
    const selRe = new RegExp(`${v}\\s*=\\s*[^;]*?querySelector(?:All)?\\s*\\(\\s*['"]([^'"]+)['"]`, 'g');
    for (const m of upto.matchAll(selRe)) out.push(m[1]);
  }
  const inline = line.match(/querySelector(?:All)?\s*\(\s*['"]([^'"]+)['"]\s*\)\s*\.\s*(?:style|setAttribute)/);
  if (inline) out.push(inline[1]);
  return [...new Set(out)];
}

const schemes = fs.readdirSync(PROTO).filter((d) => /^S\d\d-/.test(d)).sort();
const all = [];

for (const dir of schemes) {
  const id = dir.slice(0, 3);
  const html = fs.readFileSync(path.join(PROTO, dir, 'index.html'), 'utf8');
  const sources = [];
  {
    const re = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
    let m;
    while ((m = re.exec(html))) {
      const srcM = /src\s*=\s*["']([^"']+)["']/i.exec(m[1] || '');
      if (srcM) {
        const p = path.join(PROTO, dir, srcM[1].replace(/^\.\//, ''));
        if (fs.existsSync(p)) sources.push({ name: srcM[1], text: fs.readFileSync(p, 'utf8'), start: 1 });
      } else {
        const start = html.slice(0, m.index + m[0].indexOf('>') + 1).split('\n').length;
        sources.push({ name: 'index.html', text: m[2], start });
      }
    }
  }

  const sites = [];
  for (const s of sources) {
    const lines = s.text.split('\n');
    lines.forEach((line, i) => {
      const kinds = [];
      if (CREATE.test(line)) kinds.push('synthesise');
      if (PATHWRITE.test(line)) kinds.push('path-data');
      if (MEASURE.test(line)) kinds.push('measure');
      if (STYLEWRITE.test(line)) kinds.push('style-knob');
      if (TRIG.test(line)) kinds.push('trig');
      if (!kinds.length) return;
      sites.push({
        at: `${s.name}:${s.start + i}`,
        kinds, driver: driverAt(lines, i), targets: targetsFor(s.text, i),
        code: line.trim().slice(0, 120),
      });
    });
  }
  all.push({ id, scriptCount: sources.length, scriptLines: sources.reduce((a, s) => a + s.text.split('\n').length, 0), sites });
}

fs.writeFileSync(path.join(ROOT, 'deliverables/74-w4/sites.json'), JSON.stringify(all, null, 2));
console.log('wrote sites.json');
for (const r of all) {
  const synth = r.sites.filter((s) => s.kinds.includes('synthesise') || s.kinds.includes('path-data'));
  const knob = r.sites.filter((s) => s.kinds.includes('style-knob'));
  console.log(`${r.id} lines=${r.scriptLines} sites=${r.sites.length} synth/path=${synth.length} knob=${knob.length}`);
}
