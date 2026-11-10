// 对比 HEAD 版 vs 现在：390 档「闸门」排序的余量，确认我有没有吃掉落
import { Browser } from 'file:///D:/Web/style/tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync, writeFileSync, cpSync, rmSync, readdirSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';
import { execFileSync } from 'node:child_process';

const GIT = 'D:\\Git\\cmd\\git.exe';
const ROOT = 'D:/Web/style';
const SNAP = '_snap-head';

// 1) 用 git 取 HEAD 版的 _selection，放到一个独立快照目录，共享 data.js 等
function prepare() {
  const dir = join(ROOT, SNAP);
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(join(dir, 'prototypes/_selection'), { recursive: true });
  mkdirSync(join(dir, 'prototypes/_fonts'), { recursive: true });
  // HEAD 版的四个界面文件
  for (const f of ['index.html', 'style.css', 'app.js', 'wizard.html', 'wizard.css', 'wizard.js']) {
    const buf = execFileSync(GIT, ['show', `HEAD:prototypes/_selection/${f}`], { maxBuffer: 64 << 20 });
    writeFileSync(join(dir, 'prototypes/_selection', f), buf);
  }
  // 非 HEAD 的纯数据文件直接拷（data.js / prompts.js / prompt-copy.js 内容差异不影响布局测量）
  for (const f of ['data.js', 'prompts.js', 'prompt-copy.js']) {
    cpSync(join(ROOT, 'prototypes/_selection', f), join(dir, 'prototypes/_selection', f));
  }
}
prepare();

const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json', '.woff2': 'font/woff2' };
const server = createServer((req, res) => {
  const u = decodeURIComponent(req.url.split('?')[0]);
  // 先找快照，再落到真仓库（供 _fonts / 原型截图）
  for (const base of [SNAP, '']) {
    const p = join(ROOT, base, u);
    if (existsSync(p) && statSync(p).isFile()) {
      res.writeHead(200, { 'Content-Type': MIME[extname(p)] || 'application/octet-stream' });
      res.end(readFileSync(p));
      return;
    }
  }
  res.writeHead(404); res.end('nf');
});
await new Promise(r => server.listen(8425, '127.0.0.1', r));
const browser = await Browser.launch({ headless: true });
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, mobile: true });

const SORTS = ['n', 'gate'];
for (const [label, url] of [
  ['HEAD 版', `http://127.0.0.1:8425/${SNAP}/prototypes/_selection/index.html`],
  ['现在', `http://127.0.0.1:8425/prototypes/_selection/index.html`],
]) {
  await page.goto(url, { settleMs: 1500 });
  const rows = [];
  for (const s of SORTS) {
    await page.eval(`(() => { const el=document.getElementById('sort'); if(!el)return; el.value=${JSON.stringify(s)}; el.dispatchEvent(new Event('change',{bubbles:true})); })()`);
    await new Promise(r => setTimeout(r, 400));
    const r = await page.eval(`(() => {
      const cards=[...document.querySelectorAll('li.row')]; let full=0;
      for(const c of cards){const b=c.getBoundingClientRect(); if(b.top>=0&&b.bottom<=window.innerHeight) full++;}
      const f=cards[0]; const b=f?f.getBoundingClientRect():null;
      return { id:(f?.querySelector('.no')?.textContent||'').trim(), top:+b.top.toFixed(1), h:+b.height.toFixed(1), full, slack:+(window.innerHeight-b.bottom).toFixed(1) };
    })()`);
    rows.push(`${s}:${r.id} top=${r.top} h=${r.h} 完整=${r.full} 余量=${r.slack}`);
  }
  const mast = await page.eval(`+document.querySelector('.mast').getBoundingClientRect().height.toFixed(1)`);
  console.log(`\n=== 390x844 ${label} ===  .mast=${mast}`);
  console.log('  ' + rows.join('\n  '));
}
await browser.close();
server.close();
rmSync(join(ROOT, SNAP), { recursive: true, force: true });
console.log('\n（快照已清理）');
