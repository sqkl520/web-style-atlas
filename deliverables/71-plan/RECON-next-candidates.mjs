// 下一轮候选方向的实况侦察：每个候选都用数据说话，不靠记忆
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { execSync } from 'node:child_process';
const ROOT = 'D:/Web/style';

const run = (c) => { try { return execSync(c, { cwd: ROOT, encoding: 'utf8' }).trim(); } catch (e) { return (e.stdout || '') + (e.stderr || ''); } };

console.log('════ A. data.js 的负向分句：先分类再决定改不改 ════\n');
const dataJs = readFileSync(ROOT + '/prototypes/_selection/data.js', 'utf8');
const risks = [...dataJs.matchAll(/"risk"\s*:\s*"((?:[^"\\]|\\.){10,})"/g)].map((m) => m[1].replace(/\\"/g, '"'));
console.log(`risk 段总数: ${risks.length}`);
const NEG = /(不要|禁止|避免|不得|反的是|不允许|别用|勿用|拒绝|规避)/;
const NAMED = /#[0-9A-Fa-f]{6}|Playfair|Inter\b|Roboto|emoji|玻璃拟态|毛玻璃/;
let withNeg = 0, named = 0, namedAndNeg = 0;
for (const r of risks) {
  const n = NEG.test(r), m = NAMED.test(r);
  if (n) withNeg++;
  if (m) named++;
  if (n && m) namedAndNeg++;
}
console.log(`含否定词: ${withNeg}/${risks.length}`);
console.log(`点名具体禁项: ${named}/${risks.length}`);
console.log(`既否定又点名（真该改的）: ${namedAndNeg}/${risks.length}`);
if (namedAndNeg) {
  console.log('\n  点名样例：');
  for (const r of risks.filter((x) => NAMED.test(x) && NEG.test(x)).slice(0, 3)) console.log('   · ' + r.slice(0, 150));
}

console.log('\n════ B. 双链 palette 不一致（data.js vs prompts.js）════\n');
const dna = JSON.parse(readFileSync(ROOT + '/prototypes/_prompts/dna-clean.json', 'utf8'));
const dnaArr = Array.isArray(dna) ? dna : Object.values(dna);
const promptsSrc = readFileSync(ROOT + '/prototypes/_selection/prompts.js', 'utf8');
const sb = { window: {} };
new Function('window', promptsSrc)(sb.window);
const schemes = sb.window.STYLE_PROMPTS.schemes;
const HEXT = /#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})(?![0-9a-fA-F])/g;
const hexes = (s) => [...new Set([...String(s).matchAll(HEXT)].map((m) => m[0].toUpperCase()))];
let diff = 0;
const diffs = [];
// data.js 里的 palette（选型台推荐卡用 slice(0,4) 画色块）
const dataPal = {};
for (const m of dataJs.matchAll(/"id"\s*:\s*"(S\d{2})"[\s\S]{0,3000}?"palette"\s*:\s*\[([^\]]*)\]/g)) {
  dataPal[m[1]] = hexes(m[2]);
}
for (const s of schemes) {
  const raw = s.dna?.palette;
  const p = hexes(Array.isArray(raw) ? raw.join(' ') : String(raw || ''));
  const d = dataPal[s.id] || [];
  if (JSON.stringify(p.sort()) !== JSON.stringify(d.sort())) { diff++; diffs.push({ id: s.id, data: d, prompts: p }); }
}
console.log(`两链 palette 不同的案: ${diff}/30`);
for (const x of diffs.slice(0, 6)) console.log(`  ${x.id}  data.js=[${x.data.join(',')}]  prompts.js=[${x.prompts.join(',')}]`);
const dataLens = Object.values(dataPal).map((v) => v.length);
if (dataLens.length) console.log(`data.js palette 长度分布: ${JSON.stringify(dataLens.reduce((a, c) => (a[c] = (a[c] || 0) + 1, a), {}))}`);

