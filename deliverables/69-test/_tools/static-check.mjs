// 静态检查：把 judge.mjs 里几条「靠读者相信」的 PASS 换成可复算的证据。
// 检查项：单文件、外部资源、禁用字体出现、轮播类名、火车/铁轨词、角度与互斥对文本、
//        表格与条目计数、随机数（「禁止随机撒图」）。
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = 'D:/Web/style/deliverables/69-test';
const CASES = ['S20', 'S21', 'S28'];
const out = {};

for (const id of CASES) {
  const dir = join(ROOT, id);
  const files = [];
  (function walk(d) {
    for (const f of readdirSync(d)) {
      const p = join(d, f);
      if (statSync(p).isDirectory()) { if (f !== 'shots') walk(p); }
      else if (!/\.(jpg|jpeg|png|webp)$/i.test(f)) files.push(p);
    }
  })(dir);
  const html = readFileSync(join(dir, 'index.html'), 'utf8');
  const r = {
    files: files.map((f) => f.replace(ROOT + '/', '')),
    htmlBytes: Buffer.byteLength(html, 'utf8'),
    htmlCount: files.filter((f) => /\.html$/i.test(f)).length,
    hasStyleTag: /<style[\s>]/i.test(html),
    externalCss: [...html.matchAll(/<link[^>]+rel=["']?stylesheet/gi)].map((m) => m[0]),
    externalJs: [...html.matchAll(/<script[^>]+src=/gi)].map((m) => m[0]),
    frameworks: ['react', 'vue', 'tailwind', 'bootstrap', 'jquery']
      .filter((k) => new RegExp(k, 'i').test(html)),
    /* 第一版用 /Inter/i 在整段 HTML 上搜，命中 `<span class="interlock">` 里的 "inter"
     * —— 假阳性。禁用字体只可能出现在 font-family 声明里，所以只在声明内用词边界匹配。
     * 这是静态检查的 bug（归因 d），不是页面用了 Inter。 */
    bannedFontsInSource: (() => {
      const decls = [...html.matchAll(/font-family\s*:\s*([^;}"']+)/gi)].map((m) => m[1]);
      const joined = decls.join(' | ');
      return ['Playfair Display', 'Inter', 'Roboto'].filter((k) => {
        const pat = new RegExp('(^|[\\s,"])' + k.replace(/ /g, '\\s*') + '(?=$|[\\s,"])', 'i');
        return pat.test(joined);
      });
    })(),
    carouselTokens: ['carousel', 'slider', 'swiper', 'slick', 'glide', 'owl-']
      .filter((k) => new RegExp(k, 'i').test(html)),
    trainTokens: ['火车', '铁轨', '蒸汽', '制服', 'railway', 'locomotive', 'train', 'steam']
      .filter((k) => new RegExp(k, 'i').test(html)),
    randomCalls: [...html.matchAll(/Math\.random|lodash\.shuffle|shuffle\(/g)].map((m) => m[0]),
    setIntervalCount: (html.match(/setInterval/g) || []).length,
    // S21 专用：三档角度与「互斥对」文本
    degTokens: ['30°', '45°', '60°'].filter((d) => html.includes(d)),
    interlockTokens: ['互斥对', '互斥组', '互斥'].filter((k) => html.includes(k)),
    tableCount: (html.match(/<table/g) || []).length,
    // S28 专用：与 8 号 / 2 号的分界
    boundaryTokens: ['8 号', '2 号'].filter((k) => html.includes(k)),
    // 图片
    imgCount: (html.match(/<img/g) || []).length,
    imgSrcs: [...new Set([...html.matchAll(/<img[^>]+src="([^"]+)"/g)].map((m) => m[1]))],
    langAttr: (html.match(/<html[^>]*lang="([^"]+)"/) || [])[1] || null,
    hasDoctype: /^<!DOCTYPE html>/i.test(html.trim()),
  };
  out[id] = r;
}

// 自己写文件（不用 PowerShell 重定向：> 会用 UTF-16LE 落盘，judge 侧 JSON.parse 直接崩）
writeFileSync('D:/Web/style/deliverables/69-test/_staging/static.json', JSON.stringify(out, null, 2), 'utf8');
console.log('wrote static.json');
for (const id of CASES) {
  const r = out[id];
  console.log(`${id}: html=${r.htmlCount} style=${r.hasStyleTag} extCss=${r.externalCss.length} extJs=${r.externalJs.length} fw=${JSON.stringify(r.frameworks)} banned=${JSON.stringify(r.bannedFontsInSource)} carousel=${JSON.stringify(r.carouselTokens)} train=${JSON.stringify(r.trainTokens)} rnd=${r.randomCalls.length} deg=${JSON.stringify(r.degTokens)} boundary=${JSON.stringify(r.boundaryTokens)}`);
}
