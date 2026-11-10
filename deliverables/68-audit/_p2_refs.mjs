// _p2_refs.mjs — do the untracked .mjs probes get cited by committed .md reports?
// READ-ONLY.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const GIT = 'D:\\Git\\cmd\\git.exe';
const ROOT = 'D:\\Web\\style';

function git(args) {
  return execFileSync(GIT, args, { cwd: ROOT, maxBuffer: 1024 * 1024 * 512, encoding: 'utf8' });
}

const tracked = git(['ls-files', '-z']).split('\0').filter(Boolean);
const untracked = git(['ls-files', '--others', '--exclude-standard', '-z']).split('\0').filter(Boolean);

// The audit scope: committed markdown reports. Lead said "170 tracked md reports".
const trackedMd = tracked.filter((p) => p.toLowerCase().endsWith('.md'));
const trackedDelivMd = trackedMd.filter((p) => p.startsWith('deliverables/'));
const allTrackedDeliv = tracked.filter((p) => p.startsWith('deliverables/'));

// Untracked probes we are judging
const untrackedMjs = untracked.filter((p) => p.toLowerCase().endsWith('.mjs'));
const trackedMjs = tracked.filter((p) => p.toLowerCase().endsWith('.mjs'));

const untrackedMjsBasename = new Map(); // basename -> [paths]
for (const p of untrackedMjs) {
  const b = path.basename(p);
  if (!untrackedMjsBasename.has(b)) untrackedMjsBasename.set(b, []);
  untrackedMjsBasename.get(b).push(p);
}
const trackedMjsBasename = new Set(trackedMjs.map((p) => path.basename(p)));
const untrackedMjsPaths = new Set(untrackedMjs);

// Build a set of every tracked path (for dead-link detection)
const trackedSet = new Set(tracked);
const untrackedSet = new Set(untracked);

// Citation regexes. A filename mention looks like `_p10_gate.mjs` or path/to/x.mjs
// We capture path-ish tokens ending in .mjs
const RE_MJS = /[A-Za-z0-9_\-./\\]*[A-Za-z0-9_\-]\.mjs/g;

