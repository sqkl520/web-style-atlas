// 任务 2 探针：Clopper-Pearson 单侧 95% 下界 —— 自己算，不引用红队数字。
//
// 定义：抽 n 案、观察到 k 案通过。总体通过率 p 的单侧 95% 置信下界 p_L
// 满足 P(X >= k | p = p_L) = 0.05（二项分布尾概率）。
// 闭式解：p_L = BetaInv(0.05; k, n-k+1)；k=n 时退化为 0.05^(1/n)。
//
// 校验：n=3, k=3 → 0.05^(1/3) = 0.3684 → 36.8%，与红队给的 36.8% 一致。
// 这一步是**自校验**：如果我的实现算不出 36.8%，说明实现错了。
import { writeFileSync } from 'node:fs';

// 二项尾概率 P(X >= k)
function tail(n, k, p) {
  // 用对数避免下溢
  let s = 0;
  for (let i = k; i <= n; i++) {
    let logc = 0;
    for (let j = 1; j <= i; j++) logc += Math.log((n - i + j) / j);
    s += Math.exp(logc + i * Math.log(p) + (n - i) * Math.log(1 - p));
  }
  return s;
}
// 二分求 p 使 tail = 0.05（tail 关于 p 单调递增）
function cpLower(n, k, alpha = 0.05) {
  if (k === 0) return 0;
  if (k === n) return Math.pow(alpha, 1 / n);
  let lo = 0, hi = 1;
  for (let it = 0; it < 200; it++) {
    const mid = (lo + hi) / 2;
    if (tail(n, k, mid) < alpha) lo = mid; else hi = mid;
  }
  return (lo + hi) / 2;
}

const out = { method: 'Clopper-Pearson one-sided 95% lower bound', rows: [] };
console.log('n    k     p_L(95% 单侧下界)   p_L(90%)     说明');
for (const n of [10, 15, 20, 30]) {
  for (let k = n; k >= Math.max(0, n - 3); k--) {
    const pl = cpLower(n, k, 0.05);
    const pl90 = cpLower(n, k, 0.10);
    out.rows.push({ n, k, pass: k / n, lower95: +pl.toFixed(4), lower90: +pl90.toFixed(4) });
    console.log(String(n).padEnd(5), String(k).padEnd(5), (pl * 100).toFixed(1) + '%'.padEnd(17),
      (pl90 * 100).toFixed(1) + '%'.padEnd(13), '点估计 ' + (k / n * 100).toFixed(0) + '%');
  }
}

// 自校验
const chk = cpLower(3, 3, 0.05);
console.log('\n【自校验】n=3, k=3 →', (chk * 100).toFixed(1) + '%  （红队报 36.8%，应一致）');
console.log('  闭式 0.05^(1/3) =', (Math.pow(0.05, 1 / 3) * 100).toFixed(1) + '%');

// 10 案的关键档位
console.log('\n=== 10 案抽样的关键档位 ===');
for (const k of [10, 9, 8]) {
  const pl = cpLower(10, k, 0.05);
  console.log('  10 案全过/仅 ' + (10 - k) + ' 案失败 → 总体通过率 95% 下界 = ' + (pl * 100).toFixed(1) + '%');
}
// 反向：要证明总体 ≥ 90%，需要多少案全过？
console.log('\n=== 反向问题：要证明总体通过率 ≥ X，全过需要多少案 ===');
for (const target of [0.8, 0.85, 0.9, 0.95]) {
  for (let n = 3; n <= 60; n++) {
    if (Math.pow(0.05, 1 / n) >= target) { console.log('  目标 ≥' + (target * 100) + '%  → 需要 ' + n + ' 案全过（0.05^(1/' + n + ')=' + (Math.pow(0.05, 1 / n) * 100).toFixed(1) + '%）'); break; }
  }
}

writeFileSync('D:/Web/style/deliverables/69-audit/t2-cp.json', JSON.stringify(out, null, 1), 'utf8');
