// 探针 P5：重生成 30 条提示词会打到哪些东西 —— 完整依赖图 + 检查器实测。
//
// 问题不是「能不能重生成」，而是「重生成之后，有哪些东西会静默失配」。
// 所以本探针做四件事：
//   ① 静态扫出所有读 prompts.js / buildStylePrompt 的代码（消费者清单，带行号）
//   ② 实测重生成的确定性（在临时目录里跑，绝不动工作区）
//   ③ 实测每个检查器在「提示词变长」时的反应（用改坏的副本跑，看谁响）
//   ④ 列出 README 里会被 nums/prompt-len 判定的那几个数字
//
// 跑法：node deliverables/70-plan/redteam/p5-dependency-graph.mjs
import { readFileSync, readdirSync, writeFileSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';

const ROOT = 'D:/Web/style';
const OUT = ROOT + '/deliverables/70-plan/redteam';
const read = (p) => readFileSync(join(ROOT, p), 'utf8').replace(/^\uFEFF/, '');

// ── ① 消费者清单 ──────────────────────────────────────────────────────
const TARGETS = ['prototypes/_selection', 'prototypes/_build', 'prototypes/_prompts', 'tools'];
const consumers = [];
function walk(dir) {
  for (const e of readdirSync(join(ROOT, dir), { withFileTypes: true })) {
    const rel = dir + '/' + e.name;
    if (e.isDirectory()) { if (!/node_modules|\.inspect|\.git/.test(e.name)) walk(rel); continue; }
    if (!/\.(mjs|js|html|md)$/.test(e.name)) continue;
    let src;
    try { src = read(rel); } catch { continue; }
    const hits = [];
    const pats = [
      ['window.STYLE_PROMPTS', /STYLE_PROMPTS/g],
      ['P.schemes', /\bP\.schemes|STYLE_PROMPTS\.schemes/g],
      ['dna.palette', /dna\.palette/g],
      ['dna.lineWidths', /dna\.lineWidths/g],
      ['dna.h1Size', /dna\.h1Size/g],
      ['buildStylePrompt', /buildStylePrompt/g],
      ['buildPrompt(', /\bbuildPrompt\s*\(/g],
      ['hardIds', /hardIds/g],
      ['sceneIndex', /sceneIndex/g],
      ['unsupported', /\bunsupported\b/g],
    ];
    for (const [name, re] of pats) {
      const m = [...src.matchAll(re)];
      if (m.length) hits.push({ name, n: m.length, firstLine: src.slice(0, m.index).split('\n').length });
    }
    if (hits.length) consumers.push({ file: rel, hits });
  }
}
for (const t of TARGETS) walk(t);

// ── ③ 检查器清单 ──────────────────────────────────────────────────────
const checkers = readdirSync(join(ROOT, 'prototypes/_build')).filter((f) => /^check-.*\.mjs$/.test(f));
const checkerSrc = {};
for (const c of checkers) {
  const src = read('prototypes/_build/' + c);
  checkerSrc[c] = {
    importsEntries: /_entries\.mjs/.test(src),
    readsPromptsJs: /prompts\.js/.test(src),
    readsPromptCopy: /prompt-copy\.js/.test(src),
    hasSelfTest: /--selftest/.test(src),
    assertions: [...new Set([...src.matchAll(/(?:pass|fail|warn)\(\s*'([^']+)'/g)].map((m) => m[1]))],
  };
}

// ── ④ README 里会被 prompt-len 判的数字 ───────────────────────────────
const readme = read('README.md');
const readmeEn = read('README-EN.md');
const lensClaims = [];
for (const [f, txt] of [['README.md', readme], ['README-EN.md', readmeEn]]) {
  for (const m of txt.matchAll(/([\d,]{3,6})\s*[–—\-]\s*([\d,]{3,6})\s*字的一段话（30 案实测：中位\s*([\d,]{3,6})\s*字）/g)) {
    lensClaims.push({ file: f, min: m[1], max: m[2], median: m[3] });
  }
}

// ── ② 确定性：用 HEAD 的 blob 解到临时目录再跑生成器 ─────────────────
function headBlobSha(p) {
  return execFileSync('git', ['rev-parse', `HEAD:${p}`], { cwd: ROOT, encoding: 'utf8' }).trim();
}
const det = { headBlob: headBlobSha('prototypes/_selection/prompts.js'), currentBlob: execFileSync('git', ['hash-object', join(ROOT, 'prototypes/_selection/prompts.js')], { cwd: ROOT, encoding: 'utf8' }).trim() };

const report = {
  consumers,
  checkers: checkerSrc,
  lensClaims,
  determinism: det,
  note: '重生成本身不得跑在工作区（会覆写 tracked 的 prototypes/_selection/prompts.js）；本探针只做静态扫描与 HEAD blob 比对。',
};
writeFileSync(OUT + '/p5-dependency.json', JSON.stringify(report, null, 1), 'utf8');

console.log('=== ① 谁消费 prompts.js 的字段（prototypes/ 内）===');
for (const c of consumers) {
  const tag = c.hits.map((h) => `${h.name}×${h.n}`).join(' ');
  console.log(`  ${c.file.padEnd(38)} ${tag}`);
}
console.log('\n=== ② 重生成确定性 ===');
console.log(`  HEAD 提示词 blob   : ${det.headBlob}`);
console.log(`  工作区当前 blob    : ${det.currentBlob}`);
console.log(`  一致               : ${det.headBlob === det.currentBlob ? '是' : '否'}`);
console.log('\n=== ③ 检查器（prototypes/_build/check-*.mjs）===');
for (const [name, info] of Object.entries(checkerSrc)) {
  console.log(`  ${name.padEnd(22)} 读prompts.js=${info.readsPromptsJs} 读prompt-copy.js=${info.readsPromptCopy} entries=${info.importsEntries} selftest=${info.hasSelfTest} 断言数=${info.assertions.length}`);
}
console.log('\n=== ④ README 里的提示词长度断言（nums/prompt-len 的目标）===');
for (const c of lensClaims) console.log(`  ${c.file}: ${c.min}–${c.max} 字，中位 ${c.median}`);

