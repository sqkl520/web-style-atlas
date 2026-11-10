// 字体可用性探针：只问 Chrome「这台机器上这些 family 有没有」，不涉及任何设计。
import { Browser, sleep } from 'file:///D:/Web/style/tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';

const FAMILIES = [
  'Space Grotesk', 'Noto Sans SC', 'Noto Serif SC', 'Martian Mono',
  'Antonio', 'WenJin Mincho', 'Georgia', 'Songti SC', 'STSong', 'IBM Plex Mono',
  'Instrument Serif', 'JetBrains Mono',
  'Playfair Display', 'Inter', 'Roboto',
  'SimSun', 'Microsoft YaHei', 'Times New Roman', 'Arial', 'Segoe UI', 'DengXian', 'KaiTi', 'FangSong',
];

const b = await Browser.launch({ width: 1440, height: 900 });
const p = await b.newPage({ width: 1440, height: 900 });
await p.goto('about:blank', { settleMs: 200 });
const res = await p.eval((fams) => {
  const out = {};
  for (const f of fams) {
    let ok = false;
    try { ok = document.fonts.check(`16px "${f}"`); } catch (e) { ok = 'err'; }
    out[f] = ok;
  }
  // 更硬的办法：量文本宽度，与三个通用族比较
  const mk = (family) => {
    const s = document.createElement('span');
    s.textContent = '中文测试 ABCdefg 0123';
    s.style.cssText = `position:absolute;visibility:hidden;font-size:40px;font-family:${family}`;
    document.body.appendChild(s);
    const w = s.getBoundingClientRect().width;
    s.remove();
    return w;
  };
  const width = {};
  for (const f of fams) width[f] = mk(`"${f}", monospace`) - mk('monospace');
  return { check: out, width, ua: navigator.userAgent };
}, FAMILIES);

console.log('UA:', res.ua);
console.log('family'.padEnd(20), 'fonts.check', 'widthDelta(px)');
for (const f of FAMILIES) {
  console.log(f.padEnd(20), String(res.check[f]).padEnd(11), res.width[f].toFixed(2));
}
await b.close();
await sleep(100);
