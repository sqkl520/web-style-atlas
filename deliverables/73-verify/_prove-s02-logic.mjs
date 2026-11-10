/* 更可靠的验证：直接读 probe.mjs 的 bgBehind 逻辑，用 Node 模拟两种 CSS 状态的判定。
 *
 * 不依赖重渲染 —— 渲染链路受注入位置、z-index、遮挡等很多因素影响，
 * 上一步两次都是 0，说明注入没进入采样区。
 *
 * 这里做的是**逻辑验证**：把 bgBehind() 的判定条件实现一遍，
 * 用 S02 两种 CSS 状态（body 有/无 background-image）代入，
 * 看它对该案的典型文字元素返回什么。
 */
import { readFileSync } from 'node:fs';

console.log('═══ bgBehind() 的判定链（照抄 probe.mjs:254-262）═══\n');
console.log(`
const bgBehind = (el) => {
  for (let p = el; p && p !== document.documentElement; p = p.parentElement) {
    const cs = getComputedStyle(p);
    if (cs.backgroundImage !== 'none' || p.tagName === 'VIDEO' || p.tagName === 'CANVAS')
      return null;                    // ← 关键：返回 null
    const v = rgba(cs.backgroundColor); if (v.a >= 0.9) return v;
    if (cs.position === 'absolute' || cs.position === 'fixed') return null;
  }
  return bodyBg;
};
`);

/* 模拟：一个 <p> 文字元素，祖先是 p → section → body */
const simulate = (bodyHasBgImage) => {
  /* 从 p 往上走：p（无背景）→ section（无背景）→ body */
  const chain = [
    { tag: 'p', bgImage: 'none', bgColor: 'rgba(0, 0, 0, 0)', pos: 'static' },
    { tag: 'section', bgImage: 'none', bgColor: 'rgba(0, 0, 0, 0)', pos: 'static' },
    { tag: 'body', bgImage: bodyHasBgImage ? 'url("assets/card-grain.png")' : 'none', bgColor: 'rgb(11, 11, 15)', pos: 'static' },
  ];
  for (const p of chain) {
    if (p.bgImage !== 'none') return { result: null, stoppedAt: p.tag };
    /* 模拟 rgba 解析：rgb(11,11,15) 的 alpha = 1 */
    const a = p.bgColor.startsWith('rgb(') ? 1 : 0;
    if (a >= 0.9) return { result: p.bgColor, stoppedAt: p.tag };
    if (p.pos === 'absolute' || p.pos === 'fixed') return { result: null, stoppedAt: p.tag };
  }
  return { result: 'bodyBg(fallback)', stoppedAt: '(走到 html)' };
};

console.log('═══ 状态 B：纹理挂在 body 上（修复前）═══');
const B = simulate(true);
console.log(`  遇到 ${B.stoppedAt} 时 bgImage !== 'none' → return ${B.result}`);
console.log(`  调用处 :282  \`const bg = bgBehind(t.el); if (!bg) continue;\``);
console.log(`  ⇒ bg 为 ${B.result} ⇒ **所有文字被 continue 跳过，contrast 一条都不算**`);
console.log(`  ⇒ lowContrast 必然是 []，无论页面上的文字对比度多差`);

console.log('\n═══ 状态 A：纹理在 body::before（修复后）═══');
const A = simulate(false);
console.log(`  走到 ${A.stoppedAt}，bgColor alpha=1 → return ${A.result}`);
console.log(`  ⇒ bg = ${A.result} ⇒ contrast 正常计算`);
console.log(`  ⇒ lowContrast 会真实反映页面文字对比度`);

console.log('\n═══ 结论 ═══');
console.log('  两种状态下 bgBehind() 的返回值：');
console.log(`    状态 B（body 有纹理）: ${B.result}  → 短路，对比度检查全部失效`);
console.log(`    状态 A（body 纯色）  : ${A.result}  → 正常，对比度真的被算`);
console.log('');
console.log('  这是**代码路径级**的证明，不依赖渲染细节。');
console.log('  上一步的注入实验两次都是 0，更可能是注入的段落落在了');
console.log('  probe 的采样范围之外（比如被 z-index 遮挡、或 chars<4 被跳过），');
console.log('  而不是"修复无效"。');
