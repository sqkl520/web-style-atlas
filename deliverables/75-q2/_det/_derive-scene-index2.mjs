// 第二版：机械派生失败的根因是「同义词命中 ≠ 这案适合这行」。
// 换判据：词必须出现在 scenes 的**句首主语位置**（「适合…X…」「X 类项目的…」），
// 而不是出现在任何从句里。看能不能收敛。
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
const ctx = { window: {} }; vm.createContext(ctx);
vm.runInContext(readFileSync('prototypes/_selection/data.js', 'utf8'), ctx);
const S = ctx.window.SCHEMES;
const posOf = (r) => { const s = r.scenes || ''; const i = s.indexOf('不适合'); return i > 0 ? s.slice(0, i) : s; };

console.log('=== 30 案正向段的实际形态（前 90 字）===');
for (const r of S.slice(0, 8)) console.log(r.id, '|', posOf(r).slice(0, 90));
console.log('\n=== 分句后看：每案正向段有几个分句、每个分句的主语 ===');
const split = (s) => s.split(/[、，；。（）]/).map((x) => x.trim()).filter((x) => x.length >= 3);
for (const r of S.slice(0, 6)) {
  console.log('\n' + r.id + ':');
  split(posOf(r)).forEach((c) => console.log('   · ' + c));
}
