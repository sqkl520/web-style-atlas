// 语义核实：<code> 在 Chrome 里的 AX 角色与 UA 计算样式
// 目的：判断「把页码/日期包进 <code>」会不会改变屏幕阅读器的读法。
import { Browser, serve, openPage, sleep } from './lib-exec.mjs';
import { writeFileSync } from 'node:fs';

const HTML = `<!doctype html><html lang="zh-Hans"><head><meta charset="utf-8">
<style>
body{font:16px/1.85 "Noto Serif SC",serif}
.mono{font-family:"Noto Serif SC",serif;font-size:16px;letter-spacing:.02em}
code{font-family:inherit;font-size:inherit;font-weight:inherit;letter-spacing:inherit;line-height:inherit;background:none;padding:0;border:0}
</style></head><body>
<p id="a">第 <span class="mono">118</span> 页</p>
<p id="b">第 <span class="mono"><code>118</code></span> 页</p>
<p id="c">第 <code class="mono">118</code> 页</p>
<pre id="d">alpha</pre>
</body></html>`;

const srv = await serve();
writeFileSync('D:/Web/style/deliverables/69-exec/_ax-test.html', HTML, 'utf8');
const browser = await Browser.launch({ width: 1200, height: 800 });
const page = await openPage(browser, { width: 1200, height: 800 });
await page.goto(srv.url('deliverables/69-exec/_ax-test.html'), { settleMs: 400 });
await sleep(600);

const styles = await page.eval(`(() => {
  const get = (sel) => { const el = document.querySelector(sel); const cs = getComputedStyle(el);
    return { tag: el.tagName, ff: cs.fontFamily, fs: cs.fontSize, fw: cs.fontWeight, ls: cs.letterSpacing, lh: cs.lineHeight,
             bg: cs.backgroundColor, pad: cs.padding, bd: cs.borderTopWidth, ws: cs.whiteSpace, ubi: cs.unicodeBidi,
             rect: (() => { const r = el.getBoundingClientRect(); return [r.x, r.y, r.width, r.height].map(v => +v.toFixed(3)); })(),
             textRects: (() => { const rg = document.createRange(); rg.selectNodeContents(el); return [...rg.getClientRects()].map(r => [r.x, r.y, r.width, r.height].map(v => +v.toFixed(3))); })() };
  };
  return {
    spanOnly: get('#a .mono'),
    spanCode: get('#b .mono'),
    codeHasClass: get('#c .mono'),
    codeEl: get('#b code'),
    uaCode: (() => { const el = document.createElement('code'); document.body.appendChild(el); const cs = getComputedStyle(el);
      const o = { ff: cs.fontFamily, fs: cs.fontSize, ubi: cs.unicodeBidi, ws: cs.whiteSpace }; el.remove(); return o; })(),
  };
})()`);
console.log('--- computed styles ---');
console.log(JSON.stringify(styles, null, 1));

// AX 树
await page.send('Accessibility.enable').catch(() => {});
const { nodes } = await page.send('Accessibility.getFullAXTree');
const interesting = nodes
  .filter((n) => ['paragraph', 'StaticText', 'code', 'generic', 'InlineTextBox', 'none', 'pre'].includes(n.role?.value))
  .map((n) => ({ role: n.role?.value, name: (n.name?.value || '').slice(0, 30), ignored: !!n.ignored, childIds: (n.childIds || []).length }));
console.log('\n--- AX nodes (role / name / ignored) ---');
for (const n of interesting) console.log(`  ${String(n.role).padEnd(12)} ignored=${n.ignored ? 'Y' : 'N'} name="${n.name}"`);

// 专门查 code 元素是否有自己的 AX 节点
const codeNodes = nodes.filter((n) => n.role?.value === 'code');
console.log(`\nrole=="code" 的 AX 节点数：${codeNodes.length}`);
for (const n of codeNodes) console.log('  ', JSON.stringify({ role: n.role.value, name: n.name?.value, ignored: !!n.ignored }));

await browser.close();
srv.server.close();
