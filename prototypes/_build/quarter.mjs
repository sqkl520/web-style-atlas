#!/usr/bin/env node
/* 季度体检（2026-11-11，Q4）
 *
 * Q4 的主题是「季度节奏跑通一轮，且有数据可依」。这个脚本就是那一轮的载体。
 *
 * 它按**真实依赖顺序**跑完整条链，然后给一份人能读的报告。
 * 所有判据都来自实测输出，不写死任何数字。
 *
 * ═══ 用法 ═══════════════════════════════════════════════════════════
 *
 *   node prototypes/_build/quarter.mjs              # 只跑不写盘（dry-run，默认）
 *   node prototypes/_build/quarter.mjs --write      # 真的重新生成产物
 *   node prototypes/_build/quarter.mjs --render     # 连三档渲染一起跑（很慢，10–20 分钟）
 *   node prototypes/_build/quarter.mjs --report     # 只出报告，不跑任何东西
 *
 * ── 为什么默认 dry-run ────────────────────────────────────────────────
 * 这个脚本会重写 data.js / prompts.js / provenance.js。
 * 如果默认就写，任何人随手跑一下都会改工作区 —— 而"随手跑一下看看"恰恰是
 * 季度体检最可能被怎么用的方式。写盘必须是明确的意图（`--write`）。
 *
 * ── 为什么渲染要单独开关 ──────────────────────────────────────────────
 * 渲染 35 案 × 3 档 = 105 次 Chrome 页面加载，实测 10–20 分钟。
 * 季度体检里它是必要的一步（截图会过期），但不该让"我只想看看闸门状态"
 * 的人也等二十分钟。所以 `--render` 是显式开关。
 *
 * ═══ 依赖顺序为什么是这个顺序 ═══════════════════════════════════════
 *
 *   1. extract-specs      documents/*.md  → _specs/*.md
 *   2. render-scheme      _specs + html/css → .inspect/report.json + 截图
 *   3. extract-dna        _specs + css     → dna-raw.json
 *   4. clean-dna          dna-raw.json     → dna-clean.json
 *   5. collect-schemes    _specs + report  → data.js
 *   6. build-prompts      dna-clean + data → prompts.js
 *   7. build-provenance   prompts + css    → dna-provenance.json + provenance.js
 *   8. 九道静态闸门
 *   9. probe-ui（真浏览器）
 *
 * ⚠️ 顺序里有两个容易搞反的地方，都是本仓库实际踩过的：
 *   · **collect-schemes 必须在 build-prompts 之前**：后者的 SCENE_INDEX
 *     与 data.js 相关（`build-prompts.mjs:40` 读 data.js）。反过来跑会得到
 *     一份基于旧数据的提示词。
 *   · **build-provenance 必须在 build-prompts 之后**：它读 `prompts.js`
 *     取机制句（不是读 dna-clean.json —— 那条路只有 34 个数值，因为
 *     机制句的补丁是在 build-prompts 里打的，见 build-provenance.mjs 的注释）。
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import vm from 'node:vm';

const ROOT = decodeURIComponent(new URL('../..', import.meta.url).pathname).replace(/^\/([A-Za-z]:)/, '$1');
const B = join(ROOT, 'prototypes/_build');
const PP = join(ROOT, 'prototypes/_prompts');

const ARGV = process.argv.slice(2);
const WRITE = ARGV.includes('--write');
const RENDER = ARGV.includes('--render');
const REPORT_ONLY = ARGV.includes('--report');
const QUIET = ARGV.includes('--quiet');

/* ── 步骤定义 ─────────────────────────────────────────────────────────
 * kind：
 *   'gen'   生成产物。dry-run 时**不跑**（它会写盘），只报"需要跑"。
 *   'gate'  只读检查。dry-run 时照跑 —— 它的价值就在于给出当前状态。
 *   'slow'  渲染或浏览器探针。只在 --render 或非 dry-run 时才跑。
 */
