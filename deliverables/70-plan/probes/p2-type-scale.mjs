/**
 * p2-type-scale.mjs —— 缺陷 2 的证据：原型**实际渲染**的字号层级 vs 提示词给的东西。
 *
 * 核心问题：提示词的「字号」信息只有两处（prompt-copy.js:284 与 :456 之外的那条）
 *   · d.h1Size —— 24/30 是 clamp(46px, 5vw, 72px) 这种**随视口变化**的表达式，
 *     在 1440 视口下真正渲染成多少，提示词没说；clamp 的下界（手机上）也不等于桌面。
 *   · 其余字号层级（h2/h3/正文/小字/标签）**一个都没有**。
 *
 * 本探针在真实浏览器里量三件事，全部可复算：
 *   ① 每个可见文本元素的 computed font-size，按字符数加权 → 得到「字号层级表」：
 *      实际出现了几档字号、每档吃多少字符、谁是正文档（字符最多）、谁是标题档（最大）。
 *   ② 该案 style.css 里声明的 font-size 档位（静态口径，与①对照，证明 CSS 里本来就有）。
 *   ③ 提示词里**实际写给 AI 的**字号信息（跑 buildStylePrompt，抓所有 px/clamp/字号句）。
 *      这是"AI 看到什么"的唯一权威口径 —— 不读 dna-clean.json，读最终字符串。
 *
 * 判据（写进报告）：
 *   tiers          = 字符数 ≥ 1% 总字符的不同 font-size 个数（有人的档才算）
 *   promptTierN    = 提示词文本里出现的不同 px 值个数（clamp 里的三个值全算）
 *   gap            = tiers - promptTierN —— 这就是"AI 不知道要做几档"的量化
 *
 * 用法：node deliverables/70-plan/probes/p2-type-scale.mjs [--json out.json] [--only S19,S20]
 */
import { Browser } from '../../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { createServer } from 'node:http';
import { readFileSync, existsSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, extname, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '../../..');
const SEL = join(ROOT, 'prototypes/_selection');

const argv = process.argv.slice(2);
const argVal = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; };
const OUT = argVal('--json', join(HERE, 'p2-type-scale.json'));
const ONLY = (argVal('--only', '') || '').split(',').map(s => s.trim()).filter(Boolean);
const VIEWPORT = 1440;

const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.otf': 'font/otf' };

function serve(port = 8732) {
  const srv = createServer((req, res) => {
    const p = join(ROOT, decodeURIComponent(req.url.split('?')[0]));
    if (!p.startsWith(ROOT) || !existsSync(p)) { res.writeHead(404); res.end('nf'); return; }
    res.writeHead(200, { 'Content-Type': MIME[extname(p).toLowerCase()] || 'application/octet-stream' });
    res.end(readFileSync(p));
  });
  return new Promise(r => srv.listen(port, '127.0.0.1', () => r(srv)));
}

/* 用与浏览器完全相同的装载路径跑 buildStylePrompt（data.js → prompts.js → prompt-copy.js）。
 * prompt-copy.js 末尾有一段 `if (document.readyState === "loading")` 的自动初始化，
 * 它与提示词生成无关，但会在无 DOM 环境里抛 TypeError —— 给一个最小 document 桩即可。
 * 这也是 check-docs.mjs 用的同一条装载路径（见 check-docs.mjs:376-395 buildPromptLengths）。 */
function loadPromptFn() {
  const noop = () => {};
  const stubEl = () => ({ addEventListener: noop, removeEventListener: noop, classList: { add: noop, remove: noop, toggle: noop, contains: () => false }, style: {}, setAttribute: noop, getAttribute: () => null, appendChild: noop, querySelector: () => null, querySelectorAll: () => [], focus: noop, click: noop });
  const sandbox = {
    window: {}, console,
    document: {
      readyState: 'complete', addEventListener: noop, removeEventListener: noop,
      querySelector: () => null, querySelectorAll: () => [], getElementById: () => null,
      createElement: stubEl, body: stubEl(), documentElement: stubEl(),
    },
    navigator: { clipboard: { writeText: async () => {} }, userAgent: 'node' },
    location: { href: 'http://localhost/', hash: '', search: '' },
    localStorage: { getItem: () => null, setItem: noop, removeItem: noop },
    setTimeout, clearTimeout, requestAnimationFrame: (f) => setTimeout(f, 0),
  };
  sandbox.globalThis = sandbox;
  sandbox.window = sandbox;
  const ctx = vm.createContext(sandbox);
  for (const f of ['data.js', 'prompts.js', 'prompt-copy.js']) {
    vm.runInContext(readFileSync(join(SEL, f), 'utf8'), ctx, { filename: f });
  }
  if (typeof sandbox.window.buildStylePrompt !== 'function') throw new Error('buildStylePrompt 未装载');
  return sandbox.window.buildStylePrompt;
}

