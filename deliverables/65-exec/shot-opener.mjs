/* 浏览器实测：输入框在两档视口里可见、可用、不撑破布局；复制按钮用**真实鼠标事件**点。
 *
 * 为什么不用 page.eval 里 el.click()：那不算用户手势。
 * 仓库里已经付过一次代价（99-scratch/verify-headed-clipboard.mjs 顶部注释）：
 * 没有真实手势时 navigator.clipboard 三条路径全部 NotAllowedError；
 * 而 eval 里 .click() 恰恰是"没有手势"的那一种。所以这里全部走 Input.dispatchMouseEvent。
 *
 * 为什么要在 headless 里也读一次剪贴板：
 * 已知无头实例的剪贴板与操作系统隔离（同上注释）。所以判定分两层：
 *   ① 页面内 navigator.clipboard.readText() 能读回刚才写的内容 → 证明写入路径真的写了；
 *   ② 系统剪贴板交给 verify-headed-clipboard.mjs 那条独立路径（本轮不改它）。
 * 只看按钮变成「已复制 ✓」是不够的 —— 那句话在 execCommand 假成功时也会出现（老坑）。
 *
 * 跑：node deliverables/65-exec/shot-opener.mjs
 */
import http from 'node:http';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, extname, normalize } from 'node:path';
import { Browser, sleep } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';

const ROOT = 'D:/Web/style';
const PORT = 9724;
const SHOTS = join(ROOT, 'deliverables/65-exec/shots');
mkdirSync(SHOTS, { recursive: true });

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.jpg': 'image/jpeg', '.png': 'image/png',
  '.svg': 'image/svg+xml', '.json': 'application/json; charset=utf-8',
  '.woff2': 'font/woff2', '.woff': 'font/woff',
};
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/') p = '/prototypes/_selection/index.html';
  const f = normalize(join(ROOT, p));
  if (!f.startsWith(normalize(ROOT)) || !existsSync(f)) { res.writeHead(404); res.end('no'); return; }
  res.writeHead(200, { 'Content-Type': MIME[extname(f)] || 'application/octet-stream' });
  res.end(readFileSync(f));
});
await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
const URL = `http://127.0.0.1:${PORT}/prototypes/_selection/index.html`;

let pass = 0, fail = 0;
const results = [];
function ok(cond, label, detail) {
  if (cond) pass++; else fail++;
  results.push({ ok: !!cond, label, detail });
  console.log((cond ? '  ✓ ' : '  ✗ ') + label + (detail === undefined ? '' : '  ' + JSON.stringify(detail)));
}

const b = await Browser.launch({ width: 1440, height: 900 });
// 允许页面自身读写剪贴板（无头实例下这是唯一能"读回自己刚写的字节"的办法）
await b.send('Browser.grantPermissions', {
  origin: `http://127.0.0.1:${PORT}`,
  permissions: ['clipboardReadWrite', 'clipboardSanitizedWrite'],
});

