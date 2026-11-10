import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = 'D:/Web/style';
const SPECS = join(ROOT, 'prototypes', '_specs');
const files = readdirSync(SPECS).filter((f) => /^S\d\d\.md$/.test(f)).sort();

// 表头三种写法：
//   "**8. 去 AI 味审查点（≥3 条）**"      （标题在行首、**包裹、独立一行）
//   "8. **去 AI 味审查点（≥3 条）**："    （编号 + **标题** + 冒号）
//   "8. 去 AI 味审查点（≥3 条）：正文"     （编号 + 标题 + 冒号 + 正文同行）
// 稳定锚点：行首的数字 + 标题关键词；正文从"标题结束后紧跟的第一个冒号之后"开始。
const TITLES = [
  [1, '一句话视觉定义'], [2, '美学家族与参考'], [3, '配色系统'], [4, '字体策略'],
  [5, '布局与网格'], [6, '关键视觉元素'], [7, '动效与交互'],
  [8, '去\\s*AI\\s*味审查点'], [9, '反\\s*AI\\s*味风险与规避'], [10, '适用场景'],
  [11, '可落地要点'], [12, '设计师签名式怪癖'],
];

function fields(md) {
  const marks = [];
  for (const [num, kw] of TITLES) {
    const re = new RegExp('^[ \\t]*(?:\\*\\*)?[ \\t]*' + num + '[ \\t]*\\.[ \\t]*(?:\\*\\*)?[ \\t]*' + kw + '[^\\n]*$', 'm');
    const m = re.exec(md);
    if (m) marks.push({ start: m.index, after: m.index + m[0].length, num });
  }
  marks.sort((a, b) => a.start - b.start);
  const out = {};
  for (let k = 0; k < marks.length; k++) {
    const end = k + 1 < marks.length ? marks[k + 1].start : md.length;
    let body = md.slice(marks[k].after, end);
    // 标题行里可能已经带了正文（"…（≥3 条）：正文"），上面的正则把整行吃掉了，
    // 所以要把同一行里"最后一个 ** 之后"的内容捞回来，并从第一个冒号后开始。
    const head = md.slice(marks[k].start, marks[k].after);
    let inline = '';
    const tailColon = head.search(/[：:]/);
    if (tailColon >= 0) inline = head.slice(tailColon + 1);
    body = (inline + '\n' + body).replace(/^[\s*]+/, '');
    // 如果标题独立成行、正文另起一行，body 开头可能是 "：内容" 或 "**：内容"
    out[marks[k].num] = body.replace(/^[\s*]*[：:]?[\s*]*/, '').trim();
  }
  return out;
}

const han = (s) => (s.match(/[\u4e00-\u9fff]/g) || []).length;

const rows = [];
for (const f of files) {
  const md = readFileSync(join(SPECS, f), 'utf8');
  const F = fields(md);
  const f8 = F[8] || '';
  rows.push({
    id: f.replace('.md', ''),
    keys: Object.keys(F).sort((a, b) => a - b).join(','),
    f8, f9: F[9] || '', f10: F[10] || '', f11: F[11] || '', f3: F[3] || '',
    f8han: han(f8), f8chars: f8.replace(/\s/g, '').length,
    f9han: han(F[9] || ''), f11han: han(F[11] || ''), f10han: han(F[10] || ''),
    c: [...f8.matchAll(/C-\d+\.\d+/g)].map((m) => m[0]),
    p: [...f8.matchAll(/P\d+/g)].map((m) => m[0]),
    r: [...f8.matchAll(/R-\d+/g)].map((m) => m[0]),
  });
}
writeFileSync('D:/Web/style/deliverables/65-audit/_raw.json', JSON.stringify(rows, null, 1), 'utf8');

let T8 = 0, T8c = 0, T9 = 0, T11 = 0, T10 = 0;
console.log('id\th8\tc8\th9\th11\th10\tkeys\t首20字');
for (const r of rows) {
  T8 += r.f8han; T8c += r.f8chars; T9 += r.f9han; T11 += r.f11han; T10 += r.f10han;
  console.log([r.id, r.f8han, r.f8chars, r.f9han, r.f11han, r.f10han, r.keys, r.f8.slice(0, 20)].join('\t'));
}
console.log('TOTAL f8 han=' + T8 + ' chars=' + T8c + '  f9=' + T9 + '  f10=' + T10 + '  f11=' + T11);
