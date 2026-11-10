// 探针 31：误检风险 —— 30 份 md 里所有「行首数字 + 冒号」的行，逐条判断是真标题还是正文
import { readSpec, specIds } from './lib-load.mjs';

// 当前生效的 R1：^(digits)(-附|.)\s*(name)：
const R1 = /^(\d{1,2})(-附|[.．])\s*([^\n：*\d][^\n：*]{0,38}?)：/gm;

console.log('=== R1 命中的全部行（当前正则），标注是否是真字段标题 ===');
const CANON = new Set(['一句话视觉定义', '机制', '美学家族与参考', '配色系统', '字体策略', '布局与网格', '关键视觉元素',
  '动效与交互', '去 AI 味审查点', '反 AI 味风险与规避', '适用场景', '可落地要点', '设计师签名式怪癖']);
let total = 0, realTitle = 0, falsePos = 0;
const fps = [];
for (const id of specIds()) {
  const text = readSpec(id);
  for (const m of text.matchAll(R1)) {
    total++;
    const lineNo = text.slice(0, m.index).split(/\r?\n/).length;
    const key = m[3].replace(/（[^）]*）/g, '').trim();
    const isReal = CANON.has(key) || /^去掉名字之后的机制$/.test(key) || key === '';
    if (isReal) realTitle++;
    else { falsePos++; fps.push(`${id}:${lineNo}  num=${m[1]} sep="${m[2]}" key="${key}"`); }
  }
}
console.log(`R1 命中 ${total} 行；判定为真标题 ${realTitle}；判定为误检 ${falsePos}`);
for (const f of fps) console.log('  ⚠ ' + f);

console.log('\n=== 全库「行首 1–2 位数字 + 任意内容 + 冒号」但**不带**点或 -附的行（R1 现在挡掉了）===');
const BARE = /^(\d{1,2})(?![-.．\d])\s*([^\n：*\d][^\n：*]{0,60}?)：/gm;
for (const id of specIds()) {
  const text = readSpec(id);
  for (const m of text.matchAll(BARE)) {
    const lineNo = text.slice(0, m.index).split(/\r?\n/).length;
    console.log(`  ${id}:${lineNo}  "${m[0].slice(0, 70)}"`);
  }
}

console.log('\n=== 结论：这 7 条裸数字行若被当成标题，会砍掉哪些字段 ===');
console.log('（这与 HEAD 版本的 bug 同源：分隔符可选 ⇒ 正文首句被吃成标题）');
