// _p1_inventory.mjs — repo hygiene audit: inventory of untracked files
// READ-ONLY. Writes only its own JSON output next to itself.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const GIT = 'D:\\Git\\cmd\\git.exe';
const ROOT = 'D:\\Web\\style';

function git(args, opts = {}) {
  return execFileSync(GIT, args, {
    cwd: ROOT,
    maxBuffer: 1024 * 1024 * 512,
    encoding: opts.encoding ?? 'utf8',
    ...opts,
  });
}

// untracked files honouring .gitignore (so: exactly what a `git add .` would pick up)
const othersRaw = git(['ls-files', '--others', '--exclude-standard', '-z']);
const others = othersRaw.split('\0').filter(Boolean);

// ignored files, for comparison
const ignoredRaw = git(['ls-files', '--others', '--ignored', '--exclude-standard', '-z']);
const ignored = ignoredRaw.split('\0').filter(Boolean);

// tracked files
const trackedRaw = git(['ls-files', '-z']);
const tracked = trackedRaw.split('\0').filter(Boolean);

function stat(p) {
  try {
    return fs.lstatSync(path.join(ROOT, p));
  } catch {
    return null;
  }
}

const EXT_GROUP = {
  '.mjs': 'mjs-probe',
  '.js': 'js',
  '.cjs': 'js',
  '.json': 'json',
  '.jpg': 'image',
  '.jpeg': 'image',
  '.png': 'image',
  '.webp': 'image',
  '.gif': 'image',
  '.svg': 'image',
  '.txt': 'text-log',
  '.log': 'text-log',
  '.md': 'markdown',
  '.html': 'html',
  '.css': 'css',
  '.py': 'py',
  '.ps1': 'ps1',
  '.sh': 'sh',
  '.yml': 'yaml',
  '.yaml': 'yaml',
  '.woff2': 'font',
  '.woff': 'font',
  '.otf': 'font',
  '.ttf': 'font',
  '.pdf': 'pdf',
  '.zip': 'archive',
};

function groupOf(p) {
  const ext = path.extname(p).toLowerCase();
  return EXT_GROUP[ext] ?? (ext ? `other:${ext}` : 'noext');
}

function tally(list) {
  const byGroup = new Map();
  let totalBytes = 0;
  let missing = 0;
  const files = [];
  for (const p of list) {
    const st = stat(p);
    const bytes = st ? st.size : 0;
    if (!st) missing++;
    totalBytes += bytes;
    const g = groupOf(p);
    const cur = byGroup.get(g) ?? { count: 0, bytes: 0 };
    cur.count++;
    cur.bytes += bytes;
    byGroup.set(g, cur);
    files.push({ path: p, bytes, group: g });
  }
  return { byGroup, totalBytes, missing, files };
}

const untrackedTally = tally(others);
const trackedTally = tally(tracked);
const ignoredTally = tally(ignored);

// top 20 largest untracked
const top20 = [...untrackedTally.files].sort((a, b) => b.bytes - a.bytes).slice(0, 20);

// per-directory rollup of untracked
const byDir = new Map();
for (const f of untrackedTally.files) {
  const parts = f.path.split('/');
  const dir = parts.length > 1 ? parts.slice(0, 2).join('/') : '(root)';
  const cur = byDir.get(dir) ?? { count: 0, bytes: 0 };
  cur.count++;
  cur.bytes += f.bytes;
  byDir.set(dir, cur);
}
const dirRollup = [...byDir.entries()]
  .sort((a, b) => b[1].count - a[1].count)
  .map(([dir, v]) => ({ dir, ...v }));

// deliverables-only breakdown
const delivUntracked = untrackedTally.files.filter((f) => f.path.startsWith('deliverables/'));
const delivBySubdir = new Map();
for (const f of delivUntracked) {
  const parts = f.path.split('/');
  const sub = parts.length > 2 ? parts.slice(0, 2).join('/') : 'deliverables/(root)';
  const cur = delivBySubdir.get(sub) ?? { count: 0, bytes: 0 };
  cur.count++;
  cur.bytes += f.bytes;
  delivBySubdir.set(sub, cur);
}

const out = {
  generatedAt: new Date().toISOString(),
  head: git(['rev-parse', 'HEAD']).trim(),
  counts: {
    untrackedFiles: others.length,
    ignoredFiles: ignored.length,
    trackedFiles: tracked.length,
  },
  untracked: {
    totalBytes: untrackedTally.totalBytes,
    missing: untrackedTally.missing,
    byGroup: Object.fromEntries([...untrackedTally.byGroup.entries()].sort((a, b) => b[1].count - a[1].count)),
    top20,
    dirRollup,
    delivBySubdir: Object.fromEntries([...delivBySubdir.entries()].sort((a, b) => b[1].count - a[1].count)),
  },
  tracked: {
    totalBytes: trackedTally.totalBytes,
    byGroup: Object.fromEntries([...trackedTally.byGroup.entries()].sort((a, b) => b[1].count - a[1].count)),
    delivMdCount: tracked.filter((p) => p.startsWith('deliverables/') && p.endsWith('.md')).length,
    delivAllCount: tracked.filter((p) => p.startsWith('deliverables/')).length,
  },
  ignored: {
    totalBytes: ignoredTally.totalBytes,
    byGroup: Object.fromEntries([...ignoredTally.byGroup.entries()].sort((a, b) => b[1].count - a[1].count)),
    top20: [...ignoredTally.files].sort((a, b) => b.bytes - a.bytes).slice(0, 20),
  },
};

fs.writeFileSync(path.join(ROOT, 'deliverables/68-audit/_p1_inventory.json'), JSON.stringify(out, null, 2));
console.log('untrackedFiles', out.counts.untrackedFiles);
console.log('ignoredFiles', out.counts.ignoredFiles);
console.log('trackedFiles', out.counts.trackedFiles);
console.log('untrackedBytes', out.untracked.totalBytes);
console.log('trackedBytes', out.tracked.totalBytes);
console.log('ignoredBytes', out.ignored.totalBytes);
console.log('--- untracked by group ---');
for (const [g, v] of Object.entries(out.untracked.byGroup)) console.log(g, v.count, v.bytes);
