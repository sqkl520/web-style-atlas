// 量出 Chrome 对裸 <code> 的 UA 计算样式（不带任何我们自己的覆盖），
// 这样才能精确知道「包 code」要抵消哪些属性 —— 而不是凭印象写 CSS。
import { Browser, serve, sleep } from './lib-exec.mjs';
import { writeFileSync } from 'node:fs';

const HTML = `<!doctype html><html lang="zh-Hans"><head><meta charset="utf-8">
<style>body{font:16px/1.85 "Noto Serif SC",serif;margin:20px}
.mono{font-family:"Noto Serif SC",serif;font-size:16px;letter-spacing:.06em;color:#123456}
.folio{writing-mode:vertical-rl;font-family:"Noto Serif SC",serif;font-size:16px;line-height:28px}
</style></head><body>
<p id="p1">A<span class="mono">118</span>B</p>
<ul><li id="li1">x<span class="mono">G-4</span>y</li></ul>
<div class="folio" id="fol1"><span>第 116 页</span></div>
</body></html>`;

const srv = await serve();
writeFileSync('D:/Web/style/deliverables/69-exec/_ua.html', HTML, 'utf8');
const browser = await Browser.launch({ width: 1200, height: 800 });
const page = await browser.newPage({ width: 1200, height: 800 });
await page.goto(srv.url('deliverables/69-exec/_ua.html'), { settleMs: 300 });
await sleep(500);

const r = await page.eval(`(() => {
  const props = ['fontFamily','fontSize','fontWeight','fontStyle','letterSpacing','lineHeight','color',
    'backgroundColor','paddingTop','paddingLeft','borderTopWidth','borderLeftWidth','marginTop','marginLeft',
    'display','whiteSpace','unicodeBidi','textTransform','fontVariantNumeric','fontFeatureSettings',
    'wordBreak','overflowWrap','verticalAlign','textIndent','fontSynthesis','textRendering',
    'webkitTextFillColor','textDecorationLine','tabSize','direction','writingMode'];
  const snap = (el) => { const cs = getComputedStyle(el); const o = {}; for (const p of props) o[p] = cs[p]; return o; };
  const mk = (tag, cls, txt, parent) => {
    const e = document.createElement(tag); if (cls) e.className = cls; e.textContent = txt;
    parent.appendChild(e); return e;
  };
  const p1 = document.getElementById('p1');
  const li1 = document.getElementById('li1');
  const fol1 = document.getElementById('fol1');

  // 基线：span 原样
  const base = {
    spanInP: snap(p1.querySelector('.mono')),
    liSpan: snap(li1.querySelector('.mono')),
    folioSpan: snap(fol1.querySelector('span')),
  };
  // 变体 1：裸 code（无 class）直接放进 p
  const bareCode = mk('code', '', '118', p1);
  // 变体 2：code 带 .mono 类（替换式）
  const codeClass = mk('code', 'mono', 'G-4', li1);
  // 变体 3：裸 code 在 .folio 里（替换式）
  const folioCode = mk('code', '', '第 116 页', fol1);
  // 变体 4：span.mono 内再套裸 code（包裹式）
  const inner = document.createElement('code'); inner.textContent = '118';
  const wrapSpan = document.createElement('span'); wrapSpan.className = 'mono'; wrapSpan.appendChild(inner);
  p1.appendChild(wrapSpan);

  return {
    ua: {
      bareCode: snap(bareCode),
      codeClass: snap(codeClass),
      folioCode: snap(folioCode),
      innerCode: snap(inner),
    },
    base,
  };
})()`);

const keys = Object.keys(r.ua.bareCode);
console.log('属性'.padEnd(22) + 'span基线'.padEnd(26) + '裸code'.padEnd(26) + 'code.mono'.padEnd(26) + 'code内嵌');
const pick = (o, k) => String(o[k]).slice(0, 24);
const interesting = [];
for (const k of keys) {
  const a = r.base.spanInP[k], b = r.ua.bareCode[k], c = r.ua.codeClass[k], d = r.ua.innerCode[k];
  if (String(a) !== String(b) || String(a) !== String(c) || String(a) !== String(d)) interesting.push(k);
  console.log(k.padEnd(22) + pick(r.base.spanInP, k).padEnd(26) + pick(r.ua.bareCode, k).padEnd(26) + pick(r.ua.codeClass, k).padEnd(26) + pick(r.ua.innerCode, k));
}
console.log('\n★ 与 span 基线不同的属性：' + (interesting.length ? interesting.join(', ') : '（无）'));

// .folio 里 span → 裸 code
console.log('\n.folio 内 span vs code：');
for (const k of keys) {
  if (String(r.base.folioSpan[k]) !== String(r.ua.folioCode[k])) {
    console.log(`  ${k}: ${r.base.folioSpan[k]}  →  ${r.ua.folioCode[k]}`);
  }
}

// AX 角色
await page.send('Accessibility.enable').catch(() => {});
const { nodes } = await page.send('Accessibility.getFullAXTree');
const roles = {};
for (const n of nodes) { const k = n.role?.value; roles[k] = (roles[k] || 0) + 1; }
console.log('\nAX 角色计数:', JSON.stringify(roles));

await browser.close();
srv.server.close();
