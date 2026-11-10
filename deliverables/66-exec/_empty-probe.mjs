/* 空状态「操作指示」可执行性探针（66-exec，2026-10-27）。
 *
 * 判据不是"文案读起来对不对"，而是：**照着它给的按钮点一下，能不能拿到它说出的行数**。
 * 对每个 0 行的状态，抓 #e-next 里的按钮文本、它承诺的数字，然后真的点下去，
 * 比对实际行数。承诺与实际不符 = FAIL。
 *
 * 覆盖四种状态：
 *  a 芯片 + 搜索词同时生效（改前 18 个词都会走到这里）
 *  b 只有芯片、后面几组筛把它筛空
 *  c 只有搜索词（行业词 / 非行业词两种）
 *  d 什么都没搜，纯筛选组合
 * 另外验证「已暂存」条子的两个按钮（放回搜索 / 丢弃）。
 *
 * 跑：node deliverables/66-exec/_empty-probe.mjs
 */
import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Browser, sleep } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = 'D:/Web/style';
const PAGE = 'file:///' + ROOT + '/prototypes/_selection/index.html';

const b = await Browser.launch({ width: 1440, height: 900 });
const out = { cases: [], parked: [], fails: [] };
const fail = (m) => { out.fails.push(m); console.log('  ✗ ' + m); };
const ok = (m) => console.log('  ✓ ' + m);

