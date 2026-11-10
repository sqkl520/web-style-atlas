/* 最小可复现：把 check-texture.mjs 的选择器正则单独拿出来跑。
 * 说明为什么它「隔一条规则才看一条」。
 */
const GATE = /(^|\})\s*([^{}]+?)\s*\{([^{}]*)\}/g;

function gateSee(css) {
  const out = [];
  let m;
  GATE.lastIndex = 0;
  while ((m = GATE.exec(css))) out.push({ lead: m[1], sel: m[2].trim(), decls: m[3].trim() });
  return out;
}

console.log('=== 用例 1：三条相邻规则，body 在中间 ===');
const c1 = `html { background: red; }\n\nbody { background-image: url(x.png); }\n\nh1 { color: blue; }`;
console.log('CSS:\n' + c1 + '\n');
for (const r of gateSee(c1)) console.log(`  lead=${JSON.stringify(r.lead)} sel=${JSON.stringify(r.sel)}`);

console.log('\n=== 用例 2：只在 body 前加一个空行（无其他变化）===');
const c2 = `html { background: red; }\n\n\nbody { background-image: url(x.png); }\n\nh1 { color: blue; }`;
for (const r of gateSee(c2)) console.log(`  lead=${JSON.stringify(r.lead)} sel=${JSON.stringify(r.sel)}`);

console.log('\n=== 用例 3：body 是第一块 ===');
const c3 = `body { background-image: url(x.png); }\nh1 { color: blue; }`;
for (const r of gateSee(c3)) console.log(`  lead=${JSON.stringify(r.lead)} sel=${JSON.stringify(r.sel)}`);

console.log('\n=== 用例 4：body 前用行内注释隔开（S02 的真实形态）===');
const c4 = `html { background: red; }\n\nbody {\n  margin: 0;\n  background-image: url(x.png);\n}\n\nh1 { color: blue; }`;
for (const r of gateSee(c4)) console.log(`  lead=${JSON.stringify(r.lead)} sel=${JSON.stringify(r.sel)}`);

console.log('\n结论：正则要求选择器必须紧跟行首 `^` 或 `}`，且中间只允许空白。');
console.log('`}` 被前一次匹配消耗掉之后，下一条规则前面不再有可用锚点 ——');
console.log('于是相邻规则里**只有隔一条**能被看到，body 是否被看到取决于它排第几，');
console.log('而不取决于它有没有挂图。');
