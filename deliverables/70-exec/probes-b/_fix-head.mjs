import { readFileSync, writeFileSync } from 'node:fs';
const p = 'D:/Web/style/deliverables/70-exec/EXEC-B-linewidth-negative.md';
let t = readFileSync(p, 'utf8');

/* 收尾时 HEAD 变了：别的人在 00:32 提交了 0ee3fb5 + 71921e8。
 * 我的改动全部是**未提交**的工作树改动，所以"开工 HEAD"与"收尾 HEAD"不同，
 * 这一点必须写清楚，否则复算的人会以为我改了已提交的基线。 */
const OLD = '| `git rev-parse HEAD` | `03f6fd47e364c43dffdf240f3eb298987f840625` | 同（**未变**） |';
const NEW = [
  '| `git rev-parse HEAD` | `03f6fd47e364c43dffdf240f3eb298987f840625` | **`71921e8e8f06dc58e9d209dca6cc05cfb457df6b`** |',
  '| 期间新增的提交（**不是我做的**） | — | `0ee3fb5`（接线字号 0/30→30/30）、`71921e8`（补交测量 Agent 报告） |',
  '| 我的改动状态 | — | **全部未提交**，在工作树里 |',
].join('\n');

if (t.includes(OLD)) {
  t = t.replace(OLD, NEW);
  console.log('已更新 HEAD 行（改为开工/收尾并列 + 说明我的改动未提交）');
} else {
  console.log('⚠ 未找到预期行，未修改。请人工核对 §0 表格第一行。');
}

/* §0.1 的收尾 hash 也要注明"这是未提交工作树的状态" */
t = t.replace(
  '| `prototypes/_prompts/clean-dna.mjs` | `07F496605C3D9542629C2CF158E52B130AC7747F62454031EF130427E012333A` | `BD97F3590889FFA4CC2CDDB96DB085E9919C1371B393D9EDA27D40CB13599D7A` |',
  '| `prototypes/_prompts/clean-dna.mjs` | `07F496605C3D9542629C2CF158E52B130AC7747F62454031EF130427E012333A` | `BD97F3590889FFA4CC2CDDB96DB085E9919C1371B393D9EDA27D40CB13599D7A`（未提交） |'
);
t = t.replace(
  '| `prototypes/_selection/prompt-copy.js` | `A5FBD8660BFB148BA5A07F2174BC67D4297030DEA7C7847A2775751AF425C88E` | `2D2A6F3239ED621E8D63DA9151D57E6E7DCCFAD25893830F13984B062D32F703` |',
  '| `prototypes/_selection/prompt-copy.js` | `A5FBD8660BFB148BA5A07F2174BC67D4297030DEA7C7847A2775751AF425C88E` | `2D2A6F3239ED621E8D63DA9151D57E6E7DCCFAD25893830F13984B062D32F703`（未提交） |'
);
writeFileSync(p, t, 'utf8');
console.log('done');
