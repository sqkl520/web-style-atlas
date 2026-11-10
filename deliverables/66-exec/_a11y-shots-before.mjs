/* 改前截图：为什么不能靠"把 CSS 里那几行注释掉"来做。
 *
 * 因为改前状态不是 HEAD —— HEAD 里根本没有 syncParked()（那是并发 Agent 未提交的改动），
 * 而缺陷 1 的现场恰恰是"并发 Agent 写了 inline-flex、还没补 [hidden] 兜底"这一版。
 * 所以最忠于事实的做法是：把**当前工作树**复制一份到临时目录，只回退我改的那 5 处
 * （逐条字符串替换并断言替换成功），其余一字不动。这样截出来的"改前"与"改后"
 * 是同一份代码、同一份数据，差异只来自这 5 条修复本身。
 *
 * 用法：node deliverables/66-exec/_a11y-shots-before.mjs
 */
import { Browser, sleep } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { readFileSync, writeFileSync, mkdirSync, cpSync, existsSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const SEL = join(ROOT, 'prototypes', '_selection');
const TMP = join(HERE, '_before-clone');
const SHOTS = join(HERE, 'shots-a11y');
mkdirSync(SHOTS, { recursive: true });

/* 整份 _selection 复制走（data.js 很大，但这是判据的一部分：
   改前改后必须共用同一份数据与同一份截图，否则数字差异分不清来源）。
   每次重跑都先删干净：残留的旧副本会让 patch() 在已经回退过的文本上再找锚点而报错，
   或者更糟 —— 让人以为"改前"还是当前代码。第一版这里写了句 cpSync(TMP,TMP)，
   那是自己复制到自己，Node 直接抛 ERR_FS_CP_EINVAL；删掉即可。 */
if (existsSync(TMP)) rmSync(TMP, { recursive: true, force: true });
cpSync(SEL, TMP, { recursive: true });

function patch(file, pairs) {
  const p = join(TMP, file);
  let s = readFileSync(p, 'utf8');
  for (const [from, to, label] of pairs) {
    if (!s.includes(from)) throw new Error('回退失败（找不到锚点）：' + label + ' in ' + file);
    s = s.split(from).join(to);
  }
  writeFileSync(p, s, 'utf8');
}

/* ── 回退 D1：删掉 #q-parked[hidden] 的 CSS 兜底，并把 syncParked 的内联 display
   改回"只靠 hidden 控制"的那一版（内联 cssText 里写死 inline-flex）。 ───────── */
patch('style.css', [
  ['#q-parked[hidden] { display: none !important; }', '/* [改前] 无兜底 */', 'D1 CSS 兜底'],
]);

patch('app.js', [
  ["    el.hidden = !state.qParked;\n    el.style.display = state.qParked ? 'inline-flex' : 'none';",
   "    el.hidden = !state.qParked;\n    /* [改前] 只靠 hidden，内联 display 留在 cssText 里 */",
   'D1 内联 display 同源'],
]);

/* ── 回退 D2：open/close 不做焦点管理 ────────────────────────────────────── */
patch('app.js', [
  ["    /* 焦点必须在 detail.hidden = false 之后移：display:none 的元素聚不上焦。 */\n    if (opts.focus !== false) focusIntoDetail();",
   "    /* [改前] 不移焦点 */",
   'D2 open 移焦点'],
  ["    if (wasOpen && opts.restoreFocus !== false && focusWasOurs) focusBackToRow(id);",
   "    /* [改前] 不回焦点 */",
   'D2 close 回焦点'],
]);

/* ── 回退 D3：detail 上的 summary Esc 拦截整段移除 ─────────────────────────── */
{
  const p = join(TMP, 'app.js');
  let s = readFileSync(p, 'utf8');
  const start = s.indexOf('  detail.addEventListener(\'keydown\', function (e) {');
  if (start < 0) throw new Error('回退失败：找不到 D3 监听器');
  const end = s.indexOf('  });', s.indexOf('focusIntoDetail();', start)) + '  });'.length;
  s = s.slice(0, start) + '  /* [改前] 无 summary Esc 拦截 */' + s.slice(end);
  writeFileSync(p, s, 'utf8');
}

/* ── 回退 D4：删掉 --s-15 定义 ────────────────────────────────────────────── */
patch('style.css', [
  ['  --s-15: 15px;\n', '', 'D4 --s-15 定义'],
]);

/* ── 回退 D5：删掉 .mast-exit a 的垂直内距 ───────────────────────────────── */
patch('style.css', [
  ['.mast-exit a { padding: 2px 0; }', '/* [改前] 无 padding */', 'D5 链接内距'],
]);

/* 顺带把"改前"的焦点环也去掉，好让 §缺陷 2 的截图对照干净
   （这条不是缺陷之一，是我为了让焦点可见而加的；放进改前副本才对比得出来）。 */
patch('style.css', [
  ['.detail-head:focus-visible { outline: 2px solid var(--link); outline-offset: -2px; }', '/* [改前] 无焦点环 */', '焦点环'],
]);

const PAGE = 'file:///' + join(TMP, 'index.html').replace(/\\/g, '/');
const b = await Browser.launch({ width: 1440, height: 900 });
for (const vp of [{ k: '1440', w: 1440, h: 900, m: false }, { k: '390', w: 390, h: 844, m: true }]) {
  const p = await b.newPage({ width: vp.w, height: vp.h, dsf: 2, mobile: vp.m });

  await p.goto(PAGE, { settleMs: 1800 });
  await p.screenshot({ path: join(SHOTS, 'before-' + vp.k + '-1-list-fold.jpg') });
  const mast = await p.eval(() => {
    const r = document.querySelector('.mast').getBoundingClientRect();
    return { x: 0, y: 0, width: Math.ceil(r.width), height: Math.ceil(r.height) };
  });
  await p.screenshot({ path: join(SHOTS, 'before-' + vp.k + '-2-mast.jpg'), clip: mast });

  /* 键盘打开详情：改前焦点应仍在行卡（不在面板里），且面板头没有焦点环 */
  await p.eval(() => {
    const r = document.querySelector('.row[data-id="S01"]');
    r.scrollIntoView({ block: 'center' }); r.focus();
  });
  await sleep(200);
  await p.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', text: '\r', unmodifiedText: '\r', windowsVirtualKeyCode: 13, nativeVirtualKeyCode: 13 });
  await p.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, nativeVirtualKeyCode: 13 });
  await sleep(600);
  await p.screenshot({ path: join(SHOTS, 'before-' + vp.k + '-3-detail-focus.jpg') });

  await p.goto(PAGE, { settleMs: 1500 });
  await p.screenshot({ path: join(SHOTS, 'before-' + vp.k + '-4-no-parked.jpg') });

  /* 改前："没有暂存词" 与 "有暂存词" 在视觉上分不出来 —— 两个按钮一直挂着。
     这里截的是**空状态**那张，它的证词是"明明没有暂存词，底部却有一条放回/丢弃"。 */
  await p.eval(() => {
    document.getElementById('q').value = '咖啡店';
    const chip = Array.from(document.querySelectorAll('.scene-chip')).find((c) => /咖啡店/.test(c.textContent));
    if (chip) chip.click();
  });
  await sleep(600);
  await p.screenshot({ path: join(SHOTS, 'before-' + vp.k + '-5-parked-visible.jpg') });

  await p.close();
}
await b.close();
console.log('改前截图已写入 ' + SHOTS);
