import { readFileSync } from 'node:fs';
const src = readFileSync('D:/Web/style/prototypes/_selection/data.js', 'utf8');
const D = JSON.parse(src.replace(/^[\s\S]*?window\.SCHEMES\s*=\s*/, '').replace(/;\s*$/, ''));
const ch = (s) => String(s || '').replace(/\s/g, '').length;

/* 关键：C 编号后面是否紧跟「规则名」（引号或括号里的白话解释）？
 *   S15: 反 C-1.6「白 / 灰交替分区」            → 有 gloss，自解释
 *   S13: 反 C-1.4 与 C-2.14「Emoji 图标与三等量图标网格」→ 有 gloss
 *   S13: 第四，反 C-4 与 R-28：                    → 无 gloss
 *   S22: 反 C-2 第 17 条（毛玻璃吸顶导航加渐变文字）→ 有 gloss（括号）
 * 统计：带 gloss 的引用 vs 裸引用。 */
const re = /反\s*(?:文件\s*01\s*的\s*)?(?:`?01-research-brief\.md`?\s*F\s*节\s*)?((?:C-\d+(?:\.\d+|\s*第\s*\d+\s*条)?|R-\d+|P\d+)(?:\s*(?:与|、|和)\s*(?:C-\d+(?:\.\d+|\s*第\s*\d+\s*条)?|R-\d+|P\d+))*)[^\n]{0,40}/g;

let withGloss = 0, bare = 0, tot = 0;
const bareList = [];
for (const r of D) {
  for (const m of r.audit.matchAll(re)) {
    const tail = m[0];
    const hasG = /[「（(]/.test(tail.slice(m[1].length));
    const hasFile = /01-research-brief/.test(tail);
    tot++;
    if (hasG || hasFile) withGloss++; else { bare++; bareList.push(r.id + ': ' + tail.replace(/\s+/g, ' ').slice(0, 70)); }
  }
}
console.log('=== 字段8 里的规则引用：带不带白话解释（gloss）===');
console.log('  引用出现次数合计 ' + tot + '；自带「规则名」或（解释）的 ' + withGloss + '（' + (withGloss / tot * 100).toFixed(0) + '%）；裸编号 ' + bare + '（' + (bare / tot * 100).toFixed(0) + '%）');
console.log('\n--- 裸编号实例（读者不查法典就读不懂的那几句）---');
bareList.forEach((b) => console.log('  ' + b));

/* 再量：如果把「反 C-1.6」这种编号前缀整个删掉，句子还剩多少字、还读得通吗？ */
console.log('\n=== 删掉编号前缀后的可读字数 ===');
let before = 0, after = 0;
for (const r of D) {
  before += ch(r.audit);
  after += ch(r.audit.replace(/反\s*(?:文件\s*01\s*的\s*)?(?:`?01-research-brief\.md`?\s*F\s*节\s*)?(?:C-\d+(?:\.\d+|\s*第\s*\d+\s*条)?|R-\d+|P\d+)(?:\s*(?:与|、|和)\s*(?:C-\d+(?:\.\d+|\s*第\s*\d+\s*条)?|R-\d+|P\d+))*/g, ''));
}
console.log('  原始 ' + before + ' 字 → 删掉编号 ' + after + ' 字（编号占 ' + (before - after) + ' 字 = ' + ((before - after) / before * 100).toFixed(1) + '%）');

/* 注释性括号（"理由：…"）占比 */
let reason = 0;
for (const r of D) {
  for (const m of r.audit.matchAll(/[（(][^）)]*理由[^）)]*[）)]/g)) reason += ch(m[0]);
}
console.log('  「（理由：…）」类注释合计 ' + reason + ' 字 = ' + (reason / before * 100).toFixed(1) + '%（解释为什么这个色值有出处）');
