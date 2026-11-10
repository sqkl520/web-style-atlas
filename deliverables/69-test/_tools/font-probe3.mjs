// 字体可用性判定 v3：
//  基线 = 一个**一定不存在**的族名（"__DSH_NoSuchFont__"）→ 它必然回退到 generic。
//  若某族宽度 == 该基线宽度，则该族未安装（或与回退度量完全一致）；
//  若不等，则确实装了（且度量与该 generic 不同）。
//  再用 CSS.getPlatformFontsForNode 在真实节点上复核「谁在画字」。
import { Browser, sleep } from 'file:///D:/Web/style/tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { writeFileSync } from 'node:fs';

const FAMILIES = [
  'Glow Sans SC', 'Songti SC', 'Georgia', 'Times New Roman', 'STSong', 'SimSun',
  'Noto Serif SC', 'Instrument Serif', 'Noto Sans SC', 'Source Han Serif SC', 'Source Han Sans SC',
  'VT323', 'IBM Plex Mono', 'JetBrains Mono', 'Martian Mono', 'Consolas', 'Courier New',
  'Playfair Display', 'Inter', 'Roboto', 'Arial', 'Microsoft YaHei', 'DengXian', 'KaiTi',
  'Space Grotesk', 'Antonio', 'WenJin Mincho', 'EB Garamond', 'Literata',
];

const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{margin:0}</style></head><body>
<div id="probe" style="position:absolute;left:-9999px;top:0;font-size:40px;white-space:nowrap"></div>
<div id="stage"></div>
</body></html>`;
writeFileSync('D:/Web/style/deliverables/69-test/_staging/font-probe3.html', html, 'utf8');

const b = await Browser.launch({ width: 1000, height: 700 });
const p = await b.newPage({ width: 1000, height: 700 });
await p.goto('http://127.0.0.1:9101/_staging/font-probe3.html', { settleMs: 800 });

const res = await p.eval((fams) => {
  const el = document.getElementById('probe');
  const w = (family, text) => { el.style.fontFamily = family; el.textContent = text; return el.getBoundingClientRect().width; };
  const LAT = 'HHHmmmiiiWWW 0123456789';
  const CJK = '中文标题测试汉字样本';
  const NO = '"__DSH_NoSuchFont__"';
  const baseLat = {}, baseCjk = {};
  for (const g of ['serif', 'monospace', 'sans-serif']) {
    baseLat[g] = w(`${NO}, ${g}`, LAT);
    baseCjk[g] = w(`${NO}, ${g}`, CJK);
  }
  const out = {};
  for (const f of fams) {
    const row = {};
    for (const g of ['serif', 'monospace', 'sans-serif']) {
      row['lat_' + g] = +(w(`"${f}", ${g}`, LAT) - baseLat[g]).toFixed(2);
      row['cjk_' + g] = +(w(`"${f}", ${g}`, CJK) - baseCjk[g]).toFixed(2);
    }
    row.installedLat = ['serif', 'monospace', 'sans-serif'].some((g) => Math.abs(row['lat_' + g]) > 0.05);
    row.installedCjk = ['serif', 'monospace', 'sans-serif'].some((g) => Math.abs(row['cjk_' + g]) > 0.05);
    out[f] = row;
  }
  return { out, baseLat, baseCjk };
}, FAMILIES);

console.log('generics base LAT:', JSON.stringify(res.baseLat.CJK ? res.baseLat : res.baseLat));
console.log('generics base CJK:', JSON.stringify(res.baseCjk));
console.log('family'.padEnd(22), 'LAT?', 'CJK?', ' Δlat(serif/mono/sans)                 Δcjk(serif/mono/sans)');
for (const f of FAMILIES) {
  const r = res.out[f];
  console.log(
    f.padEnd(22),
    (r.installedLat ? 'YES' : ' . ').padEnd(4),
    (r.installedCjk ? 'YES' : ' . ').padEnd(4),
    ` ${String(r.lat_serif).padStart(8)}${String(r.lat_monospace).padStart(8)}${String(r.lat_sans_serif).padStart(8)}`,
    `   ${String(r.cjk_serif).padStart(8)}${String(r.cjk_monospace).padStart(8)}${String(r.cjk_sans_serif).padStart(8)}`
  );
}
await b.close();
await sleep(100);