console.log('\n════ C. 移动端断点：首屏完整卡 ════\n');
console.log('（上一轮实测数据，需重测确认。先看 _selection 的 CSS 断点声明）');
const selCss = readFileSync(ROOT + '/prototypes/_selection/style.css', 'utf8');
const mq = [...new Set([...selCss.matchAll(/@media[^{]*/g)].map((m) => m[0].trim()))];
console.log(`选型台 CSS 断点数: ${mq.length}`);
mq.forEach((m) => console.log('  ' + m.replace(/\s+/g, ' ').slice(0, 90)));

console.log('\n════ D. 仓库卫生：untracked 总量 ════\n');
const st = run('git status --porcelain');
const untracked = st.split('\n').filter((l) => l.startsWith('??')).length;
console.log(`untracked 条目: ${untracked}`);
const tracked = run('git ls-files').split('\n').filter(Boolean).length;
console.log(`tracked 文件: ${tracked}`);
const groups = {};
for (const l of st.split('\n').filter((x) => x.startsWith('??'))) {
  const p = l.slice(3).replace(/\\/g, '/');
  const k = p.split('/').slice(0, 2).join('/');
  groups[k] = (groups[k] || 0) + 1;
}
console.log('按目录分组（前 8）:');
Object.entries(groups).sort((a, b) => b[1] - a[1]).slice(0, 8).forEach(([k, v]) => console.log(`  ${String(v).padStart(4)}  ${k}`));

console.log('\n════ E. check-prompts 是否已接入 README 检查器清单 ════\n');
const readme = readFileSync(ROOT + '/README.md', 'utf8');
console.log(`README 提到 check-prompts.mjs: ${readme.includes('check-prompts') ? '是' : '否 ← 缺口'}`);
for (const f of ['check-docs.mjs', 'check-stale.mjs', 'check-anchors.mjs', 'check-prompts.mjs', 'verify-prototype.mjs']) {
  console.log(`  ${f.padEnd(24)} ${readme.includes(f) ? '✓ 已记录' : '✗ 未记录'}`);
}

console.log('\n════ F. 端到端验证覆盖 ════\n');
const testDir = ROOT + '/deliverables/69-test';
if (existsSync(testDir)) {
  const cases = readdirSync(testDir, { withFileTypes: true }).filter((d) => d.isDirectory() && /^S\d{2}$/.test(d.name)).map((d) => d.name);
  console.log(`已做端到端复刻的案: ${cases.length}/30 → ${cases.join(' ')}`);
  const lens = run('git log --oneline -1 --format=%s');
  console.log(`（红队算过：要证 ≥90% 需 29 次，≥95% 需 59 次）`);
} else console.log('无 69-test 目录');

console.log('\n════ G. 30 案闸门 FAIL 的案 ════\n');
const fails = [];
for (const d of readdirSync(ROOT + '/prototypes', { withFileTypes: true }).filter((x) => x.isDirectory() && /^S\d{2}-/.test(x.name))) {
  const rp = join(ROOT, 'prototypes', d.name, '.inspect', 'report.json');
  if (!existsSync(rp)) { fails.push({ id: d.name.slice(0, 3), why: '无报告' }); continue; }
  try {
    const r = JSON.parse(readFileSync(rp, 'utf8').replace(/^\uFEFF/, ''));
    const f = (r.findings || []).filter((x) => x.level === 'FAIL');
    const w = (r.findings || []).filter((x) => x.level === 'WARN');
    if (f.length) fails.push({ id: d.name.slice(0, 3), fail: f.map((x) => x.rule), warn: w.length });
  } catch (e) { fails.push({ id: d.name.slice(0, 3), why: 'parse error' }); }
}
console.log(`有 FAIL 的案: ${fails.length}/30`);
fails.forEach((f) => console.log(`  ${f.id}  FAIL=${(f.fail || []).join(',') || f.why}  WARN=${f.warn ?? '-'}`));
