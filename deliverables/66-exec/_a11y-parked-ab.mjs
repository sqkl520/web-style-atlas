/* 一条需要排除的嫌疑：回归探针里点「放回搜索」后，列表停在「列出 0 / 30 个方案」。
 *
 * 这可能是两件事之一：
 *   a) 既有设计 —— "咖啡店"这个词本来就不在这 30 个案正文里（审计 §空状态 讲的就是
 *      "这三十个案不按行业建索引"），放回搜索后当然 0 行，空状态会给出退路；
 *   b) 我的回归 —— 我加的 #q-parked[hidden]{display:none !important} 或 close() 的焦点还原
 *      碰坏了 restoreQuery 的渲染。
 * 判据：同一串操作在**改前副本**上跑一遍。两边数字相同 ⇒ 是 a)，不是我弄坏的。
 */
import { Browser, sleep } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const PAGES = {
  '改前(副本)': 'file:///' + join(HERE, '_before-clone', 'index.html').replace(/\\/g, '/'),
  '改后(工作树)': 'file:///' + join(ROOT, 'prototypes', '_selection', 'index.html').replace(/\\/g, '/'),
};

const b = await Browser.launch({ width: 1440, height: 900 });
const out = {};
for (const [name, url] of Object.entries(PAGES)) {
  const p = await b.newPage({ width: 1440, height: 900, dsf: 1, mobile: false });
  await p.goto(url, { settleMs: 1600 });
  const step = async (fn) => { await p.eval(fn); await sleep(450); };
  const snap = () => p.eval(() => ({
    count: document.getElementById('count').textContent,
    q: document.getElementById('q').value,
    parked: window.benchParked ? window.benchParked() : null,
    pressedChips: document.querySelectorAll('.scene-chip[aria-pressed="true"]').length,
    parkedShown: (() => { const el = document.getElementById('q-parked'); return !!(el && getComputedStyle(el).display !== 'none' && el.getBoundingClientRect().height > 0); })(),
    emptyShown: !document.getElementById('empty').hidden,
  }));

  const r = { initial: await snap() };
  await step(() => { document.getElementById('q').value = '咖啡店'; });
  await step(() => {
    const chip = Array.from(document.querySelectorAll('.scene-chip')).find((c) => /咖啡店/.test(c.textContent));
    if (chip) chip.click();
  });
  r.afterChip = await snap();
  await step(() => {
    const el = document.getElementById('q-parked');
    const back = el && Array.from(el.querySelectorAll('button')).find((n) => n.getAttribute('data-act') === 'back');
    if (back) back.click();
  });
  r.afterBack = await snap();
  /* 放回之后空状态应该给出"只看芯片 / 只看搜索词"的退路 —— 这才是设计上的收尾 */
  r.emptyRetryButtons = await p.eval(() => Array.from(document.querySelectorAll('#empty button, #empty a')).map((x) => x.textContent.replace(/\s+/g, ' ').trim().slice(0, 24)));
  out[name] = r;
  await p.close();
}
await b.close();

const a = JSON.stringify(out['改前(副本)']);
const c = JSON.stringify(out['改后(工作树)']);
console.log(JSON.stringify(out, null, 1));
console.log('\n两次结果逐字节相同 = ' + (a === c));
