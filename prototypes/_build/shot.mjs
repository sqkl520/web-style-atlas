#!/usr/bin/env node
/* shot.mjs — 自包含、零第三方依赖的截图取证工具。
 *
 *   node prototypes/_build/shot.mjs prototypes/S14-zero-g-launch-sequence/ \
 *        --out .shot-test --widths 1440,768,390 --name S14
 *
 * 设计：不用 CDP（没有 websocket、没有 puppeteer），只用
 *   1) Node 内置 http 起一个本地静态服务器（站点根 = 工作目录，页面必须走 http:// 才能正确取到相对路径与字体）；
 *   2) 系统已有的 Chrome 命令行无头截图 --headless=new --screenshot；
 *   3) 系统已有的 Python + Pillow 做裁剪/切片/像素统计。
 *
 * 无 CDP 之后要靠"探针回连"拿页高：服务器把一小段 <script> 注入到 *它自己发出的* HTML 里
 * （磁盘上的文件一个字节都不改），页面 load 后用 sendBeacon 把 scrollHeight / innerWidth /
 * document.fonts.status 报回本地服务器。这是本工具唯一的"测量通道"。
 *
 * 关于窗口的坑（Chrome 155 实测，都是量出来的，不是猜的）：
 *   - 图像尺寸 == --window-size，且 布局坐标 -> 图像像素 是 1:1、偏移 0（用 100px 刻度尺量过）；
 *   - 但 CSS 视口（innerWidth/Height、媒体查询、vh）== 窗口 - (16, 95)，所以想得到 1440x900 的
 *     真实视口必须传 --window-size=1456,995；拿到的图再裁掉右边 16 / 下边 95；
 *   - 窗口宽会被 Chrome 夹到最小 500 CSS px，所以 390 这档必须走 iframe 套壳（iframe 内部
 *     媒体查询看到的确实是 iframe 自己的宽度，已用 @media (max-width:500px) 验过）；
 *   - 截图前绝不能用 JS 滚动：sy!=0 时 Chrome 会交出**整屏纯白的图**（踩过，见 README）。
 */

import http from 'node:http';
import { spawn } from 'node:child_process';
import {
  existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync,
} from 'node:fs';
import { dirname, extname, isAbsolute, join, normalize, relative, resolve, sep } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

// --------------------------------------------------------------------------- 常量 / 默认值

const HERE = dirname(fileURLToPath(import.meta.url));         // .../prototypes/_build
const REPO_ROOT = resolve(HERE, '..', '..');                   // .../style
const DEFAULTS = {
  chrome: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  python: 'C:\\Users\\Administrator\\.dsh\\dsh-runtimes\\dsh-primary-runtime\\dependencies\\python\\python.exe',
  // Chrome 窗口与 CSS 视口的差值（Chrome 155.0.8059.84 实测：window 1456x995 -> viewport 1440x900）。
  // 每次运行都会用探针复核；不一致就按差值重试一次，仍不一致才写进 report 的 warning。
  frameW: 16,
  frameH: 95,
  minWindowWidth: 500,
};

const USAGE = `用法: node shot.mjs <相对路径|目录|URL> [options]

  --out DIR            输出目录（默认 .shot）
  --width 1440         单档宽
  --height 900         视口高（默认 900）
  --widths 1440,768,390  一次跑多档
  --heights 900,1024,900 与 --widths 平行的视口高（可选）
  --name PREFIX        文件名前缀（默认取目标目录/文件名）
  --jobs N             并发上限（默认 2，硬上限 3）
  --gap MS             两次启动 Chrome 的最小间隔（默认 700）
  --settle MS          --virtual-time-budget（默认 4000）：字体/图片/懒加载的等待预算
  --max-capture PX     整页图最大高度（默认 24000，超过则标记 truncated）
  --root DIR           静态服务器根（默认仓库根 ${REPO_ROOT}）
  --bands              额外产出"逐屏带"精确截图（每屏一次渲染，最忠实，但更慢）
  --iframe / --direct  强制视口模式（默认：宽度 <500 自动 iframe）
  --keep-raw           保留未裁剪的原始截图
  --keep-profile       保留 Chrome 临时 profile
  --no-inject          不注入探针（页高退化为窗口尺寸，并写 warning）
  --trim-tail          无探针时用"尾部同色"估页高
  --no-slice           只出首屏 + 整页，不切片
  --chrome PATH / --python PATH / --chrome-timeout MS / --chrome-flags "a b"
  --json               只把 report.json 打到 stdout，不打人看的摘要
  -h, --help
`;

// --------------------------------------------------------------------------- 小工具

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function die(msg) {
  process.stderr.write(msg + '\n');
  process.exit(2);
}

function humanBytes(n) {
  if (n === null || n === undefined) return '-';
  if (n < 1024) return n + ' B';
  if (n < 1024 * 1024) return (n / 1024).toFixed(1) + ' KB';
  return (n / 1024 / 1024).toFixed(2) + ' MB';
}

/** 读 PNG 的 IHDR 拿宽高（不装任何库）。 */
function pngSize(file) {
  try {
    const b = readFileSync(file);
    if (b.length < 24 || b.readUInt32BE(0) !== 0x89504e47) return null;
    return { bytes: b.length, width: b.readUInt32BE(16), height: b.readUInt32BE(20) };
  } catch {
    return null;
  }
}

