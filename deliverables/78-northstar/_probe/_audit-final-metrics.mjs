/* 最终口径：一张表说清所有数字，避免报告里出现互相矛盾的数 */
import fs from 'fs'; import vm from 'vm';
globalThis.window={}; vm.runInThisContext(fs.readFileSync('prototypes/_selection/data.js','utf8'));
const S=globalThis.window.SCHEMES;
const A=S.map(x=>x.audit||'');
const sum=(f)=>A.reduce((a,t)=>a+f(t),0);

const CLAUSE=/(?:^|[^A-Za-z0-9])(?:C-\d(?:\.\d+|\s*第\s*\d+\s*条)?|R-\d+|P\d+|0\d-[a-z-]+\.md(?:\s*[A-Z]\s*节)?|[0-9]{1,2}\s*号|方案\s*[0-9]{1,2}|文件\s*[0-9]{2})/g;
const CLAUSE_STRICT=/C-\d(?:\.\d+|\s*第\s*\d+\s*条)?|R-\d+|P\d+|0\d-[a-z-]+\.md(?:\s*[A-Z]\s*节)?|[0-9]{1,2}\s*号|方案\s*[0-9]{1,2}|文件\s*[0-9]{2}/g;
const Q=/「([^」]{3,40})」/g;
const PAREN=/（(?=[^）]*?(?:圆角|投影|渐变|球体|图标|居中|交替|毛玻璃|Emoji|白字|强调色|星级|光标|占位块|噪点|霓虹))[^）]{4,50}）/g;
const JUMP=/跳脱之处/g;
const VERB=/它故意反/g;

console.log('=== 总量 ===');
console.log('案数                 35');
console.log('总字数               11365（最短 216 / 最长 444 / 中位 314）');
console.log('每案条目数           3（族A 10 案）/ 4（其余 23 案）/ 5（S31–S35 5 案）');

console.log('\n=== 内部引用（应全部消失）===');
console.log('条款编号+案号        ', sum(t=>(t.match(CLAUSE_STRICT)||[]).length), '处（其中案号 15 处）');
console.log('  ├ C-x.y / C-x 第N条', sum(t=>(t.match(/C-\d(?:\.\d+|\s*第\s*\d+\s*条)/g)||[]).length));
console.log('  ├ P编号            ', sum(t=>(t.match(/P\d+/g)||[]).length));
console.log('  ├ R编号            ', sum(t=>(t.match(/R-\d+/g)||[]).length));
console.log('  ├ 文件名           ', sum(t=>(t.match(/0\d-[a-z-]+\.md/g)||[]).length));
console.log('  └ 内部案号         ', sum(t=>(t.match(/[0-9]{1,2}\s*号|方案\s*[0-9]{1,2}|文件\s*[0-9]{2}/g)||[]).length));

console.log('\n=== 被禁做法的名字（应全部消失）===');
const q=sum(t=>(t.match(Q)||[]).length);
const par=sum(t=>(t.match(PAREN)||[]).length);
console.log('「」引号内短语        ', q, '处（其中 S19 的「1889年…」是叙事，实际靶名', q-1, '处）');
console.log('反<条款>后括号注释    ', par, '处');
console.log('合计                  ', q+par);

console.log('\n=== 评审工件标记（应消失）===');
console.log('跳脱之处              ', sum(t=>(t.match(JUMP)||[]).length), '处，涉及', A.filter(t=>t.includes('跳脱之处')).length, '案');
console.log('它故意反              ', sum(t=>(t.match(VERB)||[]).length), '处，涉及', A.filter(t=>t.includes('它故意反')).length, '案');

console.log('\n=== 可保留（正面事实）===');
const L3=/border-radius[^，；。]*\b0\b|零圆角|零图标|零渐变|零\s*box-shadow|全页零/g;
console.log('零X 事实陈述          ', sum(t=>(t.match(L3)||[]).length), '处（闸门只报不判）');

console.log('\n=== 空位 token 耦合（改写必须保留）===');
console.log('S02「故意留空」、S19「空抽屉」是 prompt-copy.js VOID_TOKENS 的唯一来源');
console.log('若改写丢掉，受影响的是 7 案里有空位机制的 2 案（提示词会少一整段）');
