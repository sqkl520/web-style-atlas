// RT 探针 8：P1a/P1b 的**覆盖面假象** —— 选择器 /^S\d{2}-/ 会把野目录算成"干净的案"
// 实测发现：prototypes/ 下有一个未跟踪的 S99-probe-attack/，里面只有一个假 report.json {"url":"x"}。
// 它匹配 /^S\d{2}-/，于是：
//   · check-contract 把它当成"0 FAIL 的干净案"（findings 缺失 → 空数组 → 通过）
//   · 打印的标题却硬编码「30 案」
//   · check-prompts 因为没有 style.css 直接 ENOENT 崩掉（退出码 1，但报的是拷错对象的错）
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const P = 'D:/Web/style/prototypes';
const all = readdirSync(P, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name);
const matched = all.filter((n) => /^S\d{2}-/.test(n)).sort();

console.log('═══ 选择器 /^S\\d{2}-/ 实际匹配到的目录 ═══');
console.log(`  共 ${matched.length} 个：${matched.map((n) => n.slice(0, 3)).join(' ')}`);
const rogue = matched.filter((n) => !/^S([0-2]\d|30)-/.test(n));
console.log(`  其中**不是 S01–S30** 的：${rogue.length ? rogue.join(', ') : '无'}`);
console.log('');

console.log('═══ 野目录的 report.json 内容 ═══');
for (const r of rogue) {
  const rp = join(P, r, '.inspect', 'report.json');
  if (existsSync(rp)) {
    const raw = readFileSync(rp, 'utf8');
    console.log(`  ${r}/.inspect/report.json = ${JSON.stringify(raw)}`);
    let j = null; try { j = JSON.parse(raw); } catch {}
    console.log(`  has findings? ${j && 'findings' in j}   has at? ${j && 'at' in j}`);
    console.log(`  → check-contract 判据 (j.findings || []).filter(FAIL) = [] → **算作 0 FAIL 的干净案**`);
    console.log(`  → check-stale 判据 !Number.isFinite(at) → continue → **静默跳过**`);
  }
  console.log(`  style.css 存在? ${existsSync(join(P, r, 'style.css'))} → check-prompts 直接 ENOENT 崩`);
}
console.log('');

console.log('═══ 三个检查器对「案数」的口径 ═══');
for (const f of ['check-contract.mjs', 'check-stale.mjs', 'check-prompts.mjs']) {
  const s = readFileSync(join(P, '_build', f), 'utf8');
  const hard30 = /30 案|30 个|30案/.test(s);
  const hardcoded = s.match(/[^\n]*(30 案|30 个)[^\n]*/g) || [];
  console.log(`  ${f}`);
  console.log(`    用 /^S\\d{2}-/ 选择器: ${/\^S\\d\{2\}-/.test(s) || /CASE_DIR_RE/.test(s)}`);
  console.log(`    硬编码出现「30」: ${hard30 ? '是' : '否'}`);
  for (const l of hardcoded.slice(0, 2)) console.log(`      ${l.trim().slice(0, 90)}`);
}
console.log('');

console.log('═══ 结论 ═══');
console.log('  P1a 的闸门把「30 案」当常量印在标题上，实际遍历的是"任何名字像 Sxx 的目录"。');
console.log('  一个内容为 {"url":"x"} 的野目录被计为「干净通过」，标题仍然写「30 案」。');
console.log('  这不是假想：它此刻就在盘上，并且已经让 check-prompts 以退出码 1 崩掉。');
