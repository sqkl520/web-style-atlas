/* 量 note 那段字的对比度：opacity:.72 + font-size:12px 是原来写死的，
 * 而 .rail-hint 的常规形态是 13px / --ink-3 全不透明。
 * 仓库为 --ink-3 专门调过色（style.css:19 原话「原 #6f6c64 对底只有 4.2:1」），
 * 所以"把它放出来"这件事必须连着对比度一起验，否则放出来的是一段读不清的字。
 */
import { Browser } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
const PAGE = 'file:///D:/Web/style/prototypes/_selection/index.html';
const b = await Browser.launch({ width: 1440, height: 900 });
const p = await b.newPage({ width: 1440, height: 900 });
await p.goto(PAGE, { settleMs: 1500 });
const r = await p.eval(() => {
  const note = document.querySelector('.scene-unsupported');
  const rail = document.querySelector('.rail');
  const rgb = (s) => (s.match(/[\d.]+/g) || []).slice(0, 3).map(Number);
  const lum = ([r, g, b]) => {
    const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  };
  const ratio = (fg, bg) => { const a = lum(fg), c = lum(bg); const hi = Math.max(a, c), lo = Math.min(a, c); return Math.round(((hi + 0.05) / (lo + 0.05)) * 100) / 100; };
  const blend = (fg, bg, a) => fg.map((v, i) => Math.round(v * a + bg[i] * (1 - a)));
  const cs = getComputedStyle(note);
  /* .rail 的 background 是 rgba(0,0,0,0)（透明），直接拿它当底色算出来的是"黑底对比度"。
   * 必须往上走到第一个不透明祖先 —— 这个 bug 我第一版就踩了：算出的 2.73:1 是
   * 「#56534b 对纯黑」的值，与屏幕上看到的东西无关。 */
  const paintedBg = (el) => {
    let n = el;
    while (n && n.nodeType === 1) {
      const c = getComputedStyle(n).backgroundColor;
      const parts = (c.match(/[\d.]+/g) || []).map(Number);
      if (parts.length >= 3 && (parts[3] === undefined || parts[3] > 0.99)) return rgb(c);
      n = n.parentElement;
    }
    return [255, 255, 255];
  };
  const bg = paintedBg(note);
  const bgBody = rgb(getComputedStyle(document.body).backgroundColor);
  const fg = rgb(cs.color);
  const op = parseFloat(cs.opacity);
  const eff = blend(fg, bg, op);
  return {
    fontSize: cs.fontSize,
    color: cs.color,
    opacity: op,
    railBg: getComputedStyle(rail).backgroundColor,
    bodyBg: getComputedStyle(document.body).backgroundColor,
    contrastAsWritten: ratio(eff, bg),
    contrastIfOpaque: ratio(fg, bg),
    noteDisplay: cs.display,
  };
});
console.log(JSON.stringify(r, null, 1));
await b.close();
