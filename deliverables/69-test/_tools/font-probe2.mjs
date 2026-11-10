// 字体可用性：用「双兜底对照法」判，避免 CJK 在 monospace/serif 兜底下宽度相同造成假阴性。
// 对每个 family F：测 width(`"F", serif`) 与 width(`"F", monospace`)。
//   · F 未安装 → 两者分别等于 serif / monospace 基线 → 差值与基线差值相同；
//   · F 已安装 → 两者都等于 F 自身宽度 → 差值为 0。
// 同时给出 width(`"F", serif`) - width(`serif`) 的偏移量作为二次确认。
import { Browser, sleep } from 'file:///D:/Web/style/tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { writeFileSync } from 'node:fs';

const FAMILIES = [
  // 三个案例提示词里声称的族
  'Glow Sans SC', 'Songti SC', 'Georgia', 'Times New Roman',
  'Noto Serif SC', 'Instrument Serif',
  // 声称的等宽族
  'VT323', 'IBM Plex Mono', 'JetBrains Mono', 'Martian Mono',
  // 其它候选案的族（供对照）
  'Space Grotesk', 'Antonio', 'WenJin Mincho', 'EB Garamond', 'Literata',
  // 被禁的族（用来验「不要用 Playfair/Inter/Roboto」是否可执行）
  'Playfair Display', 'Inter', 'Roboto',
  // Windows 常见中文族
  'SimSun', 'Microsoft YaHei', 'DengXian', 'KaiTi', 'FangSong', 'STSong',
  'Source Han Serif SC', 'Noto Sans SC',
];

const html = `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="margin:0">
<div id="probe" style="position:absolute;left:-9999px;top:0;font-size:40px;white-space:nowrap"></div>
</body></html>`;
writeFileSync('D:/Web/style/deliverables/69-test/_staging/font-probe2.html', html, 'utf8');

const b = await Browser.launch({ width: 900, height: 600 });
const p = await b.newPage({ width: 900, height: 600 });
await p.goto('http://127.0.0.1:9101/_staging/font-probe2.html', { settleMs: 800 });

const res = await p.eval((fams) => {
  const el = document.getElementById('probe');
  const measure = (family, text) => {
    el.style.fontFamily = family;
    el.textContent = text;
    return el.getBoundingClientRect().width;
  };
  const LAT = 'HHHmmmiiiWWW 0123456789';
  const CJK = '中文标题测试汉字样本';
  const out = {};
  const baseSerifLat = measure('serif', LAT), baseMonoLat = measure('monospace', LAT);
  const baseSerifCjk = measure('serif', CJK), baseMonoCjk = measure('monospace', CJK);
  for (const f of fams) {
    const latS = measure(`"${f}", serif`, LAT), latM = measure(`"${f}", monospace`, LAT);
    const cjkS = measure(`"${f}", serif`, CJK), cjkM = measure(`"${f}", monospace`, CJK);
    out[f] = {
      latInstalled: Math.abs(latS - latM) < 0.05,
      cjkInstalled: Math.abs(cjkS - cjkM) < 0.05,
      latS: +latS.toFixed(2), latM: +latM.toFixed(2),
      cjkS: +cjkS.toFixed(2), cjkM: +cjkM.toFixed(2),
      latShowsAsSerif: Math.abs(latS - baseSerifLat) < 0.05,
      cjkShowsAsSerif: Math.abs(cjkS - baseSerifCjk) < 0.05,
    };
  }
  return { out, base: { baseSerifLat, baseMonoLat, baseSerifCjk, baseMonoCjk } };
}, FAMILIES);

console.log('baseline serif/mono lat:', res.base.baseSerifLat, res.base.baseMonoLat, ' cjk:', res.base.baseSerifCjk, res.base.baseMonoCjk);
console.log('family'.padEnd(22), 'LAT', 'CJK', ' latW(serif=fallback?)');
for (const f of FAMILIES) {
  const r = res.out[f];
  console.log(
    f.padEnd(22),
    (r.latInstalled ? 'YES' : 'no ').padEnd(3),
    (r.cjkInstalled ? 'YES' : 'no ').padEnd(3),
    ' latS=' + String(r.latS).padStart(8), 'latM=' + String(r.latM).padStart(8),
    'cjkS=' + String(r.cjkS).padStart(7), 'cjkM=' + String(r.cjkM).padStart(7)
  );
}
await b.close();
await sleep(100);
