// Classify every em-dash occurrence in a file as comment / string / markup-text, and count only
// what lint's own counter would count. Usage: node emdash.mjs <file...>
import { readFileSync } from 'node:fs';

function scan(file) {
  const src = readFileSync(file, 'utf8');
  const lines = src.split(/\r?\n/);
  let open = null; // 'js' | 'html'
  const rows = [];
  lines.forEach((line, i) => {
    // lint's own guard: these lines are skipped for the em-dash counter
    const lintSkipped = /^\s*(\/\/|\/\*|\*|<!--)/.test(line);
    const before = open;
    // walk the line tracking block comments
    let j = 0; let commentRanges = [];
    while (j < line.length) {
      if (!open) {
        const a = line.indexOf('/*', j); const b = line.indexOf('<!--', j);
        let k = -1, kind = null;
        if (a >= 0 && (b < 0 || a < b)) { k = a; kind = 'js'; } else if (b >= 0) { k = b; kind = 'html'; }
        if (k < 0) break;
        const close = kind === 'js' ? '*/' : '-->';
        const c = line.indexOf(close, k + 2);
        if (c < 0) { open = kind; commentRanges.push([k, line.length]); break; }
        commentRanges.push([k, c + close.length]); j = c + close.length;
      } else {
        const close = open === 'js' ? '*/' : '-->';
        const c = line.indexOf(close, j);
        if (c < 0) { commentRanges.push([j, line.length]); break; }
        commentRanges.push([j, c + close.length]); open = null; j = c + close.length;
      }
    }
    // line comment
    if (!before && open !== 'html') {
      const lc = line.indexOf('//');
      if (lc >= 0 && !/https?:/.test(line.slice(Math.max(0, lc - 6), lc + 2))) {
        // crude: treat // to EOL as comment only if not inside a block comment range already handled
        if (!commentRanges.some(([s, e]) => lc >= s && lc < e)) commentRanges.push([lc, line.length]);
      }
    }
    const inComment = (idx) => commentRanges.some(([s, e]) => idx >= s && idx < e);
    for (let idx = 0; idx < line.length; idx++) {
      if (line[idx] !== '—') continue;
      rows.push({
        line: i + 1,
        col: idx + 1,
        inComment: before || open ? true : inComment(idx),
        lintCounted: !lintSkipped,
        ctx: line.trim().slice(0, 90),
      });
    }
  });
  return rows;
}

for (const f of process.argv.slice(2)) {
  const rows = scan(f);
  const inComment = rows.filter((r) => r.inComment).length;
  const inCode = rows.length - inComment;
  const lintCounted = rows.filter((r) => r.lintCounted).length;
  const lintCountedAndCode = rows.filter((r) => r.lintCounted && !r.inComment).length;
  console.log(`\n=== ${f}`);
  console.log(`total —: ${rows.length}   in comment: ${inComment}   in live text/code: ${inCode}`);
  console.log(`lint would count (its guard only skips lines STARTING with a comment marker): ${lintCounted}`);
  console.log(`  of those, actually inside a comment (over-count): ${lintCounted - lintCountedAndCode}`);
  console.log(`  of those, genuinely in code/markup text: ${lintCountedAndCode}`);
  for (const r of rows.filter((r) => !r.inComment).slice(0, 30)) console.log(`   LIVE ${f}:${r.line}:${r.col}  ${r.ctx}`);
}
