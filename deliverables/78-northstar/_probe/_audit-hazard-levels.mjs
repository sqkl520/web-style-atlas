/* 三层风险分类 —— 这决定了闸门到底该禁什么
 *  L1 内部条款编号：零信息，100% 必删（机械可删）
 *  L2 被禁/退化做法的**名字**：与"点名即加权"直接冲突，必须删（机械可定位，人工改写）
 *  L3 属性值的平铺否定（border-radius: 0 / 零圆角 / 没有一条横线）：低风险，可保留
 */
import fs from 'fs'; import vm from 'vm';
globalThis.window={}; vm.runInThisContext(fs.readFileSync('prototypes/_selection/data.js','utf8'));
const S=globalThis.window.SCHEMES;

const L1=/C-\d+(?:\.\d+|\s*第\s*\d+\s*条)?|R-\d+|P\d+|0\d-[a-z-]+\.md/g;
/* L2 的判据：①「…」引号内 = 被禁做法的名字；② 反 C-x 之后紧跟的括号注释 */
const L2Q=/「[^」]{3,40}」/g;
const L2P=/（(?=[^）]*?(?:圆角|投影|渐变|球体|图标|居中|交替|毛玻璃|Emoji|白字|强调色|星级))[^）]{4,50}）/g;
/* L3：属性值的否定 */
const L3=/border-radius[^，；。]*0|零圆角|零图标|零渐变|零 box-shadow|没有任何|不存在|没有一条|没有一处|没有一张|全页无纯|全页零/g;

let t1=0,t2=0,t3=0;
const perCase=[];
for(const x of S){
  const a=x.audit||'';
  const n1=(a.match(L1)||[]).length, n2=(a.match(L2Q)||[]).length+(a.match(L2P)||[]).length, n3=(a.match(L3)||[]).length;
  t1+=n1;t2+=n2;t3+=n3;
  perCase.push({id:x.id,n1,n2,n3});
}
console.log(`L1 内部条款编号        ${t1} 处  → 机械可删，零信息损失`);
console.log(`L2 被禁做法的名字      ${t2} 处  → 必须改写（这是"点名即加权"的载体）`);
console.log(`L3 属性值的平铺否定    ${t3} 处  → 高风险低，可保留或轻改`);

console.log('\n按案分布（L1/L2/L3）：');
const pad=(s,n)=>String(s).padEnd(n);
for(const p of perCase) console.log(`  ${p.id}  ${pad(p.n1,4)}${pad(p.n2,4)}${p.n3}`);

/* 关键问题：只删 L1+L2、保留 L3，还剩多少"反 X"结构？
   即：改写的工作量到底是"删三层"还是"重写句子"？ */
console.log('\n=== 工作量关键指标：删掉 L1+L2 后，句子还剩几成可读 ===');
const VERB=/反\s*(?:C-|R-|P\d|0\d-)|它故意反|跳脱之处/g;
let vtot=0;
for(const x of S) vtot+=(x.audit.match(VERB)||[]).length;
console.log(`  「反<条款>」/「它故意反」/「跳脱之处」共 ${vtot} 处 —— 每一个都是一次句子级手术，不是一次删除`);
console.log(`  平均每案 ${(vtot/35).toFixed(1)} 处 × 35 案`);
