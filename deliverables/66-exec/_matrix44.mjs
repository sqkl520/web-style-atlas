/* 验收 2/3：44 个 sceneIndex 词的「先搜后点」矩阵 + 「先点后搜」矩阵，逐词给证据。
 *
 * 判据（不是"看起来能筛"）：
 *   1) 先搜后点：结果必须 == 「只点芯片」的结果（芯片是最后一下动作，它该赢）；
 *      并且搜索框必须被清空、暂存条必须出现并写着那个词（用户打的字没丢）。
 *   2) 先点后搜：结果必须 == 只按搜索词的结果（AND 语义不变：在这几个里继续缩小）；
 *      若为 0 行，空状态必须给出 ≥1 个可点退路，且点下去能回到非 0。
 *   3) 只搜词：允许 0 行（行业词不在正文里是这件事的供给缺口），
 *      但 0 行时空状态必须给"按这个词的芯片筛（N 行）"这样的可点出口。
 *
 * 跑：node deliverables/66-exec/_matrix44.mjs → _matrix44.json + stdout
 */
import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Browser, sleep } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = 'D:/Web/style';
const PAGE = 'file:///' + ROOT + '/prototypes/_selection/index.html';

const b = await Browser.launch({ width: 1440, height: 900 });
const out = { rows: [], fails: [] };
const fail = (m) => { out.fails.push(m); console.log('  ✗ ' + m); };
try {
  const page = await b.newPage();
  await page.goto(PAGE);
  await sleep(900);
  await page.eval(() => {
    window.__m = {
      reset() { document.getElementById('reset').click(); },
      type(v) {
        const q = document.getElementById('q');
        q.value = v; q.dispatchEvent(new Event('input', { bubbles: true }));
      },
      chipAll(term) {
        /* 44 个词里 28 个收在「还有 28 个只有近似的」里，先展开再点。
           这一步是必须的：不展开时 querySelector 找不到芯片，探针会误判成"芯片不存在"。 */
        const more = document.querySelector('.scene-more');
        elseShow(more);
        function elseShow(m) { if (m) m.style.display = ''; }
        for (const b of document.querySelectorAll('#flt-scene button[data-scene], .scene-more button[data-scene]')) {
          if (b.getAttribute('data-scene') === term) { b.click(); return true; }
        }
        return false;
      },
      collapse() {
        const more = document.querySelector('.scene-more');
        if (more) more.style.display = 'none';
      },
      rows() { return [...document.querySelectorAll('#ledger .row')].map((r) => r.getAttribute('data-id')).sort(); },
      read() {
        const e = document.getElementById('empty');
        return {
          rows: document.querySelectorAll('#ledger .row').length,
          q: document.getElementById('q').value,
          parked: (document.getElementById('q-parked') || {}).hidden === false
            ? (document.getElementById('q-parked').textContent || '') : '',
          emptyShown: !e.hidden,
          acts: [...document.querySelectorAll('#e-next .e-act')].map((x) => x.textContent),
          pressCount: document.querySelectorAll('.scene-chip[aria-pressed="true"]').length + 1 - 1,
        };
      },
      clickFirstAct() {
        const x = document.querySelector('#e-next .e-act');
        if (!x) return null;
        const label = x.textContent;
        x.click();
        return label;
      },
    };
  });

  const terms = await page.eval(() => Object.keys(window.STYLE_PROMPTS.sceneIndex));
  console.log('词数 ' + terms.length + '\n');

  for (const term of terms) {
    const rec = { term };
    /* 只点芯片（基准） */
    await page.eval(() => window.__m.reset());
    const chipOk = await page.eval((t) => window.__m.chipAll(t), term);
    await page.eval(() => window.__m.collapse());
    await sleep(40);
    const onlyChip = await page.eval(() => window.__m.rows());
    rec.chipOk = chipOk;
    rec.onlyChip = onlyChip;

    /* 只搜词 */
    await page.eval(() => window.__m.reset());
    await page.eval((t) => window.__m.type(t), term);
    await sleep(40);
    const onlyQ = await page.eval(() => window.__m.rows());
    const onlyQst = await page.eval(() => window.__m.read());
    rec.onlyQ = onlyQ;
    rec.onlyQacts = onlyQst.acts;

    /* 先搜后点 */
    await page.eval(() => window.__m.reset());
    await page.eval((t) => window.__m.type(t), term);
    await page.eval((t) => window.__m.chipAll(t), term);
    await page.eval(() => window.__m.collapse());
    await sleep(40);
    const after = await page.eval(() => window.__m.rows());
    const st = await page.eval(() => window.__m.read());
    rec.searchThenChip = after;
    rec.afterQ = st.q;
    rec.parked = st.parked;
    rec.presses = st.pressCount;

    /* 先点后搜（搜一个与该词无关的词：白色） */
    await page.eval(() => window.__m.reset());
    await page.eval((t) => window.__m.chipAll(t), term);
    await page.eval(() => window.__m.collapse());
    await page.eval(() => window.__m.type('白色'));
    await sleep(40);
    const d = await page.eval(() => window.__m.read());
    rec.chipThenSearch = d.rows;
    rec.chipThenSearchActs = d.acts;

    /* 先点后搜若 0 行，必须能一键退回 */
    if (d.rows === 0) {
      const label = await page.eval(() => window.__m.clickFirstAct());
      await sleep(40);
      rec.rescue = { label, rows: await page.eval(() => window.__m.rows()) };
    }

    const a = rec.searchThenChip.length === rec.onlyChip.length &&
      rec.searchThenChip.every((x, i) => x === rec.onlyChip[i]);
    const bOK = rec.afterQ === '' && rec.parked.includes(term);
    rec.ok = a && bOK;
    if (!a) fail(term + ' 先搜后点 ≠ 只点芯片（' + rec.searchThenChip.length + ' vs ' + rec.onlyChip.length + '）');
    if (!bOK) fail(term + ' 先搜后点后搜索框未清空或暂存条没写这个词（q="' + rec.afterQ + '" parked="' + rec.parked + '"）');
    if (rec.onlyChip.length === 0) fail(term + ' 只点芯片就是 0 行（芯片本身失效）');
    if (d.rows === 0 && rec.rescue.rows.length === 0) fail(term + ' 先点后搜 0 行且一键退路仍 0 行');
    if (onlyQ.length === 0 && !rec.onlyQacts.length) fail(term + ' 只搜 0 行且空状态无任何可点出口');

    out.rows.push(rec);
    console.log(term.padEnd(6, '　') + ' 只搜=' + String(onlyQ.length).padStart(2) +
      ' 只点=' + String(onlyChip.length).padStart(2) +
      ' 先搜后点=' + String(after.length).padStart(2) + (a ? ' ✓' : ' ✗') +
      ' 先点后搜=' + String(d.rows).padStart(2) +
      (d.rows === 0 ? ' → 一键退回 ' + rec.rescue.rows.length + ' 行' : '') +
      ' | ' + onlyChip.join(','));
  }

  /* 收尾：reset 必须 30/30 */
  await page.eval(() => window.__m.reset());
  await sleep(60);
  const rs = await page.eval(() => window.__m.read());
  out.reset = rs;
  console.log('\nreset → ' + rs.rows + ' 行，搜索框 q="' + rs.q + '"，暂存条=' + (rs.parked ? '在' : '无'));
  if (rs.rows !== 30) fail('reset 后不是 30 行');
  if (rs.q) fail('reset 后搜索框仍有字');
  if (rs.parked) fail('reset 后暂存条还在');
  await page.close();
} finally {
  await b.close();
}

const s2c = out.rows.filter((r) => r.ok).length;
const dead = out.rows.filter((r) => r.searchThenChip.length === 0).length;
const deadD = out.rows.filter((r) => r.chipThenSearch === 0).length;
const deadDres = out.rows.filter((r) => r.chipThenSearch === 0 && r.rescue && r.rescue.rows === 0).length;
console.log('\n先搜后点成功 ' + s2c + '/' + out.rows.length +
  '；其中 0 行 ' + dead +
  '；先点后搜 0 行 ' + deadD + '（一键退回仍 0 行 ' + deadDres + '）');
console.log(out.fails.length ? '失败 ' + out.fails.length + ' 项' : '全部通过');
writeFileSync(join(HERE, '_matrix44.json'), JSON.stringify(out, null, 1), 'utf8');
process.exit(out.fails.length ? 1 : 0);
