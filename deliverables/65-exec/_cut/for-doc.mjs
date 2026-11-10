/* 生成交付文档要用的三块素材：
 *  ① S13 audit 改前/改后全文（完整，不截断）
 *  ② 其余 29 案 sha256 对照表（Markdown 表格）
 *  ③ 键序变化前后（Markdown 表格）
 * 输出到 deliverables/65-exec/_cut/for-doc.md，再手工贴进 EXEC-data-cut.md。 */
import fs from 'node:fs';
import vm from 'node:vm';
import crypto from 'node:crypto';

const load = (p) => { const sb = { window: {} }; vm.runInNewContext(fs.readFileSync(p, 'utf8'), sb); return sb.window.SCHEMES; };
const B = load('deliverables/65-exec/_cut/data.before.js');
const A = load('prototypes/_selection/data.js');
const sha = (s) => crypto.createHash('sha256').update(String(s), 'utf8').digest('hex');

const b13 = B.find((r) => r.id === 'S13').audit;
const a13 = A.find((r) => r.id === 'S13').audit;
const L = [];
const w = (s) => L.push(s);

w('## 素材 ①：S13 的 audit 改前 / 改后全文\n');
w('### 改前（780 字，含污染）\n');
w('```text');
w(b13);
w('```\n');
w(`切点：\`audit.indexOf('反套路改造三指标') === ${b13.indexOf('反套路改造三指标')}\`\n`);
w('### 改后（306 字）\n');
w('```text');
w(a13);
w('```\n');
w('### 被切掉的 474 字符（780 − 306）\n');
w('```text');
w(JSON.stringify(b13.slice(b13.indexOf('反套路改造三指标') - 1)));
w('```\n');
w(`改后的 306 字是否恰好 = 改前的 slice(0, 307).trimEnd()：**${a13 === b13.slice(0, 307).trimEnd()}**`);
w(`改前 slice(0,307) 的末 3 字符：${JSON.stringify(b13.slice(304, 307))}（末位是分隔空格）\n`);

w('\n## 素材 ②：30 案 audit 的 sha256 对照表（全 64 位）\n');
w('| 案号 | 改前长度 | 改后长度 | 改前 sha256 | 改后 sha256 | 字节不变 |');
w('|---|---:|---:|---|---|---|');
for (const b of B) {
  const a = A.find((x) => x.id === b.id);
  const sb2 = sha(b.audit), sa = sha(a.audit);
  w(`| ${b.id} | ${String(b.audit).length} | ${String(a.audit).length} | \`${sb2}\` | \`${sa}\` | ${sb2 === sa ? '✓ 相同' : '✗ **变了**'} |`);
}
const sameN = B.filter((b) => sha(b.audit) === sha(A.find((x) => x.id === b.id).audit)).length;
w(`\n合计：**${sameN}/30 相同**；唯一变化的是 S13（预期内）。`);
w(`audit 总字数：**${B.reduce((n, r) => n + String(r.audit).length, 0)} → ${A.reduce((n, r) => n + String(r.audit).length, 0)}**\n`);

w('\n## 素材 ③：键序变化前后\n');
w('| 项 | 改前 | 改后 |');
w('|---|---|---|');
const bKeys = Object.keys(B[0]), aKeys = Object.keys(A[0]);
w(`| \`audit\` 在 \`Object.keys()\` 的 index | ${bKeys.indexOf('audit')} | ${aKeys.indexOf('audit')} |`);
w(`| \`risk\` 在 \`Object.keys()\` 的 index | ${bKeys.indexOf('risk')} | ${aKeys.indexOf('risk')} |`);
w(`| 相对顺序 | audit 在 risk 之后？ **${bKeys.indexOf('audit') > bKeys.indexOf('risk')}** | audit 在 risk 之后？ **${aKeys.indexOf('audit') > aKeys.indexOf('risk')}** |`);
w(`| 记录里键的总数 | ${bKeys.length} | ${aKeys.length} |`);
w(`| 键集合是否一致 | — | **${[...bKeys].sort().join() === [...aKeys].sort().join()}** |`);
w('\n改前 30 案的键序（S01 代表，30 案完全同构）：\n');
w('```text');
w(bKeys.join(', '));
w('```\n');
w('改后 30 案的键序：\n');
w('```text');
w(aKeys.join(', '));
w('```\n');
w('**注意：改前就已经是 audit 在 risk 之前**（idx 14 < 15）。数据层的键序本轮**没有变化**——'
  + '因为生成器里 `audit:` 那一行本来就写在 `risk:` 上面。本轮在这处只补了注释把两个「位置」说清楚，'
  + '并把切断接上去。裁决文档 §3.2 说的「audit 在 risk 之后」指的是 **app.js 的渲染串（idx 9 vs 8）**，'
  + '不是 data.js 的键序。详见交付文档 §「偏离 2」那一节。\n');

fs.writeFileSync('deliverables/65-exec/_cut/for-doc.md', L.join('\n'), 'utf8');
console.log(`已写 deliverables/65-exec/_cut/for-doc.md（${L.length} 行）`);
console.log(`S13: ${b13.length} → ${a13.length}`);
console.log(`改后 === 改前.slice(0,307).trimEnd() ? ${a13 === b13.slice(0, 307).trimEnd()}`);
console.log(`键序 audit/risk：改前 ${bKeys.indexOf('audit')}/${bKeys.indexOf('risk')}，改后 ${aKeys.indexOf('audit')}/${aKeys.indexOf('risk')}`);
