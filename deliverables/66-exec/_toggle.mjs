/* 芯片的「再点一次取消」路径（66-exec，2026-10-27）。
 *
 * 这条路径容易被漏：修死路时我只测了"点上去"，没测"取消"。而取消走的是另一个接口
 * （benchClearSceneIdsKeepQuery），如果它也顺手清了搜索词，用户就丢了两次：
 * 一次在点上，一次在取消上。
 *
 * 判据：
 *  1) 搜词 → 点芯片 → 暂存条出现、4 行；
 *  2) 再点同一颗 → 芯片灭、30 行、**暂存条仍在**（字还没丢）；
 *  3) 点「放回搜索」→ 搜索框回到原来的词、按词筛。
 *
 * 跑：node deliverables/66-exec/_toggle.mjs
 */
import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Browser, sleep } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const PAGE = 'file:///D:/Web/style/prototypes/_selection/index.html';
const b = await Browser.launch({ width: 1440, height: 900 });
const steps = [];
const fails = [];
try {
  const page = await b.newPage();
  await page.goto(PAGE);
  await sleep(800);
  const read = () => page.eval(() => ({
    rows: document.querySelectorAll('#ledger .row').length,
    q: document.getElementById('q').value,
    pressed: [...document.querySelectorAll('.scene-chip[aria-pressed="true"]')].map((x) => x.getAttribute('data-scene')),
    parked: document.getElementById('q-parked') && document.getElementById('q-parked').hidden === false,
    parkedText: (document.getElementById('q-parked') || {}).textContent || '',
  }));
  const clickChip = () => page.eval(() => {
    for (const b2 of document.querySelectorAll('#flt-scene button[data-scene]')) {
      if (b2.getAttribute('data-scene') === '咖啡店') { b2.click(); return true; }
    }
    return false;
  });

  await page.eval(() => { document.getElementById('reset').click(); });
  await page.eval(() => {
    const q = document.getElementById('q');
    q.value = '咖啡店'; q.dispatchEvent(new Event('input', { bubbles: true }));
  });
  steps.push(['搜词', await read()]);
  await clickChip(); await sleep(60);
  steps.push(['点芯片', await read()]);
  await clickChip(); await sleep(60);
  steps.push(['再点一次（取消）', await read()]);
  await page.eval(() => {
    for (const b2 of document.querySelectorAll('#q-parked button')) {
      if (b2.getAttribute('data-act') === 'back') { b2.click(); return; }
    }
  });
  await sleep(60);
  steps.push(['放回搜索', await read()]);

  for (const [n, s] of steps) {
    console.log(n.padEnd(16, '　') + ' rows=' + String(s.rows).padStart(2) + ' q="' + s.q + '" chip=[' + s.pressed + '] 暂存条=' + (s.parked ? '在' : '无'));
  }
  const [, afterChip] = steps[1], [, afterToggle] = steps[2], [, afterBack] = steps[3];
  if (afterChip.rows !== 4) fails.push('点芯片后应为 4 行，实际 ' + afterChip.rows);
  if (!afterChip.parked) fails.push('点芯片后没有暂存条');
  if (afterToggle.rows !== 30) fails.push('取消芯片后应为 30 行，实际 ' + afterToggle.rows);
  if (afterToggle.pressed.length) fails.push('取消芯片后仍有芯片按着');
  if (!afterToggle.parked) fails.push('取消芯片后暂存条消失了 —— 字被丢了');
  if (afterBack.q !== '咖啡店') fails.push('放回后搜索框不是原词，而是 "' + afterBack.q + '"');
  if (afterBack.rows !== 0) fails.push('放回后应按词筛（0 行），实际 ' + afterBack.rows);
  await page.close();
} finally { await b.close(); }
writeFileSync(join(HERE, '_toggle.json'), JSON.stringify({ steps, fails }, null, 1), 'utf8');
console.log('\n' + (fails.length ? fails.join('\n') : '全部通过'));
process.exit(fails.length ? 1 : 0);
