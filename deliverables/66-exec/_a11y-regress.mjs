/* 修复后的回归探针：证明"修好了目标缺陷"没有顺手弄坏相邻行为。
 *
 * 五条修复各自的近邻风险：
 *   D1 #q-parked[hidden]{display:none!important} —— 会不会把**该显示**的暂存条也藏掉？
 *      （有暂存词时 el.hidden=false，理论上不命中，但 !important 值得实测一次。）
 *   D2 open() 抢焦点 —— 带 #S07 深链首次加载会不会把焦点扔进右下角面板？
 *   D3 summary 上 Esc 拦截 —— 会不会连"面板里任何地方按 Esc 都能收起"这条退路一起堵死？
 *   另外 J/K 连按时焦点必须一直留在面板里（否则每换一案就掉回 body，等于缺陷 2 复发）。
 *
 * 用法：node deliverables/66-exec/_a11y-regress.mjs
 */
import { Browser, sleep } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const PAGE = 'file:///' + join(ROOT, 'prototypes', '_selection', 'index.html').replace(/\\/g, '/');

/* 真键盘。注意 Enter **必须带 text:'\r'**：
   不带的话浏览器只发一个虚拟键、不合成字符，`<summary>` 的原生激活行为（走 click 合成）
   不会触发。这一点坑过我一次 —— 我据此以为"修复挡住了 summary 开合"，实际是探针的错。
   三种按法的对照见 _a11y-keycheck.mjs。 */
const press = async (page, key, code, vk, mods = 0) => {
  const extra = key === 'Enter' ? { text: '\r', unmodifiedText: '\r' } : {};
  await page.send('Input.dispatchKeyEvent', { type: 'keyDown', key, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk, modifiers: mods, ...extra });
  await page.send('Input.dispatchKeyEvent', { type: 'keyUp', key, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk, modifiers: mods });
  await sleep(60);
};
const TAB = (p) => press(p, 'Tab', 'Tab', 9);
const ESC = (p) => press(p, 'Escape', 'Escape', 27);
const ACT = () => {
  const a = document.activeElement;
  const d = document.querySelector('#detail');
  return { tag: a ? a.tagName.toLowerCase() : null, id: a ? a.id : '', cls: a ? (a.className || '').toString().trim().slice(0, 30) : '', isBody: a === document.body, inDetail: !!(a && d && d.contains(a)) };
};

const out = {};
const b = await Browser.launch({ width: 1440, height: 900 });

/* ── A. 深链 #S07 首次加载：不抢焦点 ─────────────────────────────────── */
{
  const p = await b.newPage({ width: 1440, height: 900, dsf: 2, mobile: false });
  await p.goto(PAGE + '#S07', { settleMs: 2200 });
  out.deepLink = await p.eval(() => ({
    detailOpen: !document.getElementById('detail').hidden,
    dNo: document.getElementById('d-no').textContent,
    activeTag: document.activeElement.tagName.toLowerCase(),
    activeIsBody: document.activeElement === document.body,
    activeInDetail: document.getElementById('detail').contains(document.activeElement),
    hash: location.hash,
  }));
  /* 深链进来后，面板里按一次 Tab 应落到「收起」 */
  await TAB(p);
  out.deepLink.afterOneTab = await p.eval(ACT);
  await p.close();
}

/* ── B. 有暂存词时 #q-parked 必须**看得见**且可 Tab ───────────────────── */
for (const vp of [{ k: '1440', w: 1440, h: 900, m: false }, { k: '390', w: 390, h: 844, m: true }]) {
  const p = await b.newPage({ width: vp.w, height: vp.h, dsf: 2, mobile: vp.m });
  await p.goto(PAGE, { settleMs: 1600 });
  /* 用页面自己暴露的原子接口造出"有暂存词"这个真实状态，而不是直接改 DOM */
  const created = await p.eval(() => {
    document.getElementById('q').value = '咖啡店';
    const chip = Array.from(document.querySelectorAll('.scene-chip')).find((c) => /咖啡店/.test(c.textContent));
    if (chip) { chip.click(); }
    return { parked: window.benchParked ? window.benchParked() : null, chip: chip ? chip.textContent.trim().slice(0, 12) : null };
  });
  await sleep(500);
  const shown = await p.eval(() => {
    const el = document.getElementById('q-parked');
    if (!el) return { exists: false };
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return {
      exists: true, hidden: el.hidden, display: cs.display,
      h: +r.height.toFixed(1), w: +r.width.toFixed(1),
      visible: cs.display !== 'none' && r.height > 0,
      text: (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 30),
      buttons: Array.from(el.querySelectorAll('button')).map((n) => ({ t: n.textContent.trim(), h: +n.getBoundingClientRect().height.toFixed(1) })),
      labelText: (el.querySelector('.q-parked-lab') || {}).textContent,
    };
  });
  out['parked_' + vp.k] = { created, shown };

  /* 点「放回搜索」：词回到输入框、条子消失（这条路径不能被我加的 !important 弄断） */
  const restored = await p.eval(() => {
    const el = document.getElementById('q-parked');
    const back = el && Array.from(el.querySelectorAll('button')).find((n) => n.getAttribute('data-act') === 'back');
    if (!back) return { ok: false, why: 'no back button' };
    back.click();
    return { clicked: true };
  });
  await sleep(400);
  out['parked_' + vp.k].afterRestore = await p.eval(() => {
    const el = document.getElementById('q-parked');
    return {
      q: document.getElementById('q').value,
      parkedState: window.benchParked ? window.benchParked() : null,
      chipStillPressed: document.querySelectorAll('.scene-chip[aria-pressed="true"]').length,
      parkedVisible: !!(el && getComputedStyle(el).display !== 'none' && el.getBoundingClientRect().height > 0),
      rows: document.getElementById('count').textContent,
    };
  });
  await p.close();
}

