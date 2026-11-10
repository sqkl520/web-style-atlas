// 核实规划 Agent 的核心指控：17/30 张参考图违反了提示词第 1 条「配色只用这几个值」
import { Browser } from 'file:///D:/Web/style/tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { createServer } from 'node:http';
import { readFileSync, existsSync, readdirSync, writeFileSync } from 'node:fs';
import { join, extname } from 'node:path';

const ROOT = 'D:/Web/style';
const DUMP = join(ROOT, 'deliverables/69-plan/dump');
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json', '.woff2': 'font/woff2', '.woff': 'font/woff2', '.ttf': 'font/ttf', '.otf': 'font/otf', '.webp': 'image/webp' };
const server = createServer((req, res) => {
  const u = decodeURIComponent(req.url.split('?')[0]);
  const p = join(ROOT, u);
  if (!existsSync(p)) { res.writeHead(404); res.end('nf'); return; }
  res.writeHead(200, { 'Content-Type': MIME[extname(p)] || 'application/octet-stream' });
  res.end(readFileSync(p));
});
await new Promise(r => server.listen(8580, '127.0.0.1', r));
const browser = await Browser.launch({ headless: true });
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900, mobile: false });

const dirs = readdirSync(join(ROOT, 'prototypes'), { withFileTypes: true })
  .filter(d => d.isDirectory() && /^S\d{2}-/.test(d.name)).map(d => d.name).sort();

const rows = [];
for (const dir of dirs) {
  const id = dir.slice(0, 3);
  const pf = join(DUMP, id + '.txt');
  if (!existsSync(pf)) continue;
  const prompt = readFileSync(pf, 'utf8');

  // 抽「配色只用这几个值」那一行里的 hex（排除防退化段的禁用示例）
  const seg = /配色只用这几个值[:：]([\s\S]*?)(?:不新增|$)/.exec(prompt);
  const claimed = seg ? [...new Set((seg[1].match(/#[0-9a-fA-F]{6}/g) || []).map(x => x.toUpperCase()))] : [];
  if (!claimed.length) { console.log(`${id}: 未抽到配色行`); continue; }

  await page.goto(`http://127.0.0.1:8580/prototypes/${dir}/index.html`, { settleMs: 2000 });

  const actual = await page.eval(`(() => {
    const toHex = (s) => { const m = s && s.match(/rgba?\\((\\d+),\\s*(\\d+),\\s*(\\d+)/); if (!m) return null; const h=n=>(+n).toString(16).padStart(2,'0'); return ('#'+h(m[1])+h(m[2])+h(m[3])).toUpperCase(); };
    const found = new Map();   // hex -> {count, where}
    const add = (h, where) => { if (!h) return; if (!found.has(h)) found.set(h, { count: 0, where }); found.get(h).count++; };
    const els = [document.documentElement, document.body, ...document.querySelectorAll('*')];
    for (const el of els) {
      // 排除代码片段与 svg 内容
      if (el.closest('pre, code, kbd, samp')) continue;
      const check = (s, pseudo) => {
        for (const k of ['color','backgroundColor','borderTopColor','borderRightColor','borderBottomColor','borderLeftColor','outlineColor','fill','stroke','textDecorationColor']) {
          const h = toHex(s[k]); if (h) add(h, el.tagName.toLowerCase() + (pseudo||'') + '.' + k);
        }
        const bi = s.backgroundImage || '';
        if (bi.includes('gradient')) for (const m of bi.matchAll(/rgb\\(\\d+,\\s*\\d+,\\s*\\d+\\)/g)) add(toHex(m[0]), el.tagName.toLowerCase()+'.gradient');
      };
      check(getComputedStyle(el), '');
      for (const p of ['::before','::after']) {
        const ps = getComputedStyle(el, p);
        if (ps && ps.content && ps.content !== 'none') check(ps, p);
      }
    }
    // 去掉常见的「非设计色」：纯黑纯白（浏览器默认）、透明
    for (const k of ['#000000','#FFFFFF']) found.delete(k);
    return [...found.entries()].map(([h, v]) => ({ hex: h, ...v })).sort((a,b)=>b.count-a.count);
  })()`);

  const claimSet = new Set(claimed);
  const actualSet = new Set(actual.map(x => x.hex));
  const outside = actual.filter(x => !claimSet.has(x.hex));
  const unused = claimed.filter(h => !actualSet.has(h));

  rows.push({ id, claimed: claimed.length, actualUsed: actualSet.size, outside: outside.map(x=>x.hex+':'+x.count), unused, outsideCount: outside.length });
  const flag = outside.length > 0 ? `  ⚠ 集合外 ${outside.length} 个: ${outside.slice(0,4).map(x=>x.hex+'('+x.count+')').join(' ')}` : '  ✓';
  console.log(`${id}: 声称 ${claimed.length} 色 / 实画 ${actualSet.size} 色${flag}`);
}

writeFileSync(join(ROOT, 'deliverables/69-plan/color-outside.json'), JSON.stringify(rows, null, 1), 'utf8');

console.log('\n\n=== 汇总 ===');
const bad = rows.filter(r => r.outsideCount > 0);
console.log(`声称色被违反的案: ${bad.length} / ${rows.length}`);
console.log(`总集合外颜色: ${bad.reduce((a,r)=>a+r.outsideCount,0)} 个`);
console.log(`\n声称但页面上没用的案: ${rows.filter(r=>r.unused.length).length}`);
const avgClaim = (rows.reduce((a,r)=>a+r.claimed,0)/rows.length).toFixed(1);
const avgActual = (rows.reduce((a,r)=>a+r.actualUsed,0)/rows.length).toFixed(1);
console.log(`平均声称 ${avgClaim} 色 / 平均实画 ${avgActual} 色`);
console.log('\n最严重的 5 案:');
for (const r of bad.sort((a,b)=>b.outsideCount-a.outsideCount).slice(0,5)) {
  console.log(`  ${r.id}: 声称 ${r.claimed} / 实画 ${r.actualUsed}，集合外 ${r.outsideCount} 个 → ${r.outside.slice(0,5).join(' ')}`);
}

await browser.close();
server.close();
