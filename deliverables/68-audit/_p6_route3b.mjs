// _p5_route3.mjs
// Replicate the REAL repo's path skeleton as empty files in a throwaway repo, apply the
// PROPOSED .gitignore, and measure exactly what would survive `git add deliverables/`.
// The real .gitignore is never modified. READ-ONLY w.r.t. the real repo.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const GIT = 'D:\\Git\\cmd\\git.exe';
const ROOT = 'D:\\Web\\style';

const gitReal = (a) => execFileSync(GIT, a, { cwd: ROOT, maxBuffer: 1 << 29, encoding: 'utf8' });
const split = (s) => s.split('\0').filter(Boolean);

const tracked = split(gitReal(['ls-files', '-z']));
const untracked = split(gitReal(['ls-files', '--others', '--exclude-standard', '-z']));
const ignored = split(gitReal(['ls-files', '--others', '--ignored', '--exclude-standard', '-z']));

// size manifest from the real working tree
const sizeOf = new Map();
for (const p of [...tracked, ...untracked, ...ignored]) {
  if (!p.startsWith('deliverables/')) continue;
  try {
    sizeOf.set(p, fs.statSync(path.join(ROOT, p)).size);
  } catch {}
}

const PROPOSED = `# ══════════════════════════════════════════════════════════════
# 审查/执行 Agent 的过程产物（探针、中间 JSON、截图、日志）
# 变体 B：保留 *.mjs 探针（报告点名的复现脚本不丢），只排除体积与中间物
# ══════════════════════════════════════════════════════════════

# 1) 一次性探针脚本与中间数据（顶层散落）
deliverables/*/*.json
deliverables/*/*.txt
deliverables/*/*.log

# 2) Agent 的私有过程目录（_out / _lab / _cut / _orig / _v_out / _rt_out ...）
deliverables/*/_*/

# 3) 截图与快照目录（体积主体：约占未跟踪总量 2/3）
deliverables/*/shots*/
deliverables/*/snap/
deliverables/*/tpl-audit/

# 4) 冻结副本 / 提示词快照 / 试验台
deliverables/*/frozen*/
deliverables/*/prompts*/
deliverables/*/lab/
deliverables/*/baseline/
deliverables/*/tmp/
deliverables/*/trials/
deliverables/*/impl/
deliverables/*/r2/

# 5) 复刻站与大数据目录（deliverables/63-test/replica 单目录 115MB，含 8.7MB OTF）
deliverables/*/replica/
# 写 data/* 而不是 data/：目录被整体排除后 git 不再向下遍历，
# 任何 !data/xxx 的重包含都会失效（本仓库 internship-portal 已踩过这个坑）
deliverables/*/data/*
!deliverables/*/data/*.md

# 6) 唯一被提交的"执行证据"目录：豁免
#    deliverables/62-exec/tpl-integration/ 下有 11 个被提交的 .mjs + 12 张最终截图
#    （deliverables/ 里仅有的非 md 入库文件全在这里），必须留在库里
!deliverables/62-exec/tpl-integration/
!deliverables/62-exec/tpl-integration/**
`;

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'route3-'));
execFileSync(GIT, ['init', '-q'], { cwd: tmp });
// CRITICAL: start from the REAL, currently-effective .gitignore, then append the proposal.
// Otherwise already-ignored scratch (59-scratch/99-scratch/tool-runs) wrongly shows as surviving.
const REAL_IGNORE = fs.readFileSync(path.join(ROOT, '.gitignore'), 'utf8');
fs.writeFileSync(path.join(tmp, '.gitignore'), REAL_IGNORE + '\n' + PROPOSED, 'utf8');

// replicate skeleton for deliverables/ paths only
let made = 0;
for (const p of sizeOf.keys()) {
  const abs = path.join(tmp, p);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, '');
  made++;
}

// Which deliverables paths would still be addable?
const statusOut = execFileSync(GIT, ['status', '--porcelain', '-uall'], {
  cwd: tmp,
  maxBuffer: 1 << 29,
  encoding: 'utf8',
});
const survivors = statusOut
  .split('\n')
  .map((l) => l.trim())
  .filter((l) => l.startsWith('?? '))
  .map((l) => l.slice(3).replace(/^"|"$/g, ''));

const survSet = new Set(survivors);
const groupOf = (p) => {
  const e = path.extname(p).toLowerCase();
  if (e === '.md') return 'markdown';
  if (e === '.mjs') return 'mjs';
  if (['.png', '.jpg', '.jpeg', '.webp', '.gif', '.avif'].includes(e)) return 'image';
  if (e === '.json') return 'json';
  if (['.txt', '.log'].includes(e)) return 'text';
  if (['.otf', '.woff', '.woff2', '.ttf'].includes(e)) return 'font';
  if (['.html', '.css', '.js'].includes(e)) return 'web';
  return e || 'noext';
};

const summarize = (list) => {
  const by = {};
  let bytes = 0;
  for (const p of list) {
    const g = groupOf(p);
    const s = sizeOf.get(p) ?? 0;
    by[g] = by[g] ?? { count: 0, bytes: 0 };
    by[g].count++;
    by[g].bytes += s;
    bytes += s;
  }
  return { count: list.length, bytes, by };
};

// baseline: what `git add deliverables/` would take TODAY (untracked, non-ignored)
const todayUntrackedDeliv = untracked.filter((p) => p.startsWith('deliverables/'));
// after proposed rules: survivors that are also today-untracked
const survivorsUntracked = survivors.filter((p) => !tracked.includes(p));

const before = summarize(todayUntrackedDeliv);
const after = summarize(survivorsUntracked);

// which mjs survive (should be the tracked tpl-integration set + none new)
const survMjs = survivorsUntracked.filter((p) => p.endsWith('.mjs'));

// how many CITED probes would still be present (survive)?
const refs = JSON.parse(fs.readFileSync(path.join(ROOT, 'deliverables/68-audit/_p3_refs2.json'), 'utf8'));
const citedPaths = refs.citedDetail.map((c) => c.path);
const citedSurviving = citedPaths.filter((p) => survSet.has(p));
const citedLost = citedPaths.filter((p) => !survSet.has(p));

const out = {
  generatedAt: new Date().toISOString(),
  tmpRepo: tmp,
  skeletonFiles: made,
  proposedRules: PROPOSED,
  before,
  after,
  savedBytes: before.bytes - after.bytes,
  savedPct: ((1 - after.bytes / before.bytes) * 100).toFixed(1) + '%',
  filesIgnored: before.count - after.count,
  survivorsSample: survivorsUntracked.slice(0, 40),
  survivingMjs: survMjs,
  citedProbes: citedPaths.length,
  citedProbesKept: citedSurviving.length,
  citedProbesLost: citedLost.length,
  citedLostSample: citedLost.slice(0, 20),
};

fs.writeFileSync(path.join(ROOT, 'deliverables/68-audit/_p6_route3b.json'), JSON.stringify(out, null, 2));
console.log('skeleton', made);
console.log('BEFORE', JSON.stringify({ count: before.count, MB: (before.bytes / 1048576).toFixed(1) }));
console.log('AFTER ', JSON.stringify({ count: after.count, MB: (after.bytes / 1048576).toFixed(1) }));
console.log('saved', out.savedPct, 'filesIgnored', out.filesIgnored);
console.log('after.by', JSON.stringify(after.by, null, 1));
console.log('survivingMjs', survMjs);
console.log('cited kept/lost', citedSurviving.length, citedLost.length);
