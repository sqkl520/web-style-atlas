#!/usr/bin/env node
// REDTEAM probe: how many taste-skill-ignore lines would it take to reach 0 FAIL?
// Runs lint --json on the real files, then computes for each FAIL whether an
// ignore-comment on that line would actually silence it (it always would, because lint
// returns per line), and what the resulting "clean" state would hide.
//
//   node probe-ignore-cost.mjs <file...>
// Read-only.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = 'D:/Web/style';
const LINT = join(ROOT, 'tools/taste-skill/skills/taste-skill/scripts/lint.mjs');
const NODE = 'D:/Nodejs/node.exe';
const files = process.argv.slice(2);

const run = (args) => {
  try {
    return JSON.parse(execFileSync(NODE, [LINT, ...args, '--json'], { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }));
  } catch (e) {
    return JSON.parse(e.stdout);
  }
};

const before = run(files);
const fails = before.findings.filter((f) => f.level === 'FAIL');
// one ignore comment per distinct finding LINE silences every rule that matches on that line
const linesToMask = new Set(fails.filter((f) => f.file !== '(all files)').map((f) => f.file + ':' + f.line));

// Which files/lines are *data* (descriptions of the 30 sites), not product chrome?
const DATA_FILES = ['data.js', 'prompts.js', 'prompt-copy.js'];
const dataFail = fails.filter((f) => DATA_FILES.some((d) => f.file.endsWith(d)));
const chromeFail = fails.filter((f) => !DATA_FILES.some((d) => f.file.endsWith(d)));

console.log(JSON.stringify({
  files_linted: before.files,
  FAIL_before: fails.length,
  ignore_comments_needed: linesToMask.size,
  FAIL_from_data_blobs_js: dataFail.length,
  FAIL_from_product_chrome: chromeFail.length,
  chromeFAIL_by_rule: Object.fromEntries([...new Set(chromeFail.map((f) => f.id))].map((id) => [id, chromeFail.filter((f) => f.id === id).length])),
  dataFAIL_by_file: Object.fromEntries(DATA_FILES.map((d) => [d, dataFail.filter((f) => f.file.endsWith(d)).length])),
  note: 'a comment on the line silences every rule matching that line, so the count is per line not per finding',
}, null, 1));
