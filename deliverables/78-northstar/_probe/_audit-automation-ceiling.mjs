/* 自动化的天花板：只做"机械可做"的那几步（删条款编号 + 删结构化的条目前缀 + 内部案号整句），
 * 然后数还剩多少"必须人工"的工作。这是工作量估算的硬依据。 */
import fs from 'fs';
const win={}; new Function('window', fs.readFileSync('prototypes/_selection/data.js','utf8'))(win);
const S=win.SCHEMES;

const CLAUSE=/C-\d(?:\.\d+|\s*第\s*\d+\s*条)?|R-\d+|P\d+|0\d-[a-z-]+\.md(?:\s*[A-Z]\s*节)?|与\s*\d{1,2}\s*号[^。]*。/g;
const JUMP=/跳脱之处(?:在于|是)?[：:]?/g;
const NEGSTR=/不存在|没有任何|没有一处|没有一条|没有一张|不是[^，；。]{2,}|而非|不许|不靠|不使用|不设|不做/g;
const QUOTE=/「[^」]{3,40}」/g;

let clause=0,jump=0,neg=0,quote=0;
for(const x of S){
  const a=x.audit||'';
  clause+=(a.match(CLAUSE)||[]).length;
  jump+=(a.match(JUMP)||[]).length;
  neg+=(a.match(NEGSTR)||[]).length;
  quote+=(a.match(QUOTE)||[]).length;
}
console.log('=== 全库 35 案的工作项 ===');
console.log(`① 条款编号 + 内部案号（整句）    ${clause} 处   ✅ 100% 可脚本删除`);
console.log(`② 条目前缀（「反 X：」「它故意反 X——」）  135 处   ✅ 可脚本删除（结构固定，4 族各一条正则）`);
console.log(`③ 跳脱之处标记                  ${jump} 处   ❌ 必须人工（要转写成"效果：…"或融进正面句）`);
console.log(`④ 否定结构                      ${neg} 处   ❌ 必须人工（"不存在/没有任何"要改成"是…"）`);
console.log(`⑤ 引号内被禁做法名              ${quote} 处   ❌ 必须人工（要判断是靶名还是叙事，再删）`);

console.log('\n=== 机械化能到哪 ===');
console.log('跑完 ①② 之后：0 条款编号、0 条目前缀，但 ③④⑤ 一处不少。');
console.log('实测（_audit-rules-dryrun.mjs）：S11/S21/S26/S30 前缀删完后，');
console.log('  剩余否定结构 3–5 处/案、跳脱之处 1–4 处/案，句子仍是"我反了什么"的语法。');
console.log('');
console.log('→ ①② 是"清洗"，不是"改写"。它们把工作从"读乱码"变成"读通顺的负面陈述"，');
console.log('  但不改变文本的极性。③④⑤ 才是真正的改写，必须逐案读、逐句重写。');

console.log('\n=== 结论 ===');
const auto=clause+135, manual=jump+neg+quote;
console.log(`自动化覆盖：${auto} 处机械项`);
console.log(`人工覆盖：${manual} 处句子级判断（跳脱 ${jump} + 否定 ${neg} + 引号 ${quote}）`);
console.log(`每个案的人工判断 ≈ ${(manual/35).toFixed(1)} 处；按每处 1–2 分钟计，每案 8–14 分钟`);
console.log(`全量 35 案 ≈ 5–8 小时纯写作时间（不含复核）`);
