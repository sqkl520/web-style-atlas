// 探针 3：把 Lead 的「26,096 字蒸发」这个数字拆开，看哪种口径能复现它。
// 同时统计「去 AI 味审查点」的真实体量与分布（是给终端用户看的吗）。
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { PROTO, dec } from './_rt_lib.mjs';

const SPECS = join(PROTO, '_specs');
const ids = readdirSync(PROTO, { withFileTypes: true })
  .filter((d) => d.isDirectory() && /^S\d{2}-/.test(d.name)).map((d) => d.name.slice(0, 3)).sort();

const FIELDS = ['一句话视觉定义', '机制', '美学家族与参考', '配色系统', '字体策略', '布局与网格', '关键视觉元素', '动效与交互', '去 AI 味审查点', '反 AI 味风险与规避', '适用场景', '可落地要点', '设计师签名式怪癖'];

// 复刻 collect 的切分（同 _rt_p2）
function parse(text) {
  const starts = [];
  const NAME = '([^\\n：*\\d][^\\n：*]{0,38}?)';
  for (const m of text.matchAll(new RegExp('^(\\d{1,2})(-附)?[.．]?\\s*' + NAME + '：', 'gm'))) starts.push({ i: m.index, end: m.index + m[0].length, key: m[3] });
  for (const m of text.matchAll(new RegExp('^\\*\\*(\\d{1,2})(-附)?[.．]?\\s*' + NAME + '\\*\\*\\s*$', 'gm'))) starts.push({ i: m.index, end: m.index + m[0].length, key: m[3] });
  for (const m of text.matchAll(new RegExp('^(\\d{1,2})(-附)?[.．]?\\s*\\*\\*' + NAME + '\\*\\*\\s*[：:]', 'gm'))) starts.push({ i: m.index, end: m.index + m[0].length, key: m[3] });
  starts.sort((a, b) => a.i - b.i);
  const tailRe = /^\s*(?:\*\*)?(?:真实上站文案|自评|版本|校验|审查)(?:\*\*)?\s*[：:]/m;
  const tailM = tailRe.exec(text.slice(starts.length ? starts[0].i : 0));
  const tailAbs = tailM && starts.length ? starts[0].i + tailM.index : text.length;
  const fields = {};
  for (let i = 0; i < starts.length; i++) {
    const key = starts[i].key.replace(/（[^）]*）/g, '').trim();
    let to = i + 1 < starts.length ? starts[i + 1].i : tailAbs;
    if (to > tailAbs) to = tailAbs;
    const seg = dec(text.slice(starts[i].end, to));
    if (key && !fields[key]) fields[key] = seg;
  }
  return fields;
}

const rows = [];
for (const id of ids) rows.push({ id, f: parse(readFileSync(join(SPECS, id + '.md'), 'utf8')) });

const sumChars = (k) => rows.reduce((a, r) => a + (r.f[k] || '').length, 0);
const sumBytes = (k) => rows.reduce((a, r) => a + Buffer.byteLength(r.f[k] || '', 'utf8'), 0);

console.log('=== 单字段体量（chars / UTF-8 bytes） ===');
for (const f of FIELDS) {
  console.log(`${String(sumChars(f)).padStart(6)} chars  ${String(sumBytes(f)).padStart(6)} bytes   ${f}`);
}

const unused = ['机制', '去 AI 味审查点'];
console.log('');
console.log('=== 「两个死字段」在三种口径下的合计 ===');
console.log('  chars 合计: ' + unused.reduce((a, k) => a + sumChars(k), 0));
console.log('  bytes 合计: ' + unused.reduce((a, k) => a + sumBytes(k), 0));

const used = FIELDS.filter((f) => !unused.includes(f));
console.log('');
console.log('=== 参考：正在被消费的 11 个字段 ===');
console.log('  chars 合计: ' + used.reduce((a, k) => a + sumChars(k), 0));
console.log('  bytes 合计: ' + used.reduce((a, k) => a + sumBytes(k), 0));

console.log('');
console.log('=== 26,096 的候选口径试算 ===');
const cands = {
  '去AI味审查点 chars': sumChars('去 AI 味审查点'),
  '去AI味审查点 bytes': sumBytes('去 AI 味审查点'),
  '去AI味+机制 chars': sumChars('去 AI 味审查点') + sumChars('机制'),
  '去AI味+机制 bytes': sumBytes('去 AI 味审查点') + sumBytes('机制'),
  '去AI味+机制+反AI风险 chars': sumChars('去 AI 味审查点') + sumChars('机制') + sumChars('反 AI 味风险与规避'),
  '去AI味+机制+反AI风险 bytes': sumBytes('去 AI 味审查点') + sumBytes('机制') + sumBytes('反 AI 味风险与规避'),
  '13 字段全量 chars': FIELDS.reduce((a, k) => a + sumChars(k), 0),
  '13 字段全量 bytes': FIELDS.reduce((a, k) => a + sumBytes(k), 0),
};
for (const [k, v] of Object.entries(cands)) console.log(`  ${String(v).padStart(6)}  ${k}` + (Math.abs(v - 26096) < 400 ? '   ← 接近 26,096' : ''));

console.log('');
console.log('=== 「去 AI 味审查点」按案分布（判断它是不是终端文本） ===');
const vals = rows.map((r) => ({ id: r.id, n: (r.f['去 AI 味审查点'] || '').length }));
vals.sort((a, b) => b.n - a.n);
console.log('最大 ' + vals[0].id + '=' + vals[0].n + '｜最小 ' + vals[vals.length - 1].id + '=' + vals[vals.length - 1].n +
  '｜中位 ' + vals.map((v) => v.n).sort((a, b) => a - b)[15]);
console.log('S11–S20 小计: ' + vals.filter((v) => +v.id.slice(1) >= 11 && +v.id.slice(1) <= 20).reduce((a, v) => a + v.n, 0));
console.log('S01–S10 小计: ' + vals.filter((v) => +v.id.slice(1) <= 10).reduce((a, v) => a + v.n, 0));
console.log('S21–S30 小计: ' + vals.filter((v) => +v.id.slice(1) >= 21).reduce((a, v) => a + v.n, 0));

console.log('');
console.log('=== 该字段里有几个不同的 C-编号 / 条款引用？ ===');
const all = rows.map((r) => r.f['去 AI 味审查点'] || '').join('\n');
const cRefs = new Set([...all.matchAll(/C-\d+[\.\s]?\d*/g)].map((m) => m[0]));
const pRefs = new Set([...all.matchAll(/P\d+/g)].map((m) => m[0]));
const rRefs = new Set([...all.matchAll(/R-\d+/g)].map((m) => m[0]));
console.log('C-* 条款 ' + cRefs.size + ' 种；P* 条款 ' + pRefs.size + ' 种；R-* 条款 ' + rRefs.size + ' 种');
console.log('样例：' + [...cRefs].slice(0, 12).join(' ') + ' …');
