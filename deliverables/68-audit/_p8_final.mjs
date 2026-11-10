// _p8_final.mjs — final consolidated measurement snapshot
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

// porcelain counts in both modes
const porNormal = git(['status', '--porcelain']).split('\n').filter(Boolean);
const porAll = git(['status', '--porcelain', '-uall']).split('\n').filter(Boolean);
const porIgnored = git(['status', '--porcelain', '--ignored']).split('\n').filter(Boolean);

// directory grouping, deliverables 2nd-level, both modes
function group(pairs) {
  const m = new Map();
  for (const p of pairs) {
    const s = p.split('/');
    const key = s.length > 1 ? s.slice(0, 2).join('/') : '(root)';
    const e = m.get(key) ?? { count: 0, bytes: 0 };
    e.count++;
    e.bytes += size(p);
    m.set(key, e);
  }
  return [...m.entries()].sort((a, b) => b[1].count - a[1].count);
}

// Lead's grouping was over porcelain lines; replicate it (dirs count as 1 line)
const normalGrouped = group(
  porNormal
    .filter((l) => l.startsWith('?? '))
    .map((l) => l.slice(3).replace(/\/$/, '').replace(/^"|"$/g, ''))
);

const allGrouped = group(untracked);

// untracked deliverables md (reports that would be added)
const untrackedMd = untracked.filter((p) => p.toLowerCase().endsWith('.md'));
const untrackedDelivMd = untrackedMd.filter((p) => p.startsWith('deliverables/'));

// duplicate basenames among untracked mjs
const untrackedMjs = untracked.filter((p) => p.toLowerCase().endsWith('.mjs'));
const baseCount = new Map();
for (const p of untrackedMjs) {
  const b = path.basename(p);
  baseCount.set(b, (baseCount.get(b) ?? 0) + 1);
}
const dupBases = [...baseCount.entries()].filter(([, c]) => c > 1);

const out = {
  generatedAt: new Date().toISOString(),
  head: git(['rev-parse', 'HEAD']).trim(),
  porcelain: {
    normalLines: porNormal.length,
    normalUntracked: porNormal.filter((l) => l.startsWith('?? ')).length,
    normalDirsCollapsed: porNormal.filter((l) => /^\?\? .*\/$/.test(l)).length,
    allLines: porAll.length,
    ignoredLines: porIgnored.filter((l) => l.startsWith('!! ')).length,
    untrackedLinesIgnoredMode: porIgnored.filter((l) => l.startsWith('?? ')).length,
  },
  files: {
    tracked: tracked.length,
    untracked: untracked.length,
    ignored: ignored.length,
  },
  bytes: {
    tracked: tracked.reduce((a, p) => a + size(p), 0),
    untracked: untracked.reduce((a, p) => a + size(p), 0),
  },
  deliv: {
    trackedAll: tracked.filter((p) => p.startsWith('deliverables/')).length,
    trackedMd: tracked.filter((p) => p.startsWith('deliverables/') && p.toLowerCase().endsWith('.md')).length,
    trackedNonMd: tracked.filter((p) => p.startsWith('deliverables/') && !p.toLowerCase().endsWith('.md')).length,
    untrackedAll: untracked.filter((p) => p.startsWith('deliverables/')).length,
    untrackedMd: untrackedDelivMd.length,
  },
  mjs: {
    untracked: untrackedMjs.length,
    distinctBasenames: baseCount.size,
    duplicateBasenames: dupBases.length,
    redundantCopies: untrackedMjs.length - baseCount.size,
    topDup: dupBases.sort((a, b) => b[1] - a[1]).slice(0, 12).map(([b, c]) => ({ basename: b, copies: c })),
  },
  normalGrouped: normalGrouped.map(([d, v]) => ({ dir: d, count: v.count })),
  allGrouped: allGrouped.map(([d, v]) => ({ dir: d, count: v.count, mb: +(v.bytes / 1048576).toFixed(1) })),
};

fs.writeFileSync(path.join(ROOT, 'deliverables/68-audit/_p8_final.json'), JSON.stringify(out, null, 2));
console.log(JSON.stringify(out.porcelain, null, 2));
console.log(JSON.stringify(out.files, null, 2));
console.log('trackedMB', (out.bytes.tracked / 1048576).toFixed(1), 'untrackedMB', (out.bytes.untracked / 1048576).toFixed(1));
console.log('deliv', JSON.stringify(out.deliv));
console.log('mjs', JSON.stringify(out.mjs, null, 1));
console.log('--- Lead-style grouping (-unormal) top 12 ---');
out.normalGrouped.slice(0, 12).forEach((g) => console.log(String(g.count).padStart(5), g.dir));
console.log('--- true grouping (-uall) top 12 ---');
out.allGrouped.slice(0, 12).forEach((g) => console.log(String(g.count).padStart(5), String(g.mb).padStart(7) + 'MB', g.dir));
