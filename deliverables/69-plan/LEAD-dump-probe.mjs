// A 项基础事实：线上 buildPrompt 现在到底输出什么
// 目标：(1) S19 是否含 #4A5C3A  (2) 与 99-scratch/prompt-s19.md 的差异  (3) 30 条提示词的可机械验证约束统计
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
await new Promise(r => server.listen(8510, '127.0.0.1', r));
const browser = await Browser.launch({ headless: true });
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900, mobile: false });
await page.goto('http://127.0.0.1:8510/prototypes/_selection/index.html', { settleMs: 1500 });

// buildPrompt 包在 IIFE 里，通过点按钮 + 拦截 clipboard 拿不到；改为直接调用页面内暴露的路径
const has = await page.eval(`(() => ({
  buildPrompt: typeof window.buildPrompt,
  copyPrompt: typeof window.copyPrompt,
  schemes: typeof window.SCHEMES,
  schemeCount: (window.SCHEMES||[]).length,
}))()`);
console.log('=== 页面全局 ===', JSON.stringify(has));

// 通过 UI 拿提示词：找每案的复制按钮，读它生成的文本
// 先看 prompt-copy.js 暴露了什么
const api = await page.eval(`(() => Object.keys(window).filter(k => /prompt|PROMPT|SCHEME|STYLE/.test(k)))()`);
console.log('=== 相关全局键 ===', JSON.stringify(api));

await browser.close();
server.close();
