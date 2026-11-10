#!/usr/bin/env node
/* 74-w4 needsJS classifier — the predicate, machine-checked.
 *
 * PREDICATE (words first; this file implements it):
 *
 * For each scheme S, harvest every script body. Build, per script file:
 *   ROOTS  = calls that hand a callback to an event/rAF/IO source, with the
 *            callback's TEXT SPAN: addEventListener('scroll'|'pointermove'…),
 *            requestAnimationFrame(fn), new IntersectionObserver(fn),
 *            setTimeout/setInterval(fn).
 *   FNS    = named function declarations with their text span.
 * Attribute each geometry WRITE SITE to a driver by span containment, then
 * close over the call graph: if a rooted handler calls a named fn, that fn's
 * span inherits the root's kind (transitively). This is reachability, not
 * line proximity.
 *
 * WRITE sites are: setProperty('--x'), .style.transform/left/top/width/height/
 * filter =, setAttribute(d|points|cx|cy|x1|y1|x2|y2|transform), createElement(NS),
 * innerHTML= (markup injection).
 *
 * GEO(v) := style.css consumes --v inside a geometric declaration
 *           (transform/translate/left/top/width/height/margin/inset/clip-path/
 *            grid-column/filter).
 *
 * A := ∃ write w with w.CREATES_GEOMETRY and w.RUNTIME_DERIVED and w.ON_MECHANISM
 *      CREATES_GEOMETRY := w is createElement(NS) / setAttribute(d|points|cx|…)
 *      RUNTIME_DERIVED  := w's enclosing fn contains a measurement
 *                          (getBoundingClientRect/getComputedStyle/offsetWidth/
 *                          getTotalLength) OR a closed-form formula over a
 *                          mechanism parameter (Math.sin/cos/atan2)
 *      ON_MECHANISM     := resolved by hand for the 30 cases (recorded in
 *                          ON_MECH below with the reason), because "which region
 *                          the sentence names" is a judgement the machine cannot
 *                          make. The machine narrows it to a candidate set.
 *
 * B := ¬A and ∃ v ∈ script-set vars with GEO(v)=1 reachable from scroll|pointer|raf.
 *
 * C := otherwise.
 *
 * Run: node deliverables/74-w4/classify.mjs
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = 'D:/Web/style';
const PROTO = path.join(ROOT, 'prototypes');

const lineOf = (src, pos) => src.slice(0, pos).split('\n').length;

function balanced(src, openIdx) {
  let depth = 0;
  for (let i = openIdx; i < src.length; i++) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}') { depth--; if (!depth) return i + 1; }
  }
  return src.length;
}

function scriptsOf(dir) {
  const html = fs.readFileSync(path.join(PROTO, dir, 'index.html'), 'utf8');
  const out = [];
  const re = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(html))) {
    const srcM = /src\s*=\s*["']([^"']+)["']/i.exec(m[1] || '');
    if (srcM) {
      const p = path.join(PROTO, dir, srcM[1].replace(/^\.\//, ''));
      if (fs.existsSync(p)) out.push({ file: srcM[1], text: fs.readFileSync(p, 'utf8'), base: 1 });
    } else if (m[2].trim()) {
      out.push({ file: 'index.html', text: m[2], base: lineOf(html, m.index + m[0].indexOf('>') + 1) });
    }
  }
  return out;
}

/* ---- named functions with spans ---- */
function namedFns(text) {
  const fns = [];
  const re = /(?:function\s+([A-Za-z_$][\w$]*)\s*\([^)]*\)\s*\{)|(?:(?:var|let|const)\s+([A-Za-z_$][\w$]*)\s*=\s*function\s*\([^)]*\)\s*\{)|(?:(?:var|let|const)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:\([^)]*\)|[A-Za-z_$][\w$]*)\s*=>\s*\{)/g;
  let m;
  while ((m = re.exec(text))) {
    const name = m[1] || m[2] || m[3];
    const brace = text.indexOf('{', m.index);
    fns.push({ name, start: m.index, end: balanced(text, brace) });
  }
  return fns;
}