try {
  const page = await b.newPage();
  await page.goto(PAGE);
  await sleep(900);
  await page.eval(() => {
    window.__p = {
      reset() { document.getElementById('reset').click(); },
      type(v) {
        const q = document.getElementById('q');
        q.value = v;
        q.dispatchEvent(new Event('input', { bubbles: true }));
      },
      chip(term, more) {
        const sel = more ? '.scene-more button[data-scene]' : '#flt-scene button[data-scene]';
        for (const b of document.querySelectorAll(sel)) if (b.getAttribute('data-scene') === term) { b.click(); return true; }
        return false;
      },
      axes(sel) {
        const btn = [...document.querySelectorAll(sel + ' button')][0];
        if (!btn) return false;
        btn.click();
        return btn.textContent;
      },
      read() {
        const e = document.getElementById('empty');
        return {
          rows: document.querySelectorAll('#ledger .row').length,
          count: document.getElementById('count').textContent.trim(),
          emptyShown: !e.hidden,
          emptyText: e.textContent.replace(/\s+/g, ' ').trim(),
          nextText: (document.getElementById('e-next') || {}).textContent || '',
          acts: [...document.querySelectorAll('#e-next .e-act')].map((x) => ({
            act: x.getAttribute('data-act'), label: x.textContent, say: x.textContent.match(/（(\d+) 行）/),
          })),
          parkedHidden: (document.getElementById('q-parked') || {}).hidden,
          parkedText: (document.getElementById('q-parked') || {}).textContent || '',
          q: document.getElementById('q').value,
          tplHidden: document.getElementById('tpl-strip') ? document.getElementById('tpl-strip').hidden : null,
          tplEmptyHidden: document.getElementById('empty-tpl') ? document.getElementById('empty-tpl').hidden : null,
          tplEmptyText: (document.getElementById('empty-tpl') || {}).textContent || '',
        };
      },
      clickAct(act) {
        const x = [...document.querySelectorAll('#e-next .e-act')].find((b) => b.getAttribute('data-act') === act);
        if (!x) return false;
        x.click();
        return true;
      },
      clickParked(act) {
        const x = [...document.querySelectorAll('#q-parked button')].find((b) => b.getAttribute('data-act') === act);
        if (!x) return false;
        x.click();
        return true;
      },
    };
  });

  /* ── 四种状态 → 每个按钮都按一遍 ─────────────────────────── */
  /* 场景 a 的前提是"芯片与搜索词同时生效且交集为 0"。改好之后点芯片会把搜索词挂起，
     这条路径从"用户能走到的状态"变成了"只能由脚本构造的状态"（先点芯片、再手动往框里
     打字就是它：打字不会撤销芯片，见 app.js 里那段"打字不动芯片"）。所以 a 用
     显式构造，而**不是**先搜后点 —— 后者现在会挂起，已经不是 0 行了。 */
  const scenarios = [
    { id: 'a', name: '芯片+搜索词（先点芯片后打字）', setup: async () => { await page.eval(() => { window.__p.reset(); window.__p.chip('咖啡店'); window.__p.type('白色'); }); } },
    { id: 'b', name: '只有芯片+后面几组', setup: async () => {
      await page.eval(() => { window.__p.reset(); window.__p.chip('咖啡店'); });
      // 再按「暗底」把 4 行筛空（S06/S09/S19/S22 全是亮底）
      await page.eval(() => {
        for (const b of document.querySelectorAll('#flt-ground button')) {
          if (b.textContent.indexOf('暗底') === 0) { b.click(); return; }
        }
      });
    } },
    { id: 'c1', name: '只搜行业词', setup: async () => { await page.eval(() => { window.__p.reset(); window.__p.type('咖啡店'); }); } },
    { id: 'c2', name: '只搜非行业词', setup: async () => { await page.eval(() => { window.__p.reset(); window.__p.type('量子计算'); }); } },
    { id: 'd', name: '纯筛选组合', setup: async () => {
      await page.eval(() => { window.__p.reset(); });
      await page.eval(() => {
        for (const b of document.querySelectorAll('#flt-band button')) if (b.textContent.indexOf('冷浅色带') === 0) b.click();
        for (const b of document.querySelectorAll('#flt-load button')) if (b.textContent.indexOf('很多栏目') === 0) b.click();
      });
    } },
  ];

  for (const sc of scenarios) {
    console.log('\n== ' + sc.id + ' ' + sc.name + ' ==');
    await sc.setup();
    await sleep(80);
    const st = await page.eval(() => window.__p.read());
    console.log('  rows=' + st.rows + ' | ' + st.count);
    console.log('  next: ' + st.nextText.replace(/\s+/g, ' '));
    if (st.rows !== 0) { fail(sc.id + ' 预期 0 行，实际 ' + st.rows); continue; }
    if (!st.acts.length) fail(sc.id + ' 空状态里一个可点按钮都没有（只剩文案 = 又回到让用户白读）');
    for (const a of st.acts) {
      // 每条按钮都要单独可执行：重置回本场景再点它
      await sc.setup();
      await sleep(60);
      const before = await page.eval(() => window.__p.read());
      const clicked = await page.eval((act) => window.__p.clickAct(act), a.act);
      await sleep(80);
      const after = await page.eval(() => window.__p.read());
      const promised = a.say ? +a.say[1] : null;
      const good = clicked && after.rows > 0 && (promised == null || after.rows === promised);
      out.cases.push({ sc: sc.id, act: a.act, label: a.label, promised, got: after.rows, clicked, ok: good, beforeRows: before.rows });
      if (good) ok(`[${sc.id}] ${a.label} → 实际 ${after.rows} 行（承诺 ${promised}）`);
      else fail(`[${sc.id}] ${a.label} → 实际 ${after.rows} 行（承诺 ${promised}，clicked=${clicked}）`);
    }
  }

  /* ── 「已暂存」条子：放回 / 丢弃 ─────────────────────────── */
  console.log('\n== 暂存条 ==');
  await page.eval(() => { window.__p.reset(); window.__p.type('咖啡店'); window.__p.chip('咖啡店'); });
  await sleep(80);
  const parked = await page.eval(() => window.__p.read());
  out.parked.push({ step: 'after-chip', ...parked });
  console.log('  条子可见=' + !parked.parkedHidden + ' 文案="' + parked.parkedText.trim() + '" q="' + parked.q + '" rows=' + parked.rows);
  if (parked.parkedHidden) fail('点芯片后没有出现「已暂存」条子 —— 用户会以为字被吃掉了');
  if (parked.q !== '') fail('点芯片后搜索框里仍有字："' + parked.q + '"');
  if (parked.rows !== 4) fail('点芯片后应是 4 行，实际 ' + parked.rows);

  // 放回搜索
  await page.eval(() => window.__p.clickParked('back'));
  await sleep(80);
  const back = await page.eval(() => window.__p.read());
  out.parked.push({ step: 'restore', ...back });
  console.log('  放回后 q="' + back.q + '" rows=' + back.rows + ' 条子隐藏=' + back.parkedHidden);
  if (back.q !== '咖啡店') fail('放回后搜索框不是「咖啡店」，而是 "' + back.q + '"');
  if (back.rows !== 0) fail('放回后应按搜索词筛（0 行），实际 ' + back.rows);

  // 再挂起一次，然后丢弃。「咖啡店」在首屏 16 颗里；「餐厅」在「还有 28 个只有近似的」折叠区，
  // 未展开时 querySelector 找不到它 —— 第一次用餐厅，探针以为芯片没点上。
  await page.eval(() => { window.__p.reset(); window.__p.type('咖啡店'); window.__p.chip('咖啡店'); });
  await sleep(60);
  await page.eval(() => window.__p.clickParked('drop'));
  await sleep(60);
  const drop = await page.eval(() => window.__p.read());
  out.parked.push({ step: 'drop', ...drop });
  console.log('  丢弃后 q="' + drop.q + '" rows=' + drop.rows + ' 条子隐藏=' + drop.parkedHidden);
  if (drop.rows !== 4) fail('丢弃后应保持芯片筛的 4 行，实际 ' + drop.rows);
  if (!drop.parkedHidden) fail('丢弃后条子仍在');

  /* ── reset 之后 30/30 且条子消失 ────────────────────────── */
  await page.eval(() => { window.__p.reset(); window.__p.type('咖啡店'); window.__p.chip('咖啡店'); });
  await page.eval(() => { window.__p.reset(); });
  await sleep(80);
  const rs = await page.eval(() => window.__p.read());
  out.reset = rs;
  console.log('\n== reset ==');
  console.log('  rows=' + rs.rows + ' | ' + rs.count + ' | 条子隐藏=' + rs.parkedHidden + ' | 空状态=' + rs.emptyShown);
  if (rs.rows !== 30) fail('reset 后不是 30 行');
  if (!rs.parkedHidden) fail('reset 后「已暂存」条子还在');

  await page.close();
} finally {
  await b.close();
}

writeFileSync(join(HERE, '_empty-probe.json'), JSON.stringify(out, null, 1), 'utf8');
console.log('\n' + (out.fails.length ? '失败 ' + out.fails.length + ' 项' : '全部通过'));
process.exit(out.fails.length ? 1 : 0);
