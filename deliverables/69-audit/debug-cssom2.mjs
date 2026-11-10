// 探针 9：为什么 authorHex 空？—— 测试 CSSStyleRule.cssRules 在嵌套规则时代的语义。
import http from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';
import { Browser } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
const ROOT = 'D:/Web/style/prototypes';
const PORT = 8517;
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.jpg': 'image/jpeg', '.png': 'image/png', '.woff2': 'font/woff2', '.svg': 'image/svg+xml' };
const server = http.createServer((req, res) => {
  const f = join(ROOT, decodeURIComponent(req.url.split('?')[0]));
  if (!existsSync(f) || !statSync(f).isFile()) { res.writeHead(404); res.end('no'); return; }
  res.writeHead(200, { 'Content-Type': MIME[extname(f).toLowerCase()] || 'application/octet-stream' });
  res.end(readFileSync(f));
});
await new Promise((r) => server.listen(PORT, r));
const b = await Browser.launch({ width: 800, height: 600 });
const p = await b.newPage({ width: 800, height: 600 });
await p.goto(`http://127.0.0.1:${PORT}/S19-copperplate-herbarium-cabinet/index.html`, { settleMs: 1200 });
const r = await p.eval(() => {
  const o = { ctorProbe: {}, counts: {}, sample: [] };
  const sh = Array.from(document.styleSheets).find((s) => /style\.css$/.test(s.href || ''));
  const rs = sh.cssRules;
  o.counts.total = rs.length;
  // 逐规则打印结构
  let withStyle = 0, withCssRules = 0, styleRuleCssRules = null;
  for (const rule of rs) {
    if (rule.style) withStyle++;
    if (rule.cssRules) withCssRules++;
    if (rule.selectorText === ':root') {
      o.rootStyleRuleHasCssRules = !!rule.cssRules;
      o.rootCssRulesLen = rule.cssRules ? rule.cssRules.length : 'n/a';
      o.rootCtorName = rule.constructor.name;
    }
  }
  o.counts.withStyle = withStyle;
  o.counts.withCssRules = withCssRules;
  // 前 6 条规则类型
  o.sample = Array.from(rs).slice(0, 8).map((rule) => ({
    type: rule.constructor.name, sel: (rule.selectorText || '').slice(0, 30),
    hasStyle: !!rule.style, styleLen: rule.style ? rule.style.length : null,
    hasCssRules: !!rule.cssRules, cssRulesLen: rule.cssRules ? rule.cssRules.length : null,
  }));
  // 用 for-in 检查 cssRules 是否可枚举/真值
  const first = rs[0];
  o.firstCssRulesType = typeof first.cssRules;
  o.firstCssRulesTruthy = !!(first.cssRules);
  o.firstCssRulesLen = first.cssRules ? first.cssRules.length : null;
  return o;
});
console.log(JSON.stringify(r, null, 1));
await b.close(); server.close();
