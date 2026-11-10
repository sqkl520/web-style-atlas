// 生成 6 张占位 JPG（不是 1px 图、不是纯色块）：用 Chrome 截图，
// 内容 = 该案提示词描述的线条底稿风格。只写 deliverables/69-test/S20/images/。
import { Browser, sleep } from 'file:///D:/Web/style/tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { writeFileSync } from 'node:fs';

const N = 6, W = 440, H = 292; // 2x 存储，页面上按 220x146 显示
const b = await Browser.launch({ width: 600, height: 400 });
const p = await b.newPage({ width: W, height: H, dsf: 2 });

for (let i = 1; i <= N; i++) {
  // 每条线的相位不同，保证 6 张图不是同一张
  const phase = i * 37;
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
  html,body{margin:0;width:${W}px;height:${H}px;background:#FAF3E1;overflow:hidden}
  svg{display:block}
  </style></head><body>
  <svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
    <defs>
      <pattern id="g" width="8" height="8" patternUnits="userSpaceOnUse">
        <path d="M8 0H0V8" fill="none" stroke="#55606B" stroke-width="0.2"/>
      </pattern>
    </defs>
    <rect width="${W}" height="${H}" fill="#FAF3E1"/>
    <rect width="${W}" height="${H}" fill="url(#g)"/>
    <rect x="10" y="10" width="${W - 20}" height="${H - 20}" fill="none" stroke="#0F1418" stroke-width="0.5"/>
    <path d="M28 ${H - 34}H${W - 28}" fill="none" stroke="#0F1418" stroke-width="0.5"/>
    <path d="M28 26V${H - 34}" fill="none" stroke="#0F1418" stroke-width="0.5"/>
    <polyline points="28,${H - 60 - phase % 30} ${W * 0.2},${H - 90 + phase % 40} ${W * 0.4},${60 + phase % 50} ${W * 0.6},${100 - phase % 35} ${W * 0.8},${52 + phase % 44} ${W - 28},${78 - phase % 28}"
      fill="none" stroke="#26485C" stroke-width="0.5"/>
    <polyline points="28,${H - 74 - phase % 24} ${W * 0.2},${H - 110 + phase % 32} ${W * 0.4},${80 + phase % 42} ${W * 0.6},${120 - phase % 30} ${W * 0.8},${72 + phase % 38} ${W - 28},${98 - phase % 22}"
      fill="none" stroke="#26485C" stroke-width="1"/>
    <polyline points="28,${H - 100 - phase % 18} ${W * 0.2},${H - 140 + phase % 24} ${W * 0.4},${110 + phase % 34} ${W * 0.6},${150 - phase % 24} ${W * 0.8},${102 + phase % 30} ${W - 28},${128 - phase % 16}"
      fill="none" stroke="#26485C" stroke-width="3"/>
    <text x="30" y="${H - 42}" fill="#55606B" font-size="9" font-family="'Martian Mono',monospace">PLATE 0${i}</text>
    <text x="${W - 96}" y="30" fill="#0F1418" font-size="9" font-family="'Martian Mono',monospace">S20-0${i}</text>
  </svg></body></html>`;
  await p.send('Page.navigate', { url: 'data:text/html;charset=utf-8,' + encodeURIComponent(html) });
  await sleep(700);
  const data = await p.screenshot({ format: 'jpeg', quality: 82 });
  writeFileSync(`D:/Web/style/deliverables/69-test/S20/images/占位-${i}.jpg`, Buffer.from(data, 'base64'));
  console.log('wrote 占位-' + i + '.jpg');
}
await b.close();