function normPath(raw) {
  return raw.replace(/\\/g, '/').replace(/^\.\//, '');
}

const citedUntracked = new Map(); // untracked mjs path -> Set(md)
const citedTracked = new Map();
const citations = []; // {md, token, resolvedTo, kind}
const deadLinks = []; // {md, token}

// Also collect non-mjs file references for dead-link analysis (json/png selected dirs)
const RE_ANY_DELIV = /deliverables\/[A-Za-z0-9_\-./+ ]*?\.(?:mjs|json|png|jpg|txt|csv|tsv)/g;

for (const md of trackedMd) {
  let text;
  try {
    text = fs.readFileSync(path.join(ROOT, md), 'utf8');
  } catch {
    continue;
  }
  const seen = new Set();
  for (const m of text.matchAll(RE_MJS)) {
    const raw = m[0];
    const token = normPath(raw);
    if (seen.has(token)) continue;
    seen.add(token);
    const base = path.basename(token);

    // Resolve: does this token correspond to a real file?
    let kind = null;
    let resolved = null;

    if (token.includes('/')) {
      // path-form reference
      if (trackedSet.has(token)) {
        kind = 'tracked';
        resolved = token;
      } else if (untrackedSet.has(token)) {
        kind = 'untracked';
        resolved = token;
      } else {
        // try suffix match against all known files
        const cands = [...tracked, ...untracked].filter((p) => p.endsWith('/' + token) || p === token);
        if (cands.length) {
          const t = cands.find((p) => trackedSet.has(p)) ?? cands[0];
          kind = trackedSet.has(t) ? 'tracked' : 'untracked';
          resolved = t;
        }
      }
    } else {
      // bare basename reference
      if (trackedMjsBasename.has(base)) {
        const t = trackedMjs.find((p) => path.basename(p) === base);
        kind = 'tracked';
        resolved = t;
      } else if (untrackedMjsBasename.has(base)) {
        const lst = untrackedMjsBasename.get(base);
        kind = 'untracked';
        resolved = lst[0];
        // record all same-named probes
        resolved = lst.join('|');
      }
    }

    if (kind === 'untracked') {
      for (const p of resolved.split('|')) {
        if (!citedUntracked.has(p)) citedUntracked.set(p, new Set());
        citedUntracked.get(p).add(md);
      }
    } else if (kind === 'tracked') {
      if (!citedTracked.has(resolved)) citedTracked.set(resolved, new Set());
      citedTracked.get(resolved).add(md);
    } else {
      deadLinks.push({ md, token, ext: 'mjs' });
    }
    citations.push({ md, token, kind: kind ?? 'dead', resolved });
  }
}

// Dead-link analysis over deliverables artefacts (broader net)
const deadOther = [];
for (const md of trackedMd) {
  let text;
  try {
    text = fs.readFileSync(path.join(ROOT, md), 'utf8');
  } catch {
    continue;
  }
  const seen = new Set();
  for (const m of text.matchAll(RE_ANY_DELIV)) {
    const token = normPath(m[0]).trim();
    if (seen.has(token)) continue;
    seen.add(token);
    if (token.includes('*')) continue;
    if (trackedSet.has(token) || untrackedSet.has(token)) continue;
    const cands = [...tracked, ...untracked].filter((p) => p.endsWith('/' + token) || p === token);
    if (cands.length) continue;
    deadOther.push({ md, token, ext: path.extname(token).slice(1) });
  }
}

// ---- unique-basename dedup view ----
// A basename cited by any report counts as "cited", even if duplicates exist.
const citedBasenames = new Set([...citedUntracked.keys()].map((p) => path.basename(p)));
const allUntrackedBasenames = new Set(untrackedMjs.map((p) => path.basename(p)));

const uncitedProbes = untrackedMjs.filter((p) => !citedUntracked.has(p));
const uncitedBasenames = [...allUntrackedBasenames].filter((b) => !citedBasenames.has(b)).sort();

// duplicate basenames among untracked probes (same name, many dirs)
const dupBasenames = [...untrackedMjsBasename.entries()]
  .filter(([, v]) => v.length > 1)
  .sort((a, b) => b[1].length - a[1].length)
  .map(([b, v]) => ({ basename: b, count: v.length, paths: v.slice(0, 6) }));

// Dead-link reports: distinct md files with >=1 dead mjs link
const deadMdSet = new Set(deadLinks.map((d) => d.md));
const deadOtherMdSet = new Set(deadOther.map((d) => d.md));

const out = {
  generatedAt: new Date().toISOString(),
  head: git(['rev-parse', 'HEAD']).trim(),
  scope: {
    trackedMd: trackedMd.length,
    trackedDelivMd: trackedDelivMd.length,
    allTrackedDeliv: allTrackedDeliv.length,
    trackedDelivNonMd: allTrackedDeliv.filter((p) => !p.toLowerCase().endsWith('.md')),
    untrackedMjs: untrackedMjs.length,
    trackedMjs: trackedMjs.length,
    distinctUntrackedProbeBasenames: allUntrackedBasenames.size,
  },
  headline: {
    citedProbes_files: citedUntracked.size,
    uncitedProbes_files: uncitedProbes.length,
    citedProbe_basenames: citedBasenames.size,
    uncitedProbe_basenames: uncitedBasenames.length,
    deadMjsLinks: deadLinks.length,
    deadMjsReports: deadMdSet.size,
    deadOtherLinks: deadOther.length,
    deadOtherReports: deadOtherMdSet.size,
  },
  citedUntracked: [...citedUntracked.entries()]
    .map(([p, s]) => ({ path: p, citedBy: [...s].sort() }))
    .sort((a, b) => a.path.localeCompare(b.path)),
  uncitedBasenames,
  dupBasenames,
  deadLinks,
  deadOther: deadOther.slice(0, 400),
  deadOtherByExt: deadOther.reduce((acc, d) => {
    acc[d.ext] = (acc[d.ext] ?? 0) + 1;
    return acc;
  }, {}),
};

fs.writeFileSync(path.join(ROOT, 'deliverables/68-audit/_p2_refs.json'), JSON.stringify(out, null, 2));
console.log(JSON.stringify(out.headline, null, 2));
console.log('scope', JSON.stringify(out.scope, null, 2).slice(0, 1200));
