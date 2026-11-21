#!/usr/bin/env node
/* 攻击 A：--positive-control 真的在读原型吗？
 *
 * score(id, opts) 声明了 opts，但函数体从不使用它（grep 'opts' 只命中签名那一行）。
 * --positive-control 把一个临时 htmlPath/promptPath 传进去，期待 score 读它。
 * 实际 score 永远读 join(BT, id, 'index.html')。
 *
 * 本探针不复制 score 的实现，而是直接复刻 --positive-control 的调用序列，
 * 把每一步的 r.ok 打出来，看 35 个原型里有几个真的被检查了。
 */
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = decodeURIComponent(new URL('../../../', import.meta.url).pathname).replace(/^\/([A-Za-z]:)/, '$1');
const BT = join(ROOT, 'deliverables/78-northstar/_blindtest');

const W = {};
new Function('window', readFileSync(join(ROOT, 'prototypes/_selection/data.js'), 'utf8'))(W);

let checked = 0, scored = 0, skipped = 0;
const skippedIds = [];
for (const s of W.SCHEMES) {
  const pdir = join(ROOT, 'prototypes', s.dir);
  if (!existsSync(join(pdir, 'index.html'))) continue;
  /* 正对照声称喂给 score 的是「原型 html + style.css」，临时文件路径： */
  const claimedHtml = join(ROOT, '.pc-tmp', 'index.html');
  const claimedPrompt = join(ROOT, '.pc-tmp', '_prompt.txt');
  /* score() 实际会去读的路径： */
  const actualHtml = join(BT, s.id, 'index.html');
  const actualPrompt = join(BT, s.id, '_prompt.txt');
  checked++;
  const wouldScore = existsSync(actualHtml) && existsSync(actualPrompt);
  if (wouldScore) {
    scored++;
    /* 17 个「真跑」的，跑的是盲测产物，不是原型。点明它： */
    const isPrototype = actualHtml.startsWith(join(ROOT, 'prototypes'));
    console.log(`  ${s.id}  ok=true  读的是 ${actualHtml.replace(ROOT, '')}  ` +
      `（是原型？${isPrototype ? '是' : '否 —— 是盲测产物'}）`);
  } else {
    skipped++;
    skippedIds.push(s.id);
  }
}
console.log('');
console.log(`原型目录里有 index.html：${checked} 个`);
console.log(`score() 真正判过的：${scored} 个（全部读的是 _blindtest/Sxx，不是 prototypes/）`);
console.log(`静默返回 {ok:false}、被 checked++ 计成"通过"的：${skipped} 个`);
console.log(`静默跳过的 id：${skippedIds.join(' ')}`);
console.log('');
console.log(`score.mjs 的输出会打印「检查 ${checked} 个原型，0 个被判违规」并 exit 0。`);