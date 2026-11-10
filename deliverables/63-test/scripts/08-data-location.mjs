// 63-test · evidence: where does each mechanism actually keep its data?
// Counts, per case, the values that live in markup attributes / CSS custom properties
// (which no copy swap can touch) versus values that live in text.
import { readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve('D:/Web/style');
const CASES = ['S03-long-exposure-observatory', 'S05-pixel-cold-storage-console', 'S10-grid-versus-sheet',
  'S14-zero-g-launch-sequence', 'S15-fishery-floor-ledger', 'S18-phosphor-service-deck',
  'S20-plotter-soundfield', 'S21-interlocking-release-book', 'S29-wire-bound-safety-manual'];
const FRUIT = '梨桃柚杏梅枣橙';

const out = {};
for (const c of CASES) {
  const html = readFileSync(join(ROOT, 'prototypes', c, 'index.html'), 'utf8');
  const css = readFileSync(join(ROOT, 'prototypes', c, 'style.css'), 'utf8');
  // inline style custom properties on elements: the "data" of most of these mechanisms
  const inlineVars = [...html.matchAll(/style="([^"]*)"/g)].flatMap((m) => {
    return [...m[1].matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+)/g)].map((x) => ({ name: x[1], value: x[2].trim() }));
  });
  const varNames = {};
  for (const v of inlineVars) varNames[v.name] = (varNames[v.name] || 0) + 1;
  // which of those vars does the stylesheet consume?
  const consumed = new Set([...css.matchAll(/var\(\s*(--[a-z0-9-]+)/g)].map((m) => m[1]));
  // data-* attributes carrying numeric data
  const dataAttrs = [...html.matchAll(/\s(data-[a-z-]+)="([^"]*)"/g)];
  const numericData = dataAttrs.filter((m) => /^-?[\d.,\s]+$/.test(m[2].trim()) && m[2].trim() !== '');
  // SVG path data / viewBox geometry
  const svgPaths = (html.match(/<path[^>]*\sd="/g) || []).length;
  const pathsInCss = (css.match(/d:\s*path\(/g) || []).length;
  // does the layout size anything from a text length? (the only way copy could matter)
  const jsLen = [...html.matchAll(/\.(textContent|innerText)\.length|\.length\s*[<>]=?\s*\d+/g)].length;
  out[c] = {
    inlineVarCount: inlineVars.length,
    inlineVarNames: varNames,
    inlineVarsConsumedByCss: Object.keys(varNames).filter((n) => consumed.has(n)),
    dataAttrCount: dataAttrs.length,
    numericDataAttrs: numericData.length,
    svgPathsInHtml: svgPaths,
    pathsInCss,
    textLengthDrivesLayout: jsLen,
  };
}
writeFileSync(join(ROOT, 'deliverables', '63-test', 'data', 'data-location.json'), JSON.stringify(out, null, 1));
for (const [c, d] of Object.entries(out)) {
  console.log(`\n=== ${c}`);
  console.log(`  inline CSS vars: ${d.inlineVarCount}  (${Object.entries(d.inlineVarNames).map(([k, v]) => k + '×' + v).join(', ') || '-'})`);
  console.log(`  consumed by stylesheet: ${d.inlineVarsConsumedByCss.join(', ') || 'NONE'}`);
  console.log(`  data-* attrs: ${d.dataAttrCount}  numeric-valued: ${d.numericDataAttrs}`);
  console.log(`  svg paths in html: ${d.svgPathsInHtml}  in css: ${d.pathsInCss}   textLengthDrivesLayout: ${d.textLengthDrivesLayout}`);
}
