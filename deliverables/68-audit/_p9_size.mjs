// _p9_size.mjs — estimate what `git add deliverables/` would add to .git
// Uses zlib deflate as a proxy for git's loose/pack compression (no repo writes).
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const GIT = 'D:\\Git\\cmd\\git.exe';
const ROOT = 'D:\\Web\\style';
const git = (a) => execFileSync(GIT, a, { cwd: ROOT, maxBuffer: 1 << 29, encoding: 'utf8' });
const split = (s) => s.split('\0').filter(Boolean);

const untracked = split(git(['ls-files', '--others', '--exclude-standard', '-z']));
const deliv = untracked.filter((p) => p.startsWith('deliverables/'));

let raw = 0;
let deflated = 0;
let unreadable = 0;
for (const p of deliv) {
  const abs = path.join(ROOT, p);
  try {
    const b = fs.readFileSync(abs);
    raw += b.length;
    deflated += zlib.deflateRawSync(b, { level: 6 }).length;
  } catch {
    unreadable++;
  }
}

// existing .git on disk
let gitDir = 0;
const walk = (d) => {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const f = path.join(d, e.name);
    if (e.isDirectory()) walk(f);
    else gitDir += fs.statSync(f).size;
  }
};
walk(path.join(ROOT, '.git'));

const MB = (b) => +(b / 1048576).toFixed(1);

// where else does git get ignore rules?
const cfg = {
  'info/exclude': fs.existsSync(path.join(ROOT, '.git/info/exclude'))
    ? fs.readFileSync(path.join(ROOT, '.git/info/exclude'), 'utf8').split('\n').filter((l) => l.trim() && !l.startsWith('#')).length
    : 'missing',
  coreExcludesFile: (() => {
    try {
      return git(['config', '--get', 'core.excludesFile']).trim() || '(unset)';
    } catch {
      return '(unset)';
    }
  })(),
  ignoreCase: (() => {
    try {
      return git(['config', '--get', 'core.ignoreCase']).trim();
    } catch {
      return '(unset)';
    }
  })(),
};

const out = {
  generatedAt: new Date().toISOString(),
  head: git(['rev-parse', 'HEAD']).trim(),
  route2: {
    filesToAdd: deliv.length,
    rawBytes: raw,
    rawMB: MB(raw),
    deflatedBytes: deflated,
    deflatedMB: MB(deflated),
    unreadable,
    ratio: +(raw / Math.max(deflated, 1)).toFixed(2),
  },
  gitDirNowMB: MB(gitDir),
  gitDirAfterEstimateMB: MB(gitDir + deflated),
  ignoreSources: cfg,
  countObjects: git(['count-objects', '-vH']).trim(),
};

fs.writeFileSync(path.join(ROOT, 'deliverables/68-audit/_p9_size.json'), JSON.stringify(out, null, 2));
console.log(JSON.stringify(out, null, 2));
