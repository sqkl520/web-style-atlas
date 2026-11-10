// 行号校准：证明我这边的 line 计算与 Select-String / Get-Content 给出不同数字的原因。
// 结论先行（这段代码就是证据）：
//   fs.readFileSync(...,'utf8') 之后 .split('\n') 的行号 = 编辑器行号；
//   而我先前的 `mIdx = split('\n').slice(0,line-1).join('\n').length` 少算了一个换行符，
//   导致 indexOf('}', mIdx) 从上一行末尾开始找，抓到了**上一个块**的 }，
//   于是 body 内容错位、变量表跟着错位。这是探针 bug，不是文件问题。
import { readFileSync, writeFileSync } from 'node:fs';

const f = 'D:/Web/style/prototypes/S27-hand-painted-bill-dispatch/style.css';
const raw = readFileSync(f, 'utf8');
const lines = raw.split('\n');

// 1) 逐个 :root 的**真实**行号（1-based）
const roots = [];
for (let i = 0; i < lines.length; i++) if (/:root\s*\{/.test(lines[i])) roots.push({ line: i + 1, text: lines[i].trim().slice(0, 80) });
// 2) 逐个 @media 的真实行号与范围
const medias = [];
for (let i = 0; i < lines.length; i++) if (/^\s*@media/.test(lines[i])) medias.push({ line: i + 1, text: lines[i].trim() });

// 3) --mis 在哪些行被定义
const misDefs = [];
for (let i = 0; i < lines.length; i++) if (/--mis\s*:/.test(lines[i])) misDefs.push({ line: i + 1, text: lines[i].trim().slice(0, 80) });

// 4) 判断每个 :root 落在哪个 @media 内（用行级花括号深度，简单可靠）
function mediaOf(targetLine) {
  let depth = 0;
  const stack = [];
  for (let i = 0; i < lines.length; i++) {
    const ln = lines[i];
    const opens = (ln.match(/\{/g) || []).length;
    const closes = (ln.match(/\}/g) || []).length;
    if (/^\s*@media/.test(ln) && i + 1 <= targetLine) stack.push({ line: i + 1, text: ln.trim(), depthAfter: depth + opens });
    // 关闭：从栈顶弹出那些已经闭合的
    for (let k = 0; k < closes; k++) { if (stack.length && depth + opens - k <= stack[stack.length - 1].depthAfter - 1) stack.pop(); }
    depth += opens - closes;
    if (i + 1 === targetLine) return stack.length ? stack[stack.length - 1] : null;
  }
  return null;
}

const out = { totalLines: lines.length, roots, medias, misDefs, rootMedia: [] };
for (const r of roots) {
  const m = mediaOf(r.line);
  out.rootMedia.push({ line: r.line, inMedia: m ? m.text : null, mediaLine: m ? m.line : null, text: r.text });
}
writeFileSync('D:/Web/style/deliverables/69-audit/t1-lineno.json', JSON.stringify(out, null, 1), 'utf8');

console.log('S27/style.css 总行数(LF 计):', lines.length);
console.log('\n:root 块：');
for (const x of out.rootMedia) console.log('  L' + String(x.line).padEnd(4), x.inMedia ? '在 ' + x.inMedia + ' (@L' + x.mediaLine + ')' : '（顶层）', '|', x.text);
console.log('\n@media：');
for (const m of medias) console.log('  L' + String(m.line).padEnd(4), m.text);
console.log('\n--mis 定义处：');
for (const m of misDefs) console.log('  L' + String(m.line).padEnd(4), m.text);
