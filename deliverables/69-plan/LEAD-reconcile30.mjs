// 30/30 全量对账：提示词声称的机械约束 vs 原型实际渲染值
// 这是「不需要生成就能做的验证」，能立刻发现数据层谎言
import { Browser } from 'file:///D:/Web/style/tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { createServer } from 'node:http';
import { readFileSync, existsSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, extname } from 'node:path';

const ROOT = 'D:/Web/style';
const DUMP = join(ROOT, 'deliverables/69-plan/dump');
const OUT = join(ROOT, 'deliverables/69-plan/reconcile');
mkdirSync(OUT, { recursive: true });
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json', '.woff2': 'font/woff2', '.woff': 'font/woff2', '.ttf': 'font/ttf', '.otf': 'font/otf' };
const server = createServer((req, res) => {
  const u = decodeURIComponent(req.url.split('?')[0]);
  const p = join(ROOT, u);
  if (!existsSync(p)) { res.writeHead(404); res.end('nf'); return; }
  res.writeHead(200, { 'Content-Type': MIME[extname(p)] || 'application/octet-stream' });
  res.end(readFileSync(p));
});
await new Promise(r => server.listen(8520, '127.0.0.1', r));

const dirs = readdirSync(join(ROOT, 'prototypes'), { withFileTypes: true })
  .filter(d => d.isDirectory() && /^S\d{2}-/.test(d.name)).map(d => d.name).sort();

const browser = await Browser.launch({ headless: true });
const page = await browser.newPage();

