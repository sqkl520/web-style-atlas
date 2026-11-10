/* 芯片死路探针（66-exec，2026-10-27）。
 *
 * 目的：把「先搜词 → 再点同名芯片」这条用户路径逐个行业词跑一遍，
 * 证明/证伪 app.js match() 里 sceneIds ∩ q 的取交集死路。
 *
 * 44 个 sceneIndex 词 × 三种操作顺序：
 *   A 只搜词（填 #q + 派发 input）
 *   B 只点芯片（从干净状态点 #flt-scene 里同名按钮）
 *   C 先搜后点（A 之后点同名芯片）—— 空状态让用户做的正是这件事
 *   D 先点后搜（B 之后搜一个与方案无关的词「白色」）
 *
 * 每次操作后读 #count 文本、#ledger .row 数、#empty 可见性、芯片 aria-pressed。
 * 结果写 _chip-before.json / _chip-after.json（看第一个参数）。
 *
 * 跑：node deliverables/66-exec/_chip-probe.mjs before
 */
import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Browser, sleep } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = 'D:/Web/style';
const PAGE = 'file:///' + ROOT + '/prototypes/_selection/index.html';
const tag = process.argv[2] || 'before';

const b = await Browser.launch({ width: 1440, height: 900 });
const out = { tag, terms: [], pairs: [], total: 0 };
try {
  const page = await b.newPage();
  await page.goto(PAGE);
  await sleep(900);

  const terms = await page.eval(() => Object.keys(window.STYLE_PROMPTS.sceneIndex));
  out.total = terms.length;
  out.terms = terms;

  /* 页面内的小工具：一律通过真实 DOM 事件驱动，不直接改 state（state 在闭包里）。 */
  await page.eval(() => {
    window.__probe = {
      clearAll() {
        document.getElementById('reset').click();
      },
      typeSearch(v) {
        const q = document.getElementById('q');
        q.value = v;
        q.dispatchEvent(new Event('input', { bubbles: true }));
      },
      chip(term) {
        const all = document.querySelectorAll('#flt-scene button[data-scene], .scene-more button[data-scene]');
        for (const b of all) if (b.getAttribute('data-scene') === term) return b;
        return null;
      },
      clickChip(term) {
        const b = this.chip(term);
        if (!b) return 'NO_CHIP';
        b.click();
        return 'OK';
      },
      read() {
        const rows = document.querySelectorAll('#ledger .row').length;
        const pressed = [...document.querySelectorAll('.scene-chip[aria-pressed="true"], .scene-more button[aria-pressed="true"]')]
          .map((b) => b.getAttribute('data-scene'));
        return {
          rows,
          count: (document.getElementById('count') || {}).textContent || '',
          emptyShown: !document.getElementById('empty').hidden,
          emptyText: (document.getElementById('empty') || {}).textContent || '',
          tplHidden: document.getElementById('tpl-strip') ? document.getElementById('tpl-strip').hidden : null,
          tplLead: (document.getElementById('tpl-strip-lead') || {}).textContent || '',
          tplEmptyHidden: document.getElementById('empty-tpl') ? document.getElementById('empty-tpl').hidden : null,
          tplEmptyText: (document.getElementById('empty-tpl') || {}).textContent || '',
          q: document.getElementById('q').value,
          pressed,
        };
      },
      idsOfRows() {
        return [...document.querySelectorAll('#ledger .row')].map((r) => r.getAttribute('data-id'));
      },
    };
  });

  for (const term of terms) {
    const rec = { term };
    // A 只搜
    await page.eval(() => { window.__probe.clearAll(); });
    await page.eval((t) => { window.__probe.typeSearch(t); }, term);
    await sleep(30);
    const A = await page.eval(() => window.__probe.read());
    // B 只点芯片
    await page.eval(() => { window.__probe.clearAll(); });
    const chipStatus = await page.eval((t) => window.__probe.clickChip(t), term);
    await sleep(30);
    const B = await page.eval(() => window.__probe.read());
    const Bids = await page.eval(() => window.__probe.idsOfRows());
    // C 先搜后点（死路复现）
    await page.eval(() => { window.__probe.clearAll(); });
    await page.eval((t) => { window.__probe.typeSearch(t); }, term);
    await page.eval((t) => window.__probe.clickChip(t), term);
    await sleep(30);
    const C = await page.eval(() => window.__probe.read());
    // D 先点后搜（另一个顺序）
    await page.eval(() => { window.__probe.clearAll(); });
    await page.eval((t) => window.__probe.clickChip(t), term);
    await page.eval(() => { window.__probe.typeSearch('白色'); });
    await sleep(30);
    const D = await page.eval(() => window.__probe.read());
    rec.chipStatus = chipStatus;
    rec.A = { rows: A.rows, q: A.q, emptyShown: A.emptyShown };
    rec.B = { rows: B.rows, ids: Bids, pressed: B.pressed, emptyShown: B.emptyShown };
    rec.C = { rows: C.rows, q: C.q, pressed: C.pressed, emptyShown: C.emptyShown, emptyText: C.emptyText.slice(0, 400) };
    rec.D = { rows: D.rows, q: D.q, pressed: D.pressed, emptyShown: D.emptyShown };
    out.pairs.push(rec);
  }

  /* 空状态里所有「指示用户做某动作」的句子：把 #empty + #empty-tpl 的全文抓下来，
     用正则切出「点…」「清空…」「先…」这类祈使句，人工逐条核对。 */
  out.emptyInstructions = await page.eval(() => {
    const grab = (sel) => {
      const el = document.querySelector(sel);
      return el ? { hidden: el.hidden, text: el.textContent.trim() } : null;
    };
    return { empty: grab('#empty'), emptyTpl: grab('#empty-tpl'), railHint: grab('.rail-hint'), railLead: grab('.rail-lead') };
  });

  /* reset 之后必须 30/30 */
  out.reset = await page.eval(() => {
    document.getElementById('reset').click();
    return { rows: document.querySelectorAll('#ledger .row').length, count: document.getElementById('count').textContent };
  });

  writeFileSync(join(HERE, '_chip-' + tag + '.json'), JSON.stringify(out, null, 1), 'utf8');
  await page.close();
} finally {
  await b.close();
}

const zeroC = out.pairs.filter((p) => p.C.rows === 0).length;
const zeroB = out.pairs.filter((p) => p.B.rows === 0).length;
const zeroD = out.pairs.filter((p) => p.D.rows === 0).length;
console.log('词数 ' + out.pairs.length);
console.log('A 只搜 0 行: ' + out.pairs.filter((p) => p.A.rows === 0).length);
console.log('B 只点芯片 0 行: ' + zeroB + (zeroB ? ' → ' + out.pairs.filter((p) => p.B.rows === 0).map((p) => p.term).join(' ') : ''));
console.log('C 先搜后点 0 行: ' + zeroC);
console.log('D 先点后搜(白色) 0 行: ' + zeroD);
console.log('reset: ' + out.reset.rows + ' / ' + out.reset.count);
console.log('');
for (const p of out.pairs) {
  console.log(
    p.term.padEnd(7, '　') + ' A=' + String(p.A.rows).padStart(2) +
    ' B=' + String(p.B.rows).padStart(2) + (p.chipStatus === 'NO_CHIP' ? '(!) ' : '') +
    ' C=' + String(p.C.rows).padStart(2) +
    ' D=' + String(p.D.rows).padStart(2) +
    ' | ' + (p.B.ids || []).join(',')
  );
}
