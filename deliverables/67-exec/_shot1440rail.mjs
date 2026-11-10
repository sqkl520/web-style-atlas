// _shot1440rail.mjs — 1440 档第 2 张：把筛选栏内部滚到底，证明 11 组一组不少（改前/改后各一张）
import { Browser } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const OUT = join(HERE, 'shots-list');
const BEFORE = 'file:///' + join(HERE, '_before-site', 'index.html').replace(/\\/g, '/');
const AFTER = 'file:///' + join(ROOT, 'prototypes', '_selection', 'index.html').replace(/\\/g, '/');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await Browser.launch({ width: 1440, height: 900 });
const p = await browser.newPage({ width: 1440, height: 900, reducedMotion: true });
for (const [tag, url] of [['before', BEFORE], ['after', AFTER]]) {
  await p.goto(url, { settleMs: 1800 });
  const info = await p.eval(() => {
    const rail = document.querySelector('.rail');
    rail.scrollTop = rail.scrollHeight;      // 内滚到底
    return { blocks: rail.querySelectorAll('.rail-block').length, chips: rail.querySelectorAll('.chips button').length,
      scrollH: rail.scrollHeight, clientH: rail.clientHeight, scrollTop: Math.round(rail.scrollTop) };
  });
  await sleep(400);
  await p.screenshot({ path: join(OUT, `${tag}-1440-2-rail-bottom.png`), format: 'png' });
  console.log(tag, JSON.stringify(info));
}
await p.close();
await browser.close();
