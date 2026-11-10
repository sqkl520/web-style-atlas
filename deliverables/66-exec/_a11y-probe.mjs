/* 移动端/键盘可达性 5 条缺陷的复现 + 验收探针（真浏览器，CDP）。
 *
 * 为什么不用 jsdom / 静态读文件：
 *   这 5 条里有 4 条的根因在**浏览器自己的层叠与事件模型**里 ——
 *   内联 display 压过 [hidden] 的 UA 规则、焦点在打开浮层后留在原处、
 *   Esc 从 <summary> 冒泡到 document、var() 未定义时回退到继承字号、
 *   以及 24px 触控目标只能看渲染后的 rect。这些在源码里都"看起来是对的"。
 *
 * 为什么键盘必须走 Input.dispatchKeyEvent：
 *   page.eval(() => el.dispatchEvent(new KeyboardEvent(...))) 造的是 isTrusted=false 的合成事件，
 *   它**不会**触发浏览器默认行为（Tab 移焦、summary 展开），
 *   而缺陷 2 的"Tab 87 次"和缺陷 3 的"Esc 冒泡"恰恰都要默认行为参与。
 *   合成事件测出来的数字不可信。
 *
 * 用法：node deliverables/66-exec/_a11y-probe.mjs --tag before|after
 * 输出：deliverables/66-exec/_a11y-<tag>.json + shots-a11y/<tag>-<vp>.jpg
 */
import { Browser, sleep } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const PAGE = 'file:///' + join(ROOT, 'prototypes', '_selection', 'index.html').replace(/\\/g, '/');
const SHOTS = join(HERE, 'shots-a11y');
const tagArg = process.argv.indexOf('--tag');
const TAG = tagArg > 0 ? process.argv[tagArg + 1] : 'now';
mkdirSync(SHOTS, { recursive: true });

const press = async (page, key, code, vk, extra = {}) => {
  await page.send('Input.dispatchKeyEvent', { type: 'keyDown', key, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk, ...extra });
  await page.send('Input.dispatchKeyEvent', { type: 'keyUp', key, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk, ...extra });
  await sleep(50);
};
const TAB = (p) => press(p, 'Tab', 'Tab', 9);
const ESC = (p) => press(p, 'Escape', 'Escape', 27);
const ENTER = (p) => press(p, 'Enter', 'Enter', 13);

/* 真鼠标点击（而不是 el.click()）：缺陷 2 的"焦点落在哪"取决于
   浏览器自己的 mousedown→focus 规则，程序化 click() 不跑那套规则。 */
async function realClick(page, x, y) {
  await page.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y });
  await page.send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 });
  await page.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 });
  await sleep(250);
}

const ACTIVE = () => {
  const a = document.activeElement;
  if (!a) return null;
  const d = document.querySelector('#detail');
  return {
    tag: a.tagName.toLowerCase(),
    id: a.id || '',
    cls: (a.className || '').toString().trim().slice(0, 40),
    text: (a.textContent || a.placeholder || '').replace(/\s+/g, ' ').trim().slice(0, 40),
    isBody: a === document.body,
    inDetail: !!(d && d.contains(a)),
  };
};

const out = { tag: TAG, viewports: {} };