/* ── C. J/K 连按：焦点一直留在面板里；Esc 阶梯：summary → head → 关闭 ──── */
{
  const p = await b.newPage({ width: 1440, height: 900, dsf: 2, mobile: false });
  await p.goto(PAGE, { settleMs: 1600 });
  await p.eval(() => { const r = document.querySelector('.row[data-id="S01"]'); r.scrollIntoView({ block: 'center' }); r.focus(); });
  await sleep(150);
  await press(p, 'Enter', 'Enter', 13);
  await sleep(400);
  out.ladder = { afterOpen: await p.eval(ACT) };

  /* J 连按 3 次 */
  const seq = [];
  for (let i = 0; i < 3; i++) {
    await press(p, 'j', 'KeyJ', 74);
    await sleep(350);
    seq.push(await p.eval(() => ({ id: document.getElementById('d-no').textContent, active: (() => { const a = document.activeElement; return { cls: (a.className || '').toString().trim().slice(0, 20), inDetail: document.getElementById('detail').contains(a), isBody: a === document.body }; })() })));
  }
  out.ladder.jSequence = seq;

  /* 焦点移到第一个 summary，Esc 一次 → 面板仍开、焦点退到 head */
  await p.eval(() => { const s = document.querySelector('#detail summary'); s.focus(); });
  await sleep(120);
  out.ladder.summaryFocused = await p.eval(ACT);
  await ESC(p);
  await sleep(350);
  out.ladder.esc1 = await p.eval(() => ({ detailOpen: !document.getElementById('detail').hidden, active: (() => { const a = document.activeElement; return { tag: a.tagName.toLowerCase(), cls: (a.className || '').toString().trim().slice(0, 20), inDetail: document.getElementById('detail').contains(a) }; })() }));
  /* 再按一次 Esc（此时焦点在 head，不是 summary）→ 面板应关闭，焦点回行卡 */
  await ESC(p);
  await sleep(400);
  out.ladder.esc2 = await p.eval(() => ({
    detailOpen: !document.getElementById('detail').hidden,
    active: (() => { const a = document.activeElement; return { tag: a.tagName.toLowerCase(), cls: (a.className || '').toString().trim().slice(0, 20), dataId: a.getAttribute ? a.getAttribute('data-id') : null }; })(),
    hash: location.hash,
  }));

  /* summary 上按 Enter 仍能正常开合折叠块（别把人家的默认行为挡住）。
     ⚠️ 必须先重新打开面板：上一步 esc2 已经把 detail 关掉了，此时 #detail 是
     display:none，里面 summary 的 focus() 会**静默失败**（焦点留在上一步的行卡上），
     于是 Enter 按在行卡上又把面板打开 —— 量到的 open=false 全是探针的错，不是页面的。
     这一条我自己踩过两次（第一次还以为是 Enter 少了 text 字段），所以写清楚。 */
  await p.eval(() => {
    if (document.getElementById('detail').hidden) {
      document.querySelector('.row[data-id="S06"]').click();
    }
  });
  await sleep(400);
  await p.eval(() => { const s = document.querySelector('#detail summary'); if (s) s.focus(); });
  await sleep(150);
  out.ladder.summarySetup = await p.eval(() => ({
    detailOpen: !document.getElementById('detail').hidden,
    focusedIsSummary: document.activeElement.tagName === 'SUMMARY',
    open: document.querySelector('#detail summary').parentElement.open,
  }));
  await press(p, 'Enter', 'Enter', 13);
  await sleep(300);
  out.ladder.summaryToggle = await p.eval(() => {
    const s = document.querySelector('#detail summary');
    return { open: s.parentElement.open, detailOpen: !document.getElementById('detail').hidden, stillSummary: document.activeElement.tagName === 'SUMMARY' };
  });
  /* 展开 / 收起 是同一颗键，再按一次应收回 */
  await press(p, 'Enter', 'Enter', 13);
  await sleep(300);
  out.ladder.summaryToggleBack = await p.eval(() => {
    const s = document.querySelector('#detail summary');
    return { open: s.parentElement.open, detailOpen: !document.getElementById('detail').hidden };
  });
  await p.close();
}

/* ── D. 面板关闭后，rail 里点芯片仍然正常（close 的焦点还原不能干扰筛选）── */
{
  const p = await b.newPage({ width: 390, height: 844, dsf: 2, mobile: true });
  await p.goto(PAGE, { settleMs: 1600 });
  await p.eval(() => { document.querySelector('.row[data-id="S01"]').click(); });
  await sleep(400);
  await p.eval(() => { document.getElementById('d-close').click(); });
  await sleep(300);
  const before = await p.eval(() => document.getElementById('count').textContent);
  const r = await p.eval(() => {
    const chip = Array.from(document.querySelectorAll('.scene-chip')).find((c) => /咖啡店/.test(c.textContent));
    if (!chip) return { ok: false };
    chip.click();
    return { ok: true };
  });
  await sleep(500);
  out.chipAfterClose = { before, clicked: r.ok, after: await p.eval(() => document.getElementById('count').textContent) };
  await p.close();
}

await b.close();
const file = join(HERE, '_a11y-regress.json');
writeFileSync(file, JSON.stringify(out, null, 1), 'utf8');
console.log(JSON.stringify(out, null, 1));
console.log('\n→ ' + file);