const STEPS = [
  { id: 'extract-specs', label: '规格切分', kind: 'gen', script: join(B, 'extract-specs.mjs'), writes: ['prototypes/_specs/*.md'] },
  ...(RENDER ? [{ id: 'render', label: '三档渲染（35 案）', kind: 'slow', script: join(B, 'render-scheme.mjs'), args: ['--all'], writes: ['prototypes/S*/.inspect/*', 'prototypes/_selection/.inspect/*'] }] : []),
  { id: 'extract-dna', label: 'DNA 抽取', kind: 'gen', script: join(PP, 'extract-dna.mjs'), writes: ['prototypes/_prompts/dna-raw.json'] },
  { id: 'clean-dna', label: 'DNA 清洗', kind: 'gen', script: join(PP, 'clean-dna.mjs'), writes: ['prototypes/_prompts/dna-clean.json'] },
  { id: 'collect-schemes', label: '方案数据收集', kind: 'gen', script: join(B, 'collect-schemes.mjs'), writes: ['prototypes/_selection/data.js'] },
  { id: 'build-prompts', label: '提示词生成', kind: 'gen', script: join(PP, 'build-prompts.mjs'), writes: ['prototypes/_selection/prompts.js'] },
  { id: 'build-provenance', label: '出处定位', kind: 'gen', script: join(PP, 'build-provenance.mjs'), writes: ['prototypes/_prompts/dna-provenance.json', 'prototypes/_selection/provenance.js'] },

  /* 九道静态闸门。顺序无所谓（都只读），按逻辑分组排。 */
  { id: 'check-stale-git', label: '陈旧度（commit 判据）', kind: 'gate', script: join(B, 'check-stale-git.mjs') },
  { id: 'check-docs', label: '文档一致性', kind: 'gate', script: join(B, 'check-docs.mjs') },
  { id: 'check-anchors', label: '锚点', kind: 'gate', script: join(B, 'check-anchors.mjs') },
  { id: 'check-texture', label: '纹理载体', kind: 'gate', script: join(B, 'check-texture.mjs') },
  { id: 'check-prompts', label: '提示词 ↔ CSS', kind: 'gate', script: join(B, 'check-prompts.mjs') },
  { id: 'check-twolines', label: '两条数据链', kind: 'gate', script: join(B, 'check-twolines.mjs') },
  { id: 'check-contract', label: '契约允许表', kind: 'gate', script: join(B, 'check-contract.mjs') },
  { id: 'check-ui-copy', label: '选型台界面文案', kind: 'gate', script: join(B, 'check-ui-copy.mjs') },
  { id: 'check-distribution', label: '分布（--strict）', kind: 'gate', script: join(B, 'check-distribution.mjs'), args: ['--strict'] },
  { id: 'check-scenes', label: '芯片 vs 搜索', kind: 'gate', script: join(B, 'check-scenes.mjs') },
  { id: 'check-provenance', label: '出处完整性', kind: 'gate', script: join(B, 'check-provenance.mjs') },

  /* 自测：证明闸门不是恒真。这一组本身不判定产品状态，但它决定了
   * 上面那些绿是不是可信的 —— 所以它失败要单独标出来。 */
  { id: 'selftest-docs', label: '自测：文档闸门', kind: 'gate', script: join(B, 'check-docs.mjs'), args: ['--selftest'] },
  { id: 'selftest-dist', label: '自测：分布闸门', kind: 'gate', script: join(B, 'check-distribution.mjs'), args: ['--selftest'] },
  { id: 'selftest-scenes', label: '自测：词表闸门', kind: 'gate', script: join(B, 'check-scenes.mjs'), args: ['--selftest'] },
  { id: 'selftest-prov', label: '自测：出处闸门', kind: 'gate', script: join(B, 'check-provenance.mjs'), args: ['--selftest'] },

  { id: 'probe-ui', label: '运行时探针（真浏览器）', kind: 'slow', script: join(B, 'probe-ui.mjs') },
];

/* ── 跑一步 ─────────────────────────────────────────────────────────── */
function runStep(s) {
  const t0 = Date.now();
  let out = '', code = 0;
  try {
    out = execFileSync(process.execPath, [s.script, ...(s.args || [])], {
      cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 20 * 60 * 1000,
    });
  } catch (e) {
    out = (e.stdout || '') + (e.stderr || '');
    code = e.status == null ? -1 : e.status;
  }
  return { ...s, out, code, ms: Date.now() - t0 };
}

