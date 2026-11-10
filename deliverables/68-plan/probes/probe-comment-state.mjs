#!/usr/bin/env node
// REDTEAM probe: is a lint finding inside a *real* comment (including multi-line block
// comments) or inside live code? lint.mjs only skips a line when that line *starts* with a
// comment marker, so a `⚠️` on the 4th line of a /* ... */ block is reported as an emoji FAIL.
//
//   node probe-comment-state.mjs <lint.json>
// Read-only.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = 'D:/Web/style';
const j = JSON.parse(readFileSync(process.argv[2], 'utf8'));

// Track whether each line of a file is "comment" or "code".
// Handles //, /* */, <!-- -->, and JS template/string literals well enough for this purpose:
// a // inside a string is a known limitation and is reported separately as `ambiguous`.
function classify(file) {
  const text = readFileSync(join(ROOT, file), 'utf8');
  const lines = text.split(/\r?\n/);
  const state = new Array(lines.length).fill('code');
  let mode = null; // 'block' | 'html' | null
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const t = line.trim();
    if (mode === 'block') {
      state[i] = 'block-comment';
      // does the block end on this line, with code after it?
      const end = line.indexOf('*/');
      if (end !== -1 && line.slice(end + 2).trim()) state[i] = 'block-comment-then-code';
      if (end !== -1) mode = null;
      continue;
    }
    if (mode === 'html') {
      state[i] = 'html-comment';
      if (line.includes('-->')) mode = null;
      continue;
    }
    if (t.startsWith('//')) { state[i] = 'line-comment'; continue; }
    if (t.startsWith('<!--')) {
      state[i] = 'html-comment';
      if (!t.includes('-->')) mode = 'html';
      continue;
    }
    // a block comment that starts this line and does not close on it
    const open = line.indexOf('/*');
    if (open !== -1) {
      const close = line.indexOf('*/', open + 2);
      if (close === -1) { state[i] = 'block-comment-open'; mode = 'block'; continue; }
      if (!line.slice(close + 2).trim()) { state[i] = 'inline-block-comment-only'; continue; }
    }
    if (t.startsWith('*')) { state[i] = 'block-comment'; continue; }
  }
  return { lines, state };
}

const cache = new Map();
const out = [];
for (const f of j.findings) {
  if (f.file === '(all files)') { out.push({ ...f, region: 'aggregate' }); continue; }
  if (!cache.has(f.file)) cache.set(f.file, classify(f.file));
  const { lines, state } = cache.get(f.file);
  const region = state[f.line - 1] ?? 'unknown';
  out.push({ level: f.level, id: f.id, file: f.file, line: f.line, match: f.match, region, src: (lines[f.line - 1] ?? '').trim().slice(0, 110) });
}

const isComment = (r) => /comment/.test(r.region);
const fails = out.filter((f) => f.level === 'FAIL');
const agg = {};
for (const f of out) {
  const k = `${f.level} ${f.id}`;
  agg[k] ??= { n: 0, inComment: 0, inCode: 0 };
  agg[k].n++;
  if (f.region === 'aggregate') agg[k].inComment++;
  else if (isComment(f)) agg[k].inComment++;
  else agg[k].inCode++;
}
console.log(JSON.stringify({
  total: out.length,
  FAIL: fails.length,
  FAIL_inRealComment: fails.filter((f) => isComment(f)).length,
  FAIL_inCode: fails.filter((f) => !isComment(f) && f.region !== 'aggregate').length,
  byRule: agg,
  failsInCode: fails.filter((f) => !isComment(f) && f.region !== 'aggregate').map((f) => `${f.file}:${f.line} [${f.id}] ${f.src}`),
  failsInCommentByRule: Object.fromEntries(Object.entries(agg).filter(([k]) => k.startsWith('FAIL')).map(([k, v]) => [k, v.inComment])),
}, null, 1));
