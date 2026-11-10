/* plan-probe-fonts.mjs — 只读探针（P2 实测）
 * 目的：量出 data.js 里 `fonts` 字段的长度分布，以及所有读它的位置。
 * 不改任何文件。
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const P = join(ROOT, 'prototypes');
const SEL = join(P, '_selection');

/* ── 1. data.js 的 fonts 字段长度 ── */
const src = readFileSync(join(SEL, 'data.js'), 'utf8');
const re = /\n(\s*)"fonts":\s*"((?:[^"\\]|\\.)*)"/g;
const hits = [];
let m;
let lineNo = 0;
let consumed = 0;
while ((m = re.exec(src))) {
  // 行号
  const upTo = src.slice(0, m.index);
  lineNo = upTo.split('\n').length;
  // 反转义后的真实长度（\n 之类）
  let raw = m[2];
  let real = raw.replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\\\/g, '\\');
  hits.push({ line: lineNo + 1, rawLen: raw.length, realLen: [...real].length, bytes: Buffer.byteLength(real, 'utf8') });
}
const lens = hits.map((h) => h.realLen);
console.log('═══ P2 · data.js 的 "fonts" 字段 ═══');
console.log(`  命中 ${hits.length} 处（应为 30）`);
console.log(`  真实字符数 min=${Math.min(...lens)} max=${Math.max(...lens)} avg=${Math.round(lens.reduce((a, b) => a + b, 0) / lens.length)}`);
console.log(`  合计字符 ${lens.reduce((a, b) => a + b, 0)}，UTF-8 字节 ${hits.reduce((a, h) => a + h.bytes, 0)}`);
console.log('  前 3 条行号/长度：', hits.slice(0, 3).map((h) => `L${h.line}=${h.realLen}`).join('  '));
console.log('  后 3 条行号/长度：', hits.slice(-3).map((h) => `L${h.line}=${h.realLen}`).join('  '));

/* ── 2. prompts.js 的 dna.fonts 形状 ── */
const pj = readFileSync(join(SEL, 'prompts.js'), 'utf8');
const dnaFonts = [...pj.matchAll(/"fonts":\s*\{([\s\S]{0,400}?)\}/g)];
console.log('\n═══ P2 · prompts.js 的 dna.fonts 形状 ═══');
console.log(`  命中 ${dnaFonts.length} 处对象形式（应为 30）`);
if (dnaFonts.length) {
  const keys = [...dnaFonts[0][1].matchAll(/"(\w+)":/g)].map((x) => x[1]);
  console.log('  键：', keys.join(', '));
  console.log('  样本：', dnaFonts[0][1].replace(/\s+/g, ' ').slice(0, 220));
}

/* ── 3. 全库读 data.js `fonts` 的位置（源码级 grep，跳过 deliverables/） ── */
console.log('\n═══ P2 · 谁在读 data.js 的 `fonts` 字段 ═══');
const SCAN = [
  join(SEL, 'app.js'), join(SEL, 'wizard.js'), join(SEL, 'prompt-copy.js'),
  join(SEL, 'index.html'), join(SEL, 'wizard.html'),
  join(P, '_build', 'collect-schemes.mjs'),
  join(P, '_build', 'check-docs.mjs'),
  join(P, '_build', 'summarize-all.mjs'),
];
const PAT = /(r\.fonts|\.fonts\b|["']fonts["']\s*:)/;
for (const f of SCAN) {
  if (!existsSync(f)) { console.log(`  (缺) ${f.replace(ROOT, '.')}`); continue; }
  const lines = readFileSync(f, 'utf8').split(/\r?\n/);
  const out = [];
  for (let i = 0; i < lines.length; i++) {
    const L = lines[i];
    if (PAT.test(L)) {
      // 排除 document.fonts / fonts.clear 之类浏览器 API
      if (/document\.fonts/.test(L)) continue;
      out.push({ line: i + 1, text: L.trim().slice(0, 140) });
    }
  }
  console.log(`  ${f.replace(ROOT, '.').replace(/\\/g, '/')}  ${out.length} 处`);
  for (const o of out) console.log(`      :${o.line}  ${o.text}`);
}

/* ── 4. data.js 顶层键顺序（确认 fonts 的邻居，便于定位改动） ── */
const firstRec = src.slice(0, 4000);
console.log('\n═══ P2 · data.js 首条记录顶层键（前 8 个）═══');
console.log('  ', [...firstRec.matchAll(/^\s{4}"(\w+)":/gm)].slice(0, 8).map((x) => x[1]).join(' → '));

/* ── 5. check-twolines 是否碰 fonts ── */
const tw = readFileSync(join(P, '_build', 'check-twolines.mjs'), 'utf8');
console.log('\n═══ P2 · check-twolines.mjs 是否依赖 fonts ═══');
console.log('  含 "fonts"：', (tw.match(/fonts/g) || []).length, '次（0 = 不依赖）');

/* ── 6. 案目录数与 S 案列表 ── */
const cases = readdirSync(P, { withFileTypes: true }).filter((d) => d.isDirectory() && /^S\d{2}-/.test(d.name)).map((d) => d.name).sort();
console.log(`\n═══ 案数 ═══\n  ${cases.length} 案`);