/* ── 收集数据（报告用）─────────────────────────────────────────────── */
function gather() {
  /* ⚠️ `load()` 返回的是**沙箱的 window 对象**，不是某个具体全局。
   * data.js 挂 `window.SCHEMES`，prompts.js 挂 `window.STYLE_PROMPTS` ——
   * 两边的顶层名不同。第一版写成 `const P = load(...)` 然后 `P.schemes`，
   * 拿到的永远是 undefined（P 是 window，window 上没有 `schemes`），
   * 于是报告里「少货少图 0 案」「提示词 0 份」两组数都是假 0。
   *
   * 这个 bug 之所以没被当场发现，是因为 **0 是一个合法值** ——
   * 报告看起来只是"这项没有"，而不是"读取失败"。
   * 这正是本仓库反复在治的那个病：读不到数据 → 打出一个好看的 0。
   *
   * 修法：显式取各自的顶层名，且**取不到就 throw**，让 catch 记进 d.error，
   * 报告里出现「数据读取失败」而不是一排 0。 */
  const load = (p, key) => {
    const c = { window: {} };
    vm.createContext(c);
    vm.runInContext(readFileSync(p, 'utf8'), c);
    const v = c.window[key];
    if (v === undefined) throw new Error(`${p} 里没有 window.${key}`);
    return v;
  };
  const d = {};
  try {
    const W = load(join(ROOT, 'prototypes/_selection/data.js'), 'SCHEMES');
    const P = load(join(ROOT, 'prototypes/_selection/prompts.js'), 'STYLE_PROMPTS');
    const S = W || [];
    d.cases = S.length;
    d.built = S.filter((x) => x.built).length;
    d.failZero = S.filter((x) => !x.gate || !(x.gate.fail > 0)).length;
    d.failTotal = S.reduce((a, x) => a + ((x.gate && x.gate.fail) || 0), 0);
    d.failCases = S.filter((x) => x.gate && x.gate.fail > 0).map((x) => `${x.id}:${x.gate.fail}`);
    d.shots = S.reduce((a, x) => a + ['desktop', 'tablet', 'mobile'].reduce((b, k) => b + ((x.shots && x.shots[k]) || []).length, 0), 0);
    // 分布
    const band = {};
    for (const x of S) { const b = (x.axes && x.axes.band) || '?'; band[b] = (band[b] || 0) + 1; }
    d.bands = band;
    d.warm = band['暖浅色带'] || 0;
    d.quiet = S.filter((x) => x.axes && x.axes.chroma <= 25).length;
    d.midLight = S.filter((x) => x.axes && x.axes.band === '中间明度带').length;
    d.lowPhoto = (P.schemes || []).filter((x) => x.capacity && x.capacity.minPics <= 2).length;
    d.purple = S.filter((x) => {
      const a = x.axes || {};
      return a.bandHue >= 260 && a.bandHue <= 320 && a.bandL >= 60;
    }).length;
    d.promptLen = (P.schemes || []).length;
    d.sceneTerms = Object.keys(P.sceneIndex || {}).length;
  } catch (e) {
    d.error = String(e.message || e);
  }
  return d;
}

/* ── 报告 ───────────────────────────────────────────────────────────── */
function printReport(d, results) {
  const L = [];
  const push = (s) => L.push(s);

  push('');
  push('═'.repeat(64));
  push('季度体检报告');
  push('═'.repeat(64));
  push('');

  if (d.error) {
    push('✗ 数据读取失败：' + d.error);
  } else {
    push(`规模      ${d.cases} 案，${d.built} 个已建，${d.shots} 张截图`);
    push(`闸门      ${d.failZero}/${d.cases} 案 FAIL=0，合计 ${d.failTotal} 条 FAIL` +
      (d.failCases.length ? `（${d.failCases.join(' ')}）` : ''));
    push('');
    push('分布（Q2 的四个缺口）');
    const bandStr = Object.entries(d.bands).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(' · ');
    push('  底色带    ' + bandStr);
    push(`  暖浅占比  ${d.warm}/${d.cases} = ${Math.round((d.warm / d.cases) * 100)}%（上限 60%）`);
    push(`  中间明度  ${d.midLight} 案（地板 2）`);
    push(`  亮底紫    ${d.purple} 案（地板 1）`);
    push(`  很安静    ${d.quiet} 案（地板 5）`);
    push(`  少货少图  ${d.lowPhoto} 案（地板 2）`);
    push('');
    push(`提示词    ${d.promptLen} 份，行业词 ${d.sceneTerms} 个`);
  }

  push('');
  push('─'.repeat(64));
  push('执行结果');
  push('─'.repeat(64));
  const skipped = results.filter((r) => r.skipped);
  const ran = results.filter((r) => !r.skipped);
  const failed = ran.filter((r) => r.code !== 0);
  const secs = (ms) => (ms / 1000).toFixed(1) + 's';

  for (const r of ran) {
    const mark = r.code === 0 ? '✓' : '✗';
    push(`${mark} ${r.label.padEnd(26)} ${secs(r.ms).padStart(8)}${r.code !== 0 ? '   exit ' + r.code : ''}`);
  }
  for (const r of skipped) {
    push(`· ${r.label.padEnd(26)} ${'（跳过：' + r.skipped + '）'}`);
  }

  push('');
  push('─'.repeat(64));
  if (failed.length) {
    push(`结论：${failed.length} 步失败`);
    push('');
    for (const f of failed) {
      push(`【${f.label}】`);
      const lines = String(f.out).split('\n').filter((l) => /\S/.test(l));
      for (const l of lines.slice(-14)) push('  ' + l);
      push('');
    }
  } else {
    push(`结论：全部 ${ran.length} 步通过` + (skipped.length ? `（${skipped.length} 步因 dry-run/未开 --render 而跳过）` : ''));
  }
  push('═'.repeat(64));
  push('');
  console.log(L.join('\n'));
  return failed;
}

