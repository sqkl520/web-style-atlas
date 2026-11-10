// P10：三种判据下「括号不配平」各是几案 —— 用同一份实测数据，只换判据
//      证明 Lead 的 2、前任的 9、我自己的 4 分别对应什么口径
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { HERE } from './_lib.mjs';

const J = JSON.parse(readFileSync(join(HERE, 'p5-clamp.json'), 'utf8'));
const PAIRS = [['（', '）'], ['(', ')'], ['「', '」'], ['【', '】'], ['《', '》'], ['“', '”'], ['〈', '〉']];
const excess = (s, a, z) => (s.match(new RegExp('\\' + a, 'g')) || []).length - (s.match(new RegExp('\\' + z, 'g')) || []).length;

function judge(rows, kinds) {
  const hit = [];
  for (const r of rows) {
    const s = r.shownText || '';
    const bad = kinds.map(([a, z]) => ({ p: a + z, d: excess(s, a, z) })).filter((x) => x.d !== 0);
    if (bad.length) hit.push({ id: r.id, bad });
  }
  return hit;
}

const onlyParen = PAIRS.filter(([a]) => a === '（');
const allCJK = PAIRS.filter(([a]) => '（「【《“〈'.includes(a));
for (const [w, rows] of Object.entries(J)) {
  console.log(`\n===== ${w}px（30 行） =====`);
  for (const [name, kinds] of [
    ['判据 A：只数全角圆括号（ ）', onlyParen],
    ['判据 B：中文标点全套 （）「」【】《》“”〈〉', allCJK],
    ['判据 C：加上半角 ()', PAIRS],
  ]) {
    const h = judge(rows, kinds);
    console.log(`  ${name}: ${h.length} 案  ${h.map((x) => x.id).join(' ')}`);
  }
  // 单独看：只用「」的案数
  const quoteOnly = judge(rows, PAIRS.filter(([a]) => a === '「'));
  console.log(`  （参考）只数直角引号「」: ${quoteOnly.length} 案  ${quoteOnly.map((x) => x.id).join(' ')}`);
}

// 结论核对：Lead 说 S10/S18 两案
console.log('\n== 与三份口径对照 ==');
for (const [w, rows] of Object.entries(J)) {
  const a = judge(rows, onlyParen).map((x) => x.id);
  console.log(`  ${w}px 判据A = [${a.join(' ')}]  ${w === 1440 && a.join() === 'S10,S18' ? '← 与 Lead 的「S10/S18 两案」逐字相同' : ''}`);
}
