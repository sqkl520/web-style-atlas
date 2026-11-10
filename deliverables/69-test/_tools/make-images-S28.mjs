// 生成 S28 的 6 张占位图：唱片封套裁切拼合，暗紫 + 近黑。
import { Browser, sleep } from 'file:///D:/Web/style/tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { writeFileSync } from 'node:fs';

const W = 640, H = 400;
const variants = [
  { n: 1, cut: 6, label: 'CUT-06', accent: '#AF74BE' },
  { n: 2, cut: 11, label: 'CUT-11', accent: '#D8D4C6' },
  { n: 3, cut: 4, label: 'CUT-04', accent: '#AF74BE' },
  { n: 4, cut: 14, label: 'CUT-14', accent: '#D8D4C6' },
  { n: 5, cut: 8, label: 'CUT-08', accent: '#AF74BE' },
  { n: 6, cut: 12, label: 'CUT-12', accent: '#D8D4C6' },
];

const b = await Browser.launch({ width: 900, height: 600 });
const p = await b.newPage({ width: W, height: H, dsf: 1.5 });

for (const v of variants) {
  const dx = v.cut;
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
  html,body{margin:0;width:${W}px;height:${H}px;overflow:hidden;background:#07080C}
  </style></head><body>
  <svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
    <rect width="${W}" height="${H}" fill="#07080C"/>
    <!-- 封套主体：被裁切的斜块 -->
    <g>
      <polygon points="0,0 ${W - dx * 4},0 ${W - dx * 4 + 30},${H} 0,${H}" fill="#0B0D12"/>
      <polygon points="0,0 ${W * 0.42},0 ${W * 0.30},${H} 0,${H}" fill="${v.accent}" opacity="0.16"/>
      <polygon points="${W * 0.52},0 ${W - dx * 2},0 ${W - dx * 2 + 24},${H * 0.62} ${W * 0.40},${H * 0.62}" fill="${v.accent}" opacity="0.10"/>
      <line x1="${W * 0.30}" y1="0" x2="${W * 0.18}" y2="${H}" stroke="${v.accent}" stroke-width="2"/>
      <line x1="${W * 0.52}" y1="${H * 0.62}" x2="${W - dx * 2}" y2="${H * 0.62}" stroke="${v.accent}" stroke-width="2"/>
      <line x1="0" y1="${H * 0.86}" x2="${W - dx}" y2="${H * 0.86}" stroke="#D8D4C6" stroke-width="2" opacity="0.5"/>
      <!-- 标签圈：同心环 -->
      <circle cx="${W * 0.74}" cy="${H * 0.34}" r="64" fill="none" stroke="${v.accent}" stroke-width="2"/>
      <circle cx="${W * 0.74}" cy="${H * 0.34}" r="30" fill="none" stroke="${v.accent}" stroke-width="2" opacity="0.6"/>
      <circle cx="${W * 0.74}" cy="${H * 0.34}" r="5" fill="${v.accent}"/>
    </g>
    <text x="20" y="${H - 20}" fill="#D8D4C6" font-size="13" font-family="'JetBrains Mono',monospace">${v.label} · ${dx}px</text>
    <text x="${W - 130}" y="28" fill="${v.accent}" font-size="13" font-family="'JetBrains Mono',monospace">S28-16</text>
  </svg></body></html>`;
  await p.send('Page.navigate', { url: 'data:text/html;charset=utf-8,' + encodeURIComponent(html) });
  await sleep(600);
  const data = await p.screenshot({ format: 'jpeg', quality: 84 });
  writeFileSync(`D:/Web/style/deliverables/69-test/S28/images/占位-${v.n}.jpg`, Buffer.from(data, 'base64'));
  console.log('wrote S28 占位-' + v.n + '.jpg');
}
await b.close();
