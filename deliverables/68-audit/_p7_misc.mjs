// _p7_misc.mjs — repo size projection + contradictory-numbers sample
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const GIT = 'D:\\Git\\cmd\\git.exe';
const ROOT = 'D:\\Web\\style';
const git = (a) => execFileSync(GIT, a, { cwd: ROOT, maxBuffer: 1 << 29, encoding: 'utf8' });
const split = (s) => s.split('\0').filter(Boolean);

const tracked = split(git(['ls-files', '-z']));
const untracked = split(git(['ls-files', '--others', '--exclude-standard', '-z']));
const ignored = split(git(['ls-files', '--others', '--ignored', '--exclude-standard', '-z']));

const size = (p) => {
  try {
    return fs.statSync(path.join(ROOT, p)).size;
  } catch {
    return 0;
  }
};
const sum = (arr) => arr.reduce((a, p) => a + size(p), 0);
const MB = (b) => +(b / 1048576).toFixed(1);

// current committed content size (working tree of tracked files)
const trackedBytes = sum(tracked);
const untrackedBytes = sum(untracked);
// .git on disk
let gitDirBytes = 0;
const walk = (d) => {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const f = path.join(d, e.name);
    if (e.isDirectory()) walk(f);
    else gitDirBytes += fs.statSync(f).size;
  }
};
walk(path.join(ROOT, '.git'));

// largest untracked
const big = untracked
  .map((p) => ({ p, b: size(p) }))
  .sort((a, b) => b.b - a.b)
  .slice(0, 20);

const over5 = untracked.filter((p) => size(p) > 5 * 1024 * 1024);
const over10 = untracked.filter((p) => size(p) > 10 * 1024 * 1024);
const over10Ignored = ignored.filter((p) => size(p) > 10 * 1024 * 1024);

// ---- contradictory numbers: pick recurring claim strings and collect values ----
const trackedMd = tracked.filter((p) => p.toLowerCase().endsWith('.md'));
const claims = [
  { id: 'color-count', re: /(\d[\d,]{2,6})\s*种颜色/g, label: '颜色种类数' },
  { id: 'fail0', re: /FAIL\s*=\s*(\d+)/g, label: 'FAIL 计数' },
  { id: 'img272', re: /(\d+)\s*张(?:唯一)?图/g, label: '图片张数' },
  { id: 'navlink', re: /(\d+)\/30\s*(?:的)?(?:案)?首屏没有导航/g, label: '无导航案数' },
  { id: 'radius', re: /(\d+)\/30\s*=\s*([\d.]+)%/g, label: 'n/30 占比' },
];
const found = {};
for (const c of claims) found[c.id] = [];
for (const md of trackedMd) {
  let t;
  try {
    t = fs.readFileSync(path.join(ROOT, md), 'utf8');
  } catch {
    continue;
  }
  for (const c of claims) {
    for (const m of t.matchAll(c.re)) {
      found[c.id].push({ md, value: m[0].slice(0, 60).trim(), num: m[1] });
    }
  }
}

// group color-count by value
const colorVals = {};
for (const f of found['color-count']) {
  const n = f.num.replace(/,/g, '');
  (colorVals[n] = colorVals[n] ?? []).push(f.md);
}

const out = {
  generatedAt: new Date().toISOString(),
  head: git(['rev-parse', 'HEAD']).trim(),
  sizes: {
    trackedWorkingTreeMB: MB(trackedBytes),
    untrackedMB: MB(untrackedBytes),
    gitDirMB: MB(gitDirBytes),
    repoTotalWorkingTreeMB: MB(trackedBytes + untrackedBytes),
  },
  countObjects: git(['count-objects', '-vH']).trim(),
  big: big.map((x) => ({ mb: MB(x.b), path: x.p })),
  over5MB: over5.length,
  over10MB: over10.length,
  over10MBIgnored: over10Ignored.length,
  over10MBIgnoredSample: over10Ignored.slice(0, 10).map((p) => ({ mb: MB(size(p)), path: p })),
  colorCounts: Object.fromEntries(
    Object.entries(colorVals)
      .sort((a, b) => b[1].length - a[1].length)
      .map(([k, v]) => [k, { count: v.length, reports: [...new Set(v)].slice(0, 4) }])
  ),
  failCounts: Object.fromEntries(
    Object.entries(
      found['fail0'].reduce((acc, f) => {
        (acc[f.num] = acc[f.num] ?? []).push(f.md);
        return acc;
      }, {})
    )
      .sort((a, b) => b[1].length - a[1].length)
      .map(([k, v]) => [k, { count: v.length, reports: [...new Set(v)].slice(0, 4) }])
  ),
};

fs.writeFileSync(path.join(ROOT, 'deliverables/68-audit/_p7_misc.json'), JSON.stringify(out, null, 2));
console.log(JSON.stringify(out.sizes, null, 2));
console.log('over5MB', out.over5MB, 'over10MB', out.over10MB, 'over10MBignored', out.over10MBIgnored);
console.log('colorCounts', JSON.stringify(out.colorCounts, null, 1).slice(0, 1500));
console.log('failCounts', JSON.stringify(out.failCounts, null, 1).slice(0, 1200));
