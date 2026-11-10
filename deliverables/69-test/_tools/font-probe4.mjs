// 字体判定 v4（权威法）：CSS.getPlatformFontsForNode 逐族报「实际用哪个字体画」。
// 每个族单独一个节点，Latin 与 CJK 各一段，看 platformFonts 里出现的 familyName。
import { Browser, sleep } from 'file:///D:/Web/style/tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { writeFileSync } from 'node:fs';

const FAMILIES = [
  'Glow Sans SC', 'Songti SC', 'Georgia', 'Times New Roman', 'STSong', 'SimSun',
  'Noto Serif SC', 'Instrument Serif', 'Noto Sans SC',
  'VT323', 'IBM Plex Mono', 'JetBrains Mono', 'Martian Mono', 'Consolas',
  'Playfair Display', 'Inter', 'Roboto', 'Microsoft YaHei', 'KaiTi',
  'Space Grotesk', 'Antonio', 'WenJin Mincho', 'EB Garamond', 'Literata',
];

const nodes = [];
FAMILIES.forEach((f, i) => {
  nodes.push(`<div class="p" id="lat${i}" style="font-family:'${f}'">HHHmmmiiiWWW 0123456789</div>`);
  nodes.push(`<div class="p" id="cjk${i}" style="font-family:'${f}'">中文标题测试汉字样本</div>`);
});
const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{margin:0}
.p{font-size:32px;line-height:1.3;white-space:nowrap}</style></head><body>
${nodes.join('\n')}</body></html>`;
writeFileSync('D:/Web/style/deliverables/69-test/_staging/font-probe4.html', html, 'utf8');

const b = await Browser.launch({ width: 1400, height: 900 });
const p = await b.newPage({ width: 1400, height: 900 });
await p.goto('http://127.0.0.1:9101/_staging/font-probe4.html', { settleMs: 1000 });
await p.send('DOM.enable');
await p.send('CSS.enable');
const { root } = await p.send('DOM.getDocument', { depth: -1 });

const rows = [];
for (let i = 0; i < FAMILIES.length; i++) {
  const r = { family: FAMILIES[i] };
  for (const kind of ['lat', 'cjk']) {
    const { nodeId } = await p.send('DOM.querySelector', { nodeId: root.nodeId, selector: `#${kind}${i}` });
    const res = await p.send('CSS.getPlatformFontsForNode', { nodeId });
    r[kind] = res.fonts.map((f) => `${f.familyName}[${f.glyphCount}]`).join(' + ');
  }
  rows.push(r);
}
console.log('family'.padEnd(22), '| LATIN rendered by'.padEnd(40), '| CJK rendered by');
for (const r of rows) {
  const latHit = r.lat.toLowerCase().startsWith(r.family.toLowerCase()) ? '  <<INSTALLED' : '';
  console.log(r.family.padEnd(22), '|', (r.lat || '-').padEnd(38), '|', r.cjk, latHit);
}
await b.close();
await sleep(100);
