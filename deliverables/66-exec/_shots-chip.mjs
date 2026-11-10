/* 芯片死路：改前/改后同一操作序列的截图（66-exec，2026-10-27）。
 *
 * 三条序列（每条都在两档视口各拍一张）：
 *   s1 只搜「咖啡店」            → 改前 0 行 / 改后 0 行（搜索框本来就是整串匹配，这个词不在 hay 里）
 *   s2 搜「咖啡店」+ 点同名芯片   → 改前 0 行（死路）/ 改后 4 行
 *   s3 只点「咖啡店」芯片         → 对照：这条一直是 4 行，证明芯片本身没坏
 *
 * 用法：node deliverables/66-exec/_shots-chip.mjs before|after
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Browser, sleep } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, 'shots-chip');
mkdirSync(OUT, { recursive: true });
const ROOT = 'D:/Web/style';
const PAGE = 'file:///' + ROOT + '/prototypes/_selection/index.html';
const tag = process.argv[2] || 'before';

const report = { tag, shots: [] };
const b = await Browser.launch({ width: 1440, height: 900 });
try {
  for (const vp of [{ w: 1440, h: 900, name: '1440' }, { w: 390, h: 844, name: '390' }]) {
    const page = await b.newPage({ width: vp.w, height: vp.h, mobile: vp.w < 500 });
    await page.goto(PAGE);
    await sleep(900);
    await page.eval(() => {
      window.__shot = {
        reset() { document.getElementById('reset').click(); },
        type(v) {
          const q = document.getElementById('q');
          q.value = v;
          q.dispatchEvent(new Event('input', { bubbles: true }));
        },
        chip(term) {
          const all = document.querySelectorAll('#flt-scene button[data-scene], .scene-more button[data-scene]');
          for (const b of all) if (b.getAttribute('data-scene') === term) { b.click(); return true; }
          return false;
        },
        read() {
          const bar = document.querySelector('.bar');
          return {
            rows: document.querySelectorAll('#ledger .row').length,
            count: document.getElementById('count').textContent.trim(),
            q: document.getElementById('q').value,
            pressed: [...document.querySelectorAll('.scene-chip[aria-pressed="true"]')].map((x) => x.getAttribute('data-scene')),
            emptyShown: !document.getElementById('empty').hidden,
            emptyTail: (() => {
              const e = document.getElementById('empty');
              const last = e && e.lastChild;
              return last && last.nodeType === 3 ? last.textContent.trim().slice(0, 220) : '(非文本节点)';
            })(),
            barH: bar ? Math.round(bar.getBoundingClientRect().height) : null,
          };
        },
      };
    });

    /* 每一步都从 reset 后的干净状态开始，**只**做这一步该做的事，
       这样改前/改后两张图的差别只来自这一步，不来自上一步的残留。 */
    const steps = [
      ['s1-search-only', async () => {
        await page.eval(() => window.__shot.reset());
        await page.eval(() => window.__shot.type('咖啡店'));
      }],
      ['s2-search-then-chip', async () => {
        await page.eval(() => window.__shot.reset());
        await page.eval(() => window.__shot.type('咖啡店'));
        await page.eval(() => window.__shot.chip('咖啡店'));
      }],
      ['s3-chip-only', async () => {
        await page.eval(() => window.__shot.reset());
        await page.eval(() => window.__shot.chip('咖啡店'));
      }],
    ];
    for (const [name, act] of steps) {
      await act();
      await sleep(120);
      const st = await page.eval(() => window.__shot.read());
      const file = join(OUT, `${tag}-${vp.name}-${name}.jpg`);
      await page.screenshot({ path: file, format: 'jpeg', quality: 80 });
      report.shots.push({ vp: vp.name, name, file: file.replace(ROOT + '/', ''), ...st });
    }
    await page.close();
  }
} finally {
  await b.close();
}
writeFileSync(join(HERE, `_shots-${tag}.json`), JSON.stringify(report, null, 1), 'utf8');
for (const s of report.shots) {
  console.log(`${s.vp.padStart(4)} ${s.name.padEnd(22)} rows=${String(s.rows).padStart(2)} q="${s.q}" chip=[${s.pressed}] barH=${s.barH} count="${s.count}"`);
  console.log('      emptyTail: ' + s.emptyTail.slice(0, 160));
}
