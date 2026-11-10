// 生成 S21 的 6 张占位图：锁闭条切口档位图（30/45/60°）+ 号牌 + 缝隙 + 簿页。
import { Browser, sleep } from 'file:///D:/Web/style/tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { writeFileSync } from 'node:fs';

const W = 400, H = 264; // 2x 存储，页面 200x132
const items = [
  { n: 1, label: '30', deg: 30, kind: 'cut' },
  { n: 2, label: '45', deg: 45, kind: 'cut' },
  { n: 3, label: '60', deg: 60, kind: 'cut' },
  { n: 4, label: '牌', deg: 0, kind: 'plate' },
  { n: 5, label: '缝', deg: 0, kind: 'gap' },
  { n: 6, label: '簿', deg: 0, kind: 'page' },
];

const b = await Browser.launch({ width: 600, height: 400 });
const p = await b.newPage({ width: W, height: H, dsf: 2 });

for (const it of items) {
  let body = '';
  if (it.kind === 'cut') {
    // 三条 24x96 的条（放大 2x：48x192），右端按 deg 斜切，1px 缝
    const bars = [0, 1, 2].map((k) => {
      const y = 24 + k * 50;
      const dx = Math.round(24 * Math.tan((it.deg * Math.PI) / 180) / 2 * 2); // 视觉近似
      return `<g>
        <rect x="40" y="${y}" width="96" height="48" fill="#3E3A34"/>
        <polygon points="${136 - dx},${y} 136,${y + 24} ${136 - dx},${y + 48}" fill="#E4DCC9"/>
        <text x="52" y="${y + 30}" fill="#E4DCC9" font-size="18" font-family="'IBM Plex Mono',monospace">${it.label}°</text>
      </g>`;
    }).join('');
    body = `<svg width="${W}" height="${H}"><rect width="${W}" height="${H}" fill="#E4DCC9"/>${bars}
      <line x1="40" y1="${24 + 3 * 50 + 4}" x2="200" y2="${24 + 3 * 50 + 4}" stroke="#6E6A5E" stroke-width="2"/>
      <text x="40" y="${H - 22}" fill="#6E6A5E" font-size="13" font-family="'IBM Plex Mono',monospace">CUT ${it.label}° / 1px GAP</text>
    </svg>`;
  } else if (it.kind === 'plate') {
    body = `<svg width="${W}" height="${H}"><rect width="${W}" height="${H}" fill="#E4DCC9"/>
      <rect x="40" y="30" width="320" height="80" fill="#3E3A34"/>
      <text x="56" y="80" fill="#E4DCC9" font-size="26" font-family="'IBM Plex Mono',monospace">03 / 07</text>
      <rect x="40" y="130" width="320" height="80" fill="#E4DCC9" stroke="#924307" stroke-width="3"/>
      <text x="56" y="180" fill="#924307" font-size="26" font-family="'IBM Plex Mono',monospace">L-01 · 30°</text>
      <text x="40" y="${H - 18}" fill="#6E6A5E" font-size="13" font-family="'IBM Plex Mono',monospace">SWITCH PLATE</text>
    </svg>`;
  } else if (it.kind === 'gap') {
    const rows = [0, 1, 2, 3, 4].map((k) => {
      const y = 34 + k * 40;
      return `<rect x="60" y="${y}" width="240" height="36" fill="#3E3A34"/>
              <rect x="60" y="${y + 36}" width="240" height="2" fill="#E4DCC9"/>`;
    }).join('');
    body = `<svg width="${W}" height="${H}"><rect width="${W}" height="${H}" fill="#E4DCC9"/>${rows}
      <text x="60" y="${H - 18}" fill="#6E6A5E" font-size="13" font-family="'IBM Plex Mono',monospace">1px PAPER SEAM</text>
    </svg>`;
  } else {
    const lines = [0, 1, 2, 3, 4, 5, 6, 7].map((k) =>
      `<line x1="40" y1="${42 + k * 26}" x2="${40 + (k % 3 === 0 ? 280 : 210)}" y2="${42 + k * 26}" stroke="#6E6A5E" stroke-width="2"/>`
    ).join('');
    body = `<svg width="${W}" height="${H}"><rect width="${W}" height="${H}" fill="#E4DCC9"/>
      <rect x="28" y="24" width="344" height="216" fill="none" stroke="#3E3A34" stroke-width="3"/>
      ${lines}
      <text x="40" y="${H - 16}" fill="#924307" font-size="13" font-family="'IBM Plex Mono',monospace">LEDGER p.03</text>
    </svg>`;
  }
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>html,body{margin:0;width:${W}px;height:${H}px;overflow:hidden;background:#E4DCC9}</style></head><body>${body}</body></html>`;
  await p.send('Page.navigate', { url: 'data:text/html;charset=utf-8,' + encodeURIComponent(html) });
  await sleep(600);
  const data = await p.screenshot({ format: 'jpeg', quality: 82 });
  writeFileSync(`D:/Web/style/deliverables/69-test/S21/images/占位-${it.n}.jpg`, Buffer.from(data, 'base64'));
  console.log('wrote S21 占位-' + it.n + '.jpg');
}
await b.close();
