// 核实红队的 new②：prompt-copy.js 把 palette[0] 当"最大面积色"
import { readFileSync } from 'node:fs';
const ROOT = 'D:/Web/style';

const pc = readFileSync(ROOT + '/prototypes/_selection/prompt-copy.js', 'utf8');
const lines = pc.split(/\r?\n/);

console.log('=== prompt-copy.js 里 palette[0] / 最大面积 相关 ===\n');
lines.forEach((l, i) => {
  if (/palette\[0\]|palette\.slice\(0, ?1\)|最大面积|面积最大|主色|占屏/.test(l)) {
    console.log(`${String(i + 1).padStart(4)}: ${l.trim().slice(0, 150)}`);
  }
});

console.log('\n\n=== 定位红队说的 :730 行附近 ===\n');
for (let i = 715; i < 750; i++) {
  if (lines[i] !== undefined) console.log(`${String(i + 1).padStart(4)}: ${lines[i]}`);
}
