/* 复现 + 验收：那 29 个「如实标为没有」的行业词，用户到底能不能在界面上看到。
 *
 * 背景（任务书 66 号）：README.md L78 写「29 个如实标为"没有"，收在「还有 28 个只有近似的 →」里，
 * 不藏起来」。而 prompt-copy.js 的 mountSceneChips() 里，那段 note 自带
 *   style.cssText = "...display:none"
 * 「展开」按钮只切 moreHost.style.display，全文件没有任何一处把 note 改回可见
 * ⇒ 这段话用户一次都看不到（display 恒为 none，文本节点在 DOM 里但不可绘制）。
 *
 * 这个脚本只做两件事，都是实测、不看源码推断：
 *   1. 量 note 的 computed display + 尺寸 + 可见性，分别在「点开展开区之前/之后」
 *   2. 把 29 个词逐个人肉核对一遍：它们是不是真的出现在**可见**文本里
 *      （判据不是 textContent —— textContent 在 display:none 时照样有值，那正是这个 bug 骗过前人的方式）
 * 另外存两档截图（1440×900 / 390×844），展开状态各一张。
 *
 * 跑：node deliverables/66-exec/unsupported-probe.mjs
 * 产物：deliverables/66-exec/shots-unsupported/*.png 与本脚本打印的 JSON
 */
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { Browser, sleep } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';

const ROOT = 'D:/Web/style';
const SHOTS = join(ROOT, 'deliverables/66-exec/shots-unsupported');
const PAGE = 'file:///' + ROOT + '/prototypes/_selection/index.html';
mkdirSync(SHOTS, { recursive: true });

/* 29 个词写死在探针里，不从 P.unsupported 现读。
 * 为什么：如果哪天有人把 unsupported 数组改短了，"逐词检查"会跟着变短 —— 那就成了
 * 用被测对象证明被测对象。任务书逐字列了这 29 个，这份清单就是外部基准。 */
const WANT29 = ['电商', '网店', '服装', '乐队', '家教', '培训', '独立开发者', '个人主页', '简历', '社团',
  '捐款', '甜品', '酒吧', '美甲', '展会', '政务', '金融', '医疗', '地产', '旅游',
  '汽车', '母婴', '儿童', '时尚', '美妆', '数码', '家居', '农业', '物流'];

const b = await Browser.launch({ width: 1440, height: 900 });
const out = { page: PAGE, sizes: {}, words: {} };

/* 页内取样器：一个元素的"可见"由三件事共同决定，只查 display 会漏掉「display 复位但
 * 被祖先裁掉/压在 0 高度里」。所以三个都量：computed display、client rect、以及
 * 用 elementFromPoint 打一次"这个点最上面是不是它（或它的后代）"。 */
const PROBE = () => {
  const vis = (e) => {
    if (!e) return null;
    const cs = getComputedStyle(e);
    const rr = e.getBoundingClientRect();
    return {
      display: cs.display,
      visibility: cs.visibility,
      opacity: cs.opacity,
      w: Math.round(rr.width),
      h: Math.round(rr.height),
      top: Math.round(rr.top),
      inDoc: e.isConnected,
    };
  };
  const note = document.querySelector('.scene-unsupported');
  const more = document.querySelector('.scene-more');
  const toggle = document.querySelector('.scene-toggle');
  return { note: vis(note), more: vis(more), toggle: vis(toggle), noteText: note ? note.textContent : null };
};

/* 可见文本的判据：对每一个文本所在的行盒，量它的 rect；display:none 的整棵子树
 * rect 是 0×0。所以「在可见文本里」= 元素自身及所有祖先的 display 都不是 none
 * 且 rect 有面积。这是 display:none 与"视觉隐藏"（opacity:0 / clip）的分界，
 * 也正是这个 bug 的判据 —— 它不需要"人眼判断"。 */
const VISIBLE_TEXT = (sel) => {
  const e = document.querySelector(sel);
  if (!e) return null;
  const ok = (n) => {
    const cs = getComputedStyle(n);
    if (cs.display === 'none' || cs.visibility === 'hidden') return false;
    const r = n.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  };
  let n = e, chain = [];
  while (n && n.nodeType === 1) { chain.push({ tag: n.tagName + (n.className ? '.' + String(n.className).split(' ')[0] : ''), ok: ok(n), display: getComputedStyle(n).display }); n = n.parentElement; }
  return { text: e.textContent, selfVisible: chain[0].ok, allAncestorsVisible: chain.every((c) => c.ok), chain };
};