async function probe(vw, vh, id, tag) {
  console.log(`\n== ${vw}×${vh} · ${id} ==`);
  const p = await b.newPage({ width: vw, height: vh });
  await p.goto(URL + '#' + id, { settleMs: 2600 });

  /* 详情面板由 app.js 从 hash 打开；若没开（hash 竞态），用真实键点开对应行。 */
  const opened = await p.eval(() => !document.getElementById('detail').hidden);
  if (!opened) throw new Error('详情未打开，无法测输入框');

  // ── 结构：两个输入框、label 关联、默认 value 空 ──────────────────
  const dom = await p.eval(() => {
    const wrap = document.querySelector('.prompt-cta');
    const inputs = [...document.querySelectorAll('.prompt-f-input')];
    return {
      hasWrap: !!wrap,
      n: inputs.length,
      fields: inputs.map((i) => ({
        id: i.id,
        type: i.type,
        value: i.value,
        placeholder: i.placeholder,
        hasLabelFor: !!document.querySelector('label[for="' + i.id + '"]'),
        labelText: (document.querySelector('label[for="' + i.id + '"]') || {}).textContent || '',
        ariaLabel: i.getAttribute('aria-label'),
      })),
      wrapTop: wrap ? Math.round(wrap.getBoundingClientRect().top) : null,
      fieldsRects: inputs.map((i) => {
        const r = i.getBoundingClientRect();
        return { top: Math.round(r.top), w: Math.round(r.width) };
      }),
    };
  });
  ok(dom.hasWrap, 'prompt-cta 存在');
  ok(dom.n === 2, '两个输入框', dom.n);
  ok(dom.fields.every((f) => f.type === 'text'), '都是 type=text');
  ok(dom.fields.every((f) => f.value === ''), '默认 value 全为空（不预填「一家小店」）', dom.fields.map((f) => f.value));
  ok(dom.fields.every((f) => f.hasLabelFor), '每个输入框都有 label[for] 关联');
  ok(dom.fields.every((f) => /例：/.test(f.placeholder)), 'placeholder 里有「例：」示例',
    dom.fields.map((f) => f.placeholder));
  /* placeholder 必须**完整可见**，不是"存在就行"。
   * 第一版 26 字的示例在 253px 输入框里被截成「例：看完就想问价，或者直接加微信下…」，
   * 而这一块的唯一职责就是告诉用户该填什么格式 —— 截在一半等于没说完。
   * 量法：用 canvas 按输入框实际 font 量文本宽，与内容宽（扣 padding+border）比。
   * 不用 scrollWidth：input 的 scrollWidth 在未聚焦时不含 placeholder。 */
  const phFit = await p.eval(() => {
    const inputs = [...document.querySelectorAll('.prompt-f-input')];
    return inputs.map((i) => {
      const cs = getComputedStyle(i);
      const c = document.createElement('canvas').getContext('2d');
      c.font = cs.font || (cs.fontSize + ' ' + cs.fontFamily);
      const textW = c.measureText(i.placeholder).width;
      const inner = i.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
      return { ph: i.placeholder, textW: Math.round(textW), inner: Math.round(inner), fits: textW <= inner };
    });
  });
  ok(phFit.every((x) => x.fits), 'placeholder 完整放得下（不被截断）', phFit);
  ok(dom.wrapTop !== null && dom.wrapTop >= 0 && dom.wrapTop < vh * 0.6,
    '这一块落在首屏上半部（不是要滚 3 屏才看得见）', dom.wrapTop + 'px');
  /* 两个输入框的排布：宽面板里**并排一行**，窄面板里自动落到单列。
   * 见下方 geo 量完之后的断言 —— 这里先不下结论，因为要等面板实际可用宽。 */

  // ── 布局：不横向溢出、输入框在面板内、尺寸合理 ──────────────────
  const geo = await p.eval(() => {
    const de = document.documentElement;
    const detail = document.getElementById('detail');
    const dr = detail.getBoundingClientRect();
    const inputs = [...document.querySelectorAll('.prompt-f-input')];
    const btn = document.querySelector('.prompt-copy');
    const rects = inputs.map((i) => {
      const r = i.getBoundingClientRect();
      return { w: Math.round(r.width), h: Math.round(r.height), left: Math.round(r.left), right: Math.round(r.right) };
    });
    const br = btn.getBoundingClientRect();
    return {
      docScrollW: de.scrollWidth, docClientW: de.clientWidth,
      detailScrollW: detail.scrollWidth, detailClientW: detail.clientWidth,
      detailLeft: Math.round(dr.left), detailRight: Math.round(dr.right),
      rects,
      btn: { w: Math.round(br.width), h: Math.round(br.height), right: Math.round(br.right) },
      // 有没有元素真的溢出视口右边（比 scrollWidth 更能定位罪魁）
      wideEls: [...document.querySelectorAll('#detail *')]
        .filter((e) => e.getBoundingClientRect().right > de.clientWidth + 1)
        .slice(0, 5)
        .map((e) => (e.className || e.tagName) + ' right=' + Math.round(e.getBoundingClientRect().right)),
    };
  });
  ok(geo.docScrollW <= geo.docClientW + 1, '文档无横向滚动', geo.docScrollW + ' / ' + geo.docClientW);
  ok(geo.detailScrollW <= geo.detailClientW + 1, '详情面板无横向溢出',
    geo.detailScrollW + ' / ' + geo.detailClientW);
  ok(geo.wideEls.length === 0, '面板内没有元素越过视口右缘', geo.wideEls);
  ok(geo.rects.every((r) => r.w > 120 && r.h >= 28), '输入框尺寸可用（宽>120、高>=28）', geo.rects);
  ok(geo.rects.every((r) => r.left >= geo.detailLeft - 1 && r.right <= geo.detailRight + 1),
    '输入框完全落在详情面板内', { panel: [geo.detailLeft, geo.detailRight] });
  ok(geo.btn.h >= 32, '复制按钮可点高度', geo.btn);

  /* 排布断言，判据按面板实际可用宽分档（不是按视口宽）：
   * 390 档实测 [{top:261,w:347},{top:331,w:347}] —— 单列，两框各 347px。
   * 这不是缺陷，是 auto-fit 的正常回退：面板可用宽 347px，
   * 两个 minmax(200px,1fr) + 12px gap 需要 412px，放不下。
   * 硬排一行会把每个框压到 167px、placeholder 只剩「例：一家只做…」，
   * 而那正是这一块存在的理由（告诉用户该填什么格式）。
   * 分界 420 = 200×2 + 16(gap 12 + 余量)，是 .prompt-fill 那条 grid 的算术结果，
   * 不是拍的 —— 改 minmax 的下限就必须同时改这里，否则断言会和样式脱钩。 */
  const availW = geo.detailClientW - 40;   // 减去 .detail-body 左右 padding(20+20)
  const stacked = !(dom.fieldsRects && Math.abs(dom.fieldsRects[0].top - dom.fieldsRects[1].top) <= 2);
  if (availW >= 420) {
    ok(!stacked, '可用宽 ' + Math.round(availW) + 'px ≥420，两个输入框并排一行', dom.fieldsRects);
  } else {
    ok(stacked && geo.detailScrollW <= geo.detailClientW + 1,
      '可用宽 ' + Math.round(availW) + 'px <420，落成单列且不溢出（刻意回退，不是缺陷）',
      dom.fieldsRects);
  }

  // ── 键盘可达：真实 Tab 从面板里的按钮往后走，能到达输入框 ──────────
  await p.eval(() => { document.querySelector('.prompt-copy').focus(); });
  await p.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
  await p.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
  await sleep(120);
  const afterTab = await p.eval(() => {
    const a = document.activeElement;
    return { tag: a.tagName, id: a.id, cls: a.className };
  });
  ok(afterTab.tag === 'INPUT' && /prompt-f-input/.test(afterTab.cls),
    'Tab 从复制按钮能走到输入框（键盘可达）', afterTab);

  // ── 可用：真实鼠标点击第一个输入框 → 输入中文 → 长度提示跟着变 ──────
  const before = await p.eval(() => document.querySelector('.prompt-hint').textContent);
  const box = await p.eval(() => {
    const i = document.querySelectorAll('.prompt-f-input')[0];
    i.scrollIntoView({ block: 'center' });
    const r = i.getBoundingClientRect();
    return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2) };
  });
  await p.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: box.x, y: box.y, button: 'none' });
  await p.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: box.x, y: box.y, button: 'left', clickCount: 1 });
  await p.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: box.x, y: box.y, button: 'left', clickCount: 1 });
  await sleep(150);
  const focused = await p.eval(() => document.activeElement.id);
  ok(/_prompt-biz/.test(focused) || /prompt-biz/.test(focused), '真实鼠标点击能聚焦「你经营什么」', focused);

  // 真实键入（Input.insertText 走的是插入文本同一路径，等价于输入法落字）
  await p.send('Input.insertText', { text: '一家只做手冲的咖啡店' });
  await sleep(250);
  const typed = await p.eval(() => ({
    v: document.querySelectorAll('.prompt-f-input')[0].value,
    hint: document.querySelector('.prompt-hint').textContent,
  }));
  ok(typed.v === '一家只做手冲的咖啡店', '键入内容进入输入框', typed.v);
  ok(typed.hint !== before, '字数提示跟着输入实时更新', { before: before.slice(-12), after: typed.hint.slice(-12) });

  /* 截图 1：这一块的特写（评审要看的就是它）。clip 用视口坐标，scale 2 让 13px 小字可读。 */
  const clip = await p.eval(() => {
    const w = document.querySelector('.prompt-cta').getBoundingClientRect();
    return { x: Math.max(0, Math.floor(w.left) - 6), y: Math.max(0, Math.floor(w.top) - 6),
      width: Math.ceil(w.width) + 12, height: Math.ceil(w.height) + 12 };
  });
  await p.screenshot({ path: join(SHOTS, `opener-${tag}-closeup.png`), format: 'png', clip: { ...clip, scale: 2 } });
  // 截图 2：整个视口（证明它没撑破外面）
  await p.screenshot({ path: join(SHOTS, `opener-${tag}-viewport.png`), format: 'png' });

  // ── 复制：真实鼠标点击按钮（不是 .click()）────────────────────────
  await p.eval(() => {
    const s = window.__copied = {};
    // 记录它到底写了什么，供下面比对
    s.spy = null;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      const orig = navigator.clipboard.writeText.bind(navigator.clipboard);
      navigator.clipboard.writeText = async (t) => { window.__copied.text = t; return orig(t); };
    }
  });
  const bbox = await p.eval(() => {
    const el = document.querySelector('.prompt-copy');
    el.scrollIntoView({ block: 'center' });
    const r = el.getBoundingClientRect();
    return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2) };
  });
  await p.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: bbox.x, y: bbox.y, button: 'none' });
  await p.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: bbox.x, y: bbox.y, button: 'left', clickCount: 1 });
  await p.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: bbox.x, y: bbox.y, button: 'left', clickCount: 1 });
  await sleep(900);

  const copied = await p.eval(async () => {
    const t = (window.__copied && window.__copied.text) || '';
    let back = null;
    try { back = await navigator.clipboard.readText(); } catch (e) { back = 'ERR:' + e.name; }
    /* ⚠️ 比对前必须把 \r\n 归一成 \n。
     * 第一次跑这条断言是红的：len=1710 而 clipLen=1748，差 38 —— 正好是提示词的换行数。
     * Windows 的系统剪贴板在 CF_UNICODETEXT 里把 \n 存成 \r\n，readText 原样返回。
     * 这不是缺陷，是平台属性；但如果我按 `back === t` 判，就会得出"复制坏了"的假结论，
     * 然后去改一段本来正确的代码。所以这里显式归一，并在报告里把这个差值记下来。 */
    const norm = (s) => (s == null ? s : String(s).replace(/\r\n/g, '\n'));
    return {
      len: t.length,
      firstLine: t.split('\n')[0],
      secondLine: t.split('\n')[1] || '',
      hasTyped: t.indexOf('一家只做手冲的咖啡店') >= 0,
      btnText: document.querySelector('.prompt-copy').textContent,
      fallbackShown: !!document.getElementById('prompt-fallback'),
      clipLen: back ? back.length : 0,
      clipFirst: back && back !== 'ERR' ? back.split('\n')[0] : back,
      clipMatches: norm(back) === norm(t),
      clipLfOnly: typeof back === 'string' ? (back.match(/\n/g) || []).length : 0,
      srcLines: (t.match(/\n/g) || []).length,
    };
  });
  ok(copied.hasTyped, '点按钮时把输入框的值带进了提示词', copied.firstLine);
  ok(copied.btnText.indexOf('已复制') >= 0 || copied.fallbackShown,
    '按钮给了成功反馈或弹出兜底框', { btnText: copied.btnText, fallback: copied.fallbackShown });
  ok(copied.clipMatches, '剪贴板读回的内容与提示词逐字一致（归一 CRLF 后；不是"返回 true"就算）',
    { clipLen: copied.clipLen, len: copied.len, clipFirst: (copied.clipFirst || '').slice(0, 30) });
  ok(copied.clipLen - copied.len === copied.srcLines,
    '多出的字节数恰好等于换行数（CRLF 归一，不是内容被改）',
    { 差: copied.clipLen - copied.len, 换行数: copied.srcLines });
  ok(copied.len > 1600, '复制到的是一份完整提示词', copied.len + ' 字');

  await p.close();
  return { dom, geo, copied };
}