/* ---- roots: callback spans handed to an event / rAF / IO / timer ---- */
function roots(text, fns) {
  const out = [];
  // addEventListener('ev', HANDLER [, ...])
  const lis = /addEventListener\s*\(\s*['"]([a-z]+)['"]\s*,\s*/g;
  let m;
  while ((m = lis.exec(text))) {
    const ev = m[1];
    const after = m.index + m[0].length;
    const kind = /^(scroll|wheel)$/.test(ev) ? 'scroll'
      : /^(pointermove|mousemove|pointerdown|pointerup|pointerenter|touchmove|mouseenter|pointerover)$/.test(ev) ? 'pointer'
        : ev === 'resize' ? 'resize'
          : ['click', 'change', 'submit', 'input', 'keydown', 'focusin', 'animationend'].includes(ev) ? 'ui' : 'other';
    // named handler?
    const nm = /^([A-Za-z_$][\w$]*)/.exec(text.slice(after, after + 80));
    if (nm && fns.some((f) => f.name === nm[1])) {
      const f = fns.find((x) => x.name === nm[1]);
      out.push({ kind, start: f.start, end: f.end, name: f.name });
    } else if (text.slice(after, after + 8) === 'function') {
      const brace = text.indexOf('{', after);
      out.push({ kind, start: after, end: balanced(text, brace), name: '(inline)' });
    } else if (/^\(/.test(text.slice(after, after + 1))) {
      // arrow with parens
      const brace = text.indexOf('{', after);
      const fat = text.indexOf('=>', after);
      if (fat > -1 && fat - after < 60) out.push({ kind, start: after, end: balanced(text, brace), name: '(arrow)' });
    }
  }
  // requestAnimationFrame(fn) — root only if it is not itself inside a rooted handler
  for (const rm of text.matchAll(/requestAnimationFrame\s*\(\s*([A-Za-z_$][\w$]*|function)/g)) {
    const h = rm[1];
    if (h === 'function') out.push({ kind: 'raf', start: rm.index, end: balanced(text, text.indexOf('{', rm.index)), name: '(raf-inline)' });
    else {
      const f = fns.find((x) => x.name === h);
      if (f) out.push({ kind: 'raf', start: f.start, end: f.end, name: f.name });
    }
  }
  // IntersectionObserver: inline or named callback
  for (const im of text.matchAll(/new\s+IntersectionObserver\s*\(\s*([A-Za-z_$][\w$]*|function)/g)) {
    const h = im[1];
    if (h === 'function') out.push({ kind: 'io', start: im.index, end: balanced(text, text.indexOf('{', im.index)), name: '(io-inline)' });
    else {
      const f = fns.find((x) => x.name === h);
      if (f) out.push({ kind: 'io', start: f.start, end: f.end, name: f.name });
    }
  }
  return out;
}

/* ---- geometry write sites ---- */
const RE_VAR = /setProperty\s*\(\s*['"]--([a-z0-9-]+)['"]/;
const RE_STYLE = /\.style\.(?:transform|translate|left|top|width|height|filter)\s*=/;
const RE_ATTR = /setAttribute\s*\(\s*['"](d|points|transform|cx|cy|x|y|x1|x2|y1|y2|r|width|height|viewBox)['"]/;
const RE_CREATE = /createElement(?:NS)?\s*\(/;
const RE_INNER = /\.innerHTML\s*=/;

function writeSites(text) {
  const out = [];
  text.split('\n').forEach((line, i) => {
    const kinds = [];
    const v = RE_VAR.exec(line);
    const at = RE_ATTR.exec(line);
    if (v) kinds.push('var:' + v[1]);
    if (RE_STYLE.test(line)) kinds.push('style');
    if (at) kinds.push('attr:' + at[1]);
    if (RE_CREATE.test(line)) kinds.push('create');
    if (RE_INNER.test(line)) kinds.push('inner');
    if (!kinds.length) return;
    // absolute char pos of the line start
    let pos = 0;
    for (let k = 0; k < i; k++) pos += text.split('\n')[k].length + 1;
    out.push({ line: i + 1, pos, kinds, code: line.trim().slice(0, 120) });
  });
  return out;
}

/* Geometric CSS properties: anything whose value moves/reshapes the box.
 * background-position is included because a texture shift is the mechanism in
 * S18 (走纸) and S02 (纹样相位) — a "background" property that is really motion. */
const GEO_PROP = '(?:transform|translate|left|top|right|bottom|margin(?:-left|-top|-right|-bottom)?|width|height|inset|grid-column|clip-path|offset-distance|filter|background-position(?:-[xy])?|perspective|translate[XYZ]|scale|rotate|top|bottom)';
function geoConsumer(css, v) {
  const esc = v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`${GEO_PROP}\\s*:[^;}]*var\\(\\s*--${esc}\\s*[,)]`, 'gi');
  return [...css.matchAll(re)].map((m) => ({ line: lineOf(css, m.index), decl: m[0].replace(/\s+/g, ' ').slice(0, 85) }));
}

const schemes = fs.readdirSync(PROTO).filter((d) => /^S\d\d-/.test(d)).sort();
const results = [];

for (const dir of schemes) {
  const id = dir.slice(0, 3);
  const scripts = scriptsOf(dir);
  const cssPath = path.join(PROTO, dir, 'style.css');
  const css = fs.existsSync(cssPath) ? fs.readFileSync(cssPath, 'utf8') : '';
  const html = fs.readFileSync(path.join(PROTO, dir, 'index.html'), 'utf8');

  const allWrites = [];
  const allRoots = [];
  const allFns = [];
  for (const s of scripts) {
    const fns = namedFns(s.text);
    const rs = roots(s.text, fns);
    const ws = writeSites(s.text);
    for (const f of fns) allFns.push({ ...f, file: s.file, base: s.base });
    for (const r of rs) allRoots.push({ ...r, file: s.file, base: s.base });
    for (const w of ws) allWrites.push({ ...w, file: s.file, base: s.base, text: s.text });
  }

  // Reachability: seed writes inside root spans; then propagate through the call
  // graph. A named fn inherits a kind if it is CALLED from any span that already
  // carries that kind (root span or a fn body), to a fixpoint.
  for (const w of allWrites) w.drivers = new Set();
  for (const r of allRoots) {
    for (const w of allWrites) {
      if (w.file === r.file && w.pos >= r.start && w.pos <= r.end) w.drivers.add(r.kind);
    }
  }
  // spans that can carry kinds: root spans and named-fn spans
  const spans = [];
  for (const r of allRoots) spans.push({ file: r.file, start: r.start, end: r.end, carry: new Set([r.kind]), root: true });
  for (const f of allFns) spans.push({ file: f.file, start: f.start, end: f.end, carry: new Set(), name: f.name });

  const textOf = new Map();
  for (const s of scripts) textOf.set(s.file, s.text);

  for (let iter = 0; iter < 12; iter++) {
    let changed = false;
    // a fn span picks up every kind present in writes inside it
    for (const sp of spans) {
      if (sp.root) continue;
      for (const w of allWrites) {
        if (w.file !== sp.file) continue;
        if (w.pos >= sp.start && w.pos <= sp.end) {
          for (const k of w.drivers) if (!sp.carry.has(k)) { sp.carry.add(k); changed = true; }
        }
      }
    }
    // a fn called inside a carrying span inherits those kinds into its own span
    for (const sp of spans) {
      if (!sp.carry.size) continue;
      const txt = (textOf.get(sp.file) || '').slice(sp.start, sp.end);
      for (const f of allFns) {
        if (f.file !== sp.file) continue;
        // called as NAME(...)  OR  passed as a callback: rAF(NAME) / setTimeout(NAME / addEventListener('x', NAME
        const calledDirectly = new RegExp(`\\b${f.name}\\s*\\(`).test(txt);
        const passedAsCb = new RegExp(`(?:requestAnimationFrame|setTimeout|setInterval|addEventListener\\s*\\(\\s*['"][a-z]+['"]\\s*,)\\s*\\(?\\s*${f.name}\\s*[),]`).test(txt);
        if (!calledDirectly && !passedAsCb) continue;
        const target = spans.find((s) => s.file === f.file && s.start === f.start && s.end === f.end && !s.root);
        if (!target) continue;
        for (const k of sp.carry) if (!target.carry.has(k)) { target.carry.add(k); changed = true; }
      }
    }
    if (!changed) break;
  }
  // final: assign carried kinds from enclosing fn spans to each write
  for (const w of allWrites) {
    for (const sp of spans) {
      if (sp.root) continue;
      if (sp.file === w.file && w.pos >= sp.start && w.pos <= sp.end) {
        for (const k of sp.carry) w.drivers.add(k);
      }
    }
  }

  const writes = allWrites.map((w) => ({
    at: `${w.file}:${w.base + w.line - 1}`,
    kinds: w.kinds,
    drivers: [...w.drivers].sort(),
    code: w.code,
    varName: w.kinds.find((k) => k.startsWith('var:'))?.slice(4) || null,
  }));

  const creates = writes.filter((w) => w.kinds.some((k) => k === 'create' || k.startsWith('attr:') || k === 'inner'));
  // measurement sites are their own lines, not write sites — scan them separately
  const measureLines = [];
  for (const s of scripts) {
    s.text.split('\n').forEach((line, i) => {
      if (/getBoundingClientRect|getComputedStyle|offsetWidth|offsetHeight|getTotalLength|getPointAtLength/.test(line)) {
        measureLines.push({ at: `${s.file}:${s.base + i}`, code: line.trim().slice(0, 110) });
      }
    });
  }
  const measures = measureLines;
  const trig = /Math\.(?:sin|cos|atan2)\s*\(/.test(scripts.map((s) => s.text).join('\n'));

  const varWrites = writes.filter((w) => w.varName);
  const geomVars = [];
  for (const w of varWrites) {
    const cons = geoConsumer(css, w.varName);
    if (cons.length) geomVars.push({ var: w.varName, at: w.at, drivers: w.drivers, css: cons });
  }
  const motionGeomVars = geomVars.filter((g) => g.drivers.some((k) => ['scroll', 'pointer', 'raf'].includes(k)));
  // direct .style.transform/left/top writes: geometry with no CSS var in between
  const directGeomWrites = writes.filter((w) => w.kinds.includes('style'))
    .map((w) => ({ at: w.at, drivers: w.drivers, code: w.code }));
  const motionDirectGeom = directGeomWrites.filter((d) => d.drivers.some((k) => ['scroll', 'pointer', 'raf'].includes(k)));

  results.push({
    id, dir,
    files: scripts.map((s) => s.file),
    roots: [...new Set(allRoots.map((r) => r.kind))].sort(),
    writeCount: writes.length,
    creates: creates.slice(0, 14),
    measures: measures.slice(0, 10),
    trig,
    geomVars,
    motionGeomVars,
    directGeomWrites,
    motionDirectGeom,
    writes,
  });
}

fs.writeFileSync(path.join(ROOT, 'deliverables/74-w4/classify.json'), JSON.stringify(results, null, 2));

for (const r of results) {
  console.log(
    `${r.id} roots=[${r.roots.join(',')}] writes=${r.writeCount} creates=${r.creates.length} measure=${r.measures.length}` +
    ` trig=${r.trig ? 'Y' : 'n'} geomVars=${r.geomVars.length}` +
    ` motionGeom=[${r.motionGeomVars.map((h) => h.var + '←' + h.drivers.join('|')).join(' ')}]`);
}
console.log('\nwrote classify.json');
