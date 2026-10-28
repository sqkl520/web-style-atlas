#!/usr/bin/env node
// 机械复核一个原型。把原本交给"复核 agent"的活全部落到脚本里 —— 复核 agent 是本会话最不划算的用法：
// 它要重新读一遍契约、重新跑一遍渲染，还会与构建 agent 抢同一个目录。
//
//   node verify-prototype.mjs S01-red-wedge-broadsheet
//   node verify-prototype.mjs --all
//
// 退出码：0 全部达标；1 有不达标项。
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

// 仓库根由脚本自身位置推得（模板 = check-stale.mjs:16；含 Windows 盘符修正与 39 §3-N10 的 decodeURIComponent）。
const ROOT = decodeURIComponent(new URL('../..', import.meta.url).pathname).replace(/^\/([A-Za-z]:)/, '$1');
const PROTO = join(ROOT, 'prototypes');

const BANNED = ['Inter', 'Roboto', 'Arial', 'Helvetica', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI'];
// 剥掉注释与 <script>/<style> 之后才扫 Emoji：注释不渲染，箭头（U+2190–21FF）也不算 Emoji（契约 §9.13）
function stripNonRendered(s) {
  return s
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1 ');
}
const EMOJI = /[\u2600-\u27BF\u2B00-\u2BFF\u{1F300}-\u{1FAFF}]/u;

function check(name) {
  const dir = join(PROTO, name);
  const id = name.slice(0, 3);
  const out = { id, dir: name, problems: [], notes: [] };

  const html = join(dir, 'index.html');
  const css = join(dir, 'style.css');
  if (!existsSync(html)) { out.problems.push('缺 index.html'); return out; }
  if (!existsSync(css)) { out.problems.push('缺 style.css'); }
  const H = readFileSync(html, 'utf8');
  const C = existsSync(css) ? readFileSync(css, 'utf8') : '';
  out.htmlKB = +(statSync(html).size / 1024).toFixed(1);
  out.cssKB = existsSync(css) ? +(statSync(css).size / 1024).toFixed(1) : null;
  if (out.htmlKB < 12) out.problems.push(`index.html 只有 ${out.htmlKB}K，内容严重不足`);

  // 1 远程资源：只查真正会被浏览器取的那些。
  //    <a href="https://…"> 是署名链接（CC 许可要求可点回原件页），不是资源加载，必须排除；
  //    同理 SVG 命名空间常量 http://www.w3.org/2000/svg、URL 转义过的 %23 片段也不是缺陷。
  const remote = [];
  for (const [tag, txt] of [['html', H], ['css', C]]) {
    // 只认会取资源的标签：link / img / script / source / video / audio / iframe / use
    for (const m of txt.matchAll(/<(?:link|img|script|source|video|audio|iframe|use)\b[^>]*?\b(?:src|href)\s*=\s*["']([^"']+)["']/gi)) {
      if (/^https?:/i.test(m[1])) remote.push(`${tag}:${m[1].slice(0, 70)}`);
    }
    for (const m of txt.matchAll(/url\(\s*["']?([^"')]+)/g)) {
      if (/^https?:/i.test(m[1])) remote.push(`${tag}:url ${m[1].slice(0, 70)}`);
    }
  }
  if (remote.length) out.problems.push(`远程资源 ${remote.length} 处：` + remote.slice(0, 3).join(' ; '));

  // 2 禁用字体栈：只在 font-family 声明里、且带词边界（Inter 会命中 IntersectionObserver）
  const badFams = [];
  for (const m of C.matchAll(/font-family\s*:\s*([^;}]+)/g)) {
    for (const b of BANNED) {
      if (new RegExp(`(?<![A-Za-z-])${b.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![A-Za-z-])`, 'i').test(m[1])) badFams.push(`${b} in "${m[1].trim().slice(0, 60)}"`);
    }
  }
  if (badFams.length) out.problems.push(`禁用字体族 ${badFams.length} 处：` + badFams.slice(0, 2).join(' ; '));

  // 3 Emoji：只扫渲染文本
  const em = [];
  for (const [tag, txt] of [['html', stripNonRendered(H)], ['css', stripNonRendered(C)]]) {
    const found = [...txt.matchAll(new RegExp(EMOJI, 'gu'))].map((m) => m[0]);
    if (found.length) em.push(`${tag} ${found.length} 个（${[...new Set(found)].slice(0, 6).join(' ')}）`);
  }
  if (em.length) out.problems.push('Emoji：' + em.join(' ; '));

  // 4 body 不得挂背景图（契约 §9.2：会让对比度检查整条静默跳过）
  for (const m of C.matchAll(/(?:^|\})\s*(body|html)\s*\{([^}]*)\}/g)) {
    if (/background-image|background\s*:[^;]*url\(/.test(m[2])) out.problems.push(`${m[1]} 规则挂了背景图 → 对比度检查会静默跳过`);
  }

  // 5 素材与署名
  const assetsDir = join(dir, 'assets');
  const imgExt = /\.(png|jpe?g|webp|avif|gif)$/i;
  const assets = existsSync(assetsDir) ? readdirSync(assetsDir).filter((f) => imgExt.test(f)) : [];
  out.assetCount = assets.length;
  if (!existsSync(join(assetsDir, 'CREDITS.md'))) out.problems.push('缺 assets/CREDITS.md');
  if (!existsSync(join(assetsDir, 'credits.json'))) out.notes.push('缺 assets/credits.json（若素材全是程序化生成可接受）');

  // 6 引用的本地文件是否真的存在
  //    只查会取资源的标签（<a href> 是导航不是资源）；
  //    url(%23n) 是 URL 转义过的 url(#n) 片段引用（SVG 滤镜），解码后以 # 开头，必须排除；
  //    **JS 里的 `new Blob([url])` 也会被 `url(` 匹配到** —— S10 与 S17 就因此被误报过。
  //    所以候选值必须"长得像路径"：凡含空格、括号、方括号、引号、尖括号、等号的一律跳过。
  const missingRefs = [];
  for (const m of (H + C).matchAll(/<(?:link|img|script|source|video|audio|iframe|use)\b[^>]*?\b(?:src|href)\s*=\s*["']([^"']+)["']|url\(\s*["']?([^"')]+)/gi)) {
    const v = m[1] || m[2];
    if (!v) continue;
    if (/[\s()\[\]{}"'`<>=]/.test(v)) continue;
    if (!/\.[a-z0-9]{2,5}$/i.test(v.split('?')[0])) continue;   // 必须带扩展名，否则是 JS 变量名（见过裸的 `url`）
    let d = v.split('?')[0].split('#')[0];
    try { d = decodeURIComponent(d); } catch { /* 保持原样 */ }
    if (!d || /^(https?:|#|data:|mailto:|\/)/i.test(d)) continue;
    const p = join(dir, d);
    if (!existsSync(p)) missingRefs.push(v);
  }
  const uniqMissing = [...new Set(missingRefs)];
  if (uniqMissing.length) out.problems.push('引用的本地文件缺失：' + uniqMissing.slice(0, 4).join(' '));

  // 7 渲染产物与闸门
  const rep = join(dir, '.inspect', 'report.json');
  if (!existsSync(rep)) { out.problems.push('没有 .inspect/report.json（没渲染过）'); return out; }
  let j; try { j = JSON.parse(readFileSync(rep, 'utf8')); } catch { out.problems.push('report.json 解析失败'); return out; }
  const fails = (j.findings || []).filter((f) => f.level === 'FAIL');
  const warns = (j.findings || []).filter((f) => f.level === 'WARN');
  out.fail = fails.length; out.warn = warns.length;
  out.failIds = [...new Set(fails.map((f) => f.id))];
  out.warnIds = [...new Set(warns.map((f) => f.id))];
  out.at = j.at;
  if (fails.length) out.problems.push(`闸门 FAIL=${fails.length}：${out.failIds.join(' ')}`);
  const d = (j.viewports || []).find((v) => v.width === 1440);
  if (!d) out.problems.push('report.json 里没有 1440 档');
  else {
    const p = d.metrics.page, h = d.metrics.headingSummary;
    out.realPictures = p.realPictures; out.overflow = p.horizontalOverflow;
    out.over2 = h.over2Lines; out.broken = (p.brokenImages || []).length;
    out.consoleErrors = (d.consoleErrors || []).length;
    out.screens = d.screens; out.imageCount = (j.images || []).reduce((a, i) => a + (i.pages || []).length + (i.fold ? 1 : 0), 0);
    if (p.realPictures < 4) out.problems.push(`桌面档真实图片只有 ${p.realPictures}（要求 ≥4）`);
    if (p.horizontalOverflow !== 0) out.problems.push(`横向溢出 ${p.horizontalOverflow}`);
    if (h.over2Lines > 0) out.problems.push(`有 ${h.over2Lines} 个标题超 2 行`);
    if ((p.brokenImages || []).length) out.problems.push(`断链图 ${p.brokenImages.length}`);
    if ((d.consoleErrors || []).length) out.problems.push(`控制台报错 ${d.consoleErrors.length}`);
  }
  // 8 每档都要有 fold 图
  for (const w of [1440, 768, 390]) {
    const im = (j.images || []).find((i) => i.width === w);
    if (!im || !im.fold) out.problems.push(`缺 ${w}px 的 fold 截图`);
  }
  return out;
}

let names = process.argv.slice(2).filter((a) => !a.startsWith('--'));
if (process.argv.includes('--all')) {
  /* 2026-10-28 决定：`--all` **保持只扫原型**（S01..S30），不并入产品入口。
   *
   * 为什么不并入 —— 试过，代价不对等：
   * 并入后 `_selection` 会以「缺 assets/CREDITS.md」计入不达标，汇总行从
   *   `达标 26 / 不达标 4 / 共 30`  变成  `达标 26 / 不达标 5 / 共 31`
   * 而 README（中英两版）里「26 个达标」是硬编码的可复算断言，`check-docs` 的
   * `nums/gate` 会立刻 FAIL。也就是说：并入会让一个原本全绿的检查器变红，
   * 而它红的原因不是产品退步，是我改了统计口径。
   *
   * 但「选型台的报告会陈旧」这个真问题必须有人管 —— 那交给 `check-stale.mjs`
   * （它已按 `_entries.mjs` 覆盖产品入口）。职责分开：
   *   · `--all`          = 「30 个展品达标了没有」——口径固定为 30，README 的 26/30 对得上
   *   · `check-stale`    = 「谁的报告过期了」——覆盖原型 + 产品入口
   *   · `check-anchors`  = 「谁的锚点死了」——覆盖原型 + 产品入口
   * 产品入口的「视觉达标」另有其道：`render-scheme.mjs _selection` 直接跑真闸门，
   * 结果落在 `_selection/.inspect/report.json`，页面上由 `#self-gate` 那一行自述。 */
  names = readdirSync(PROTO, { withFileTypes: true })
    .filter((d) => d.isDirectory() && /^S\d{2}-/.test(d.name)).map((d) => d.name).sort();
}
if (!names.length) { console.error('用法: node verify-prototype.mjs <目录名...> | --all'); process.exit(2); }

let bad = 0, ok = 0;
for (const n of names) {
  const r = check(n);
  if (r.problems.length) {
    bad++;
    console.log(`✗ ${r.id} ${r.dir}`);
    console.log(`    html ${r.htmlKB ?? '—'}K / css ${r.cssKB ?? '—'}K / FAIL ${r.fail ?? '—'} / WARN ${r.warn ?? '—'} / 真图 ${r.realPictures ?? '—'} / 截图 ${r.imageCount ?? 0}`);
    for (const p of r.problems) console.log('    · ' + p);
  } else {
    ok++;
    console.log(`✓ ${r.id} ${r.dir}   html ${r.htmlKB}K / css ${r.cssKB}K / FAIL 0 / WARN ${r.warn}${r.warnIds.length ? ' (' + r.warnIds.join(' ') + ')' : ''} / 真图 ${r.realPictures} / ${r.screens} 屏 / 截图 ${r.imageCount} / report at ${r.at}`);
  }
  for (const n2 of r.notes || []) console.log('    ~ ' + n2);
}
console.log(`\n达标 ${ok} / 不达标 ${bad} / 共 ${names.length}`);
process.exit(bad ? 1 : 0);
