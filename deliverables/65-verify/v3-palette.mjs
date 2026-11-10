// V3：primary 是否恒等于 palette[1]；palette 长度分布；390px 下配色行是否错乱
import { Browser } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const SEL = join(ROOT, 'prototypes', '_selection');
const PAGE = 'file:///' + join(SEL, 'index.html').replace(/\\/g, '/');

const sb = { window: {} };
vm.createContext(sb);
vm.runInContext(readFileSync(join(SEL, 'data.js'), 'utf8'), sb, { filename: 'data.js' });
const SCHEMES = sb.window.SCHEMES;

const base = SCHEMES.map((s) => {
  const p = s.palette || [];
  return { id: s.id, len: p.length, p0: p[0], p1: p[1], primary: s.primary, bg: s.bg,
    eq1: p[1] === s.primary, eq0: p[0] === s.bg };
});
console.log('=== V3 数据层 ===');
console.log(`palette 长度分布：${JSON.stringify(base.reduce((a, b) => (a[b.len] = (a[b.len] || 0) + 1, a), {}))}`);
const neq1 = base.filter((b) => !b.eq1);
console.log(`primary === palette[1] 的案：${base.filter((b) => b.eq1).length}/30`);
if (neq1.length) neq1.forEach((b) => console.log(`   ✗ ${b.id}: primary=${b.primary} palette[1]=${b.p1}`));
const neq0 = base.filter((b) => !b.eq0);
console.log(`bg === palette[0] 的案：${base.filter((b) => b.eq0).length}/30`);
if (neq0.length) neq0.forEach((b) => console.log(`   ✗ ${b.id}: bg=${b.bg} palette[0]=${b.p0}`));
const short = base.filter((b) => b.len < 2);
console.log(`palette 长度 <2 的案：${short.length}  ${short.map((b) => b.id).join(' ')}`);

const browser = await Browser.launch({ width: 390, height: 844 });
const page = await browser.newPage({ width: 390, height: 844, dsf: 1, mobile: true });
await page.goto(PAGE, { settleMs: 1200 });

const ui = await page.eval(() => {
  const out = [];
  for (const s of window.SCHEMES) {
    const row = document.querySelector('.row[data-id="' + s.id + '"]');
    if (row) row.click();
    const det = document.querySelector('#detail');
    // 找含「底色」的那一行
    let line = null;
    for (const el of det.querySelectorAll('*')) {
      const t = (el.textContent || '');
      if (el.children.length === 0 && t.includes('底色') && t.includes('主色')) { line = el.parentElement; break; }
    }
    let text = null, lines = null, h = null;
    if (line) {
      text = line.textContent.trim().replace(/\s+/g, ' ');
      const r = line.getBoundingClientRect();
      h = Math.round(r.height);
      // 用 Range 数实际渲染行数
      const range = document.createRange(); range.selectNodeContents(line);
      lines = range.getClientRects().length;
    }
    out.push({ id: s.id, text, h, lines, scrollW: line ? line.scrollWidth : null, clientW: line ? line.clientWidth : null });
  }
  return out;
});

console.log('\n=== V3 UI 390px ===');
const hasBoth = ui.filter((u) => u.text && u.text.includes('主色'));
console.log(`印出「主色」标签的案：${hasBoth.length}/30`);
console.log(`含「底色」标签的案：${ui.filter((u) => u.text && u.text.includes('底色')).length}/30`);
const wrapped = ui.filter((u) => u.lines > 1);
console.log(`390px 下配色行折成多行的案：${wrapped.length}/30`);
const overflow = ui.filter((u) => u.scrollW > u.clientW + 1);
console.log(`横向溢出（scrollWidth > clientWidth）的案：${overflow.length}/30`);
console.log('\n样本：');
for (const id of ['S01', 'S13', 'S22', 'S27', 'S30']) {
  const u = ui.find((x) => x.id === id);
  console.log(`  ${id}: h=${u.h} lines=${u.lines} 「${(u.text || '').slice(0, 70)}」`);
}
// 逐案比对 UI 文本是否与 data 的 palette[1] 一致
const mismatch = ui.filter((u) => {
  const b = base.find((x) => x.id === u.id);
  return u.text && b.p1 && !u.text.includes('主色 ' + b.p1);
});
console.log(`\nUI 上「主色」后面的值与数据层 palette[1] 不一致的案：${mismatch.length}`);
mismatch.slice(0, 5).forEach((m) => {
  const b = base.find((x) => x.id === m.id);
  console.log(`   ${m.id}: 期望主色 ${b.p1}，实际「${m.text.slice(0, 60)}」`);
});
writeFileSync(join(HERE, 'v3-palette.json'), JSON.stringify({ base, ui }, null, 2), 'utf8');
await browser.close();
