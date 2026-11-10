#!/usr/bin/env node
// REDTEAM probe: classify lint --json findings.
//   node probe-lint-classify.mjs summary <lint.json>
// Answers: how many FAILs are in comment lines? how many per rule per file?
// Read-only.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = 'D:/Web/style';
const COMMENT = /^\s*(\/\/|\/\*|\*|<!--|#)/;

const [, , mode, jsonPath] = process.argv;
if (mode !== 'summary' || !jsonPath) {
  console.error('usage: node probe-lint-classify.mjs summary <lint.json>');
  process.exit(2);
}

const j = JSON.parse(readFileSync(jsonPath, 'utf8'));
const src = new Map();
const lineOf = (f, n) => {
  if (f === '(all files)' || n === 0) return '/* aggregate finding */';
  if (!src.has(f)) src.set(f, readFileSync(join(ROOT, f), 'utf8').split(/\r?\n/));
  return src.get(f)[n - 1] ?? '';
};

const fails = j.findings.filter((f) => f.level === 'FAIL');
const warns = j.findings.filter((f) => f.level !== 'FAIL');

const rules = new Map();
let failInComment = 0;
let warnInComment = 0;
for (const f of j.findings) {
  const isC = COMMENT.test(lineOf(f.file, f.line));
  if (f.level === 'FAIL' && isC) failInComment++;
  if (f.level !== 'FAIL' && isC) warnInComment++;
  const k = `${f.level} ${f.id}`;
  const r = rules.get(k) ?? { rule: k, n: 0, inComment: 0, byFile: {}, samples: [] };
  r.n++;
  if (isC) r.inComment++;
  const base = f.file.split('/').pop();
  r.byFile[base] = (r.byFile[base] || 0) + 1;
  if (r.samples.length < 4) r.samples.push(`${f.file}:${f.line}  ${f.match}`);
  rules.set(k, r);
}

const byFile = {};
for (const f of j.findings) {
  const b = f.file.split('/').pop();
  byFile[b] ??= { FAIL: 0, WARN: 0 };
  byFile[b][f.level === 'FAIL' ? 'FAIL' : 'WARN']++;
}

console.log(JSON.stringify({
  files: j.files,
  totalFindings: j.findings.length,
  FAIL: fails.length,
  WARN: warns.length,
  FAIL_in_comment_lines: failInComment,
  WARN_in_comment_lines: warnInComment,
  FAIL_not_in_comment: fails.length - failInComment,
  byFile,
  byRule: [...rules.values()].sort((a, b) => b.n - a.n),
}, null, 1));
