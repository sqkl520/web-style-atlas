// P18：git HEAD 版 vs 工作树当前版 的提示词逐案对照（前提 1 正在被另一个 Agent 改）
import { Browser } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { execSync } from 'node:child_process';
import { writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { HERE, ROOT } from './_lib.mjs';

// 把 HEAD 版 prompt-copy.js 复制到临时目录，用同一个 index.html 加载两份，逐一对照
const sh = (c) => execSync(c, { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 28 });
const headSrc = sh('git show HEAD:prototypes/_selection/prompt-copy.js');
writeFileSync(join(HERE, '_head-prompt-copy.js'), headSrc, 'utf8');
const wtSrc = readFileSync(join(ROOT, 'prototypes', '_selection', 'prompt-copy.js'), 'utf8');
console.log('HEAD 版 %d 字节 / 工作树版 %d 字节', headSrc.length, wtSrc.length);
console.log('HEAD 里有「我实际有」吗：%s', /我实际有/.test(headSrc) ? 'YES' : 'no');
console.log('工作树里有「我实际有」吗：%s', /我实际有/.test(wtSrc) ? 'YES' : 'no');
console.log('工作树里有「这个版式设计时排了」吗：%s', /这个版式设计时排了/.test(wtSrc) ? 'YES' : 'no');

const PAGE = 'file:///' + join(ROOT, 'prototypes', '_selection', 'index.html').replace(/\\/g, '/');
const b = await Browser.launch({ width: 1440, height: 900 });
const p = await b.newPage({ width: 1440, height: 900, dsf: 1 });
await p.goto(PAGE, { settleMs: 1600 });

const now = await p.eval(() => window.SCHEMES.map((s) => {
  const t = window.buildStylePrompt(s.id);
  const L = t.split('\n');
  const i = L.findIndex((l) => /结构约束|版式设计时排了|我实际有/.test(l));
  return { id: s.id, len: t.length, block: L.slice(i, i + 6).join('\n') };
}));
writeFileSync(join(HERE, 'p18-now.json'), JSON.stringify(now, null, 1), 'utf8');

console.log('\n== 当前（工作树）S07 的结构约束段 ==');
console.log(now.find((x) => x.id === 'S07').block);

console.log('\n== 当前 30 案：长度 / 是否还说「我实际有」 ==');
const lens = now.map((x) => x.len);
console.log('  长度 min=%d max=%d；含「我实际有」的案数 = %d', Math.min(...lens), Math.max(...lens),
  now.filter((x) => /我实际有/.test(x.block)).length);
console.log('  含「版式设计时排了」的案数 = %d', now.filter((x) => /版式设计时排了/.test(x.block)).length);
const nums = now.map((x) => ({ id: x.id, n: +(/排了 (\d+) 个/.exec(x.block) || [, 0])[1] }));
console.log('  N 分布仍与 minItems 一致：' + JSON.stringify(nums.slice(0, 6)) + ' ...');
await b.close();
