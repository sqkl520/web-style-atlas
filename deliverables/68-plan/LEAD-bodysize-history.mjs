import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
const GIT = 'D:\\Git\\cmd\\git.exe';
const git = (...a) => execFileSync(GIT, a, { encoding: 'utf8', maxBuffer: 128 << 20 });

console.log('=== 1. --s-13 的定义与用法：谁把正文设成 13px ===');
const css = readFileSync('prototypes/_selection/style.css', 'utf8');
const nc = css.replace(/\/\*[\s\S]*?\*\//g, '');
nc.split('\n').forEach((l, i) => {
  if (/--s-13:|font-size:\s*var\(--s-13\)/.test(l)) console.log(`  L${i + 1}: ${l.trim().slice(0, 110)}`);
});

console.log('\n=== 2. .row-def / .field dd / 正文类选择器用的字号 ===');
for (const sel of ['.row-def', '.field dd', 'dd {', '.parts li', '.row-meta', '.cap']) {
  const i = nc.indexOf(sel);
  if (i >= 0) {
    const blk = nc.slice(i, i + 260).split('}')[0];
    const fs = /font-size:\s*([^;]+)/.exec(blk);
    console.log(`  ${sel.padEnd(14)} → font-size: ${fs ? fs[1].trim() : '(继承)'}`);
  }
}

console.log('\n=== 3. HEAD~5..HEAD 里 --s-13 / 13px 的改动 ===');
for (const c of ['d49ed74', '1753f94', 'a0c0d54', 'a56426e', 'd669ddb']) {
  const d = git('show', c, '--format=%h %s', '--', 'prototypes/_selection/style.css');
  const hits = d.split('\n').filter(l => /^[-+].*(--s-13|13px|--s-14|14px|--s-16)/.test(l));
  if (hits.length) {
    console.log(`\n  --- ${c} ---`);
    hits.slice(0, 14).forEach(l => console.log('    ' + l.trim().slice(0, 120)));
  }
}

console.log('\n=== 4. body-size 规则的历史触发：往届报告里出现过吗 ===');
const { readdirSync, existsSync } = await import('node:fs');
let found = 0;
const walk = (d) => {
  for (const e of readdirSync(d, { withFileTypes: true })) {
    const p = d + '/' + e.name;
    if (e.isDirectory()) { if (!/node_modules|scratch|\.git/.test(e.name)) walk(p); }
    else if (e.name === 'report.json') {
      try {
        const j = JSON.parse(readFileSync(p, 'utf8'));
        const b = (j.findings || []).find(f => f.id === 'body-size');
        if (b) { console.log(`  ${p}: [${b.level}] ${String(b.message).slice(0, 90)}`); found++; }
      } catch { }
    }
  }
};
walk('prototypes');
console.log('  含 body-size 的 report.json:', found);
