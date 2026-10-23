#!/usr/bin/env node
// 读全部 30 个原型的 .inspect/report.json，输出统一口径的汇总。
// 为什么要有它：pwsh 的 > 与 *>> 默认写 UTF-16LE，捕获 node 输出会变成乱码/被当成二进制；
// 而 report.json 本来就是 inspect.mjs 的权威产物，直接读它最可靠，且口径统一。
//
//   node summarize-all.mjs            打印表格
//   node summarize-all.mjs --md       输出 markdown（供选型台与交付文档引用）
//   node summarize-all.mjs --json     输出 JSON
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

// 仓库根由脚本自身位置推得（模板 = check-stale.mjs:16；含 Windows 盘符修正与 39 §3-N10 的 decodeURIComponent）。
const ROOT = decodeURIComponent(new URL('../..', import.meta.url).pathname).replace(/^\/([A-Za-z]:)/, '$1');
const PROTO = join(ROOT, 'prototypes');

// 目录名里已经带了方案号，直接扫描 prototypes 下所有 Sxx-* 目录，
// 不维护第二份清单 —— 清单会和磁盘漂移，这正是前面几次误判的根源。
const dirs = readdirSync(PROTO, { withFileTypes: true })
  .filter((d) => d.isDirectory() && /^S\d{2}-/.test(d.name))
  .map((d) => d.name)
  .sort();

const rows = [];
for (const name of dirs) {
  const id = name.slice(0, 3);
  const rep = join(PROTO, name, '.inspect', 'report.json');
  const html = join(PROTO, name, 'index.html');
  const css = join(PROTO, name, 'style.css');
  const r = {
    id, dir: name,
    htmlKB: existsSync(html) ? +(statSync(html).size / 1024).toFixed(1) : null,
    cssKB: existsSync(css) ? +(statSync(css).size / 1024).toFixed(1) : null,
    rendered: existsSync(rep),
  };
  if (existsSync(rep)) {
    let j;
    try { j = JSON.parse(readFileSync(rep, 'utf8')); } catch { r.error = 'report.json 解析失败'; rows.push(r); continue; }
    const d = (j.viewports || []).find((v) => v.width === 1440) || (j.viewports || [])[0];
    const fails = (j.findings || []).filter((f) => f.level === 'FAIL');
    const warns = (j.findings || []).filter((f) => f.level === 'WARN');
    r.at = j.at;
    r.fail = fails.length;
    r.warn = warns.length;
    r.failIds = [...new Set(fails.map((f) => f.id))];
    r.warnIds = [...new Set(warns.map((f) => f.id))];
    if (d) {
      const p = d.metrics.page, t = d.metrics.type, h = d.metrics.headingSummary;
      r.vw = d.width;
      r.pageH = p.height; r.screens = d.screens; r.words = p.words;
      r.img = p.img; r.realPictures = p.realPictures; r.svg = p.svg; r.sections = p.sections;
      r.overflow = p.horizontalOverflow; r.broken = (p.brokenImages || []).length;
      r.over2 = h.over2Lines; r.centered = h.centered;
      r.families = t.families.map((f) => f.family).join(' / ');
      r.familyCount = t.familyCount; r.sizeCount = t.sizeCount;
      r.bodySize = d.metrics.type.body ? d.metrics.type.body.size : (d.metrics.body ? d.metrics.body.size : null);
      r.heroPx = d.metrics.hero ? d.metrics.hero.size : null;
      r.heroFont = d.metrics.hero ? d.metrics.hero.font : null;
      r.consoleErrors = (d.consoleErrors || []).length;
    }
    r.viewportCount = (j.viewports || []).length;
    r.imageCount = (j.images || []).reduce((a, i) => a + (i.pages || []).length + (i.fold ? 1 : 0), 0);
  }
  rows.push(r);
}

const mode = process.argv.includes('--json') ? 'json' : process.argv.includes('--md') ? 'md' : 'table';

if (mode === 'json') { console.log(JSON.stringify(rows, null, 1)); process.exit(0); }

const total = 30;
const rendered = rows.filter((r) => r.rendered);
const clean = rendered.filter((r) => r.fail === 0);
const missing = [];
for (let i = 1; i <= total; i++) {
  const k = 'S' + String(i).padStart(2, '0');
  if (!rows.some((r) => r.id === k)) missing.push(k);
}
const notBuilt = rows.filter((r) => r.htmlKB === null).map((r) => r.id);

if (mode === 'md') {
  console.log('| 方案 | 目录 | html | css | 渲染 | FAIL | WARN | 桌面真实图 | 横向溢出 | 超2行标题 | 字体族数 | 屏数 | 截图 |');
  console.log('| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |');
  for (const r of rows) {
    console.log(`| ${r.id} | \`${r.dir}\` | ${r.htmlKB ?? '—'}K | ${r.cssKB ?? '—'}K | ${r.rendered ? '✓' : '✗'} | ${r.fail ?? '—'} | ${r.warn ?? '—'} | ${r.realPictures ?? '—'} | ${r.overflow ?? '—'} | ${r.over2 ?? '—'} | ${r.familyCount ?? '—'} | ${r.screens ?? '—'} | ${r.imageCount ?? 0} |`);
  }
  console.log('');
  console.log(`合计：磁盘上有 ${rows.length} 个原型目录；已渲染 ${rendered.length}；FAIL=0 的有 ${clean.length}；未建页面 ${notBuilt.length} 个（${notBuilt.join(' ')}）；完全缺目录 ${missing.length} 个（${missing.join(' ') || '无'}）`);
} else {
  console.log('方案  目录                                     html    css   渲染 FAIL WARN 真图 溢出 超2 族 屏 截图');
  for (const r of rows) {
    console.log(
      r.id.padEnd(5) + r.dir.padEnd(38) +
      String(r.htmlKB ?? '—').padStart(6) + 'K' + String(r.cssKB ?? '—').padStart(6) + 'K' +
      String(r.rendered ? ' ✓  ' : ' ✗  ') +
      String(r.fail ?? '—').padStart(4) + String(r.warn ?? '—').padStart(5) +
      String(r.realPictures ?? '—').padStart(5) + String(r.overflow ?? '—').padStart(5) +
      String(r.over2 ?? '—').padStart(4) + String(r.familyCount ?? '—').padStart(3) +
      String(r.screens ?? '—').padStart(3) + String(r.imageCount ?? 0).padStart(4) +
      (r.error ? '  ' + r.error : '')
    );
  }
  console.log('');
  console.log(`磁盘上 ${rows.length} 个原型目录｜已渲染 ${rendered.length}｜FAIL=0 有 ${clean.length}｜未建页面 ${notBuilt.length}：${notBuilt.join(' ') || '无'}｜缺目录 ${missing.length}：${missing.join(' ') || '无'}`);
}
