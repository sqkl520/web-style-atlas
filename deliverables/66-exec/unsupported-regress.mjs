/* 回归：我动的是 mountSceneChips 里 note 的样式，而这段所在的容器 moreHost
 * 同时是「28 颗近似芯片」的宿主。所以必须证明我没碰坏它周边的三件事：
 *   1. 折叠/展开循环（开 → 关 → 开）后 note 跟随 moreHost 一起隐显
 *   2. 28 颗近似芯片仍然可点、仍然带 data-scene（note 是个 <p>，不是 button，不该干扰计数）
 *   3. 芯片计数选择器 `#flt-scene button, .scene-more button` 的结果数没变（16 + 28 = 44）
 *
 * 判据写成断言而不是打印，因为"看起来没坏"不算回归证据。
 * 跑：node deliverables/66-exec/unsupported-regress.mjs
 */
import { Browser, sleep } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';

const PAGE = 'file:///D:/Web/style/prototypes/_selection/index.html';
const b = await Browser.launch({ width: 1440, height: 900 });
const p = await b.newPage({ width: 1440, height: 900 });
await p.goto(PAGE, { settleMs: 1600 });

let fail = 0;
const ok = (m) => console.log('  ✓ ' + m);
const bad = (m) => { fail++; console.log('  ✗ ' + m); };

const snap = () => p.eval(() => {
  const q = (s) => document.querySelector(s);
  const n = q('.scene-unsupported'), m = q('.scene-more'), t = q('.scene-toggle');
  const d = (e) => (e ? getComputedStyle(e).display : null);
  const area = (e) => { if (!e) return 0; const r = e.getBoundingClientRect(); return Math.round(r.width * r.height); };
  /* ⚠️ 判「note 到底看不看得见」不能只看它自己的 display（第一版就是这么错判的）：
   * 修法既然是**甲**（让 note 跟着 moreHost 显隐），那 note 自己的 display 就恒为 block，
   * 收起时由祖先 moreHost 的 display:none 让它变 0×0。只查自身 display 会把
   * 「正确的收起」判成失败 —— 断言口径错了，不是代码错了。
   * 所以这里同时给出两个量：自身 display（解释用）与「整条祖先链都可见」这个判据。 */
  const rendered = (e) => {
    if (!e) return false;
    let cur = e;
    while (cur && cur.nodeType === 1) {
      if (getComputedStyle(cur).display === 'none') return false;
      cur = cur.parentElement;
    }
    return area(e) > 0;
  };
  return {
    noteDisplay: d(n), noteArea: area(n), noteRendered: rendered(n),
    moreDisplay: d(m),
    toggleText: t ? t.textContent : null,
    chips: document.querySelectorAll('#flt-scene button, .scene-more button').length,
    nearChips: document.querySelectorAll('.scene-more button[data-scene]').length,
    noteIsButton: n ? n.tagName : null,
  };
});

const s0 = await snap();
console.log('== 折叠态 ==');
if (!s0.noteRendered && s0.noteArea === 0) ok(`收起时 note 不可见（自身 display=${s0.noteDisplay}，被祖先 moreHost 收起，面积 0）`);
else bad(`收起时 note 仍可见：rendered=${s0.noteRendered} area=${s0.noteArea}`);
if (s0.moreDisplay === 'none') ok('收起时 moreHost 不可见');
else bad('收起时 moreHost display=' + s0.moreDisplay);

console.log('\n== 芯片计数（note 不得混进 button 计数）==');
if (s0.chips === 44) ok('`#flt-scene button, .scene-more button` = 44（16 直连 + 28 近似）');
else bad('芯片总数 = ' + s0.chips + '，应为 44');
if (s0.nearChips === 28) ok('.scene-more button[data-scene] = 28');
else bad('近似芯片 = ' + s0.nearChips + '，应为 28');
if (s0.noteIsButton === 'P') ok('note 是 <p> 不是 button（不会被当成芯片）');
else bad('note 的标签是 ' + s0.noteIsButton + '，应为 P');

console.log('\n== 展开 / 收起 / 再展开 ==');
for (const round of [1, 2]) {
  await p.eval(() => document.querySelector('.scene-toggle').click());
  await sleep(300);
  const open = await snap();
  if (open.noteRendered) ok(`第 ${round} 轮展开：note 可见（block，${open.noteArea}px²）`);
  else bad(`第 ${round} 轮展开：note rendered=${open.noteRendered} area=${open.noteArea}`);
  if (/收起/.test(open.toggleText)) ok(`第 ${round} 轮展开：按钮文案 = 「${open.toggleText}」`);
  else bad(`第 ${round} 轮展开：按钮文案异常「${open.toggleText}」`);

  await p.eval(() => document.querySelector('.scene-toggle').click());
  await sleep(300);
  const shut = await snap();
  if (!shut.noteRendered && shut.noteArea === 0) ok(`第 ${round} 轮收起：note 一起收起（自身 display=${shut.noteDisplay}，被祖先收起）`);
  else bad(`第 ${round} 轮收起：note rendered=${shut.noteRendered} area=${shut.noteArea}`);
  if (/还有 28 个/.test(shut.toggleText)) ok(`第 ${round} 轮收起：按钮文案复位 = 「${shut.toggleText}」`);
  else bad(`第 ${round} 轮收起：按钮文案 = 「${shut.toggleText}」`);
}

console.log('\n== 点一颗近似芯片（只测我碰过的那层没挡住点击）==');
const clickRes = await p.eval(() => {
  const t = document.querySelector('.scene-toggle');
  if (getComputedStyle(document.querySelector('.scene-more')).display === 'none') t.click();
  const btn = [...document.querySelectorAll('.scene-more button[data-scene]')].find((x) => x.dataset.scene === '餐厅');
  if (!btn) return { err: '找不到「餐厅」芯片' };
  btn.click();
  return { pressed: btn.getAttribute('aria-pressed'), scene: btn.dataset.scene };
});
if (clickRes.err) bad(clickRes.err);
else if (clickRes.pressed === 'true') ok('「餐厅」近似芯片点击后 aria-pressed=true（点击链路没被 note 干扰）');
else bad('「餐厅」点击后 aria-pressed=' + clickRes.pressed);

await b.close();
console.log(fail ? `\n✗ ${fail} 项不通过` : '\n✓ 全部通过');
process.exit(fail ? 1 : 0);
