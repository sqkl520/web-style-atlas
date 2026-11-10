// 把「站点对外显示的每个数字」和「它自己的判据实测值」逐条对账。
// 这个仓库最反复的病症是：闸门全绿 + 数字在对外说谎。所以先对一遍。
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
const ctx = { window: {} }; vm.createContext(ctx);
vm.runInContext(readFileSync('prototypes/_selection/data.js', 'utf8'), ctx);
vm.runInContext(readFileSync('prototypes/_selection/prompts.js', 'utf8'), ctx);
const S = ctx.window.SCHEMES, P = ctx.window.STYLE_PROMPTS;

const gateFail0 = S.filter((s) => !s.gate || !(s.gate.fail > 0)).length;
const gateFailTotal = S.reduce((a, s) => a + ((s.gate && s.gate.fail) || 0), 0);
const shots = (() => { let n = 0; for (const s of S) for (const k of ['desktop', 'tablet', 'mobile']) n += ((s.shots && s.shots[k]) || []).length; return n; })();

// 提示词长度（用 check-prompts 同口径：buildStylePrompt 的输出长度）
const promptLens = (() => {
  const ctx2 = { window: {} }; vm.createContext(ctx2);
  vm.runInContext(readFileSync('prototypes/_selection/prompts.js', 'utf8'), ctx2);
  return null; // 真实长度要跑 prompt-copy.js，这里不做（需要 DOM）
})();

console.log('=== 站点对外声明的数字 vs 实测 ===');
const claims = [
  ['方案总数 30', 30, S.length],
  ['闸门 FAIL=0 的案数 26', 26, gateFail0],
  ['FAIL 总数 8（README 写"8 remaining gate failures"）', 8, gateFailTotal],
  ['暖浅色带 18 案（HSL 判据）', 18, S.filter((s) => s.axes.band === '暖浅色带').length],
  ['中间明度带 1 案（HSL 判据）', 1, S.filter((s) => s.axes.band === '中间明度带').length],
  ['冷暗带 5', 5, S.filter((s) => s.axes.band === '冷暗带').length],
  ['暖暗带 3', 3, S.filter((s) => s.axes.band === '暖暗带').length],
  ['中性浅带 2', 2, S.filter((s) => s.axes.band === '中性浅带').length],
  ['冷浅色带 1', 1, S.filter((s) => s.axes.band === '冷浅色带').length],
  ['行业词 44', 44, Object.keys(P.sceneIndex).length],
  ['直连行业 16', 16, Object.keys(P.sceneIndex).filter((t) => P.sceneIndex[t].direct.length).length],
  ['unsupported 29', 29, P.unsupported.length],
  ['截图 272 张（README-EN 写）', 272, shots],
  ['结构标签 22 个', 22, new Set(S.map((s) => s.structure)).size],
  ['低门槛 11 / 中 12 / 高 7', '11/12/7', (() => { const t = {}; S.forEach((s) => (t[s.threshold] = (t[s.threshold] || 0) + 1)); return t['低'] + '/' + t['中'] + '/' + t['高']; })()],
];
let bad = 0;
for (const [name, want, got] of claims) {
  const ok = String(want) === String(got);
  if (!ok) bad++;
  console.log((ok ? '  ✓ ' : '  ✗ ') + name.padEnd(46) + ' 实测 ' + got);
}
console.log('\n对不上的:', bad, '条');

console.log('\n=== 真实图片总数分布（向导 img 轴的分母）===');
const rp = S.map((s) => (s.gate && s.gate.realPictures) || 0).sort((a, b) => a - b);
console.log('min', rp[0], 'median', rp[15], 'max', rp[29], ' 合计', rp.reduce((a, b) => a + b, 0));
console.log('向导问「基本不用图」时，能对上最少的案是', rp[0], '张 —— 全库没有一案是真的"基本不用图"');
