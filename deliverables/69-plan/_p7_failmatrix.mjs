// 探针 7：D 的 6 条 FAIL 逐条定性 —— 静态 lint vs 运行期 inspect 的判据分叉。
// 关键问题：README L419/L422 说 S13 还有 `shadow`(17 处) 与 `button-fx`，但我刚重渲染
// 只有 mono + empty-screens。到底是"上轮真修好了"，还是"两个工具口径不同"？
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { ROOT, out } from './_lib.mjs';

const NODE = process.execPath;
const LINT = join(ROOT, 'tools/taste-skill/skills/taste-skill/scripts/lint.mjs');
const targets = {
  S07: 'S07-slate-ink-contents', S08: 'S08-amber-overprint-lightbox',
  S13: 'S13-blind-debossed-dispatch', S21: 'S21-interlocking-release-book',
};

let lintJson = {};
try {
  const s = execFileSync(NODE, [LINT, ...Object.values(targets).map((d) => join(ROOT, 'prototypes', d)), '--json'],
    { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'] });
  lintJson = JSON.parse(s);
} catch (e) { lintJson = JSON.parse(e.stdout || '{"findings":[]}'); }

const byFile = {};
for (const f of lintJson.findings || []) {
  const id = (f.file.match(/prototypes\/(S\d\d)/) || [])[1];
  const k = `${id}|${f.level}|${f.id}`;
  (byFile[k] = byFile[k] || []).push(f);
}
out('=== 静态 lint 现在报什么（4 个案，--json）===');
for (const k of Object.keys(byFile).sort()) out(`  ${k}  ×${byFile[k].length}`);

out('\n=== S13 的 shadow 命中，按类型拆 ===');
const s13sh = (byFile['S13|FAIL|shadow'] || []);
const kinds = { boxShadow: [], dropShadow: [], textShadow: [], other: [] };
for (const f of s13sh) {
  const line = readFileSync(f.file, 'utf8').split(/\r?\n/)[f.line - 1] || '';
  if (/text-shadow/.test(line)) kinds.textShadow.push(line.trim());
  else if (/drop-shadow/.test(line)) kinds.dropShadow.push(line.trim());
  else if (/box-shadow/.test(line)) kinds.boxShadow.push(line.trim());
  else kinds.other.push(line.trim());
}
for (const [k, v] of Object.entries(kinds)) out(`  ${k}: ${v.length} 处  ${v.slice(0, 3).map((x) => JSON.stringify(x.slice(0, 90))).join(' | ')}`);
out('  ⚠️ _CONTRACT.md §9.3 明写「filter: drop-shadow() 不算 shadow」——lint.mjs 的 shadow 正则却含 drop-shadow\\(');
out('  → 静态 lint 与契约 §9.3 直接冲突。这解释了 README 的「shadow 17 处」从哪来。');

out('\n=== 运行期 inspect 的 shadow / button-fx 判据（刚重渲染 p2-fails-live.json）===');
const live = JSON.parse(readFileSync(join(ROOT, 'deliverables/69-plan/p2-fails-live.json'), 'utf8'));
for (const [id, v] of Object.entries(live)) {
  const ids = v.fails.map((f) => f.id);
  out(`  ${id}: exit=${v.exit} FAIL=[${ids.join(' ')}]  allow=[${v.allow}]`);
}
out('\n  runtime shadow 判据源码（rules.mjs）：只有 surfaces.shadowStatic>0 才 FAIL；');
out('  shadowStatic 的定义（probe.mjs）：computed boxShadow 里"有非 inset 且非全零"的那一段。');
out('  → drop-shadow 是 filter，probe 根本不看它；这是 S13 静态红、运行期绿的机制。');

out('\n=== S13 的 17 处 / button-fx 现在的真值 ===');
for (const id of Object.keys(targets)) {
  const p = join(ROOT, 'deliverables/69-plan/inspect-live-' + id, 'report.json');
  if (!existsSync(p)) continue;
  const j = JSON.parse(readFileSync(p, 'utf8'));
  const v = (j.viewports || []).find((x) => x.width === 1440);
  const sf = v.metrics.surfaces, bt = v.metrics.buttons;
  out(`  ${id} 1440: shadowStatic=${sf.shadowStatic} shadowOverlay=${sf.shadowOverlay} textShadow=${sf.textShadow} ` +
    `buttons.withShadow=${bt.withShadow} withGradient=${bt.withGradient} radius=${bt.radius} ` +
    `monoProseShare=${v.metrics.type.monoProseShare} familyCount=${v.metrics.type.familyCount} ` +
    `emptyScreens=${(v.filled || []).filter((x) => x < 0.2).length}/${(v.filled || []).length}`);
}

out('\n=== 6 条 FAIL × 是否有豁免记录（_CONTRACT.md §9.15 允许表 / README L415-）===');
const contract = readFileSync(join(ROOT, 'prototypes/_CONTRACT.md'), 'utf8');
const readme = readFileSync(join(ROOT, 'README.md'), 'utf8');
const rows = [
  ['S07', 'mono'], ['S08', 'palette-terracotta'], ['S08', 'font-count'],
  ['S13', 'mono'], ['S13', 'empty-screens'], ['S21', 'mono'],
];
for (const [id, rule] of rows) {
  const inContract = new RegExp('\\|\\s*`' + rule + '`').test(contract);
  const inReadmeBoundary = readme.includes('已知豁免') && readme.slice(readme.indexOf('做不到与已知边界')).includes(rule);
  out(`  ${id} ${rule.padEnd(20)} §9.15允许表=${inContract ? 'YES' : 'NO '}   README边界节提到=${inReadmeBoundary ? 'YES' : 'NO'}`);
}
out('\n=== README 现在的说法 vs 实测 ===');
const L419 = readme.split(/\r?\n/).find((l) => l.includes('合计 8 条')) || '';
out('  README 行（合计 8 条）：' + L419.trim().slice(0, 220));
out('  实测合计 FAIL 条数 =', Object.values(live).reduce((a, v) => a + v.fails.length, 0));
out('  README 里仍写「shadow（17 处）」=', readme.includes('shadow（17 处）'));
out('  README 里仍写「button-fx」=', readme.includes('button-fx'));
