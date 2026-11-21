/* 最终全量审核：一条命令跑完全部断言，并把每案的数字摆出来。
 * 这是交付时该跑的那一个脚本 —— 前面的探针是过程，这个是结论。 */
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(import.meta.url), '../../../../');
const R = JSON.parse(readFileSync(join(ROOT, 'deliverables/78-northstar/_probe/_audit-rewrites/rewrites.json'), 'utf8'));
const win = {};
new Function('window', readFileSync(join(ROOT, 'prototypes/_selection/data.js'), 'utf8'))(win);
const S = new Map(win.SCHEMES.map((s) => [s.id, s]));

const L1 = /(?:^|[^A-Za-z0-9])(?:C-\d(?:\.\d+|\s*第\s*\d+\s*条)?|R-\d+|P\d+|0\d-[a-z-]+\.md(?:\s*[A-Z]\s*节)?|[0-9]{1,2}\s*号|方案\s*[0-9]{1,2}|文件\s*[0-9]{2})/g;
const MARKS = /跳脱之处|它故意反/g;
const QUOTE = /「([^」]{3,40})」/g;
const PAREN = /（(?=[^）]*?(?:圆角|投影|渐变|球体|图标|居中|交替|毛玻璃|Emoji|白字|强调色|星级|光标|占位块|噪点|霓虹))[^）]{4,50}）/g;
const OKQ = [/^\d{4}\s*年/, /^可通行区域$/, /^\d+\s*\/\s*\d+$/];
const NEG = /不是[^，。；]{0,20}|没有任何|没有一处|不存在|而不是|而非|不靠|不设|不做|不用|不得|不许|无纯|不参与/g;
const VOID = ['故意留空', '空抽屉', '空白卡', '空白行', '永久留'];

const rows = [];
let fail = 0;
for (const s of win.SCHEMES) {
  const r = R[s.id];
  const problems = [];
  if (!r) problems.push('无改写稿');
  else {
    if (r.before !== s.audit) problems.push('before 不逐字相等');
    const a = r.after;
    const l1 = [...a.matchAll(L1)].map((m) => m[0].trim());
    const q = [...a.matchAll(QUOTE)].map((m) => m[0]).filter((x) => !OKQ.some((re) => re.test(x.slice(1, -1))));
    const p = [...a.matchAll(PAREN)].map((m) => m[0]);
    const mk = [...a.matchAll(MARKS)].map((m) => m[0]);
    const ng = [...a.matchAll(NEG)].map((m) => m[0]);
    if (l1.length) problems.push(`L1:${l1.join(',')}`);
    if (q.length) problems.push(`L2«»:${q.join(',')}`);
    if (p.length) problems.push(`L2():${p.join(',')}`);
    if (mk.length) problems.push(`标记:${mk.join(',')}`);
    if (ng.length) problems.push(`否定:${ng.join(',')}`);
    /* 空位 token */
    const other = Object.keys(s).filter((k) => k !== 'audit').map((k) => {
      const v = s[k];
      return typeof v === 'string' ? v : (v && typeof v === 'object' ? Object.values(v).filter((x) => typeof x === 'string').join('\n') : '');
    }).join('\n');
    const only = VOID.filter((t) => s.audit.includes(t) && !other.includes(t));
    const lost = only.filter((t) => !a.includes(t));
    if (lost.length) problems.push(`空位token丢:${lost.join(',')}`);
    rows.push({ id: s.id, b: s.audit.length, a: a.length, kept: only.filter((t) => a.includes(t)), problems });
  }
  if (problems.length) fail++;
}

console.log('案    改写前  改写后  压缩    状态');
for (const r of rows) {
  const pct = ((r.a / r.b - 1) * 100).toFixed(0);
  console.log(`${r.id}  ${String(r.b).padStart(5)}  ${String(r.a).padStart(5)}  ${(pct + '%').padStart(5)}   ${r.problems.length ? '❌ ' + r.problems.join(' | ') : '✅'}`);
}
console.log('');
const sum = (f) => rows.reduce((a, r) => a + f(r), 0);
console.log(`合计     ${sum((r) => r.b)} → ${sum((r) => r.a)} 字（${(sum((r) => r.a) / sum((r) => r.b) * 100).toFixed(1)}%，少 ${sum((r) => r.b) - sum((r) => r.a)} 字）`);
console.log(`空位 token 保留：${rows.filter((r) => r.kept.length).map((r) => `${r.id}(${r.kept.join(',')})`).join(' ') || '无'}`);
console.log(fail ? `\n❌ ${fail}/${rows.length} 案不合格` : `\n✅ ${rows.length}/35 案全部合格：before 逐字相等，零条款编号、零被禁做法名、零评审标记、零成句否定、空位 token 未丢`);
process.exitCode = fail ? 1 : 0;