const main = async () => {
  const build = loadPromptFn();
  const srv = await serve();
  const browser = await Browser.launch({ width: VIEWPORT, height: 900 });
  const page = await browser.newPage();
  await page.setViewport({ width: VIEWPORT, height: 900, dsf: 1, mobile: false });

  const dirs = readdirSync(join(ROOT, 'prototypes'), { withFileTypes: true })
    .filter(d => d.isDirectory() && /^S\d{2}-/.test(d.name)).map(d => d.name).sort();

  const rows = [];
  for (const dir of dirs) {
    const id = dir.slice(0, 3);
    if (ONLY.length && !ONLY.includes(id)) continue;

    const prompt = build(id);

    /* 提示词里给 AI 的字号信息：所有 px 值 + clamp/vw 表达式 + 字号相关句子 */
    const pxVals = [...new Set((prompt.match(/([\d.]+)px/g) || []).map(s => parseFloat(s)))].sort((a, b) => a - b);
    const sizeSentences = (prompt.match(/[^。\n]*(字号|字级|font-size|标题取|这一档)[^。\n]*/g) || []).map(s => s.trim());

    await page.goto(`http://127.0.0.1:8732/prototypes/${dir}/index.html`, { settleMs: 1500 });

    const dom = await page.eval(`(() => {
      const rows = [];
      const els = [...document.querySelectorAll('body *')];
      for (const el of els) {
        if (el.closest('script,style,noscript,svg')) continue;
        let t = ''; for (const n of el.childNodes) if (n.nodeType === 3) t += n.nodeValue;
        t = t.replace(/\\s+/g,' ').trim();
        if (t.length < 2) continue;
        const cs = getComputedStyle(el);
        const r = el.getBoundingClientRect();
        if (r.width <= 0 || r.height <= 0) continue;
        rows.push({ tag: el.tagName.toLowerCase(), fs: parseFloat(cs.fontSize) || 0, chars: t.length,
                    lh: cs.lineHeight, weight: cs.fontWeight, family: (cs.fontFamily||'').split(',')[0].replace(/["']/g,'').trim() });
      }
      // 按字号聚合（字符加权）
      const bySize = {};
      for (const r of rows) {
        const k = r.fs.toFixed(2);
        if (!bySize[k]) bySize[k] = { fs: +k, chars: 0, blocks: 0, tags: {}, weights: {}, families: {} };
        bySize[k].chars += r.chars; bySize[k].blocks++;
        bySize[k].tags[r.tag] = (bySize[k].tags[r.tag]||0)+1;
        bySize[k].weights[r.weight] = (bySize[k].weights[r.weight]||0)+1;
        bySize[k].families[r.family] = (bySize[k].families[r.family]||0)+1;
      }
      const totalChars = rows.reduce((s,r)=>s+r.chars,0);
      // 也取 h1 的真实字号
      const h1 = document.querySelector('h1');
      const h1fs = h1 ? parseFloat(getComputedStyle(h1).fontSize) : null;
      const h1r = h1 ? h1.getBoundingClientRect() : null;
      return { bySize: Object.values(bySize).sort((a,b)=>b.fs-a.fs), totalChars,
               h1fs, h1Lines: h1r ? Math.round(h1r.height / (parseFloat(getComputedStyle(h1).lineHeight) || h1fs*1.2)) : null,
               docH: document.documentElement.scrollHeight };
    })()`);

    const total = dom.totalChars || 1;
    const tiers = dom.bySize.filter(s => s.chars / total >= 0.01);
    const bodyTier = [...tiers].sort((a, b) => b.chars - a.chars)[0] || null;
    const headTier = tiers[0] || null;

    /* CSS 静态口径：style.css 里声明过的 font-size 值 */
    const css = readFileSync(join(ROOT, 'prototypes', dir, 'style.css'), 'utf8');
    const cssSizes = [...new Set((css.match(/font-size\s*:\s*([^;}]+)/g) || [])
      .map(s => s.replace(/font-size\s*:\s*/, '').trim()))];

    rows.push({
      id, dir,
      tiers: tiers.map(t => ({ fs: t.fs, chars: t.chars, share: +(100 * t.chars / total).toFixed(1), tags: t.tags, weights: t.weights })),
      tierN: tiers.length,
      allSizeN: dom.bySize.length,
      h1fs: dom.h1fs,
      bodyFs: bodyTier ? bodyTier.fs : null,
      headFs: headTier ? headTier.fs : null,
      ratio: (headTier && bodyTier) ? +(headTier.fs / bodyTier.fs).toFixed(2) : null,
      promptPxN: pxVals.length,
      promptPx: pxVals,
      promptSizeSentences: sizeSentences,
      cssSizeN: cssSizes.length,
      cssSizes,
      docH: dom.docH,
    });
    console.log(`${id}: 真实 ${tiers.length} 档 (全站 ${dom.bySize.length} 档) h1=${dom.h1fs} 正文=${bodyTier?bodyTier.fs:'?'} 标题/正文=${(headTier&&bodyTier)?(headTier.fs/bodyTier.fs).toFixed(2):'?'} | 提示词 px 值 ${pxVals.length} 个 | CSS 声明 ${cssSizes.length} 种`);
  }

  await browser.close();
  srv.close();
  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, JSON.stringify({ generatedAt: new Date().toISOString(), viewport: VIEWPORT, rows }, null, 1), 'utf8');
  console.log('\n写到 ' + OUT);

  const med = (a) => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
  console.log('\n=== 字号层级对照 ===');
  console.log(`真实档位（≥1% 字符）：中位 ${med(rows.map(r => r.tierN))} 档，区间 ${Math.min(...rows.map(r => r.tierN))}–${Math.max(...rows.map(r => r.tierN))}`);
  console.log(`提示词给的 px 值：中位 ${med(rows.map(r => r.promptPxN))} 个，区间 ${Math.min(...rows.map(r => r.promptPxN))}–${Math.max(...rows.map(r => r.promptPxN))}`);
  const hasScaleSentence = rows.filter(r => r.promptSizeSentences.some(s => /字号|字级|font-size/.test(s)));
  console.log(`提示词里出现"字号/字级"句子的案：${hasScaleSentence.length}/${rows.length} → ${hasScaleSentence.map(r => r.id).join(' ') || '无'}`);
};

main().catch(e => { console.error(e); process.exit(1); });
