/* 报告结构自检：代码围栏必须成对，否则后面半篇会被渲染成代码块。
 * 为什么单独写一支：Markdown 不像 JS 有 --check，围栏漏一个在终端里看不出来
 * （我一开始就是只数了个总数，没有配对着看）。
 */
import { readFileSync } from 'node:fs';

const F = 'D:/Web/style/deliverables/66-exec/EXEC-a11y-mobile.md';
const s = readFileSync(F, 'utf8');
const lines = s.split('\n');
const fences = [];
lines.forEach((l, i) => { if (l.startsWith('```')) fences.push({ n: i + 1, text: l }); });

console.log('总行数 ' + lines.length + '，围栏行 ' + fences.length + ' 条（必须是偶数）');
let open = false, openAt = 0;
for (const f of fences) {
  if (!open) { open = true; openAt = f.n; console.log('  开  ' + f.n + '  ' + f.text); }
  else { open = false; }
  }
console.log(open ? '✗ 未闭合：第 ' + openAt + ' 行开的那个一直没关' : '✓ 围栏全部成对');

/* 表格列数一致性：| 开头的行在同一块里列数应相同（发现不了的表格错会静默丢列）。
   ⚠️ 必须先吃掉 `\|`（Markdown 里转义的竖线）：表格单元格里写 `--tag before\|after`
   是合法且必要的写法，按裸 | 切会把一格算成两格 —— 那是检查器的假阳性，不是文档的错。
   （第一版就是这么误报了一次，所以这里写清楚。） */
const splitRow = (l) => l.replace(/\\\|/g, '\u0001').split('|');
let badTable = 0;
let i = 0;
while (i < lines.length) {
  if (lines[i].startsWith('|')) {
    const cols = splitRow(lines[i]).length;
    const start = i;
    while (i < lines.length && lines[i].startsWith('|')) {
      if (splitRow(lines[i]).length !== cols) { badTable++; console.log('  ✗ 表格列数不一致，行 ' + (i + 1) + '（块起 ' + (start + 1) + '）'); }
      i++;
    }
  } else i++;
}
console.log(badTable ? '✗ 有 ' + badTable + ' 行列数不一致' : '✓ 表格列数一致');
console.log('首行：' + JSON.stringify(lines[0]));
