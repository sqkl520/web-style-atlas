#!/usr/bin/env node
/* 74-w4 needsJS classifier — Step 1c: "does JS write geometry, and to what?"
 * For every setProperty('--x') in a scheme's scripts, find whether style.css
 * consumes --x inside a GEOMETRIC property (transform / translate / left / top /
 * width / height / clip-path / offset). If yes, JS is steering real geometry
 * through a CSS knob — the "B" shape. If the var is only for colour/opacity it
 * is decoration, not geometry.
 * Also classifies each geometry-writing call site by its DRIVER, by looking at
 * the ~25 lines of enclosing function / nearest listener registration.
 * Run: node deliverables/74-w4/vars.mjs
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = 'D:/Web/style';
const PROTO = path.join(ROOT, 'prototypes');

const GEOM_PROPS = /(?:^|[\s;{])(?:transform|translate|left|top|right|bottom|margin(?:-left|-top|-right|-bottom)?|width|height|inset|grid-column|clip-path|offset-distance|filter)\s*:[^;}]*var\(\s*--%V%\s*[,)]/i;

function cssConsumers(css, varName) {
  const out = [];
  const esc = varName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`(?:transform|translate|left|top|right|bottom|margin(?:-left|-top|-right|-bottom)?|width|height|inset|grid-column|clip-path|offset-distance|filter)\\s*:[^;}]*var\\(\\s*--${esc}\\s*[,)]`, 'gi');
  for (const m of css.matchAll(re)) {
    out.push({ line: css.slice(0, m.index).split('\n').length, decl: m[0].replace(/\s+/g, ' ').slice(0, 90) });
  }
  return out;
}
function cssNonGeom(css, varName) {
  const esc = varName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`([a-z-]+)\\s*:[^;}]*var\\(\\s*--${esc}\\s*[,)]`, 'gi');
  return [...css.matchAll(re)].map((m) => ({ prop: m[1], line: css.slice(0, m.index).split('\n').length }));
}

const schemes = fs.readdirSync(PROTO).filter((d) => /^S\d\d-/.test(d)).sort();
const report = [];

for (const dir of schemes) {
  const id = dir.slice(0, 3);
  const html = fs.readFileSync(path.join(PROTO, dir, 'index.html'), 'utf8');
  const cssPath = path.join(PROTO, dir, 'style.css');
  const css = fs.existsSync(cssPath) ? fs.readFileSync(cssPath, 'utf8') : '';

  // gather script sources with origin offset
  const sources = [];
  {
    const re = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
    let m;
    while ((m = re.exec(html))) {
      const srcM = /src\s*=\s*["']([^"']+)["']/i.exec(m[1] || '');
      if (srcM) {
        const p = path.join(PROTO, dir, srcM[1].replace(/^\.\//, ''));
        if (fs.existsSync(p)) sources.push({ name: srcM[1], text: fs.readFileSync(p, 'utf8') });
      } else sources.push({ name: 'index.html', text: m[2], startLine: html.slice(0, m.index + m[0].indexOf('>') + 1).split('\n').length });
    }
  }

  const vars = new Map(); // varName -> {writes:[{file,line,driver}], cssGeom:[], cssOther:[]}
  for (const s of sources) {
    const lines = s.text.split('\n');
    lines.forEach((line, i) => {
      for (const m of line.matchAll(/setProperty\s*\(\s*['"]--([a-z0-9-]+)['"]/gi)) {
        const v = m[1];
        const absLine = (s.startLine || 1) + i;
        // driver: scan backwards up to 40 lines for a listener / rAF / IO / setTimeout
        const ctx = lines.slice(Math.max(0, i - 40), i + 1).join('\n');
        let driver = 'unknown';
        if (/addEventListener\s*\(\s*['"]scroll|requestAnimationFrame/.test(ctx)) driver = 'scroll/rAF';
        else if (/pointermove|mousemove|pointerenter|pointerdown|mouseenter/.test(ctx)) driver = 'pointer';
        else if (/IntersectionObserver|rootMargin/.test(ctx)) driver = 'IO-reveal';
        else if (/setTimeout|setInterval/.test(ctx)) driver = 'timer';
        else if (/addEventListener\s*\(\s*['"](?:change|click|submit|input)/.test(ctx)) driver = 'ui-event';
        else if (/addEventListener\s*\(\s*['"]resize|innerWidth|innerHeight/.test(ctx)) driver = 'resize';
        if (!vars.has(v)) vars.set(v, { writes: [], cssGeom: [], cssOther: [] });
        vars.get(v).writes.push({ file: s.name, line: absLine, driver });
      }
    });
  }
  for (const [v, rec] of vars) {
    rec.cssGeom = cssConsumers(css, v);
    rec.cssOther = cssNonGeom(css, v).filter((x) => !/^(?:transform|translate|left|top|right|bottom|margin|width|height|inset|grid-column|clip-path|filter)/.test(x.prop));
  }

  // also count direct inline style geometry writes (style.transform = ...)
  const directGeom = [];
  for (const s of sources) {
    s.text.split('\n').forEach((line, i) => {
      if (/\.style\.(?:transform|left|top|width|height|translate|filter)\s*=/.test(line)) {
        directGeom.push({ file: s.name, line: (s.startLine || 1) + i, code: line.trim().slice(0, 110) });
      }
    });
  }

  report.push({
    id,
    varKnobs: [...vars.entries()].map(([v, r]) => ({
      var: v,
      writes: r.writes.slice(0, 6),
      driveCount: [...new Set(r.writes.map((w) => w.driver))],
      cssGeomConsumers: r.cssGeom.slice(0, 5),
      cssOtherProps: [...new Set(r.cssOther.map((x) => x.prop))],
    })),
    directGeomWrites: directGeom.slice(0, 8),
  });
}

fs.writeFileSync(path.join(ROOT, 'deliverables/74-w4/vars.json'), JSON.stringify(report, null, 2));
console.log('wrote vars.json\n');
for (const r of report) {
  const geomVars = r.varKnobs.filter((k) => k.cssGeomConsumers.length);
  const decoVars = r.varKnobs.filter((k) => !k.cssGeomConsumers.length);
  console.log(`${r.id}  geomVars=[${geomVars.map((k) => k.var + '<' + k.driveCount.join('|') + '>').join(' ')}]  decoVars=[${decoVars.map((k) => k.var).join(',')}]  direct=[${r.directGeomWrites.map((d) => d.line).join(',')}]`);
}