for (const vp of [{ k: '1440', w: 1440, h: 900, m: false }, { k: '390', w: 390, h: 844, m: true }]) {
  const b = await Browser.launch({ width: vp.w, height: vp.h });
  const p = await b.newPage({ width: vp.w, height: vp.h, dsf: 2, mobile: vp.m });
  await p.goto(PAGE, { settleMs: 1700 });
  const rec = {};

  /* ── 缺陷 1：空状态下 #q-parked 的显隐与可 Tab 性 ─────────────────────
   * 两种口径都取：
   *   asIs      —— 当前树的表现
   *   restored  —— 把 syncParked 里那行内联 display 还原成审计时的写法
   *                （cssText 里写死 display:inline-flex、hidden 只走 el.hidden），
   *                用来在已修好的树上**重建**缺陷现场，拿到可对照的改前数字。
   * 判据三件套：computed display / rect.height / 里面两颗按钮在不在 Tab 序列。 */
  const parkedProbe = () => {
    const el = document.getElementById('q-parked');
    if (!el) return { exists: false };
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    const btns = Array.from(el.querySelectorAll('button'));
    const focusable = (nw) => {
      const s = getComputedStyle(nw);
      if (s.display === 'none' || s.visibility === 'hidden') return false;
      const bb = nw.getBoundingClientRect();
      return bb.width > 0 && bb.height > 0 && !nw.disabled;
    };
    return {
      exists: true,
      hiddenAttr: el.hasAttribute('hidden'),
      hiddenProp: el.hidden,
      display: cs.display,
      rect: { top: +r.top.toFixed(1), h: +r.height.toFixed(1), w: +r.width.toFixed(1) },
      occupiesLayout: r.height > 0,
      buttonCount: btns.length,
      tabbableButtons: btns.filter(focusable).length,
      inlineDisplay: el.style.display,
      barH: +document.querySelector('.bar').getBoundingClientRect().height.toFixed(1),
      firstRowTop: +document.querySelector('.row').getBoundingClientRect().top.toFixed(1),
      docH: document.documentElement.scrollHeight,
    };
  };

  rec.d1 = { asIs: await p.eval(parkedProbe) };

  /* 从搜索框真按 5 次 Tab，看会不会停在「放回搜索 / 丢弃」上（行为口径） */
  await p.eval(() => { document.getElementById('q').focus(); });
  const walk = [];
  for (let i = 0; i < 5; i++) {
    await TAB(p);
    walk.push(await p.eval(() => {
      const a = document.activeElement;
      return a ? (a.tagName.toLowerCase() + (a.id ? '#' + a.id : '') + ' ' + (a.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 14)) : null;
    }));
  }
  rec.d1.asIs.tabWalkFromSearch = walk;

  /* 重建审计时的写法：内联 display:inline-flex + hidden=true */
  rec.d1.restored = await p.eval(() => {
    const el = document.getElementById('q-parked');
    el.style.cssText = 'display:inline-flex;align-items:center;gap:6px;flex-wrap:wrap;font-size:13px;line-height:1.5;color:var(--ink-2);' +
      'border:1px dashed var(--rule-2);padding:4px 8px;max-width:100%';
    el.hidden = true;          // 审计时这里只有 hidden，display 仍留在内联样式里
    return true;
  });
  await sleep(150);
  rec.d1.restored = { ...(await p.eval(parkedProbe)), note: 'inline display:inline-flex + hidden=true（审计现场）' };
  await p.eval(() => { document.getElementById('q').focus(); });
  const walk2 = [];
  for (let i = 0; i < 5; i++) {
    await TAB(p);
    walk2.push(await p.eval(() => {
      const a = document.activeElement;
      return a ? (a.tagName.toLowerCase() + (a.id ? '#' + a.id : '') + ' ' + (a.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 14)) : null;
    }));
  }
  rec.d1.restored.tabWalkFromSearch = walk2;
  /* 复原（改后口径重新读一次，保证后面的测量跑在真实状态下） */
  await p.goto(PAGE, { settleMs: 1500 });

  /* ── 缺陷 4：--s-15 是否定义、两处 fallback 到多少 ──────────────────── */
  rec.d4 = await p.eval(() => {
    const cs = getComputedStyle(document.documentElement);
    const claim = document.querySelector('.mast-claim');
    const wizard = document.querySelector('.mast-wizard a');
    return {
      s15: JSON.stringify(cs.getPropertyValue('--s-15')),
      defined: cs.getPropertyValue('--s-15').trim() !== '',
      scale: ['--s-13', '--s-14', '--s-15', '--s-16', '--s-17', '--s-20', '--s-24', '--s-34']
        .map((n) => n + '=' + JSON.stringify(cs.getPropertyValue(n).trim())),
      claimFontSize: getComputedStyle(claim).fontSize,
      claimLines: Math.round(claim.getBoundingClientRect().height / parseFloat(getComputedStyle(claim).lineHeight)),
      claimH: +claim.getBoundingClientRect().height.toFixed(1),
      wizardFontSize: getComputedStyle(wizard).fontSize,
      wizardH: +wizard.getBoundingClientRect().height.toFixed(1),
      bodyFontSize: getComputedStyle(document.body).fontSize,
      mastH: +document.querySelector('.mast').getBoundingClientRect().height.toFixed(1),
      firstRowTop: +document.querySelector('.row').getBoundingClientRect().top.toFixed(1),
    };
  });

  /* ── 缺陷 5：页头三个模板链接的触控目标 ─────────────────────────────
   * WCAG 2.2 AA 2.5.8 两条路：
   *   a) 目标本身 ≥24×24；
   *   b) 间距豁免：以目标为中心的 24px 直径圆不与任何其它目标相交。
   * 多行内联元素（390 档的「作品集 M03」会折成两段）必须用**逐段 rect**判 b)，
   * 用并集矩形会把两段之间的空白当成可点区域 —— 那是假阳性（审计里就撞了这一步）。 */
  rec.d5 = await p.eval(() => {
    const links = Array.from(document.querySelectorAll('.mast-exit a'));
    const frags = (a) => Array.from(a.getClientRects()).map((r) => ({ l: r.left, t: r.top, r: r.right, b: r.bottom, w: r.width, h: r.height }));
    const targets = links.map((a) => ({ text: a.textContent.trim(), frag: frags(a) }));
    const circHits = [];
    for (let i = 0; i < targets.length; i++) {
      for (let j = i + 1; j < targets.length; j++) {
        for (const f of targets[i].frag) {
          const cx = (f.l + f.r) / 2, cy = (f.t + f.b) / 2, rad = 12;
          for (const g of targets[j].frag) {
            const nx = Math.max(g.l, Math.min(cx, g.r));
            const ny = Math.max(g.t, Math.min(cy, g.b));
            const d = Math.hypot(cx - nx, cy - ny);
            if (d < rad) circHits.push({ pair: targets[i].text + ' / ' + targets[j].text, dist: +d.toFixed(1) });
          }
        }
      }
    }
    return {
      count: links.length,
      targets: targets.map((t) => ({ text: t.text, h: +t.frag[0].h.toFixed(1), unionH: +(Math.max(...t.frag.map((f) => f.b)) - Math.min(...t.frag.map((f) => f.t))).toFixed(1), fragCount: t.frag.length, frags: t.frag.map((f) => ({ w: +f.w.toFixed(1), h: +f.h.toFixed(1), t: +f.t.toFixed(1) })) })),
      minHeight: +Math.min(...targets.flatMap((t) => t.frag.map((f) => f.h))).toFixed(1),
      circleHits: circHits,
      passesBySize: targets.every((t) => t.frag.every((f) => f.h >= 24)),
      passesBySpacing: circHits.length === 0,
      mastExitH: +document.getElementById('tpl-exit').getBoundingClientRect().height.toFixed(1),
      linkDisplay: getComputedStyle(links[0]).display,
      linkPadding: getComputedStyle(links[0]).padding,
      notWrapText: true,
    };
  });

  /* ── 缺陷 2：打开详情后的焦点 ───────────────────────────────────────
   * 两条路径分开测，因为浏览器行为不同：
   *   click  真鼠标点行卡（mousedown 会把焦点放到最近的可聚焦祖先/body）
   *   enter  行卡已聚焦，按 Enter
   * 另外按审计口径量"从 body 起 Tab 多少次进面板"。 */
  rec.d2 = {};

  /* (a) 鼠标点击路径 */
  const rowBox = await p.eval(() => {
    const r = document.querySelector('.row[data-id="S01"]');
    r.scrollIntoView({ block: 'center' });
    const b = r.getBoundingClientRect();
    return { x: Math.round(b.left + 40), y: Math.round(b.top + 24) };
  });
  await sleep(200);
  await p.eval(() => { document.body.focus(); if (document.activeElement && document.activeElement.blur) document.activeElement.blur(); });
  await realClick(p, rowBox.x, rowBox.y);
  rec.d2.activeAfterMouseOpen = await p.eval(ACTIVE);
  rec.d2.detailOpenAfterMouse = await p.eval(() => !document.getElementById('detail').hidden);
  rec.d2.detailRect = await p.eval(() => {
    const d = document.getElementById('detail'); const r = d.getBoundingClientRect();
    return { top: +r.top.toFixed(1), h: +r.height.toFixed(1), display: getComputedStyle(d).display, scrollTop: d.scrollTop };
  });
  /* 从 body 数 Tab 到进面板（审计口径 87 次） */
  await p.eval(() => { document.body.focus(); if (document.activeElement && document.activeElement.blur) document.activeElement.blur(); });
  let nTab = 0, firstInside = null;
  for (let i = 0; i < 220; i++) {
    await TAB(p);
    nTab++;
    const a = await p.eval(ACTIVE);
    if (a && a.inDetail) { firstInside = a; break; }
  }
  rec.d2.tabCountFromBodyToDetail = nTab;
  rec.d2.firstInsideDetail = firstInside;

  /* (b) Enter 路径（键盘用户的主路径） */
  await p.eval(() => { document.getElementById('d-close').click(); });
  await sleep(250);
  await p.eval(() => {
    const r = document.querySelector('.row[data-id="S03"]');
    r.scrollIntoView({ block: 'center' }); r.focus();
  });
  await sleep(150);
  rec.d2.focusBeforeEnter = await p.eval(ACTIVE);
  await ENTER(p);
  await sleep(400);
  rec.d2.activeAfterEnterOpen = await p.eval(ACTIVE);
  rec.d2.detailOpenAfterEnter = await p.eval(() => !document.getElementById('detail').hidden);
  rec.d2.dNo = await p.eval(() => document.getElementById('d-no').textContent);

  /* ── 缺陷 2 后半：关闭后焦点回到触发行卡 ──────────────────────────── */
  rec.d2.close = {};
  rec.d2.close.focusBeforeClose = await p.eval(ACTIVE);
  await p.eval(() => { document.getElementById('d-close').click(); });
  await sleep(350);
  rec.d2.close.activeAfterClose = await p.eval(ACTIVE);
  rec.d2.close.detailHidden = await p.eval(() => document.getElementById('detail').hidden);
  rec.d2.close.targetRowIsS03 = await p.eval(() => {
    const a = document.activeElement;
    return !!(a && a.classList && a.classList.contains('row') && a.getAttribute('data-id') === 'S03');
  });

  /* 用键盘 Esc 关（焦点在面板里）也要还回行卡 */
  await ENTER_OPEN_BY_ROW(p, 'S05');
  rec.d2.close.escPath = { before: await p.eval(ACTIVE) };
  await ESC(p);
  await sleep(350);
  rec.d2.close.escPath.after = await p.eval(ACTIVE);
  rec.d2.close.escPath.detailHidden = await p.eval(() => document.getElementById('detail').hidden);

  /* ── 缺陷 3：焦点在 <summary> 上按 Esc ───────────────────────────────
   * 改前：面板关闭（detail.hidden=true）。改后：面板仍在、焦点不丢。
   * 同时留一个对照组：焦点在面板正文（不在 summary）上按 Esc，面板**应该**关。 */
  async function ENTER_OPEN_BY_ROW(page, id) {
    await page.eval((rid) => {
      const r = document.querySelector('.row[data-id="' + rid + '"]');
      r.scrollIntoView({ block: 'center' }); r.focus();
    }, id);
    await sleep(150);
    await ENTER(page);
    await sleep(350);
  }

  rec.d3 = {};
  await ENTER_OPEN_BY_ROW(p, 'S07');
  rec.d3.setup = await p.eval(() => {
    const s = document.querySelector('#detail summary');
    s.focus();
    return {
      detailHidden: document.getElementById('detail').hidden,
      focusedTag: document.activeElement.tagName.toLowerCase(),
      summaryText: (s.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 26),
      detailsOpen: s.parentElement.open,
    };
  });
  await ESC(p);
  await sleep(400);
  rec.d3.afterEscOnSummary = await p.eval(() => ({
    detailHidden: document.getElementById('detail').hidden,
    bodyClass: document.body.className,
    activeTag: document.activeElement ? document.activeElement.tagName.toLowerCase() : null,
    activeIsSummary: !!(document.activeElement && document.activeElement.tagName === 'SUMMARY'),
    activeInDetail: !!(document.querySelector('#detail') && document.querySelector('#detail').contains(document.activeElement)),
    hash: location.hash,
    detailsOpen: (() => { const s = document.querySelector('#detail summary'); return s ? s.parentElement.open : null; })(),
  }));

  /* 对照组：焦点放在面板正文里的「打开原型」链接（非 summary）再按 Esc → 应关闭 */
  await ENTER_OPEN_BY_ROW(p, 'S08');
  rec.d3.control = { setup: await p.eval(() => {
    const link = document.querySelector('#detail .open-proto');
    if (link) link.focus();
    return { focused: document.activeElement.tagName.toLowerCase() + '.' + (document.activeElement.className || '').toString().split(' ')[0], isSummary: document.activeElement.tagName === 'SUMMARY' };
  }) };
  await ESC(p);
  await sleep(400);
  rec.d3.control.afterEsc = await p.eval(() => ({ detailHidden: document.getElementById('detail').hidden }));

  /* ── 快捷键回归：J/K 换案、1/2/3 切视口、/ 定位搜索、Esc 收起 ────────── */
  await ENTER_OPEN_BY_ROW(p, 'S09');
  rec.kbd = {};
  const idBeforeJ = await p.eval(() => document.getElementById('d-no').textContent);
  await p.eval(() => { document.body.focus(); if (document.activeElement && document.activeElement.blur) document.activeElement.blur(); });
  await press(p, 'j', 'KeyJ', 74);
  await sleep(350);
  rec.kbd.J = { from: idBeforeJ, to: await p.eval(() => document.getElementById('d-no').textContent), open: await p.eval(() => !document.getElementById('detail').hidden), active: await p.eval(ACTIVE) };
  await press(p, 'k', 'KeyK', 75);
  await sleep(350);
  rec.kbd.K = { to: await p.eval(() => document.getElementById('d-no').textContent) };
  await press(p, '2', 'Digit2', 50);
  await sleep(300);
  rec.kbd.vp2 = await p.eval(() => Array.from(document.querySelectorAll('.viewer-tabs button')).filter((x) => x.getAttribute('aria-pressed') === 'true').map((x) => x.textContent));
  await press(p, '3', 'Digit3', 51);
  await sleep(300);
  rec.kbd.vp3 = await p.eval(() => Array.from(document.querySelectorAll('.viewer-tabs button')).filter((x) => x.getAttribute('aria-pressed') === 'true').map((x) => x.textContent));
  await press(p, '/', 'Slash', 191);
  await sleep(250);
  rec.kbd.slash = await p.eval(ACTIVE);
  await p.eval(() => { document.body.focus(); if (document.activeElement && document.activeElement.blur) document.activeElement.blur(); });
  await ESC(p);
  await sleep(350);
  rec.kbd.escCloses = await p.eval(() => ({ detailHidden: document.getElementById('detail').hidden, hash: location.hash }));

  /* 截图不在这里做：_a11y-shots.mjs（改后）与 _a11y-shots-before.mjs（改前副本）负责，
     因为它们要在同一个位置、用同一条路径各截一次才可比。
     上一版把截图塞在这里，结果 detail 与 detail-focus 两张字节完全相同（同一时刻连拍两张），
     等于只有一张 —— 那种"有文件但没信息"的证据不如没有。 */

  out.viewports[vp.k] = rec;
  await p.close();
  await b.close();
}

const file = join(HERE, '_a11y-' + TAG + '.json');
writeFileSync(file, JSON.stringify(out, null, 1), 'utf8');
console.log(JSON.stringify(out, null, 1));
console.log('\n→ ' + file);
