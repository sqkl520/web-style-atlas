// r1-emoji-scan.mjs — 源码级 emoji 扫描（与 lint.mjs 的 emoji 规则同正则）
// 目的：确认 .cap 的 ⚠ 是不是唯一来源；注释里的 ⚠ 不算（lint.mjs L80 对 emoji 规则跳过注释行）。
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..', '..');
const SEL = join(ROOT, 'prototypes', '_selection');
const RE = /[\u{1F300}-\u{1FAFF}\u{2700}-\u{27BF}\u{2600}-\u{26FF}]/u;
const isComment = (l) => /^\s*(\/\/|\/\*|\*|<!--)/.test(l);
// lint.mjs 的 emoji 规则额外跳过 import/@import 行（L80）
const skipForEmoji = (l) => /^\s*(\/\/|\/\*|\*|import |@import|<!--)/.test(l);

const files = ['app.js', 'index.html', 'style.css', 'data.js', 'prompts.js', 'prompt-copy.js', 'wizard.css', 'wizard.js'];
let codeHits = 0, commentHits = 0;
for (const f of files) {
  let raw;
  try { raw = readFileSync(join(SEL, f), 'utf8'); } catch { continue; }
  const lines = raw.split(/\r?\n/);
  lines.forEach((l, i) => {
    if (!RE.test(l)) return;
    const cm = isComment(l);
    const skipped = skipForEmoji(l);
    if (cm) { commentHits++; return; }
    codeHits++;
    console.log(`${f}:${i + 1}  ${skipped ? '(lint 跳过此行的 emoji 规则)' : '(lint 会报)'}  ${l.trim().slice(0, 120)}`);
  });
}
console.log(`\n非注释行命中 = ${codeHits}，注释行命中 = ${commentHits}`);
