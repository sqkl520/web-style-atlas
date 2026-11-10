// 探针 1：dump 出 30 案 buildPrompt(id) 的**当前**全文。
// 只用 http 起服务（file:// 下 CORS 会挡住 prompt-copy.js? 不会，但 data.js/prompts.js 是本地脚本，
// 为了保证与线上 _selection/index.html 同一加载路径，这里直接加载那个页面本身，然后调 window.buildPrompt）。
// 端口 8511。
import http from 'node:http';
import { readFileSync, existsSync, writeFileSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';
import { Browser } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';

const ROOT = 'D:/Web/style/prototypes/_selection';
const OUT = 'D:/Web/style/deliverables/69-audit';
const PORT = 8511;
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml',
};
const server = http.createServer((req, res) => {
  const p = decodeURIComponent(req.url.split('?')[0]);
  const f = join(ROOT, p === '/' ? 'index.html' : p);
  if (!existsSync(f) || !statSync(f).isFile()) { res.writeHead(404); res.end('no'); return; }
  res.writeHead(200, { 'Content-Type': MIME[extname(f)] || 'application/octet-stream' });
  res.end(readFileSync(f));
});
await new Promise((r) => server.listen(PORT, r));

const b = await Browser.launch({ width: 1440, height: 900 });
const p = await b.newPage({ width: 1440, height: 900 });
await p.goto(`http://127.0.0.1:${PORT}/index.html`, { settleMs: 2500 });

const meta = await p.eval(() => {
  const S = window.STYLE_PROMPTS;
  return {
    ok: !!(S && S.schemes), n: S ? S.schemes.length : 0,
    ids: S ? S.schemes.map((s) => s.id) : [],
    hasSchemes: !!window.SCHEMES, nSchemes: window.SCHEMES ? window.SCHEMES.length : 0,
    hasBuild: typeof window.buildPrompt === 'function',
    hasBuildPublic: typeof window.buildStylePrompt === 'function',
  };
});
console.log('page meta:', JSON.stringify(meta));

// 三种调用形态都 dump：默认（用户什么都没填）、带 biz/action、以及 buildStylePrompt 别名
const out = { dumpedAt: new Date().toISOString(), meta, prompts: {}, variantFilled: {} };
for (const id of meta.ids) {
  // 注意：buildPrompt 是 IIFE 内部的私有函数，**没有**挂到 window；对外是 window.buildStylePrompt。
  out.prompts[id] = await p.eval((i) => window.buildStylePrompt(i), id);
  out.variantFilled[id] = await p.eval(
    (i) => window.buildStylePrompt(i, { biz: '一家只做手冲的咖啡店', action: '看懂豆单并加微信订' }),
    id
  );
}
await b.close();
server.close();

const ids = Object.keys(out.prompts);
let total = 0;
const lines = [];
for (const id of ids) {
  const t = out.prompts[id];
  total += t.length;
  lines.push('===== ' + id + ' (' + t.length + ' chars) =====', t, '');
}
writeFileSync(join(OUT, 'dump30-default.txt'), lines.join('\n'), 'utf8');
writeFileSync(join(OUT, 'dump30-filled.txt'),
  ids.map((id) => '===== ' + id + ' (' + out.variantFilled[id].length + ' chars) =====\n' + out.variantFilled[id] + '\n').join('\n'),
  'utf8');
writeFileSync(join(OUT, 'dump30.json'), JSON.stringify(out, null, 1), 'utf8');

const lens = ids.map((id) => out.prompts[id].length);
console.log('ids:', ids.length);
console.log('char len default: min', Math.min(...lens), 'max', Math.max(...lens),
  'mean', Math.round(lens.reduce((a, b) => a + b, 0) / lens.length), 'total', total);
const lens2 = ids.map((id) => out.variantFilled[id].length);
console.log('char len filled: min', Math.min(...lens2), 'max', Math.max(...lens2));
console.log('wrote dump30-default.txt / dump30-filled.txt / dump30.json');
