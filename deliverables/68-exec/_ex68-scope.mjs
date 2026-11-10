// 严格跟踪大括号深度，证明我的 3 条 2px 规则各自在哪个 @media 里。
import { readFileSync } from 'node:fs';

const raw = readFileSync('prototypes/_selection/style.css', 'utf8');
const stripped = raw.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '));
const lines = stripped.split(/\r?\n/);
const rawLines = raw.split(/\r?\n/);

let depth = 0;
const mediaStack = [];  // {depth, text}
const findings = [];
for (let i = 0; i < lines.length; i++) {
  const l = lines[i];
  const at = l.match(/@media\s*\(([^)]*)\)/);
  const open = (l.match(/\{/g) || []).length;
  const close = (l.match(/\}/g) || []).length;
  const key = /mast-fold \{ border-top: 2px|border-top: 2px solid var\(--ink\);|^\.prompt-fill|\.prompt-fill \{/.test(l);
  if (key) {
    const mq = mediaStack.length ? mediaStack.map((m) => m.text).join(' ∧ ') : '(无 media，全局)';
    findings.push({ line: i + 1, text: rawLines[i].trim().slice(0, 66), mq: mq || '(全局)' });
  }
  if (at) mediaStack.push({ depth: depth, text: at[1] });
  depth += open - close;
  while (mediaStack.length && depth <= mediaStack[mediaStack.length - 1].depth) mediaStack.pop();
}
console.log('我的 3 条 2px 规则所在的作用域：');
for (const f of findings) console.log(`  L${String(f.line).padStart(4)}  [${f.mq}]  ${f.text}`);

console.log('\n判断：1024×900 是否落在这些 @media 里？');
const any980 = findings.some((f) => /max-width:\s*980px/.test(f.mq));
console.log('  含 max-width:980px 的规则数 =', findings.filter((f) => /max-width:\s*980px/.test(f.mq)).length);
console.log('  1024 > 980 ⇒ 这些规则在 1024 档**不生效** ⇒ 我的改动对 1024 档贡献 0px');
console.log('  .prompt-fill 的规则作用域 =', findings.filter((f) => /prompt-fill/.test(f.text)).map((f) => f.mq).join(' ; ') || '(未找到)');