function parseArgs(argv) {
  const opt = {
    target: null, out: '.shot', name: null, widths: null, heights: null,
    width: null, height: 900, jobs: 2, gap: 700, settle: 4000, maxCapture: 24000,
    root: null, bands: false, mode: null, keepRaw: false, keepProfile: false,
    inject: true, trimTail: false, slice: true, jsonOnly: false,
    chrome: DEFAULTS.chrome, python: DEFAULTS.python, chromeTimeout: 120000, chromeFlags: [],
    frameW: DEFAULTS.frameW, frameH: DEFAULTS.frameH,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => {
      if (i + 1 >= argv.length) die('参数 ' + a + ' 后面缺值\n\n' + USAGE);
      return argv[++i];
    };
    const num = (v, what) => {
      const n = Number(v);
      if (!Number.isFinite(n)) die('参数 ' + what + ' 需要数字，收到 ' + JSON.stringify(v));
      return n;
    };
    switch (a) {
      case '-h': case '--help': process.stdout.write(USAGE); process.exit(0); break;
      case '--out': opt.out = next(); break;
      case '--name': opt.name = next(); break;
      case '--width': opt.width = num(next(), a); break;
      case '--height': opt.height = num(next(), a); break;
      case '--widths': opt.widths = next(); break;
      case '--heights': opt.heights = next(); break;
      case '--jobs': opt.jobs = Math.max(1, Math.min(3, num(next(), a))); break;
      case '--gap': opt.gap = num(next(), a); break;
      case '--settle': opt.settle = num(next(), a); break;
      case '--max-capture': opt.maxCapture = num(next(), a); break;
      case '--root': opt.root = next(); break;
      case '--bands': opt.bands = true; break;
      case '--iframe': opt.mode = 'iframe'; break;
      case '--direct': opt.mode = 'direct'; break;
      case '--keep-raw': opt.keepRaw = true; break;
      case '--keep-profile': opt.keepProfile = true; break;
      case '--no-inject': opt.inject = false; break;
      case '--trim-tail': opt.trimTail = true; break;
      case '--no-slice': opt.slice = false; break;
      case '--json': opt.jsonOnly = true; break;
      case '--chrome': opt.chrome = next(); break;
      case '--python': opt.python = next(); break;
      case '--chrome-timeout': opt.chromeTimeout = num(next(), a); break;
      case '--chrome-flags': opt.chromeFlags = next().split(/\s+/).filter(Boolean); break;
      case '--frame-w': opt.frameW = num(next(), a); break;
      case '--frame-h': opt.frameH = num(next(), a); break;
      default:
        if (a.startsWith('-')) die('未知参数 ' + a + '\n\n' + USAGE);
        if (opt.target) die('只能给一个目标，收到 ' + JSON.stringify(a));
        opt.target = a;
    }
  }
  if (!opt.target) die(USAGE);
  return opt;
}

/** 目标 -> {root, pageRel, pageUrlPath, looksLikeIndex, kind} */
function resolveTarget(target, opt) {
  if (/^https?:\/\//i.test(target)) {
    return { kind: 'url', external: true, url: target, root: null, pageRel: null };
  }
  const abs = isAbsolute(target) ? normalize(target) : resolve(process.cwd(), target);
  if (!existsSync(abs)) die('目标不存在: ' + abs);
  const st = statSync(abs);
  let pageAbs = abs;
  if (st.isDirectory()) pageAbs = join(abs, 'index.html');
  if (!existsSync(pageAbs)) die('找不到 HTML: ' + pageAbs);
  let root = opt.root ? resolve(opt.root) : REPO_ROOT;
  const inside = (root, p) => p === root || p.startsWith(root + sep);
  if (!inside(root, pageAbs)) {
    if (inside(process.cwd(), pageAbs)) root = process.cwd();
    else root = dirname(pageAbs);
  }
  const rel = relative(root, pageAbs);
  const urlPath = '/' + rel.split(sep).map(encodeURIComponent).join('/');
  return { kind: 'file', external: false, assetAbs: pageAbs, root, pageRel: rel.split(sep).join('/'), urlPath };
}

function defaultName(target, resolved) {
  if (resolved.external) {
    try {
      const u = new URL(target);
      return (u.hostname + u.pathname).replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '') || 'page';
    } catch { return 'page'; }
  }
  const rel = resolved.pageRel;
  const parts = rel.split('/');
  const base = parts[parts.length - 1] === 'index.html' ? parts[parts.length - 2] : parts[parts.length - 1].replace(/\.html?$/i, '');
  return base || 'page';
}

/** 目标 URL 上的探针参数。 */
function withProbeParams(url, { tier, band }) {
  const u = new URL(url);
  u.searchParams.set('__shot_tier', tier);
  if (band === null || band === undefined) u.searchParams.delete('__shot_band');
  else u.searchParams.set('__shot_band', String(band));
  return u.toString();
}

/** 同上，但接受"相对路径"（服务器内部转发 iframe 时用），返回 路径+查询串。 */
function probeParamsOn(pathOrUrl, { tier, band }) {
  const u = new URL(pathOrUrl, 'http://shot.local');
  u.searchParams.set('__shot_tier', tier);
  if (band === null || band === undefined) u.searchParams.delete('__shot_band');
  else u.searchParams.set('__shot_band', String(band));
  return u.pathname + u.search;
}

// --------------------------------------------------------------------------- 注入探针

/** 注入到"服务器发出的 HTML"里；磁盘文件不改。 */
function buildProbeScript() {
  return `<script id="__shot_probe" data-shot="probe">
/* shot.mjs 注入的测量探针：只在本地 http 会话里存在，页面对磁盘文件零改动。 */
(function () {
  var q = new URLSearchParams(location.search);
  var tier = q.get('__shot_tier') || '';
  function px(v) { return Math.round(v || 0); }
  var sent = 0;

  /* 页高必须量"未夹紧的内容范围"：
     documentElement.scrollHeight 会被视口高夹紧（内容比视口矮时它等于视口高），
     长窗口截图里这会直接把"整页高"读成窗口高，于是整页图尾巴全是背景。踩过。
     所以同时量 docH（scrollHeight）与 elemMax（所有非 fixed 元素 bottom 的最大值），
     由调用方按 scrollable 与否选择。 */
  function measure() {
    var de = document.documentElement, b = document.body;
    var vh = window.innerHeight, vw = window.innerWidth;
    var sy = window.scrollY || window.pageYOffset || 0;
    var docH = Math.max(de ? de.scrollHeight : 0, de ? de.offsetHeight : 0, b ? b.scrollHeight : 0);
    var elemMax = 0, bottomEl = '', counted = 0;
    var all = b ? b.querySelectorAll('*') : [];
    for (var i = 0; i < all.length; i++) {
      var el = all[i], cs;
      try { cs = getComputedStyle(el); } catch (e) { continue; }
      if (cs.position === 'fixed' || cs.display === 'none' || cs.visibility === 'hidden') continue;
      var r = el.getBoundingClientRect();
      if (r.height <= 0 || r.width <= 0) continue;
      counted++;
      var bottom = r.bottom + sy;
      if (bottom > elemMax) {
        elemMax = bottom;
        bottomEl = el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') +
          (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\\s+/).slice(0, 2).join('.') : '');
      }
    }
    var bodyBottom = b ? (b.getBoundingClientRect().bottom + sy) : 0;
    var contentH = Math.max(elemMax, bodyBottom, 0);
    var clamped = docH <= vh + 1;
    var h = clamped ? contentH : docH;
    return { h: h, docH: docH, contentH: contentH, elemMax: elemMax, bodyBottom: bodyBottom,
      clamped: clamped, bottomEl: bottomEl, counted: counted, vw: vw, vh: vh, sy: sy };
  }

  function report(tag) {
    try {
      var m = measure();
      var broken = 0, imgs = document.images || [], pending = 0;
      for (var i = 0; i < imgs.length; i++) {
        if (!imgs[i].complete) pending++;
        else if (imgs[i].naturalWidth === 0) broken++;
      }
      var u = '/__shot__/report?tier=' + encodeURIComponent(tier)
        + '&tag=' + encodeURIComponent(tag)
        + '&h=' + px(m.h) + '&docH=' + px(m.docH) + '&contentH=' + px(m.contentH)
        + '&elemMax=' + px(m.elemMax) + '&bodyBottom=' + px(m.bodyBottom)
        + '&clamped=' + (m.clamped ? 1 : 0) + '&bottomEl=' + encodeURIComponent(m.bottomEl)
        + '&counted=' + m.counted
        + '&w=' + px(document.documentElement.scrollWidth)
        + '&vw=' + px(m.vw) + '&vh=' + px(m.vh) + '&sy=' + px(m.sy)
        + '&dpr=' + (window.devicePixelRatio || 1)
        + '&fonts=' + encodeURIComponent(document.fonts ? document.fonts.status : 'n/a')
        + '&img=' + (imgs.length || 0) + '&imgpending=' + pending + '&broken=' + broken
        + '&n=' + (++sent);
      if (navigator.sendBeacon) { navigator.sendBeacon(u); }
      else { var im = new Image(); im.src = u; }
    } catch (e) { /* 探针永远不该弄坏页面 */ }
  }
  function later() {
    report('load');
    setTimeout(function () { report('t1'); }, 200);
    setTimeout(function () { report('t2'); }, 1000);
    setTimeout(function () { report('t3'); }, 2500);
    if (document.fonts && document.fonts.ready && document.fonts.ready.then) {
      document.fonts.ready.then(function () { report('fonts'); });
    }
  }
  if (document.readyState === 'complete') later();
  else window.addEventListener('load', later);
  window.addEventListener('DOMContentLoaded', function () { report('dom'); });
})();
</script>`;
}