const rows = [];
for (const dir of dirs) {
  const id = dir.slice(0, 3);
  const pf = join(DUMP, id + '.txt');
  if (!existsSync(pf)) { console.log(`${id}: 缺提示词 dump`); continue; }
  const prompt = readFileSync(pf, 'utf8');

  // 从提示词抽声称值
  const claimHex = [...new Set((prompt.match(/#[0-9a-fA-F]{6}/g) || []).map(x => x.toUpperCase()))];
  // 排除「防退化」段落里的否定示例（#6366F1 是禁用的）
  const negativeHex = new Set();
  const negSeg = /防退化[\s\S]*?(?=验收|输出要求|$)/.exec(prompt);
  if (negSeg) for (const m of negSeg[0].matchAll(/#[0-9a-fA-F]{6}/g)) negativeHex.add(m[0].toUpperCase());
  const posHex = claimHex.filter(h => !negativeHex.has(h));

  const claimRadius0 = /全站一律\s*0|一律\s*(方角|直角)|border-radius:\s*0/.test(prompt);
  const claimWidths = [...new Set([...prompt.matchAll(/(\d+(?:\.\d+)?)px/g)].map(m => m[1]))];

  await page.setViewport({ width: 1440, height: 900, mobile: false });
  await page.goto(`http://127.0.0.1:8520/prototypes/${dir}/index.html`, { settleMs: 2000 });

  const actual = await page.eval(`(() => {
    const all = [...document.querySelectorAll('*')];
    const bcs = getComputedStyle(document.body);
    const hex = (rgb) => { const m = rgb.match(/rgba?\\((\\d+),\\s*(\\d+),\\s*(\\d+)/); if (!m) return null; const h = (n) => (+n).toString(16).padStart(2,'0'); return ('#' + h(m[1]) + h(m[2]) + h(m[3])).toUpperCase(); };
    const usedColors = new Set();
    const widths = new Set();
    const radii = new Set();
    let outerShadow = 0, insetShadow = 0;
    const fams = new Set();
    for (const el of all) {
      const s = getComputedStyle(el);
      for (const k of ['color','backgroundColor','borderTopColor','borderBottomColor','outlineColor']) {
        const v = s[k];
        if (v && !/rgba\\(0, 0, 0, 0\\)|transparent/i.test(v)) { const h = hex(v); if (h && h !== '#FFFFFF' || (v.includes('255, 255, 255'))) usedColors.add(h); }
      }
      for (const k of ['borderTopWidth','borderRightWidth','borderBottomWidth','borderLeftWidth','outlineWidth']) {
        const v = s[k]; if (v && v !== '0px') widths.add(v);
      }
      for (const k of ['borderTopLeftRadius','borderTopRightRadius','borderBottomLeftRadius','borderBottomRightRadius']) {
        const v = s[k]; if (v && v !== '0px') radii.add(v);
      }
      const bs = s.boxShadow;
      if (bs && bs !== 'none') { if (bs.includes('inset')) insetShadow++; else outerShadow++; }
      const f = s.fontFamily.split(',')[0].replace(/["']/g,'').trim();
      if (f && !/^(serif|sans-serif|monospace|system-ui)$/i.test(f)) fams.add(f);
    }
    return {
      bodyBg: hex(bcs.backgroundColor),
      htmlBg: hex(getComputedStyle(document.documentElement).backgroundColor),
      usedColors: [...usedColors],
      widths: [...widths].sort(),
      radii: [...radii],
      outerShadow, insetShadow,
      fams: [...fams],
      h1Font: (document.querySelector('h1') ? getComputedStyle(document.querySelector('h1')).fontFamily : '').split(',')[0].replace(/["']/g,'').trim(),
    };
  })()`);

  // 对账
  const posSet = new Set(posHex);
  const actualSet = new Set(actual.usedColors);
  const hexInPrompt = [...posSet].filter(h => actualSet.has(h));
  const hexMissing = [...posSet].filter(h => !actualSet.has(h)); // 提示词声称但页面没用
  const hexExtra = [...actualSet].filter(h => !posSet.has(h) && !['#FFFFFF', '#000000'].includes(h)); // 页面用了但提示词没说

  rows.push({
    id,
    hexClaim: posHex.length,
    hexHit: hexInPrompt.length,
    hexMissing, hexExtra,
    radiusClaim0: claimRadius0,
    radiusActualNonZero: actual.radii.length,
    shadowOuter: actual.outerShadow,
    shadowInset: actual.insetShadow,
    widthsActual: actual.widths,
    h1Font: actual.h1Font,
    fams: actual.fams,
    bodyBg: actual.bodyBg,
    promptHasBodyBg: actual.bodyBg ? posSet.has(actual.bodyBg) || posSet.has((actual.bodyBg || '').toUpperCase()) : false,
  });
  console.log(`${id}: hex ${hexInPrompt.length}/${posHex.length}${hexMissing.length ? ' 缺:' + hexMissing.join(',') : ''}${hexExtra.length ? ' 多:' + hexExtra.join(',') : ''} | 圆角非零 ${actual.radii.length} | 外影 ${actual.outerShadow} | 线宽 ${actual.widths.join('/')}`);
}

await browser.close();
server.close();

writeFileSync(join(OUT, 'reconcile.json'), JSON.stringify(rows, null, 1), 'utf8');

console.log('\n\n=== 汇总 ===');
const totalClaim = rows.reduce((a, r) => a + r.hexClaim, 0);
const totalHit = rows.reduce((a, r) => a + r.hexHit, 0);
console.log(`色值: 提示词声称 ${totalClaim} 个，页面实际命中 ${totalHit} 个（${(totalHit / totalClaim * 100).toFixed(1)}%）`);
const withMissing = rows.filter(r => r.hexMissing.length);
console.log(`有「声称但页面没用」的案: ${withMissing.length} / ${rows.length}`);
for (const r of withMissing) console.log(`  ${r.id}: 缺 ${r.hexMissing.join(', ')}`);
const withExtra = rows.filter(r => r.hexExtra.length);
console.log(`\n有「页面用了但提示词没说」的案: ${withExtra.length} / ${rows.length}`);
for (const r of withExtra.slice(0, 10)) console.log(`  ${r.id}: 多 ${r.hexExtra.slice(0, 6).join(', ')}${r.hexExtra.length > 6 ? ' …共' + r.hexExtra.length : ''}`);
console.log(`\n圆角: 声称「全站 0」且实际非零的案: ${rows.filter(r => r.radiusClaim0 && r.radiusActualNonZero > 0).length}`);
console.log(`外投影（提示词都说只用 inset）: 有外影的案 ${rows.filter(r => r.shadowOuter > 0).length} / ${rows.length}`);
for (const r of rows.filter(r => r.shadowOuter > 0)) console.log(`  ${r.id}: 外影 ${r.shadowOuter} 处，内影 ${r.shadowInset} 处`);
