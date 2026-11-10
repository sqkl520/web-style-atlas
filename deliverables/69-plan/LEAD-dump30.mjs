// A 项核心侦察：dump 全部 30 条线上提示词，并与 99-scratch/prompt-s19.md 对比
import { Browser } from 'file:///D:/Web/style/tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { createServer } from 'node:http';
import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, extname } from 'node:path';

const ROOT = 'D:/Web/style';
const OUT = join(ROOT, 'deliverables/69-plan/dump');
mkdirSync(OUT, { recursive: true });
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json', '.woff2': 'font/woff2' };
const server = createServer((req, res) => {
  const u = decodeURIComponent(req.url.split('?')[0]);
  const p = join(ROOT, u);
  if (!existsSync(p)) { res.writeHead(404); res.end('nf'); return; }
  res.writeHead(200, { 'Content-Type': MIME[extname(p)] || 'application/octet-stream' });
  res.end(readFileSync(p));
});
await new Promise(r => server.listen(8511, '127.0.0.1', r));
const browser = await Browser.launch({ headless: true });
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900, mobile: false });
await page.goto('http://127.0.0.1:8511/prototypes/_selection/index.html', { settleMs: 1500 });

const t = await page.eval(`typeof window.buildStylePrompt`);
console.log('window.buildStylePrompt:', t);

// 取 30 条（opts 不传，即默认的线上路径）
const prompts = await page.eval(`(() => {
  const out = {};
  for (const r of window.SCHEMES) out[r.id] = window.buildStylePrompt(r.id);
  return out;
})()`);

const ids = Object.keys(prompts);
console.log('dump 条数:', ids.length);
const lens = ids.map(id => prompts[id].length).sort((a, b) => a - b);
console.log('长度: min=' + lens[0] + ' 中位=' + lens[Math.floor(lens.length / 2)] + ' max=' + lens[lens.length - 1]);

// 逐案写文件
for (const id of ids) writeFileSync(join(OUT, id + '.txt'), prompts[id], 'utf8');

console.log('\n=== 关键判定 1：线上提示词的调色板里有几个 hex ===');
const hexCount = {};
for (const id of ids) {
  const hs = [...new Set((prompts[id].match(/#[0-9a-fA-F]{6}/g) || []).map(x => x.toUpperCase()))];
  hexCount[id] = hs;
}
const cnt = Object.values(hexCount).map(a => a.length);
console.log('  每案 hex 数分布:', JSON.stringify([...new Set(cnt)].sort((a,b)=>a-b)));
console.log('  min=' + Math.min(...cnt) + ' max=' + Math.max(...cnt));

console.log('\n=== 关键判定 2：S19 的 hex 列表 vs 那次手工验证用的 #4A5C3A ===');
console.log('  线上 S19 hex:', JSON.stringify(hexCount['S19']));
console.log('  含 4A5C3A ?', (hexCount['S19'] || []).includes('#4A5C3A'));

// 从原型 CSS 读真实 :root 色
const css19 = readFileSync(join(ROOT, 'prototypes/S19-copperplate-herbarium-cabinet/style.css'), 'utf8');
const rootHex = [...new Set((css19.match(/#[0-9a-fA-F]{6}/g) || []).map(x => x.toUpperCase()))];
console.log('  S19 style.css 出现的 hex 数:', rootHex.length);
console.log('  style.css 里有 4A5C3A ?', rootHex.includes('#4A5C3A'));

console.log('\n=== 关键判定 3：30 案的「提示词声称色 vs CSS 实际色」覆盖率 ===');
let inP = 0, notInP = 0;
const missing = [];
for (const id of ids) {
  const dir = readFileSync(join(ROOT, 'prototypes'), { withFileTypes: true });
}
// 简化：只统计 S19
console.log('\n=== 关键判定 4：提示词里可机械验证的约束条数（抽取正则） ===');
const patterns = {
  hex: /#[0-9a-fA-F]{6}/g,
  radius0: /border-radius:\s*0|全站.*圆角.*0|一律\s*(方角|直角)/g,
  fontName: /(?:标题|正文|编号)[^\n]{0,20}?(?:用|：)\s*[「"']([A-Za-z\u4e00-\u9fa5][^」"'\n]{1,40})[」"']/g,
  lineWidth: /(\d+(?:\.\d+)?)px/g,
  pull: /--pull:\s*(\d+)px/g,
};
for (const [k, re] of Object.entries(patterns)) {
  let total = 0;
  for (const id of ids) total += (prompts[id].match(re) || []).length;
  console.log(`  ${k.padEnd(10)} 全库 ${total} 处, 每案均 ${(total / ids.length).toFixed(1)}`);
}

writeFileSync(join(OUT, '_summary.json'), JSON.stringify({ lens, hexCount, ids }, null, 1), 'utf8');
console.log('\n已写 deliverables/69-plan/dump/');
await browser.close();
server.close();