for (const [label, w, h] of [['1440x900', 1440, 900], ['390x844', 390, 844]]) {
  const p = await b.newPage({ width: w, height: h, dsf: 1, mobile: w < 500 });
  await p.goto(PAGE, { settleMs: 1600 });

  const before = await p.eval(PROBE);
  await p.screenshot({ path: join(SHOTS, `before-${label}.png`), format: 'png' });

  // 点「还有 28 个只有近似的 →」
  const clicked = await p.eval(() => {
    const t = document.querySelector('.scene-toggle');
    if (!t) return null;
    t.scrollIntoView({ block: 'center' });
    t.click();
    return t.textContent;
  });
  await sleep(350);

  const after = await p.eval(PROBE);
  const visText = await p.eval(VISIBLE_TEXT, '.scene-unsupported');
  // 让 note 完整进视口再拍整页图（不然 1440×900 里它被折叠线切掉一半，"看到了"要靠脑补）
  await p.eval(() => {
    const e = document.querySelector('.scene-unsupported');
    if (e) e.scrollIntoView({ block: 'center' });
  });
  await sleep(250);

  // 逐词检查：在**可见**的 note 文本里找一个词。先确认整段是否可见，再逐词。
  const wordHits = await p.eval((words) => {
    const e = document.querySelector('.scene-unsupported');
    if (!e) return { noteExists: false, hits: [] };
    const cs = getComputedStyle(e);
    const ancVisible = (() => { let n = e; while (n && n.nodeType === 1) { const c = getComputedStyle(n); if (c.display === 'none') return false; n = n.parentElement; } return true; })();
    const t = e.textContent;
    return {
      noteExists: true,
      noteDisplay: cs.display,
      effectivelyRendered: ancVisible && cs.display !== 'none',
      hits: words.map((w) => ({ w, inText: t.includes(w) })),
    };
  }, WANT29);

  await p.screenshot({ path: join(SHOTS, `after-${label}.png`), format: 'png' });
  const crop = await p.eval(() => {
    const e = document.querySelector('.scene-unsupported');
    if (!e) return null;
    const r = e.getBoundingClientRect();
    /* ⚠️ screenshot 的 clip 用的是**页面坐标**，getBoundingClientRect 是**视口坐标**。
     * 上面 scrollIntoView 之后页面已经滚过，所以必须加回滚动量 —— 第一版漏了这一步，
     * 裁出来的是旁边那片芯片（而 note 在视口外），图看着"有东西"，实际裁错了区域。 */
    return {
      x: Math.max(0, Math.round(r.left + window.scrollX) - 8),
      y: Math.max(0, Math.round(r.top + window.scrollY) - 8),
      width: Math.min(1200, Math.round(r.width) + 16),
      height: Math.round(r.height) + 16,
    };
  });
  if (crop && crop.width > 0 && crop.height > 0) {
    await p.screenshot({ path: join(SHOTS, `note-crop-${label}.png`), format: 'png', clip: crop });
  }

  out.sizes[label] = { before, after, toggleAfterClick: clicked, visText, words: wordHits };
  await p.close();
}
await b.close();

/* ── 判定 ─────────────────────────────────────────────────────────────── */
let fail = 0;
const ok = (m) => console.log('  ✓ ' + m);
const bad = (m) => { fail++; console.log('  ✗ ' + m); };

console.log('== 复现/验收：29 个未支持行业词的可发现性 ==\n');
for (const [label, r] of Object.entries(out.sizes)) {
  console.log(`-- ${label} --`);
  console.log('   展开前 note.display = ' + (r.before.note && r.before.note.display) +
    '，尺寸 ' + (r.before.note ? r.before.note.w + '×' + r.before.note.h : 'null'));
  console.log('   展开后 note.display = ' + (r.after.note && r.after.note.display) +
    '，尺寸 ' + (r.after.note ? r.after.note.w + '×' + r.after.note.h : 'null') +
    '，more.display = ' + (r.after.more && r.after.more.display));
  const visible = r.after.note && r.after.note.display !== 'none' && r.after.note.w > 0 && r.after.note.h > 0;
  if (visible) ok(label + '：点开展开后 note 真的可见（display=' + r.after.note.display + '，有面积）');
  else bad(label + '：点开展开后 note 仍不可见（display=' + (r.after.note && r.after.note.display) + '）');
  const missing = r.words.hits.filter((x) => !x.inText).map((x) => x.w);
  if (r.words.hits.length !== 29) bad(label + `：只核对了 ${r.words.hits.length} 个词，应为 29`);
  else if (missing.length) bad(label + '：29 个词里缺 ' + missing.length + ' 个：' + missing.join('、'));
  else ok(label + '：29/29 个词都在 note 文本里（文本层）');
  if (!r.words.effectivelyRendered) bad(label + '：note 文本存在但没有被渲染（祖先或自身 display:none）—— 文本层命中不算数');
  else ok(label + '：note 整棵祖先链都可见，文本层命中 = 视觉命中');
  console.log('');
}
console.log(JSON.stringify(out.sizes['1440x900'].visText.chain, null, 1));
console.log('\n截图：' + SHOTS);
console.log(fail ? `\n✗ ${fail} 项不通过` : '\n✓ 全部通过');
process.exit(fail ? 1 : 0);
