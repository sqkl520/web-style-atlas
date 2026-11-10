/* 用真浏览器（CDP）导出 30 案提示词，交叉核对 Node 侧导出的结果。
 *
 * 为什么需要这一步：Node 里的 vm 宿主只给了 window/document 空壳，
 * 而 buildPrompt 会读 window.SCHEMES（tone）与 window.STYLE_PROMPTS（字体/palette/risk/reuse）。
 * 任何一个装载顺序或全局名写错，vm 版本都会静默少一段，而真浏览器里是对的（或反之）。
 * 上一轮的教训：只测一层会互相掩盖（「复制按钮存在但写不进剪贴板」就是这么漏的）。
 *
 * 判据：CDP 里 window.buildStylePrompt(id) 的 30 份全文，与
 * deliverables/66-exec/_out/after/{id}.txt **逐字节相同**。
 *
 * 跑：node deliverables/66-exec/cdp-verify.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { Browser, sleep } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';

const ROOT = 'D:/Web/style';
const OUT = join(ROOT, 'deliverables/66-exec/_out');
const PAGE = 'file:///' + ROOT.replace(/\\/g, '/') + '/prototypes/_selection/index.html';

const b = await Browser.launch({ width: 1440, height: 900 });
let fail = 0;
const ok = (m) => console.log('  ✓ ' + m);
const bad = (m) => { fail++; console.log('  ✗ ' + m); };

try {
  const page = await b.newPage();
  await page.goto(PAGE);
  await sleep(1200);

  /* 先证明页面真的把两份全局装载好了：缺一个，下面的逐字节比对就毫无意义。 */
  const env = await page.eval(() => ({
    hasBuild: typeof window.buildStylePrompt === 'function',
    schemes: (window.STYLE_PROMPTS && window.STYLE_PROMPTS.schemes || []).length,
    dataSchemes: (window.SCHEMES || []).length,
    ids: (window.STYLE_PROMPTS && window.STYLE_PROMPTS.schemes || []).map((s) => s.id),
  }));
  console.log('== 页面装载 ==');
  ok('buildStylePrompt 是函数：' + env.hasBuild);
  ok('STYLE_PROMPTS.schemes = ' + env.schemes + '，window.SCHEMES = ' + env.dataSchemes);

  /* 30 案全文一次取回（比 30 次 evaluate 快，也不会在中途被别的脚本改到一半） */
  const texts = await page.eval((ids) => {
    const out = {};
    for (const id of ids) out[id] = window.buildStylePrompt(id);
    return out;
  }, env.ids);

  console.log('\n== 30 案：CDP 全文 vs Node 导出（逐字节）==');
  const diffs = [];
  for (const id of env.ids) {
    const disk = readFileSync(join(OUT, 'after', id + '.txt'), 'utf8');
    if (texts[id] !== disk) {
      diffs.push(id);
      /* 只打印第一处差异的上下文 —— 整份贴出来会把终端刷掉 */
      let i = 0;
      while (i < Math.min(texts[id].length, disk.length) && texts[id][i] === disk[i]) i++;
      console.log('    ' + id + ' 第一处差异 @' + i + '：CDP=' +
        JSON.stringify(texts[id].slice(i, i + 40)) + ' DISK=' + JSON.stringify(disk.slice(i, i + 40)));
    }
  }
  if (diffs.length) bad('不一致：' + diffs.join(' '));
  else ok('30/30 逐字节相同');

  /* 验收 2 在真浏览器里再跑一次，不用 Node 侧的结论 */
  console.log('\n== 假前提措辞（真浏览器全文）==');
  const BANNED = [[/我实际有/, '「我实际有」'], [/就排\s*\d+\s*个/, '「就排 N 个」'], [/先凑到|先凑够|先凑齐/, '「先凑到 N 个」']];
  for (const [re, label] of BANNED) {
    const hit = env.ids.filter((id) => re.test(texts[id]));
    if (hit.length) bad(label + ' 命中：' + hit.join(' '));
    else ok(label + '：30/30 未命中');
  }
  /* 设计规模必须仍然出现在提示词里（修错的方向不是"把 N 删掉"） */
  const noN = env.ids.filter((id) => !/这个版式设计时排了 \d+ 个/.test(texts[id]));
  if (noN.length) bad('丢了版式规模句：' + noN.join(' '));
  else ok('30/30 仍写明「这个版式设计时排了 N 个」');

  /* degrades 分岔：取出第 3 条逐案比对 */
  console.log('\n== degrades 分岔（第 3 条）==');
  const yes = [], no = [];
  for (const id of env.ids) {
    const m = texts[id].match(/^3\. (但这个版式的位置是按 \d+ 个数出来的[^\n]*|这个版式是自动流排版[^\n]*)$/m);
    if (!m) { bad(id + ' 找不到第 3 条'); continue; }
    (m[1].startsWith('但这个版式') ? yes : no).push(id);
  }
  ok('手工定位分支 ' + yes.length + ' 案：' + yes.join(' '));
  ok('自动流分支 ' + no.length + ' 案：' + no.join(' '));
  if (yes.length !== 13 || no.length !== 17) bad('分岔案数不是 13/17');

  /* 长度：真浏览器里的实测，与 README 的区间对一眼 */
  const lens = env.ids.map((id) => texts[id].length);
  console.log('\n== 长度（真浏览器实测）==');
  console.log('    ' + Math.min(...lens) + '–' + Math.max(...lens) + '，中位 ' +
    ((lens.slice().sort((a, b2) => a - b2)[14] + lens.slice().sort((a, b2) => a - b2)[15]) / 2));

  writeFileSync(join(OUT, 'cdp-30.json'), JSON.stringify({ ids: env.ids, lens, texts }, null, 1), 'utf8');
  await page.close();
} finally {
  await b.close();
}

console.log(fail ? '\n失败 ' + fail + ' 项' : '\n全部通过');
process.exit(fail ? 1 : 0);
