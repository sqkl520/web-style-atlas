// Print the CSS rule block that owns a given line, by walking back to the enclosing selector.
// Usage: node rule.mjs <file> <line> [<line> ...]
import { readFileSync } from 'node:fs';
const [file, ...nums] = process.argv.slice(2);
const lines = readFileSync(file, 'utf8').split(/\r?\n/);
for (const ns of nums) {
  const n = Number(ns);
  // walk back to the line containing '{' that opens this block
  let open = -1;
  for (let i = n - 1; i >= 0; i--) {
    if (lines[i].includes('{')) { open = i; break; }
    if (lines[i].includes('}') && i !== n - 1) break;
  }
  // walk forward to the matching close
  let depth = 0; let close = -1;
  for (let i = Math.max(open, 0); i < lines.length; i++) {
    for (const ch of lines[i]) { if (ch === '{') depth++; else if (ch === '}') depth--; }
    if (open >= 0 && depth <= 0 && i >= open && lines[i].includes('}')) { close = i; break; }
  }
  // also show media-query context if any
  console.log(`\n===== ${file}:${n} =====`);
  const from = Math.max(0, (open < 0 ? n - 1 : open) - 1);
  for (let i = from; i <= Math.min(lines.length - 1, close < 0 ? n + 1 : close); i++) {
    console.log(String(i + 1).padStart(5) + (i === n - 1 ? ' >> ' : ' |  ') + lines[i]);
  }
}