const r1440 = await probe(1440, 900, 'S01', '1440');
const r390 = await probe(390, 844, 'S16', '390');

/* ── 390 档额外：未填时面板里那根待填横线必须可见 ───────────────────── */
console.log('\n== 390 档提示语是否完整可读 ==');
const p3 = await b.newPage({ width: 390, height: 844 });
await p3.goto(URL + '#S16', { settleMs: 2400 });
const note = await p3.eval(() => {
  const n = document.querySelector('.prompt-fill-note');
  const r = n.getBoundingClientRect();
  return {
    text: n.textContent,
    w: Math.round(r.width),
    h: Math.round(r.height),
    clipped: n.scrollWidth > n.clientWidth + 1,
    inViewportWidth: r.right <= document.documentElement.clientWidth + 1,
  };
});
ok(note.text.indexOf('我不知道你做什么生意') >= 0, '面板里写明了「不填会怎样」',
  note.text.slice(0, 34) + '…');
ok(!note.clipped && note.inViewportWidth, '这句说明没被裁掉、也没超出视口', note);
await p3.eval(() => document.querySelector('.prompt-cta').scrollIntoView({ block: 'start' }));
await sleep(300);
await p3.screenshot({ path: join(SHOTS, 'opener-390-note.png'), format: 'png' });
await p3.close();

console.log('\n== 汇总 ==');
console.log('通过 ' + pass + ' 项，失败 ' + fail + ' 项');
console.log('截图目录：deliverables/65-exec/shots/');
await b.close();
server.close();
process.exit(fail ? 1 : 0);
