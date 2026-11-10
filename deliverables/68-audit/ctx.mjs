// Dump lint findings with the actual source line + 2 lines of context, classifying each line as
// code / line-comment / block-comment-body / html-comment / string-literal.
// Usage: node ctx.mjs <lint.json> [--snippets]
import { readFileSync } from 'node:fs';
const p = process.argv[2];
const wantSnippets = process.argv.includes('--snippets');
const { findings } = JSON.parse(readFileSync(p, 'utf8'));
const cache = new Map();
const src = (f) => {
  if (!cache.has(f)) cache.set(f, readFileSync(f, 'utf8').split(/\r?\n/));
  return cache.get(f);
};

// Determine, per file, which lines are inside a /* ... */ block comment or an HTML <!-- --> comment.
function commentMask(lines) {
  const inBlock = new Array(lines.length).fill(null); // 'js' | 'html' | null  (marker lands on the closing line)
  let mode = String(lines.slice(0, 400).join('\n')).includes('<!') ? null : null;
  let open = null;
  let start = -1;
  lines.forEach((line, i) => {
    // walk char by char so a one-line /* x */ does not open a region
    let j = 0;
    while (j < line.length) {
      if (!open) {
        const a = line.indexOf('/*', j);
        const b = line.indexOf('<!--', j);
        let k = -1;
        let kind = null;
        if (a >= 0 && (b < 0 || a < b)) { k = a; kind = 'js'; }
        else if (b >= 0) { k = b; kind = 'html'; }
        if (k < 0) break;
        const close = kind === 'js' ? '*/' : '-->';
        const c = line.indexOf(close, k + 2);
        if (c < 0) { open = kind; start = i; inBlock[i] = kind + ':open'; break; }
        j = c + close.length;
      } else {
        const close = open === 'js' ? '*/' : '-->';
        const c = line.indexOf(close, j);
        if (c < 0) { inBlock[i] = open + ':in'; break; }
        inBlock[i] = open + ':close'; open = null; j = c + close.length;
      }
    }
  });
  return inBlock;
}

for (const f of findings) {
  if (f.line === 0) { console.log(`\n### ${f.id} ${f.file} — ${f.match}`); continue; }
  const lines = src(f.file);
  const i = f.line - 1;
  const block = commentMask(lines)[i];
  const line = lines[i];
  let cls = 'CODE';
  if (block) cls = 'BLOCK-COMMENT(' + block + ')';
  else if (/^\s*(\/\/|<!--)/.test(line)) cls = 'LINE-COMMENT';
  else if (/^\s*\*/.test(line)) cls = 'JSDOC-BODY';
  console.log(`\n### ${f.id}  ${f.file}:${f.line}  [${cls}]`);
  console.log(`    > ${line.trim().slice(0, 220)}`);
  if (wantSnippets) {
    for (const d of [-2, -1, 1, 2]) {
      const l = lines[i + d];
      if (l !== undefined) console.log(`    ${d > 0 ? '+' : ''}${d}| ${l.trim().slice(0, 200)}`);
    }
  }
}
