// Probe 1: does lint.mjs's emoji skip actually fire in block-comment continuation lines?
// lint.mjs:80 skips emoji only when the line STARTS with //, /*, *, import, @import, <!--.
// A line inside a /* ... */ block that merely *contains* prose (no leading *) is NOT skipped.
// This script replicates lint's own line-state machine and reports, per emoji hit,
// whether the hit line is inside a block comment at that point.
import { readFileSync } from 'node:fs';

const files = process.argv.slice(2);
if (!files.length) {
  files.push('prototypes/_selection/app.js', 'prototypes/_selection/index.html', 'prototypes/_selection/style.css');
}
const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2700}-\u{27BF}\u{2600}-\u{26FF}]/u;

for (const file of files) {
  const lines = readFileSync(file, 'utf8').split(/\r?\n/);
  let inBlock = false;
  console.log(`\n=== ${file} ===`);
  let flagged = 0, unflagged = 0;
  lines.forEach((line, i) => {
    const n = i + 1;
    const had = inBlock;
    // advance block-comment state across this line
    for (let k = 0; k < line.length; k++) {
      if (!inBlock && line[k] === '/' && line[k + 1] === '*') { inBlock = true; k++; }
      else if (inBlock && line[k] === '*' && line[k + 1] === '/') { inBlock = false; k++; }
    }
    if (!EMOJI.test(line)) return;
    // lint.mjs:80 test
    const lintSkips = /^\s*(\/\/|\/\*|\*|import |@import|<!--)/.test(line);
    // a // -comment line also renders nothing
    const lineComment = /^\s*\/\//.test(line) || /\/\*/.test(line.slice(0, line.indexOf('⚠') === -1 ? line.length : line.indexOf('⚠')));
    const insideComment = had || lineComment || /^\s*\*/.test(line);
    console.log(`${String(n).padStart(5)}  lintSkips=${String(lintSkips).padEnd(5)} inBlockAtStart=${String(had).padEnd(5)} effectivelyComment=${String(insideComment).padEnd(5)} | ${line.trim().slice(0, 78)}`);
    if (lintSkips) flagged++; else unflagged++;
  });
  console.log(`-- lint FLAGS ${unflagged}, lint SILENTLY SKIPS ${flagged} (both are comments in source) --`);
}
