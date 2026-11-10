// 探针 21：核实「反套路改造三指标」这块内容在 30 案里的分布 —— 为什么只有 S13 活下来。
// 这是 WIP 的 audit 字段新暴露出来的不对称。
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { PROTO, loadData } from './_rt_lib.mjs';

const SPECS = join(PROTO, '_specs');
const ids = readdirSync(PROTO, { withFileTypes: true })
  .filter((d) => d.isDirectory() && /^S\d{2}-/.test(d.name)).map((d) => d.name.slice(0, 3)).sort();
const D = loadData();

console.log('=== 「反套路改造三指标」在 30 份 spec 里的出现形态 ===');
console.log('案   在spec里出现  以独立 3-附 行写  写在字段8正文里  data.audit 是否含它');
const lost = [], kept = [];
for (const id of ids) {
  const t = readFileSync(join(SPECS, id + '.md'), 'utf8');
  const inSpec = t.includes('反套路改造三指标');
  const asAtt = /^\s*(?:\*\*)?3-附[（(]反套路改造三指标[）)]/m.test(t);
  const r = D.find((x) => x.id === id);
  const inAudit = (r.audit || '').includes('反套路改造三指标');
  if (inSpec) {
    console.log(`${id}  ${String(inSpec).padEnd(13)} ${String(asAtt).padEnd(16)} ${String(!asAtt).padEnd(16)} ${inAudit}`);
    if (asAtt && !inAudit) lost.push(id);
    if (inAudit) kept.push(id);
  }
}
console.log('');
console.log('spec 里写了这块内容的案：' + (kept.concat(lost).join(' ') || '无'));
console.log('★ 内容保住的：' + (kept.join(' ') || '无'));
console.log('★ 内容丢掉的：' + (lost.join(' ') || '无') + `（${lost.length} 案）`);
console.log('');
console.log('机制：');
console.log('  S03 / S08 把它写成**独立的 `3-附（反套路改造三指标）：` 行** ⇒ 键剥空 ⇒ collect-schemes 整段丢弃');
console.log('  S13 把它**接在字段 8 正文末尾**（同一段内，无 `3-附` 标记）⇒ 被 audit 字段完整收进来');
console.log('  ⇒ 同一类内容，只因为换行位置不同，一存一亡。');

// 精确字数
const seg = {};
for (const id of ['S03', 'S08']) {
  const t = readFileSync(join(SPECS, id + '.md'), 'utf8');
  const m = /^\s*(?:\*\*)?(\d{1,2})-附[（(]反套路改造三指标[）)][：:]\s*([\s\S]*?)(?=\n\s*(?:\*\*)?\d{1,2}[.．]|$)/m.exec(t);
  seg[id] = m ? m[2].replace(/\s+/g, ' ').trim().length : 0;
}
console.log('');
console.log('被丢弃的字节数：S03 = ' + seg.S03 + ' 字，S08 = ' + seg.S08 + ' 字，合计 ' + (seg.S03 + seg.S08));
console.log('对照：S13 的 audit 里这块内容 = ' + (() => {
  const a = D.find((x) => x.id === 'S13').audit;
  const i = a.indexOf('反套路改造三指标');
  return a.length - i;
})() + ' 字（保留下来了）');
