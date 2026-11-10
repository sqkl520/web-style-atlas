// 把两份 README 里所有「方案总数 / 达标数 / 剩余 FAIL / audit 合计」一次性同步到实测值。
// 为什么做成脚本：Q2 要加 5 个案，每加一个这些数字就全变一次。手改 5 遍必然漏。
// 判据全部从 data.js 与 prompts.js 现算，不写死。
import { readFileSync, writeFileSync } from 'node:fs';
import vm from 'node:vm';

const load = (p) => { const c = { window: {} }; vm.createContext(c); vm.runInContext(readFileSync(p, 'utf8'), c); return c.window; };
const W = load('prototypes/_selection/data.js');
const P = load('prototypes/_selection/prompts.js');
const S = W.SCHEMES;

const N = S.length;
const fail0 = S.filter((s) => !s.gate || !(s.gate.fail > 0)).length;
const failTotal = S.reduce((a, s) => a + ((s.gate && s.gate.fail) || 0), 0);
const failCases = S.filter((s) => s.gate && s.gate.fail > 0).length;
const auditSum = S.reduce((a, s) => a + (s.audit || '').length, 0);
const warm = S.filter((s) => s.axes && s.axes.band === '暖浅色带').length;
const warmPct = Math.round((warm / N) * 100);
const shots = S.reduce((a, s) => a + ['desktop', 'tablet', 'mobile'].reduce((b, k) => b + ((s.shots && s.shots[k]) || []).length, 0), 0);

// 提示词长度：需要 buildStylePrompt，代价高；改用 check-prompts 已算好的区间（由调用方传入或读日志）。
console.log(JSON.stringify({ N, fail0, failTotal, failCases, auditSum, warm, warmPct, shots }));
