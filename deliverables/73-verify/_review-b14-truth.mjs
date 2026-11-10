/* 地面真值：用一个稳健的花括号解析器（不用那个会吞 `}` 的正则）
 * 重新判定 31 个 style.css 里 body/html 规则是否挂了图。
 *
 * 目的：把两件事分开——
 *   ① 「31 个全部合规」这个**结论**对不对（本脚本回答）
 *   ② 闸门是**怎么得出**这个结论的（上一个脚本已回答：它只看到 34/85 条规则）
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const P = 'D:/Web/style/prototypes';
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '');

/* 返回 [{selector, decls, inMedia}] —— 逐字符解析，正确处理嵌套 */
function parseRules(css) {
  const out = [];
  let buf = '';
  const stack = [];
  for (let i = 0; i < css.length; i++) {
    const c = css[i];
    if (c === '{') { stack.push(buf.trim()); buf = ''; }
    else if (c === '}') {
      const declText = buf;
      const sel = stack.pop();
      if (sel !== undefined && !sel.startsWith('@')) {
        out.push({ selector: sel, decls: declText, inAt: stack.length > 0 });
      }
      buf = '';
    } else buf += c;
  }
  return out;
}

const dirs = readdirSync(P, { withFileTypes: true })
  .filter((d) => d.isDirectory() && /^S\d{2}-/.test(d.name)).map((d) => d.name).sort();
const targets = dirs.map((d) => ({ id: d.slice(0, 3), f: join(P, d, 'style.css') }));
targets.push({ id: '_selection', f: join(P, '_selection', 'style.css') });

const isBodyish = (sel) => sel.split(',').map((s) => s.trim()).some((p) => p === 'body' || p === 'html');

let totalRules = 0, bodyish = 0, violations = 0;
console.log('案       body/html 规则   其中在 @media 内   违规');
console.log('─'.repeat(58));
for (const t of targets) {
  if (!existsSync(t.f)) { console.log(`${t.id}  （无 style.css）`); continue; }
  const css = strip(readFileSync(t.f, 'utf8'));
  const rules = parseRules(css).filter((r) => isBodyish(r.selector));
  totalRules += rules.length;
  bodyish += rules.filter((r) => r.inAt).length;
  const bad = [];
  for (const r of rules) {
    const bi = r.decls.match(/background-image\s*:\s*([^;}]+)/i);
    if (bi && !/^\s*none\s*$/i.test(bi[1]) && /url\(|gradient\(/i.test(bi[1])) {
      bad.push(`background-image:${bi[1].trim().slice(0, 40)}`);
    }
    const bg = r.decls.match(/(?:^|;)\s*background\s*:\s*([^;}]+)/i);
    if (bg && /url\(|gradient\(/i.test(bg[1])) {
      bad.push(`background:${bg[1].trim().slice(0, 40)}`);
    }
  }
  violations += bad.length;
  console.log(`${t.id}      ${String(rules.length).padStart(2)}              ${String(rules.filter((r) => r.inAt).length).padStart(2)}              ${bad.length ? '✗ ' + bad.join(' | ') : '—'}`);
}
console.log('─'.repeat(58));
console.log(`合计 body/html 规则 ${totalRules} 条（其中 ${bodyish} 条在 @media 内）`);
console.log(`真实违规：${violations} 条`);
console.log(violations === 0
  ? '\n⇒ 结论：31 个 style.css **确实**没有任何 body/html 挂图。'
  : '\n⇒ 结论：存在真实违规，闸门"全绿"是错的。');
