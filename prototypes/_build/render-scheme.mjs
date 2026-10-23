#!/usr/bin/env node
// 渲染一个原型，打印闸门结果。新 22 个与已有 8 个**必须用同一条命令**，否则渲染不可比。
//
//   node render-scheme.mjs S01-red-wedge-broadsheet
//   node render-scheme.mjs S01-red-wedge-broadsheet --allow hairline,font-count
//
// 关键：cwd 必须是仓库根（ROOT）。
//   原因：inspect.mjs 起一个本地 http 服务，root 取 cwd（因为传入文件在 cwd 之下）；
//   站点根设成整个工作区，原型的 ../_fonts/ 共享字体缓存才取得到。
//   若 cwd 设成原型目录，root 就变成原型目录，../_fonts/ 会 403。
//
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

// 仓库根由脚本自身位置推得（模板 = check-stale.mjs:16；含 Windows 盘符修正与 39 §3-N10 的 decodeURIComponent）。
// 39 §2-B01/B03：写死 ROOT 时，若本机另有一份同路径副本，脚本会渲染**那一份**而看起来完全正常。
const ROOT = decodeURIComponent(new URL('../..', import.meta.url).pathname).replace(/^\/([A-Za-z]:)/, '$1');
const INSPECT = join(ROOT, 'tools/taste-skill/skills/taste-skill/scripts/inspect.mjs');
const name = process.argv[2];
if (!name) { console.error('用法: node render-scheme.mjs <原型目录名> [--allow a,b]'); process.exit(2); }
const dir = join(ROOT, 'prototypes', name);
const html = join(dir, 'index.html');
if (!existsSync(html)) { console.error('没有 index.html: ' + html); process.exit(2); }

const extra = [];
const ai = process.argv.indexOf('--allow');
if (ai !== -1 && process.argv[ai + 1]) extra.push('--allow', process.argv[ai + 1]);

// T0-8 第三处 + 39 §2-B01 修法：静默失败曾被实测证实——inspect.mjs 缺失时 spawnSync 不抛，
// 而下方 L36 的 existsSync(rep) 被**上一轮的旧 report.json** 满足 ⇒ 脚本打印旧数据、退出码像成功。
// （2026-10-24 亲历：tools/ 消失后 S24 两次"渲染成功"全是旧报告，mtime 与 at 一动不动。）
if (!existsSync(INSPECT)) {
  console.error('缺渲染引擎：' + INSPECT + '\n  tools/ 不在仓库里（.gitignore:2 排除）——本机需自备 taste-skill；' +
    '只想截图取证请用 shot.mjs（零依赖，不碰 tools/）。');
  process.exit(4);
}
// 记下渲染前的报告指纹：跑完必须变，防止"打印旧数据"再次发生
const rep = join(dir, '.inspect', 'report.json');
const before = existsSync(rep) ? readFileSync(rep, 'utf8') : null;

const outRel = `prototypes/${name}/.inspect`;
const r = spawnSync(process.execPath, [
  INSPECT, `prototypes/${name}/index.html`, '--out', outRel, '--widths', '1440,768,390', '--json', ...extra,
], { cwd: ROOT, stdio: 'inherit' });
if (r.error || r.status !== 0 || r.signal) {
  console.error('\ninspect.mjs 失败：' + (r.error ? r.error.message : `exit=${r.status} signal=${r.signal}`) +
    '\n  没有写任何新报告——下面若出现旧数据，均来自更早一轮。');
  process.exit(5);
}

if (!existsSync(rep)) { console.error('\n没有生成 report.json —— 渲染失败。'); process.exit(3); }
if (before !== null && readFileSync(rep, 'utf8') === before) {
  console.error('\nreport.json 内容与渲染前逐字节相同 —— inspect 声称成功但没写报告，判为失败。');
  process.exit(6);
}
const j = JSON.parse(readFileSync(rep, 'utf8'));

const byLevel = {};
for (const f of j.findings) byLevel[f.level] = (byLevel[f.level] || 0) + 1;
// 注意 report.json 的真实结构（已核实）：
//   findings[] 用 id 不是 rule；viewports[] 里没有视口名、也没有 pages；
//   文件名在另一个顶层数组 images[]（{viewport,width,fold,pages}）里。
const nm = (w) => (w >= 1100 ? 'desktop' : w >= 600 ? 'tablet' : 'mobile');
const imgByW = new Map((j.images || []).map((i) => [i.width, i]));

console.log('\n===== ' + name + ' =====');
for (const v of j.viewports) {
  const p = v.metrics.page;
  const im = imgByW.get(v.width) || {};
  const ce = (v.consoleErrors || []).length;
  console.log(`\n[${nm(v.width)} ${v.width}x${v.height}]`);
  console.log(`  页高 ${p.height}（${v.screens} 屏）  字 ${p.words}  图 ${p.img}（真实 ${p.realPictures}）  svg ${p.svg}  段 ${p.sections}  横向溢出 ${p.horizontalOverflow}  控制台报错 ${ce}`);
  console.log(`  已绘制 ${(v.filled || []).map((x) => x.toFixed(2)).join('/')}   断链图 ${JSON.stringify(p.brokenImages)}   动作元素 ${v.motion ? v.motion.elements : '?'}   溢出元凶 ${JSON.stringify(p.overflowCulprits || [])}`);
  const t = v.metrics.type;
  console.log(`  字体族 ${t.familyCount}：` + t.families.map((f) => `${f.family} ${(f.share * 100).toFixed(0)}%${f.mono ? ',mono' : ''}`).join(' | ') + `   字号 ${t.sizeCount} 档`);
  const h = v.metrics.headingSummary;
  console.log(`  标题 ${h.count} 个，最多 ${h.maxLines} 行，超2行 ${h.over2Lines}，居中 ${h.centered}，混排字体 ${h.mixedFontHeadings}`);
  const hero = v.metrics.hero;
  console.log(`  hero「${String(hero.text).slice(0, 24)}」${hero.size}px / ${hero.vw}vw  ${hero.font}  ${hero.align}  ${hero.lines} 行`);
  console.log(`  图：${im.fold ? 'fold' : '—'} + ${(im.pages || []).length} page`);
}
if (j.findings.length) {
  console.log('\n发现：');
  for (const f of j.findings) {
    const also = f.alsoAt && f.alsoAt.length ? `  （另见 ${f.alsoAt.join('/')}px）` : '';
    console.log(`  [${f.level}] ${f.id} @${f.width}  ${String(f.message).slice(0, 140)}${f.fix ? '  → ' + f.fix : ''}${also}`);
  }
} else {
  console.log('\n发现：无');
}
console.log(`\n合计 FAIL=${byLevel.FAIL || 0}  WARN=${byLevel.WARN || 0}`);
process.exit((byLevel.FAIL || 0) > 0 ? 1 : 0);
