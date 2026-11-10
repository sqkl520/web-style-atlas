// 噪声下限：同一个 URL 连测两次，指纹是否一致？
// 如果不一致，任何"逐字节相同"的结论都不能成立，必须先修测量手法。
import { serve } from './lib-exec.mjs';
import { Browser, measureUrl } from './pix-lib.mjs';

const srv = await serve();
const browser = await Browser.launch({ width: 1440, height: 900 });
const CASES = [['S07', 'S07-slate-ink-contents'], ['S13', 'S13-blind-debossed-dispatch'], ['S21', 'S21-interlocking-release-book']];
const ROUNDS = Number(process.argv[2] || 3);

for (const [id, dir] of CASES) {
  const url = srv.url(`prototypes/${dir}/index.html`);
  const got = [];
  for (let i = 0; i < ROUNDS; i++) {
    const m = await measureUrl(browser, url, { width: 1440, height: 900, scrollShots: true });
    got.push(m);
  }
  console.log(`\n===== ${id}  ×${ROUNDS} 同 URL 重复 =====`);
  const fulls = got.map((g) => g.fullSha);
  const boxes = got.map((g) => g.boxesSig);
  console.log(`  docH      ${got.map((g) => g.docH).join(' / ')}  ${new Set(got.map((g) => g.docH)).size === 1 ? '★一致' : '✗漂移'}`);
  console.log(`  boxesSig  ${boxes.map((b) => b.slice(0, 8)).join(' / ')}  ${new Set(boxes).size === 1 ? '★一致' : '✗漂移'}`);
  console.log(`  fullSha   ${fulls.map((b) => b.slice(0, 8)).join(' / ')}  ${new Set(fulls).size === 1 ? '★一致' : '✗漂移'}`);
  console.log(`  fullBytes ${got.map((g) => g.fullBytes).join(' / ')}`);
  for (const y of [0, 900, 1800, 2700, 3600]) {
    const v = got.map((g) => g.scrolls[y]);
    console.log(`  scrollY ${String(y).padEnd(5)} ${v.map((s) => s.slice(0, 8)).join(' / ')}  ${new Set(v).size === 1 ? '★一致' : '✗漂移'}`);
  }
}
await browser.close();
srv.server.close();
