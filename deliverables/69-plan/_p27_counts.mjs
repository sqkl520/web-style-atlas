// 探针 27：A 的核心账 —— 30 案提示词里到底有多少条**可机械判定**的约束，
// 其中有多少条是"只靠提示词自洽（选项 d）就能验的"，多少条**必须**端到端。
//
// 分类口径（写死在这里，可复核）：
//   M 类 机械可判：有明确取值，且能从渲染结果里直接读（色值、字体、圆角、阴影、线宽、图片数、单元数）
//   S 类 结构可判：可数、但"对不对"要看语义（N 个条目、编号三处一致、首屏无轮播）
//   H 类 必须人眼：调性像不像、机制复现得像不像、risk 段有没有重演
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadCtx, ROOT, out } from './_lib.mjs';

const w = loadCtx();
const P = w.STYLE_PROMPTS;
const bp = w.buildStylePrompt;

const rows = [];
for (const s of P.schemes) {
  const t = bp(s.id, { biz: '', action: '' });
  const L = t.split('\n');
  const has = (re) => L.some((x) => re.test(x));
  const M = {
    色值: (L.find((l) => /^1\. 配色只用这几个值/.test(l)) || '').match(/#[0-9A-Fa-f]{6}/g)?.length || 0,
    标题字体链: has(/^2\. 字体/) ? 1 : 0,
    正文字体链: /正文同理|正文用 /.test(t) ? 1 : 0,
    等宽槽: /等宽/.test(t) ? 1 : 0,
    圆角: has(/^3\. 圆角/) ? 1 : 0,
    阴影: has(/^4\. 阴影/) ? 1 : 0,
    线宽档: (L.find((l) => /^5\. 线宽只用这几级/.test(l)) || '').match(/[\d.]+px/g)?.length || 0,
    图片数: has(/^4\. 版式里至少要/) ? 1 : 0,
    设计规模N: has(/^1\. 这个版式设计时排了/) ? 1 : 0,
    防退化8条: L.filter((l) => /^[①②③④⑤⑥⑦⑧] /.test(l)).length,
  };
  const S = {
    编号三处一致: /编号是不是同一串/.test(t) ? 1 : 0,
    首屏无轮播: /首屏不要轮播图/.test(t) ? 1 : 0,
    移动端单列: /移动端单列/.test(t) ? 1 : 0,
    degrades后果: /少一个就空一格|自动流排版/.test(t) ? 1 : 0,
    刻意留空: /刻意留空/.test(t) ? 1 : 0,
    硬前提reuse: /这个版式的硬前提/.test(t) ? 1 : 0,
  };
  const H = {
    调性行: /这个案子的调性是/.test(t) ? 1 : 0,
    签名动作: /这个风格的签名动作/.test(t) ? 1 : 0,
    risk段: /最容易做成的错误样子/.test(t) ? 1 : 0,
    验收三问: (t.match(/^\d\. 拿远半米看|^1\. 拿远半米看/m) || []).length ? 3 : 0,
    气质像不像: 1,
  };
  const mSum = Object.values(M).reduce((a, b) => a + b, 0);
  const sSum = Object.values(S).reduce((a, b) => a + b, 0);
  const hSum = Object.values(H).reduce((a, b) => a + b, 0);
  rows.push({ id: s.id, M, S, H, mSum, sSum, hSum, total: mSum + sSum + hSum });
}

const sum = (k) => rows.reduce((a, r) => a + r[k], 0);
out('=== 30 案 × 三类约束的条数 ===');
out(`  M 类（机械可判，有明确取值）   ：${sum('mSum')} 条   平均 ${(sum('mSum') / 30).toFixed(1)} 条/案`);
out(`  S 类（结构可判，要看语义对不对）：${sum('sSum')} 条   平均 ${(sum('sSum') / 30).toFixed(1)} 条/案`);
out(`  H 类（必须人眼）              ：${sum('hSum')} 条   平均 ${(sum('hSum') / 30).toFixed(1)} 条/案`);
out(`  合计                         ：${sum('total')} 条   平均 ${(sum('total') / 30).toFixed(1)} 条/案`);
out('');
out('=== M 类拆项（每项 30 案合计）===');
for (const k of Object.keys(rows[0].M)) out(`  ${k.padEnd(10)} ${sum('mSum') && rows.reduce((a, r) => a + r.M[k], 0)}`);
out('');
out('=== 关键比例 ===');
const mPct = sum('mSum') / sum('total') * 100;
out(`  可机械化的约束占全部约束的 ${mPct.toFixed(1)}%`);
out(`  → 也就是说：**至多 ${mPct.toFixed(0)}% 的提示词内容可以用脚本验，其余 ${(100 - mPct).toFixed(0)}% 只能靠端到端实现 + 人眼**。`);
out('');
out('=== 选项 d（提示词自洽）能覆盖到哪 ===');
out(`  它能自动判的是 M 类里"提示词声称值 == 原型 CSS 值"的那部分（色值/字体/圆角/阴影/线宽/N/图片数）。`);
out(`  但它**结构上不可能**发现"原型自己画出了清单外颜色"（实测 17/30 案有，共 33 个颜色），`);
out(`  因为它的真值来自同一份 CSS；而"页面实画"是第三次测量，只有真的渲染+采样才看得到。`);
