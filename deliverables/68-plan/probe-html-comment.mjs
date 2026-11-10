// Probe 2: is index.html:236 inside an HTML comment? Track <!-- --> state.
import { readFileSync } from 'node:fs';
const file = process.argv[2] || 'prototypes/_selection/index.html';
const lines = readFileSync(file, 'utf8').split(/\r?\n/);
let inHtml = false, openLine = 0;
const target = Number(process.argv[3] || 236);
lines.forEach((line, i) => {
  const n = i + 1;
  // scan for comment delimiters in order
  let idx = 0;
  while (idx < line.length) {
    if (!inHtml) {
      const o = line.indexOf('<!--', idx);
      if (o === -1) break;
      inHtml = true; openLine = n; idx = o + 4;
    } else {
      const c = line.indexOf('-->', idx);
      if (c === -1) break;
      inHtml = false; idx = c + 3;
    }
  }
  if (n === target) {
    console.log(`line ${n}: insideHtmlComment=${inHtml} (comment opened at line ${inHtml ? openLine : '(closed)'})`);
    console.log(`  text: ${line.trim().slice(0, 100)}`);
  }
});
