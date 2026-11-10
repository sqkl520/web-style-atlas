#!/usr/bin/env node
/* 74-w4 needsJS classifier — Step 1b: structural evidence.
 * For each scheme, answer three machine-checkable questions:
 *   Q1  Does index.html contain an EMPTY svg/canvas that script must fill?
 *   Q2  Do hand-authored <path d="..."> / <polygon points="..."> exist in HTML?
 *   Q3  How much of the geometry is declared in style.css (custom props / calc)?
 *       -> count CSS transform/left/top/width/grid-column writebacks driven by
 *          a --var that script sets (means: CSS owns geometry, JS only turns a knob)
 * Run: node deliverables/74-w4/structure.mjs
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = 'D:/Web/style';
const PROTO = path.join(ROOT, 'prototypes');

const schemes = fs.readdirSync(PROTO).filter((d) => /^S\d\d-/.test(d)).sort();
const rows = [];

for (const dir of schemes) {
  const id = dir.slice(0, 3);
  const htmlPath = path.join(PROTO, dir, 'index.html');
  const cssPath = path.join(PROTO, dir, 'style.css');
  const html = fs.existsSync(htmlPath) ? fs.readFileSync(htmlPath, 'utf8') : '';
  const css = fs.existsSync(cssPath) ? fs.readFileSync(cssPath, 'utf8') : '';
  const lines = html.split('\n');

  // Q1: empty svg / canvas containers (script must populate)
  const emptySvg = [];
  lines.forEach((l, i) => {
    if (/<svg\b[^>]*>\s*<\/svg>/i.test(l)) emptySvg.push(i + 1);
    if (/<canvas\b[^>]*>\s*<\/canvas>/i.test(l)) emptySvg.push(i + 1);
  });

  // svg with only a defs/pattern and no path => also needs synthesis
  const svgOpen = (html.match(/<svg\b/gi) || []).length;
  const pathDs = [...html.matchAll(/<path\b[^>]*\sd\s*=\s*["'][^"']+["']/gi)].map((m) =>
    html.slice(0, m.index).split('\n').length);
  const polygons = [...html.matchAll(/<polygon\b[^>]*\spoints\s*=/gi)].map((m) =>
    html.slice(0, m.index).split('\n').length);
  const circles = [...html.matchAll(/<circle\b[^>]*\sr\s*=/gi)].map((m) =>
    html.slice(0, m.index).split('\n').length);

  // Q2: hand-written path `d` complexity — count coordinate pairs in the longest d
  let longestD = 0, longestDLine = 0;
  for (const m of html.matchAll(/<path\b[^>]*\sd\s*=\s*["']([^"']+)["']/gi)) {
    const n = (m[1].match(/[-\d.]+[ ,]+[-\d.]+/g) || []).length;
    if (n > longestD) { longestD = n; longestDLine = html.slice(0, m.index).split('\n').length; }
  }

  // Q3: CSS ownership — vars that script sets, and whether CSS consumes them in geometry
  const cssVarDefs = [...new Set([...css.matchAll(/--([a-z0-9-]+)\s*:/gi)].map((m) => m[1]))];
  const scriptVars = new Set();
  // inline script bodies only
  for (const m of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)) {
    for (const v of m[1].matchAll(/setProperty\s*\(\s*['"]--([a-z0-9-]+)['"]/gi)) scriptVars.add(v[1]);
    for (const v of m[1].matchAll(/style\.setProperty\s*\(\s*['"]--([a-z0-9-]+)['"]/gi)) scriptVars.add(v[1]);
  }
  const extJs = path.join(PROTO, dir, 'app.js');
  if (fs.existsSync(extJs)) {
    const js = fs.readFileSync(extJs, 'utf8');
    for (const v of js.matchAll(/setProperty\s*\(\s*['"]--([a-z0-9-]+)['"]/gi)) scriptVars.add(v[1]);
  }
  // does CSS use those vars inside a geometric property?
  const geomConsumers = [];
  for (const v of scriptVars) {
    const re = new RegExp(`(?:transform|translate|left|top|margin|width|height|inset|grid-column|clip-path|offset-distance)[^;{}]*var\\(\\s*--${v.replace(/[-]/g, '\\-')}\\s*\\)`, 'gi');
    const hits = [...css.matchAll(re)].map((m) => css.slice(0, m.index).split('\n').length);
    if (hits.length) geomConsumers.push({ var: v, lines: hits.slice(0, 6) });
  }

  // CSS keyframes count (pure-CSS motion available)
  const keyframes = [...css.matchAll(/@keyframes\s+([a-z0-9_-]+)/gi)].map((m) => ({
    name: m[1], line: css.slice(0, m.index).split('\n').length,
  }));

  rows.push({
    id, dir,
    svgCount: svgOpen, emptySvg,
    handPaths: pathDs.length, handPolygons: polygons.length, handCircles: circles.length,
    longestDCoords: longestD, longestDLine,
    scriptSetVars: [...scriptVars],
    cssConsumesScriptVarsGeometrically: geomConsumers,
    keyframes,
    htmlBytes: html.length, cssBytes: css.length,
  });
}

const out = path.join(ROOT, 'deliverables/74-w4/structure.json');
fs.writeFileSync(out, JSON.stringify(rows, null, 2));
console.log('wrote ' + out);
for (const r of rows) {
  console.log(
    `${r.id} svg=${r.svgCount} emptySvg=[${r.emptySvg.join(',')}] handPath=${r.handPaths}` +
    ` (maxD coords=${r.longestDCoords}@${r.longestDLine}) poly=${r.handPolygons} circ=${r.handCircles}` +
    ` | scriptVars=[${r.scriptSetVars.join(',')}]` +
    ` cssGeoConsumers=${r.cssConsumesScriptVarsGeometrically.length}` +
    ` keyframes=[${r.keyframes.map((k) => k.name).join(',')}]`);
}
