/* 诊断脚本：为什么 style.css 里的 --s-15 读不到。
 * 起因：磁盘上第 61 行明明白白写着 `--s-15: 15px;`，但 getComputedStyle 取回来是空串，
 * 而**同一个文件里**后面那条 .mast-exit a{padding:2px 0} 却生效了（24px 量到了）。
 * 同一份文件一半生效一半不生效，说明问题在 :root 那个块内部的解析，不在缓存。
 */
import { Browser } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { readFileSync, writeFileSync } from 'node:fs';

const CSS = 'D:/Web/style/prototypes/_selection/style.css';
const raw = readFileSync(CSS);

/* 1) 字节层：BOM / CRLF / 非法 UTF-8 / 注释配对 / 花括号配对 */
const txt = raw.toString('utf8');
const bad = txt.includes('\uFFFD');
const i = txt.indexOf(':root');
const j = txt.indexOf('}', i);
const rootBlock = txt.slice(i, j + 1);
console.log('== style.css 字节层 ==');
console.log('bytes=' + raw.length + ' BOM=' + (raw[0] === 0xEF && raw[1] === 0xBB && raw[2] === 0xBF));
console.log('hasU+FFFD(解码失败)=' + bad + '  CRLF=' + (txt.match(/\r\n/g) || []).length);
console.log('comments open=' + (txt.match(/\/\*/g) || []).length + ' close=' + (txt.match(/\*\//g) || []).length);
console.log(':root block 长度=' + rootBlock.length);
console.log('--s-15 在 :root 块内=' + rootBlock.includes('--s-15'));

/* 2) 逐行打印 :root 块，标出行号，找出解析中断点 */
console.log('\n== :root 块原样（带行号）==');
const startLine = txt.slice(0, i).split('\n').length;
rootBlock.split('\n').forEach((ln, k) => {
  if (/--s-|^\s*:root|^\s*\}/.test(ln)) console.log(String(startLine + k).padStart(4) + ' | ' + ln);
});

/* 3) 在真浏览器里：把 :root 块单独做成一份 style，看它自己解析出什么 */
const b = await Browser.launch({ width: 900, height: 700 });
const p = await b.newPage({ width: 900, height: 700 });

const probe = async (label, cssText) => {
  const html = '<style>' + cssText + '</style><p>x</p>';
  await p.goto('data:text/html;charset=utf-8,' + encodeURIComponent(html), { settleMs: 400 });
  const r = await p.eval(() => {
    const cs = getComputedStyle(document.documentElement);
    let rules = [];
    try { rules = [...document.styleSheets[0].cssRules].map((x) => x.selectorText + ' {' + (x.style ? x.style.cssText.slice(0, 120) : '') + '}'); } catch (e) { rules = ['ERR ' + e.name]; }
    return { s15: JSON.stringify(cs.getPropertyValue('--s-15')), s16: JSON.stringify(cs.getPropertyValue('--s-16')), ruleCount: rules.length, rules };
  });
  console.log('\n== ' + label + ' ==');
  console.log('--s-15=' + r.s15 + '  --s-16=' + r.s16 + '  rules=' + r.ruleCount);
  if (r.rules.length) console.log(r.rules.join('\n'));
};

await probe('A. 整个 :root 块原样', rootBlock);

/* 4) 二分：只留到 --s-16，再逐段加回，定位是哪一行让后面失效 */
const lines = rootBlock.split('\n');
const cut16 = lines.slice(0, lines.findIndex((l) => l.includes('--s-16')) + 1).join('\n') + '\n}';
await probe('B. :root 只到 --s-16', cut16);

await probe('C. B + 只加 --s-15 一行（无注释）', cut16.replace(/\}\s*$/, '  --s-15: 15px;\n}\n'));

const commentOnly = rootBlock.slice(rootBlock.indexOf('/*', rootBlock.indexOf('--s-16')), rootBlock.indexOf('--s-15') + '--s-15: 15px;'.length) + '\n}';
await probe('D. 只放我新加的那段注释 + --s-15', ':root {\n' + commentOnly);

writeFileSync('D:/Web/style/deliverables/66-exec/_cssdiag-root.txt', rootBlock, 'utf8');
await p.close();
await b.close();
