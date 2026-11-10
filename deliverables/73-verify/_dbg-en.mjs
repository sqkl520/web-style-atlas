import { readFileSync } from 'node:fs';

const t = readFileSync('D:/Web/style/README-EN.md', 'utf8');
const src = readFileSync('D:/Web/style/prototypes/_build/check-contract.mjs', 'utf8');
const iRe = src.indexOf('const CLAIM_RE = ');
const jRe = src.indexOf('/g;', iRe);
const CLAIM_RE = eval(src.slice(iRe + 'const CLAIM_RE = '.length, jRe + 2));

for (const m of t.matchAll(CLAIM_RE)) {
  const win = t.slice(Math.max(0, m.index - 150), m.index + 260);
  const sents = win.split(/[。！？\n]/).filter((s) => s.trim());
  console.log('=== match: id=' + m[1] + ' n=' + (m[2] ?? m[5]) + ' rule=' + (m[3] ?? m[4]) + ' ===');
  console.log('匹配原文:', JSON.stringify(m[0]));
  console.log('所在位置:', m.index);
  console.log('\n窗口内各句:');
  sents.forEach((s, n) => {
    const hasCase = /S\d{2}/.test(s);
    const hasRule = /shadow/i.test(s);
    const hasRetract = /是错的|已清账|已清|早就清|cleared|was wrong|no longer/i.test(s);
    const hasClaim = /真未修|未修|未清|genuinely unresolved/i.test(s);
    const mark = hasCase && hasRule && hasRetract && !hasClaim ? ' ← 撤回句' : '';
    console.log(`  [${n}] case=${hasCase} rule=${hasRule} retract=${hasRetract} claim=${hasClaim}${mark}`);
    console.log(`      ${s.trim().slice(0, 140)}`);
  });
  console.log('');
}