function injectIntoHtml(html, { band, probe, tier }) {
  let out = html;
  if (band) {
    const css = `<style id="__shot_band" data-shot="band">/* shot.mjs 逐屏带：把布局整体上移 N px，等价于"滚到第 N 屏"，但不会让 Chrome 交出白图 */\nbody{margin-top:${-band}px !important}</style>`;
    if (/<\/head>/i.test(out)) out = out.replace(/<\/head>/i, css + '</head>');
    else out = css + out;
  }
  if (probe) {
    const s = buildProbeScript();
    if (/<\/body>/i.test(out)) out = out.replace(/<\/body>/i, s + '</body>');
    else out = out + s;
  }
  void tier;
  return out;
}

const MIME = {
  '.html': 'text/html; charset=utf-8', '.htm': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif',
  '.webp': 'image/webp', '.avif': 'image/avif', '.svg': 'image/svg+xml',
  '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.otf': 'font/otf',
  '.ico': 'image/x-icon', '.txt': 'text/plain; charset=utf-8', '.md': 'text/markdown; charset=utf-8',
  '.xml': 'application/xml', '.mp4': 'video/mp4', '.webm': 'video/webm', '.map': 'application/json',
};

/**
 * 极简静态服务器：站点根 = root，页面/字体/图片都从 http:// 取。
 * 另外提供两个内部端点：
 *   GET /__shot__/report   探针回连（记录页高/视口/字体状态）
 *   GET /__shot__/frame    iframe 套壳（窄档用：Chrome 窗口宽最小 500 CSS px）
 */
