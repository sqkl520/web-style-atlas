// 独立解析器 —— 与 v3 方法不同：
//   v3  = 「对每个 { 记录块，选择器 = 往回找上一个 }/;/{ 之后的文本」（启发式回溯）
//   本脚本 = 「字符级 tokenizer（处理字符串/括号/注释）+ 栈，块的选择器由 token 流
//             归属决定」，并用字符位置切片取 decls。
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const P = 'D:/Web/style/prototypes';
const stripComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '');

function tokenize(css) {
  const toks = [];
  let buf = '', quote = null, paren = 0;
  for (let i = 0; i < css.length; i++) {
    const ch = css[i];
    if (quote) {
      buf += ch;
      if (ch === '\\') { buf += css[++i] ?? ''; continue; }
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'") { quote = ch; buf += ch; continue; }
    if (ch === '(') { paren++; buf += ch; continue; }
    if (ch === ')') { paren = Math.max(0, paren - 1); buf += ch; continue; }
    if (paren === 0 && ch === '{') { toks.push({ type: 'sel', text: buf, pos: i }); buf = ''; toks.push({ type: 'open', pos: i }); continue; }
    if (paren === 0 && ch === '}') { toks.push({ type: 'close', pos: i }); buf = ''; continue; }
    buf += ch;
  }
  return toks;
}

export function independentBodyRules(cssRaw) {
  const css = stripComments(cssRaw);
  const toks = tokenize(css);
  const hits = [];
  const stack = [];
  let allRules = 0;
  for (let i = 0; i < toks.length; i++) {
    const t = toks[i];
    if (t.type === 'open') {
      // 直属选择器 = 紧邻这个 open 之前的 sel token（若无则是空 → 匿名块）
      const selTok = (i > 0 && toks[i - 1].type === 'sel') ? toks[i - 1].text : '';
      let d = 0, closePos = null;
      for (let j = i; j < toks.length; j++) {
        if (toks[j].type === 'open') d++;
        else if (toks[j].type === 'close') { d--; if (d === 0) { closePos = toks[j].pos; break; } }
      }
      const decls = closePos === null ? null : css.slice(t.pos + 1, closePos);
      stack.push({ sel: selTok.trim(), decls });
      allRules++;
      const tags = selTok.split(/[{},]/).map((s) => s.trim()).filter((x) => x === 'body' || x === 'html');
      if (tags.length) hits.push({ sel: selTok.trim(), tags, decls, depth: stack.length - 1 });
      continue;
    }
    if (t.type === 'close') stack.pop();
  }
  return { allRules, bodyRules: hits };
}

const cases = readdirSync(P, { withFileTypes: true })
  .filter((d) => d.isDirectory() && /^S\d{2}-/.test(d.name)).map((d) => d.name).sort();
const targets = cases.map((d) => ({ id: d.slice(0, 3), path: join(P, d, 'style.css') }));
const selCss = join(P, '_selection', 'style.css');
if (existsSync(selCss)) targets.push({ id: '_selection', path: selCss });

let files = 0, allRules = 0, bodyRules = 0;
const detail = [];
for (const t of targets) {
  if (!existsSync(t.path)) continue;
  files++;
  const r = independentBodyRules(readFileSync(t.path, 'utf8'));
  allRules += r.allRules; bodyRules += r.bodyRules.length;
  detail.push({ id: t.id, all: r.allRules, body: r.bodyRules.length, sels: r.bodyRules.map((x) => x.sel.replace(/\s+/g, ' ')) });
}
if (process.argv.includes('--json')) {
  console.log(JSON.stringify({ files, allRules, bodyRules, detail }, null, 2));
} else {
  for (const d of detail) console.log(`${d.id}  all=${d.all}  body=${d.body}  ${d.body ? 'sels=[' + d.sels.join(' | ') + ']' : ''}`);
  console.log('');
  console.log(`INDEP  files=${files}  allRules=${allRules}  bodyRules=${bodyRules}`);
}
