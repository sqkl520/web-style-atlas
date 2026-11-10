/* 扫描「评审工件标记」在 30 案里的分布。
 * 两个层面都要扫，只看一个不够：
 *   A. data.js 的全部键（33 键 × 30 案）—— 回答「数据层现在还有谁脏」；
 *   B. prototypes/_specs/Sxx.md 原文 —— 回答「源文件里到底有几处」，因为
 *      collect-schemes 的字段切分会把无编号小节吞进上一个字段，位置可能不在 audit。
 * 判定串（四条）：反套路改造三指标 / 打勾 / 供 V-11 / 必须存在 X */
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';

const MARKS = ['反套路改造三指标', '打勾', '供 V-11', '必须存在 X', '必须不存在 Y', '必须可测量 Z'];
/* 可选第一个参数 = 要扫的 data.js 路径（缺省扫当前产物）。
 * 有了它，同一份脚本既能扫「改前快照」也能扫「现在的 data.js」，
 * 于是「改前 6 处、改后 0 处」这两组数是同一个判据算出来的，不是两次手抄。 */
const DATA = process.argv[2] || 'prototypes/_selection/data.js';
const src = fs.readFileSync(DATA, 'utf8');
const sb = { window: {} };
vm.runInNewContext(src, sb);
const recs = sb.window.SCHEMES;

console.log(`扫描对象：${DATA}（${recs.length} 案）`);
console.log('═══ A. data.js：30 案 × 全部键，命中标记的字段 ═══');
let hitsA = 0;
for (const r of recs) {
  for (const k of Object.keys(r)) {
    const v = typeof r[k] === 'string' ? r[k] : JSON.stringify(r[k] || '');
    for (const m of MARKS) {
      if (v.includes(m)) { console.log(`  ${r.id}.${k}  ←「${m}」 (字段长度 ${v.length})`); hitsA++; }
    }
  }
}
console.log(`  A 合计命中 ${hitsA} 处`);

console.log('\n═══ B. _specs/Sxx.md 原文：命中的行 ═══');
let hitsB = 0;
for (let i = 1; i <= 30; i++) {
  const id = 'S' + String(i).padStart(2, '0');
  const p = path.join('prototypes/_specs', id + '.md');
  if (!fs.existsSync(p)) { console.log(`  ${id} 无 md`); continue; }
  const lines = fs.readFileSync(p, 'utf8').split(/\r?\n/);
  lines.forEach((ln, n) => {
    for (const m of MARKS) {
      if (ln.includes(m)) { console.log(`  ${id}.md:${n + 1}  ←「${m}」  ${ln.slice(0, 60)}`); hitsB++; }
    }
  });
}
console.log(`  B 合计命中 ${hitsB} 处`);

console.log('\n═══ C. 只有 audit 字段时，谁脏 ═══');
const dirty = recs.filter((r) => MARKS.some((m) => String(r.audit || '').includes(m))).map((r) => r.id);
console.log('  audit 含标记的案：' + (dirty.join(' ') || '无'));