/* ── 主流程 ─────────────────────────────────────────────────────────── */
if (REPORT_ONLY) {
  const d = gather();
  printReport(d, []);
  process.exit(0);
}

if (!QUIET) {
  console.log('');
  console.log(`季度体检（${WRITE ? '写盘模式' : 'dry-run'}${RENDER ? ' + 渲染' : ''}）`);
  console.log('依赖顺序：specs → [render] → dna-raw → dna-clean → data → prompts → provenance → 闸门');
  console.log('');
}

const results = [];
for (const s of STEPS) {
  /* dry-run 与生成步骤：
   * 不跑（它们会写盘），但显式标出"需要跑"，而不是静默略过 ——
   * 静默略过会让报告看起来"全过"，而实际上产物可能是旧的。 */
  if (s.kind === 'gen' && !WRITE) {
    if (!QUIET) console.log(`· ${s.label.padEnd(26)} 跳过（dry-run；产物：${s.writes.join(', ')}）`);
    results.push({ ...s, skipped: 'dry-run' });
    continue;
  }
  if (s.kind === 'slow' && !RENDER && !WRITE) {
    if (!QUIET) console.log(`· ${s.label.padEnd(26)} 跳过（需要 --render）`);
    results.push({ ...s, skipped: '未开 --render' });
    continue;
  }
  if (!QUIET) process.stdout.write(`  ${s.label.padEnd(26)} … `);
  const r = runStep(s);
  if (!QUIET) console.log(r.code === 0 ? '✓' : `✗ exit ${r.code}`);
  results.push(r);
}

const d = gather();
const failed = printReport(d, results);

/* 报告落盘：季度体检要留档，否则"上一季什么状态"没法对比。 */
if (WRITE) {
  const dir = join(ROOT, 'deliverables/77-quarters');
  mkdirSync(dir, { recursive: true });
  const stamp = new Date().toISOString().slice(0, 10);
  const out = join(dir, `${stamp}.md`);
  const md = [
    `# 季度体检 ${stamp}`,
    '',
    '```',
    `规模：${d.cases} 案 / ${d.built} 已建 / ${d.shots} 张截图`,
    `闸门：${d.failZero}/${d.cases} FAIL=0，合计 ${d.failTotal} 条 FAIL${d.failCases && d.failCases.length ? '（' + d.failCases.join(' ') + '）' : ''}`,
    `分布：暖浅 ${d.warm}/${d.cases} · 中间明度 ${d.midLight} · 亮底紫 ${d.purple} · 很安静 ${d.quiet} · 少货少图 ${d.lowPhoto}`,
    `提示词：${d.promptLen} 份 / 行业词 ${d.sceneTerms} 个`,
    '```',
    '',
    failed.length ? `**${failed.length} 步失败**` : '**全部通过**',
    '',
  ].join('\n');
  writeFileSync(out, md, 'utf8');
  console.log(`报告已写入 ${out}`);
}

process.exit(failed.length ? 1 : 0);