function startServer(ctx) {
  const beacons = [];
  const requests = [];
  const launches = [];   // [{tier, t0, t1}] 用于把 http 日志归因到某一档

  const listen = (req, res) => {
    try { handle(req, res); } catch (err) {
      // 服务器绝不能因为单个请求崩掉（崩了整轮截图都没了），原文报错到 stderr
      process.stderr.write('[shot.mjs] 静态服务器处理请求异常: ' + (err && err.stack || err) + '\n');
      try { res.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' }); res.end('500\n'); } catch { /* ignore */ }
    }
  };

  const handle = (req, res) => {
    const u = new URL(req.url, 'http://127.0.0.1');
    const now = Date.now();
    const entry = { ts: new Date(now).toISOString(), method: req.method, path: u.pathname, query: u.search, status: 0, bytes: 0, tier: null };

    if (u.pathname === '/__shot__/report') {
      const b = {
        tier: u.searchParams.get('tier') || '',
        tag: u.searchParams.get('tag') || '',
        h: Number(u.searchParams.get('h')),
        docH: Number(u.searchParams.get('docH')),
        contentH: Number(u.searchParams.get('contentH')),
        elemMax: Number(u.searchParams.get('elemMax')),
        bodyBottom: Number(u.searchParams.get('bodyBottom')),
        viewportClamped: u.searchParams.get('clamped') === '1',
        bottomEl: u.searchParams.get('bottomEl') || '',
        counted: Number(u.searchParams.get('counted')),
        w: Number(u.searchParams.get('w')),
        vw: Number(u.searchParams.get('vw')),
        vh: Number(u.searchParams.get('vh')),
        sy: Number(u.searchParams.get('sy')),
        dpr: Number(u.searchParams.get('dpr')),
        fonts: u.searchParams.get('fonts'),
        images: Number(u.searchParams.get('img')),
        imagesPending: Number(u.searchParams.get('imgpending')),
        brokenImages: Number(u.searchParams.get('broken')),
        n: Number(u.searchParams.get('n')),
        at: new Date(now).toISOString(),
      };
      beacons.push(b);
      entry.status = 204;
      entry.tier = b.tier || null;
      requests.push(entry);
      res.writeHead(204, { 'cache-control': 'no-store', 'access-control-allow-origin': '*' });
      res.end();
      return;
    }

    if (u.pathname === '/__shot__/frame') {
      const w = Number(u.searchParams.get('w') || 390);
      const h = Number(u.searchParams.get('h') || 900);
      const inner = u.searchParams.get('u') || '/';
      const src = probeParamsOn(inner, { tier: u.searchParams.get('tier') || '', band: u.searchParams.get('band') || null });
      const html = `<!doctype html><meta charset="utf-8"><title>shot-frame ${w}x${h}</title>
<style>html,body{margin:0;padding:0;background:#202020;overflow:hidden}
iframe{display:block;width:${w}px;height:${h}px;border:0;background:#fff}</style>
<iframe scrolling="no" src="${src.replace(/&/g, '&amp;').replace(/"/g, '&quot;')}"></iframe>`;
      const buf = Buffer.from(html, 'utf8');
      entry.status = 200; entry.bytes = buf.length;
      requests.push(entry);
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
      res.end(buf);
      return;
    }

    // 静态文件
    let rel;
    try { rel = decodeURIComponent(u.pathname); } catch { rel = u.pathname; }
    let abs = resolve(ctx.root, '.' + rel);
    const inside = abs === ctx.root || abs.startsWith(ctx.root + sep);
    if (!inside) {
      entry.status = 403;
      entry.tier = attribute(now, launches);
      requests.push(entry);
      res.writeHead(403, { 'content-type': 'text/plain; charset=utf-8' });
      res.end('403 outside root\n');
      return;
    }
    try {
      if (existsSync(abs) && statSync(abs).isDirectory()) {
        const idx = join(abs, 'index.html');
        if (existsSync(idx)) abs = idx;
      }
      if (!existsSync(abs)) throw new Error('ENOENT');
      const ext = extname(abs).toLowerCase();
      const buf = readFileSync(abs);
      entry.status = 200; entry.bytes = buf.length;
      if (ext === '.html' || ext === '.htm') {
        const tier = u.searchParams.get('__shot_tier') || '';
        const bandParam = u.searchParams.get('__shot_band');
        const band = bandParam === null ? 0 : Number(bandParam);
        const html = injectIntoHtml(buf.toString('utf8'), { band: Number.isFinite(band) && band > 0 ? band : 0, probe: ctx.inject, tier });
        const out = Buffer.from(html, 'utf8');
        entry.bytes = out.length;
        res.writeHead(200, { 'content-type': MIME['.html'], 'cache-control': 'no-store' });
        res.end(out);
      } else {
        res.writeHead(200, { 'content-type': MIME[ext] || 'application/octet-stream', 'cache-control': 'no-store' });
        res.end(buf);
      }
    } catch (err) {
      entry.status = 404;
      entry.error = String(err && err.message || err);
      res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
      res.end('404 ' + abs + '\n');
    }
    entry.tier = entry.tier || attribute(now, launches);
    requests.push(entry);
  };

  const attribute = (now, list) => {
    const hit = list.filter((l) => now >= l.t0 && now <= l.t1);
    if (hit.length === 1) return hit[0].tier;
    return null; // 多档并发时无法归因，如实留 null
  };

  const server = http.createServer(listen);
  const ready = new Promise((res) => server.listen(0, '127.0.0.1', () => res(server.address().port)));
  return { server, ready, beacons, requests, launches };
}

// --------------------------------------------------------------------------- Chrome / Python

function runChrome(ctx, { url, outFile, winW, winH, label }) {
  const args = [
    '--headless=new',
    '--hide-scrollbars',
    '--force-device-scale-factor=1',
    `--window-size=${winW},${winH}`,
    `--screenshot=${outFile}`,
    `--user-data-dir=${ctx.profileDir(label)}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-extensions',
    '--disable-background-networking',
    '--disable-component-update',
    '--disable-sync',
    '--disable-client-side-phishing-detection',
    '--mute-audio',
    '--no-pings',
    '--virtual-time-budget=' + ctx.opt.settle,
    '--run-all-compositor-stages-before-draw',
    ...ctx.opt.chromeFlags,
    url,
  ];
  return new Promise((done) => {
    const t0 = Date.now();
    const started = new Date(t0).toISOString();
    const child = spawn(ctx.opt.chrome, args, { stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => { stdout += d; });
    child.stderr.on('data', (d) => { stderr += d; });
    let killed = false;
    const timer = setTimeout(() => {
      killed = true;
      try { child.kill(); } catch { /* ignore */ }
    }, ctx.opt.chromeTimeout);
    child.on('error', (err) => {
      clearTimeout(timer);
      done({ code: null, error: String(err && err.message || err), stdout, stderr, ms: Date.now() - t0, args, started, killed });
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      done({ code, error: null, stdout, stderr, ms: Date.now() - t0, args, started, killed, ended: new Date().toISOString() });
    });
  });
}

/** 串行化 Chrome 启动：并发 <= jobs，且两次启动之间至少隔 gap ms。 */
class LaunchGate {
  constructor(jobs, gap) { this.jobs = jobs; this.gap = gap; this.active = 0; this.lastStart = 0; }
  async run(fn) {
    for (;;) {
      const wait = this.lastStart + this.gap - Date.now();
      if (this.active < this.jobs && wait <= 0) break;
      await sleep(wait > 0 ? Math.min(wait, 250) : 40);
    }
    this.active++;
    this.lastStart = Date.now();
    try { return await fn(); } finally { this.active--; }
  }
}

function runPython(ctx, args) {
  return new Promise((done) => {
    const child = spawn(ctx.opt.python, [ctx.pyScript, ...args], { stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => { stdout += d; });
    child.stderr.on('data', (d) => { stderr += d; });
    child.on('error', (err) => done({ code: null, error: String(err && err.message || err), stdout, stderr }));
    child.on('close', (code) => done({ code, error: null, stdout, stderr }));
  });
}

// --------------------------------------------------------------------------- 单档流程

function tierLabel(width, height) { return `${width}x${height}`; }

async function captureTier(ctx, spec) {
  const { width: W, height: H } = spec;
  const label = tierLabel(W, H);
  const tier = {
    tier: label, device: W >= 1100 ? 'desktop' : W >= 600 ? 'tablet' : 'mobile',
    viewport: { width: W, height: H },
    mode: null, window: null, url: null, pageHeight: null, pageHeightSource: null,
    pageHeightRealViewport: null, pageHeightTallWindow: null, vhDistortion: false,
    screens: 0, slicesMatch: false, truncated: false, calibrated: false, attempts: 0,
    images: { fold: null, full: null, slices: [] }, probe: { beacons: [], fonts: null, brokenImages: null },
    bands: [], launched: [], error: null, warnings: [], timings: {},
  };
  const t0 = Date.now();

  // Chrome 的窗口宽会被夹到最小 500 CSS px，所以比它窄的档只能靠 iframe 造视口。
  const useIframe = ctx.opt.mode ? ctx.opt.mode === 'iframe' : W < DEFAULTS.minWindowWidth;
  tier.mode = useIframe ? 'iframe' : 'direct';
  tier.warnings.push(...spec.warnings || []);

  if (ctx.resolved.external) {
    tier.note = '外部 URL：无法注入探针，页高只能用窗口高度近似';
  }

  const pageOriginUrl = ctx.resolved.external
    ? ctx.resolved.url
    : ctx.origin + ctx.resolved.urlPath;

  const urlFor = (frameInnerH, band) => {
    const b = typeof band === 'number' && band > 0 ? band : null;
    if (tier.mode === 'iframe') {
      const u = new URL(ctx.origin + '/__shot__/frame');
      u.searchParams.set('w', String(W));
      u.searchParams.set('h', String(Math.round(frameInnerH)));
      u.searchParams.set('tier', label);
      u.searchParams.set('u', ctx.resolved.external ? ctx.resolved.url : ctx.resolved.urlPath);
      if (b !== null) u.searchParams.set('band', String(b));
      return u.toString();
    }
    const base = ctx.resolved.external ? ctx.resolved.url : ctx.origin + ctx.resolved.urlPath;
    return withProbeParams(base, { tier: label, band: b });
  };

  const outDir = ctx.outDir;
  const prefix = `${ctx.opt.name}-${W}`;
  const rawDir = join(outDir, '.raw');
  mkdirSync(rawDir, { recursive: true });
  const rawFold = join(rawDir, `${prefix}-fold.raw.png`);
  const rawFull = join(rawDir, `${prefix}-full.raw.png`);

  const beaconsFor = () => ctx.srv.beacons.filter((b) => b.tier === label);
  const latestBeacon = (list) => {
    const ok = list.filter((b) => Number.isFinite(b.h) && b.h > 0);
    if (!ok.length) return null;
    // 取"最后一次上报"（虚拟时间跑完前的最终态），同时保留全部进度供取证
    return ok.reduce((a, b) => (b.n >= a.n ? b : a), ok[0]);
  };

  const launch = async (url, winW, winH, outFile, kind) => {
    return ctx.gate.run(async () => {
      const t = Date.now();
      const mark = { tier: label, t0: t, t1: t + ctx.opt.chromeTimeout };
      ctx.srv.launches.push(mark);
      const r = await runChrome(ctx, { url, outFile, winW, winH, label: `${prefix}-${kind}-${Date.now()}` });
      mark.t1 = Date.now();
      r.attemptHttp = ctx.srv.requests.length;
      tier.launched.push({
        kind, url, window: [winW, winH], code: r.code, ms: r.ms, killed: r.killed,
        error: r.error || null,
        stdout: r.stdout ? r.stdout.trim().slice(0, 4000) : '',
        stderr: r.stderr ? r.stderr.trim().slice(0, 8000) : '',
        startedAt: r.started, endedAt: r.ended || null,
      });
      if (r.error) tier.warnings.push(`Chrome 启动失败(${kind}): ${r.error}`);
      if (r.killed) tier.warnings.push(`Chrome 超时被杀(${kind}, >${ctx.opt.chromeTimeout}ms)`);
      if (!existsSync(outFile)) {
        // 原文错误，不吞
        tier.error = `Chrome 没有产出截图 ${outFile}（exit=${r.code} killed=${r.killed}）\n  stderr: ${r.stderr.trim() || '(空)'}\n  stdout: ${r.stdout.trim() || '(空)'}`;
      }
      return r;
    });
  };

  let dx = spec.frameW ?? ctx.opt.frameW;
  let dy = spec.frameH ?? ctx.opt.frameH;

  // --- 1) 首屏（同时充当"视口校准 + 页高测量"那一趟）
  let rawMeta = null;
  for (let attempt = 1; attempt <= 2; attempt++) {
    tier.attempts = attempt;
    const winW = tier.mode === 'iframe' ? Math.max(DEFAULTS.minWindowWidth, W) + dx : W + dx;
    const winH = H + dy;
    tier.window = { width: winW, height: winH };
    const url = urlFor(H, null);
    tier.url = url;
    const before = beaconsFor().length;
    await launch(url, winW, winH, rawFold, 'fold');
    rawMeta = pngSize(rawFold);
    if (!rawMeta) { tier.error = tier.error || `首屏截图缺失或不是 PNG: ${rawFold}`; break; }
    if (rawMeta.width !== winW || rawMeta.height !== winH) {
      tier.warnings.push(`图像尺寸 ${rawMeta.width}x${rawMeta.height} 与窗口 ${winW}x${winH} 不一致（Chrome 行为异常）`);
    }
    const fresh = beaconsFor().slice(before);
    const b = latestBeacon(beaconsFor());
    if (!ctx.opt.inject || !b) {
      tier.warnings.push('没有收到探针回连，页高退化为窗口高度（无法知道真实页高）');
      tier.calibrated = false;
      break;
    }
    tier.probe.beacons = beaconsFor().map((x) => ({
      tag: x.tag, n: x.n, h: x.h, docH: x.docH, contentH: x.contentH, elemMax: x.elemMax,
      bodyBottom: x.bodyBottom, viewportClamped: x.viewportClamped, bottomEl: x.bottomEl,
      w: x.w, vw: x.vw, vh: x.vh, sy: x.sy, fonts: x.fonts,
      images: x.images, imagesPending: x.imagesPending, brokenImages: x.brokenImages, at: x.at,
    }));
    tier.probe.fonts = b.fonts;
    tier.probe.brokenImages = b.brokenImages;
    tier.probe.imageCount = b.images;
    void fresh;
    if (b.sy !== 0) tier.warnings.push(`探针报告 scrollY=${b.sy}（截图前发生滚动会让 Chrome 交出白图，应排查页面脚本）`);
    if (b.vw === W && b.vh === H) {
      tier.calibrated = true;
      break;
    }
    const ndx = winW - b.vw;
    const ndy = winH - b.vh;
    if (ndx === dx && ndy === dy) {
      tier.warnings.push(`视口校准不收敛：想要 ${W}x${H}，窗口 ${winW}x${winH} 得到 ${b.vw}x${b.vh}（疑似 Chrome 最小窗宽 500 或 UA 缩放）`);
      break;
    }
    dx = ndx; dy = ndy;
    if (tier.mode === 'direct' && W + dx < DEFAULTS.minWindowWidth) {
      tier.warnings.push(`宽度 ${W} 超出 Chrome 最小窗口(${DEFAULTS.minWindowWidth} CSS px)，自动改用 iframe 视口`);
      tier.mode = 'iframe';
    }
    tier.warnings.push(`视口校准第 ${attempt} 次失败（得到 ${b.vw}x${b.vh}），已按差值 ${dx}/${dy} 重试`);
  }

  const fb = latestBeacon(beaconsFor());
  if (ctx.opt.inject && fb) {
    tier.pageHeightRealViewport = fb.h;
    tier.pageWidthRealViewport = fb.w;
    tier.pageHeightRealViewportDoc = fb.docH;
    tier.viewportClampedAtFold = fb.viewportClamped;
    tier.bottomEl = fb.bottomEl;
    if (fb.viewportClamped) {
      tier.warnings.push(`真视口下 scrollHeight(${fb.docH}) 被视口夹紧，页高改用"元素内容范围" ${fb.contentH}（最底元素 ${fb.bottomEl}）`);
    }
    if (fb.imagesPending > 0) tier.warnings.push(`截图时仍有 ${fb.imagesPending} 张图片未完成加载；如需更完整请加大 --settle`);
    if (fb.sy !== 0) tier.warnings.push(`探针报告 scrollY=${fb.sy}（截图前发生滚动会让 Chrome 交出白图，应排查页面脚本）`);
  } else {
    tier.pageHeightRealViewport = Math.max(H, (tier.window ? tier.window.height - dy : H));
    tier.pageHeightSource = 'window';
  }

  if (!tier.error && rawMeta) {
    // --- 2) 首屏裁剪（python 只裁剪，不切片）
    const foldName = `${prefix}-fold.png`;
    const foldArgs = [
      '--image', rawFold, '--out', outDir, '--prefix', prefix + '-fold',
      '--viewport', `${W}x${H}`, '--crop', `${W}x${H}`,
      '--no-slice', '--fold-name', foldName,
      '--stats', join(outDir, `${prefix}-fold-stats.json`), '--label', label + '-fold',
    ];
    const pr = await runPython(ctx, foldArgs);
    if (pr.code !== 0) {
      tier.error = `shot-page.py 裁剪首屏失败（exit=${pr.code}）\n  stderr: ${pr.stderr.trim() || '(空)'}\n  stdout: ${pr.stdout.trim() || '(空)'}`;
    } else {
      const j = readJson(join(outDir, `${prefix}-fold-stats.json`));
      tier.images.fold = j ? { file: foldName, ...(j.outputs.fold || {}), stats: j.total } : null;
    }

    // --- 3) 整页：窗高 = 真视口页高 + 下边距 + 余量（多出来的部分靠裁剪丢掉；余量用来兜"全部懒加载后变高"）
    const wantPageH = Math.min(tier.pageHeightRealViewport, ctx.opt.maxCapture);
    const tallSlack = Math.round(wantPageH * 0.10) + 200;
    const tallWinH = Math.min(ctx.opt.maxCapture + dy + tallSlack, Math.round(wantPageH) + dy + tallSlack);
    const tallW = tier.mode === 'iframe' ? Math.max(DEFAULTS.minWindowWidth, W) + dx : W + dx;
    const tallInnerH = Math.max(H, tallWinH - dy);
    const tallUrl = urlFor(tallInnerH, null);
    const before2 = beaconsFor().length;
    await launch(tallUrl, tallW, tallWinH, rawFull, 'full');
    const rawFullMeta = pngSize(rawFull);
    if (!rawFullMeta) {
      tier.error = tier.error || `整页截图缺失或不是 PNG: ${rawFull}\n  见上报的 Chrome stderr`;
    } else {
      const b2 = latestBeacon(beaconsFor().slice(before2)) || latestBeacon(beaconsFor());
      // 整页高以"真视口那趟"量为准（页高 = 用户真实需要滚动的距离）。
      // 长窗口只是用来把长图渲染出来；长窗口自己的页高读数常被视口夹紧或在长窗口里多出
      // 只属于该布局的元素（实测 S14：长窗口里 ol.near 伸出 footer 下方 921px），
      // 那种尾巴不该算进"整页"。
      const base = tier.pageHeightRealViewport;
      let cut = Math.min(base, rawFullMeta.height, ctx.opt.maxCapture);
      if (!tier.pageHeightSource) tier.pageHeightSource = 'fold-viewport';
      if (b2) {
        tier.pageHeightTallWindow = b2.h;
        tier.probe.tallBeacon = {
          tag: b2.tag, h: b2.h, docH: b2.docH, contentH: b2.contentH, elemMax: b2.elemMax,
          viewportClamped: b2.viewportClamped, bottomEl: b2.bottomEl, vw: b2.vw, vh: b2.vh,
          sy: b2.sy, fonts: b2.fonts, imagesPending: b2.imagesPending, brokenImages: b2.brokenImages,
        };
        tier.pageHeightTallContent = b2.contentH;
        if (!b2.viewportClamped && b2.docH > base + 2) {
          // 长窗口下页面确实变长了（100vh / 高度媒体查询 / 读 innerHeight 的脚本 / 懒加载全部加载）
          cut = Math.min(b2.docH, rawFullMeta.height, ctx.opt.maxCapture);
          tier.vhDistortion = true;
          tier.pageHeightSource = 'tall-window';
          tier.warnings.push(`长窗口下页面比真视口更高（${b2.docH} > ${base}）：视口高影响了布局（100vh／高度媒体查询／读 innerHeight 的脚本／懒加载全部命中），整页图按 ${cut} 裁`);
        } else if (b2.contentH > base + 2) {
          tier.tallOnlyContent = Math.round(b2.contentH);
          tier.warnings.push(`长窗口里最底元素 ${b2.bottomEl} 伸到 ${Math.round(b2.contentH)}，比真视口页高 ${base} 更低：这部分只在长窗口布局里出现，已排除在整页图之外（逐屏证据请用 --bands）`);
        }
      }
      if (tier.pageHeightRealViewport > ctx.opt.maxCapture) {
        tier.truncated = true;
        tier.warnings.push(`页高 ${tier.pageHeightRealViewport} 超过 --max-capture ${ctx.opt.maxCapture}，整页图被截断`);
      }
      if (cut > rawFullMeta.height) {
        cut = rawFullMeta.height;
        tier.warnings.push(`裁剪高超过截图高，按截图高 ${rawFullMeta.height} 处理`);
      }
      tier.pageHeight = cut;
      if (!tier.pageHeightSource) tier.pageHeightSource = 'window';
      const fullName = `${prefix}-full.png`;
      const probeArgs = [
        '--image', rawFull, '--out', outDir, '--prefix', prefix,
        '--viewport', `${W}x${H}`, '--crop', `${W}x${cut}`, '--page-height', String(cut),
        '--full-name', fullName, '--stats', join(outDir, `${prefix}-stats.json`), '--label', label,
      ];
      if (!ctx.opt.slice) probeArgs.push('--no-slice');
      if (ctx.opt.trimTail) probeArgs.push('--trim-tail');
      const pr2 = await runPython(ctx, probeArgs);
      if (pr2.code !== 0) {
        tier.error = `shot-page.py 切片失败（exit=${pr2.code}）\n  stderr: ${pr2.stderr.trim() || '(空)'}\n  stdout: ${pr2.stdout.trim() || '(空)'}`;
      } else {
        const j = readJson(join(outDir, `${prefix}-stats.json`));
        if (j) {
          tier.screens = j.screens;
          tier.images.full = { file: fullName, ...(j.outputs.full || j.outputs.fold || {}), stats: j.total };
          tier.images.slices = (j.slices || []).map((s) => ({
            index: s.index, file: s.file, width: s.width, height: s.height, bytes: s.bytes,
            y0: s.y0, y1: s.y1,
            luminanceMean: s.luminanceMean, luminanceStdev: s.luminanceStdev,
            meanRgb: s.meanRgb, nearWhiteShare: s.nearWhiteShare,
            top3: s.top3, dominant: s.dominant, blank: s.blank, sampling: s.sampling,
          }));
          tier.sliceWarnings = j.warnings || [];
          tier.warnings.push(...(j.warnings || []));
          const expect = Math.ceil(cut / H);
          if (ctx.opt.slice) {
            tier.slicesMatch = tier.screens === expect && tier.images.slices.length === expect;
            if (!tier.slicesMatch) {
              tier.warnings.push(`切片数量对不上：页高 ${cut} / 视口高 ${H} = ${expect} 屏，实际产出 ${tier.screens} 张`);
            }
          } else {
            tier.slicesMatch = null;   // --no-slice：没要求切片，不做这项校验
          }
        }
      }
      // --- 4) 逐屏带（可选）：每屏一次真实视口渲染，不靠切片
      if (ctx.opt.bands && tier.pageHeightRealViewport) {
        const n = Math.ceil(Math.min(tier.pageHeightRealViewport, ctx.opt.maxCapture) / H);
        for (let i = 0; i < n; i++) {
          const band = i * H;
          const bUrl = urlFor(H, band);
          const rawBand = join(rawDir, `${prefix}-band-${String(i + 1).padStart(2, '0')}.raw.png`);
          const winW = tier.mode === 'iframe' ? Math.max(DEFAULTS.minWindowWidth, W) + dx : W + dx;
          await launch(bUrl, winW, H + dy, rawBand, 'band-' + (i + 1));
          const bm = pngSize(rawBand);
          if (!bm) { tier.warnings.push(`逐屏带第 ${i + 1} 屏没有图`); continue; }
          const name = `${prefix}-band-${String(i + 1).padStart(2, '0')}.png`;
          const pr3 = await runPython(ctx, [
            '--image', rawBand, '--out', outDir, '--prefix', prefix + '-band' + String(i + 1).padStart(2, '0'),
            '--viewport', `${W}x${H}`, '--crop', `${W}x${H}`, '--page-height', String(H),
            '--no-slice', '--fold-name', name, '--stats', join(outDir, `${prefix}-band-${String(i + 1).padStart(2, '0')}-stats.json`),
            '--label', `${label}-band-${i + 1}`,
          ]);
          if (pr3.code !== 0) { tier.warnings.push(`逐屏带第 ${i + 1} 屏处理失败: ${pr3.stderr.trim()}`); continue; }
          const jb = readJson(join(outDir, `${prefix}-band-${String(i + 1).padStart(2, '0')}-stats.json`));
          tier.bands.push({ index: i + 1, offset: band, file: name, width: W, height: H, ...(jb && jb.outputs.fold ? jb.outputs.fold : {}), stats: jb ? jb.total : null });
        }
      }
    }
  }

  if (!ctx.opt.keepRaw) {
    for (const f of [rawFold, rawFull]) { try { if (existsSync(f)) rmSync(f); } catch { /* ignore */ } }
  }
  tier.timings = { elapsedMs: Date.now() - t0 };
  return tier;
}

function readJson(file) {
  if (!existsSync(file)) return null;
  try {
    // utf-8-sig：本机 PowerShell 写的 json 可能带 BOM；Node 会把它当普通字符噎住
    let text = readFileSync(file, 'utf8');
    if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
    return JSON.parse(text);
  } catch (err) {
    process.stderr.write(`[shot.mjs] 读 JSON 失败 ${file}: ${err.message}\n`);
    return null;
  }
}

// --------------------------------------------------------------------------- main

async function main() {
  const opt = parseArgs(process.argv.slice(2));
  const resolved = resolveTarget(opt.target, opt);
  const name = opt.name || defaultName(opt.target, resolved);
  const outDir = resolve(process.cwd(), opt.out);
  mkdirSync(outDir, { recursive: true });

  // 档位
  const specs = [];
  if (opt.widths) {
    const ws = opt.widths.split(',').map((s) => Number(s.trim())).filter((n) => Number.isFinite(n) && n > 0);
    const hs = opt.heights ? opt.heights.split(',').map((s) => Number(s.trim())).filter(Number.isFinite) : [];
    if (!ws.length) die('--widths 没解析出任何宽度: ' + opt.widths);
    ws.forEach((w, i) => specs.push({ width: w, height: hs[i] || opt.height, frameW: opt.frameW, frameH: opt.frameH }));
  } else {
    specs.push({ width: opt.width || 1440, height: opt.height, frameW: opt.frameW, frameH: opt.frameH });
  }

  const pyScript = join(HERE, 'shot-page.py');
  if (!existsSync(pyScript)) die('找不到 ' + pyScript);
  if (!existsSync(opt.chrome)) die('找不到 Chrome: ' + opt.chrome);
  if (!existsSync(opt.python)) die('找不到 python: ' + opt.python);

  const tmpRoot = mkdtempSync(join(tmpdir(), 'shot-mjs-'));
  const ctx = {
    opt, resolved, outDir, pyScript,
    srv: null, origin: null, gate: new LaunchGate(opt.jobs, opt.gap),
    tmpRoot,
    profileDir: (label) => {
      const d = join(tmpRoot, String(label).replace(/[^a-zA-Z0-9._-]+/g, '_').slice(0, 60));
      mkdirSync(d, { recursive: true });
      return d;
    },
  };

  const srv = startServer({ root: resolved.root || dirname(resolved.assetAbs || process.cwd()), inject: opt.inject });
  ctx.srv = srv;
  const port = await srv.ready;
  ctx.origin = `http://127.0.0.1:${port}`;

  const report = {
    tool: 'shot.mjs',
    version: '1.0.0',
    generatedAt: new Date().toISOString(),
    target: opt.target,
    page: resolved.external ? resolved.url : resolved.assetAbs,
    pageRel: resolved.pageRel,
    name,
    options: {
      out: opt.out, widths: specs.map((s) => s.width), height: opt.height,
      jobs: opt.jobs, gap: opt.gap, settle: opt.settle, maxCapture: opt.maxCapture,
      bands: opt.bands, inject: opt.inject, slice: opt.slice, keepRaw: opt.keepRaw,
      mode: opt.mode || 'auto', frame: { width: opt.frameW, height: opt.frameH },
      chrome: opt.chrome, python: opt.python,
    },
    server: { origin: ctx.origin, port, root: resolved.root },
    chromeVersion: null,
    tiers: [],
    failed: [],
    warnings: [],
  };

  // Chrome 版本（不是必须，但取证报告里该有）
  try {
    const { execFileSync } = await import('node:child_process');
    const v = execFileSync('powershell.exe', ['-NoProfile', '-Command',
      `(Get-Item '${opt.chrome.replace(/'/g, "''")}').VersionInfo.ProductVersion`], { encoding: 'utf8' }).trim();
    report.chromeVersion = v;
  } catch (err) {
    report.warnings.push('拿 Chrome 版本失败: ' + err.message);
  }

  if (!opt.jsonOnly) {
    process.stdout.write(`\nshot.mjs  target=${resolved.external ? resolved.url : resolved.pageRel}\n`);
    process.stdout.write(`         server=${ctx.origin}  root=${resolved.root}\n`);
    process.stdout.write(`         out=${outDir}  tiers=${specs.map((s) => `${s.width}x${s.height}`).join(', ')}  jobs=${opt.jobs} gap=${opt.gap}ms\n\n`);
  }

  // 并发跑多档（并发 <= jobs，启动之间有 gap）
  const queue = specs.slice();
  const workers = [];
  const concurrency = Math.max(1, Math.min(opt.jobs, specs.length));
  for (let i = 0; i < concurrency; i++) {
    workers.push((async () => {
      for (;;) {
        const spec = queue.shift();
        if (!spec) return;
        const tier = await captureTier(ctx, spec);
        report.tiers.push(tier);
      }
    })());
  }
  await Promise.all(workers);

  report.tiers.sort((a, b) => b.viewport.width - a.viewport.width);

  // http 日志（404 断链资源是重要的取证信号：字体/图片取不到会让截图骗人）
  const httpLog = srv.requests.map((r) => `${r.ts} ${String(r.status).padEnd(3)} ${r.method} ${r.path}${r.query}${r.tier ? '  [' + r.tier + ']' : ''}`);
  const missing = srv.requests.filter((r) => r.status === 404).map((r) => ({ path: r.path + r.query, tier: r.tier, at: r.ts }));
  report.http = {
    requests: srv.requests.length,
    byStatus: srv.requests.reduce((a, r) => { a[r.status] = (a[r.status] || 0) + 1; return a; }, {}),
    missing,
    log: '.shot-http.log',
  };
  writeFileSync(join(outDir, '.shot-http.log'), httpLog.join('\n') + '\n', 'utf8');
  if (missing.length) {
    report.warnings.push(`有 ${missing.length} 个资源 404（截图里可能是缺字/缺图，不是"设计如此"）：` +
      JSON.stringify(missing.slice(0, 8)));
  }

  for (const t of report.tiers) {
    if (t.error) report.failed.push({ tier: t.tier, error: t.error });
    if (!t.slicesMatch && opt.slice) report.failed.push({ tier: t.tier, error: `切片数量校验失败 screens=${t.screens}` });
  }

  const reportPath = join(outDir, 'report.json');
  writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n', 'utf8');   // Node 写 = 无 BOM

  if (!opt.jsonOnly) {
    for (const t of report.tiers) {
      const f = t.images.fold || {};
      const fl = t.images.full || {};
      process.stdout.write(`[${t.tier}] mode=${t.mode} window=${t.window ? t.window.width + 'x' + t.window.height : '-'}\n`);
      process.stdout.write(`   页高 ${t.pageHeight ?? '?'}（真视口 ${t.pageHeightRealViewport ?? '?'}${t.vhDistortion ? '，长窗口下更高' : ''}${t.tallOnlyContent ? `，长窗口独有内容到 ${t.tallOnlyContent} 已排除` : ''}）  来源=${t.pageHeightSource}  ${t.screens} 屏  校准=${t.calibrated ? 'ok' : 'no'}${t.truncated ? '  已截断' : ''}\n`);
      process.stdout.write(`   首屏 ${f.width}x${f.height} ${humanBytes(f.bytes)}   整页 ${fl.width}x${fl.height} ${humanBytes(fl.bytes)}   切片 ${t.images.slices.length} 张  对得上=${t.slicesMatch === null ? 'n/a(--no-slice)' : t.slicesMatch}\n`);
      const lum = t.images.full && t.images.full.stats ? t.images.full.stats.luminanceMean : null;
      const dom = t.images.full && t.images.full.stats ? t.images.full.stats.dominant : null;
      process.stdout.write(`   整页平均亮度 ${lum} 主色 ${dom ? dom.hex + ' ' + (dom.share * 100).toFixed(1) + '%' : '-'}  字体 ${t.probe.fonts || '?'}  断链图 ${t.probe.brokenImages ?? '?'}\n`);
      if (t.bands.length) {
        process.stdout.write(`   逐屏带 ${t.bands.length} 张：` + t.bands.map((b) => `${b.index}:${b.stats ? b.stats.luminanceMean : '?'}`).join('  ') + '\n');
      }
      for (const w of t.warnings) process.stdout.write(`   ! ${w}\n`);
      if (t.error) process.stdout.write(`   x ${t.error}\n`);
    }
    for (const w of report.warnings) process.stdout.write(`! ${w}\n`);
    process.stdout.write(`\nreport.json -> ${reportPath}\n`);
    process.stdout.write(`失败 ${report.failed.length} 档：${JSON.stringify(report.failed.map((f) => f.tier))}\n`);
  } else {
    process.stdout.write(JSON.stringify(report, null, 2) + '\n');
  }

  if (!opt.keepProfile) { try { rmSync(tmpRoot, { recursive: true, force: true }); } catch { /* ignore */ } }
  srv.server.close();
  process.exit(report.failed.length ? 1 : 0);
}

main().catch((err) => {
  process.stderr.write('[shot.mjs] 未捕获异常: ' + (err && err.stack || err) + '\n');
  process.exit(3);
});
