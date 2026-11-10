// _p3_refs2.mjs — rigorous citation analysis with a full existence universe.
// Universe = tracked ∪ untracked(non-ignored) ∪ ignored  -- so a reference to a
// still-present-but-ignored scratch script is NOT counted as a dead link.
// READ-ONLY.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const GIT = 'D:\\Git\\cmd\\git.exe';
const ROOT = 'D:\\Web\\style';

const git = (a) => execFileSync(GIT, a, { cwd: ROOT, maxBuffer: 1024 * 1024 * 512, encoding: 'utf8' });
const split = (s) => s.split('\0').filter(Boolean);

const tracked = split(git(['ls-files', '-z']));
const untracked = split(git(['ls-files', '--others', '--exclude-standard', '-z']));
const ignored = split(git(['ls-files', '--others', '--ignored', '--exclude-standard', '-z']));

const trackedSet = new Set(tracked);
const untrackedSet = new Set(untracked);
const ignoredSet = new Set(ignored);

const allFiles = [...tracked, ...untracked, ...ignored];
const byBase = new Map(); // basename -> {tracked:[],untracked:[],ignored:[]}
for (const p of allFiles) {
  const b = path.basename(p);
  let e = byBase.get(b);
  if (!e) byBase.set(b, (e = { tracked: [], untracked: [], ignored: [] }));
  if (trackedSet.has(p)) e.tracked.push(p);
  else if (untrackedSet.has(p)) e.untracked.push(p);
  else e.ignored.push(p);
}

// Reports: every tracked .md (superset of the 147 deliverables reports)
const trackedMd = tracked.filter((p) => p.toLowerCase().endsWith('.md'));

const RE_MJS = /[A-Za-z0-9_\-./\\]*[A-Za-z0-9_\-]\.mjs/g;
const norm = (s) => s.replace(/\\/g, '/').replace(/^\.\//, '');

const status = (p) => (trackedSet.has(p) ? 'tracked' : untrackedSet.has(p) ? 'untracked' : ignoredSet.has(p) ? 'ignored' : 'missing');

const cited = new Map(); // resolved path -> Set(md)
const rows = []; // every citation
const dead = []; // token resolved to nothing anywhere
const deadMd = new Set();

// For "uncited probe" accounting we must not credit an untracked copy just because
// a same-named *ignored* or *tracked* copy exists. Track ambiguity.
let ambiguousBasenameCitations = 0;

for (const md of trackedMd) {
  let text;
  try {
    text = fs.readFileSync(path.join(ROOT, md), 'utf8');
  } catch {
    continue;
  }
  const seen = new Set();
  for (const m of text.matchAll(RE_MJS)) {
    let token = norm(m[0]);
    // strip any leading glob-ish or punctuation junk
    token = token.replace(/^[^A-Za-z0-9_.]+/, '');
    if (!token || seen.has(token)) continue;
    seen.add(token);
    const base = path.basename(token);

    let resolvedList = [];
    let how = null;

    if (token.includes('/')) {
      if (status(token) !== 'missing') {
        resolvedList = [token];
        how = 'exact-path';
      } else {
        const suffix = allFiles.filter((p) => p === token || p.endsWith('/' + token));
        if (suffix.length) {
          resolvedList = suffix;
          how = 'path-suffix';
        }
      }
    } else {
      const e = byBase.get(base);
      if (e) {
        resolvedList = [...e.tracked, ...e.untracked, ...e.ignored];
        how = 'basename';
        if (e.untracked.length + e.ignored.length + e.tracked.length > 1) ambiguousBasenameCitations++;
      }
    }

    if (!resolvedList.length) {
      dead.push({ md, token });
      deadMd.add(md);
      rows.push({ md, token, how: 'none', kinds: [] });
      continue;
    }
    const kinds = resolvedList.map(status);
    for (const p of resolvedList) {
      if (!cited.has(p)) cited.set(p, new Set());
      cited.get(p).add(md);
    }
    rows.push({ md, token, how, kinds, resolved: resolvedList.slice(0, 8) });
  }
}

const untrackedMjs = untracked.filter((p) => p.toLowerCase().endsWith('.mjs'));
const trackedMjs = tracked.filter((p) => p.toLowerCase().endsWith('.mjs'));
const ignoredMjs = ignored.filter((p) => p.toLowerCase().endsWith('.mjs'));

const untrackedMjsCited = untrackedMjs.filter((p) => cited.has(p));

// strict: only count as cited when the citation was path-exact/suffix AND uniquely identifies
// this file (no same-basename sibling), OR basename unique in the whole universe.
const basenameCount = (p) => {
  const e = byBase.get(path.basename(p));
  return e ? e.tracked.length + e.untracked.length + e.ignored.length : 0;
};
const untrackedMjsCitedStrict = untrackedMjsCited.filter((p) => {
  const cits = rows.filter((r) => r.resolved && r.resolved.includes(p));
  return cits.some((r) => r.how !== 'basename' || basenameCount(p) === 1);
});
const untrackedMjsUncited = untrackedMjs.filter((p) => !cited.has(p));

const out = {
  generatedAt: new Date().toISOString(),
  head: git(['rev-parse', 'HEAD']).trim(),
  universe: {
    tracked: tracked.length,
    untracked: untracked.length,
    ignored: ignored.length,
    total: allFiles.length,
  },
  reports: {
    trackedMdTotal: trackedMd.length,
    trackedDelivMd: trackedMd.filter((p) => p.startsWith('deliverables/')).length,
    reportsWithAnyCitation: new Set(rows.filter((r) => r.kinds.length).map((r) => r.md)).size,
    reportsWithNoCitation: trackedMd.length - new Set(rows.map((r) => r.md)).size,
  },
  probes: {
    untrackedMjs: untrackedMjs.length,
    trackedMjs: trackedMjs.length,
    ignoredMjs: ignoredMjs.length,
    untrackedMjs_cited_optimistic: untrackedMjsCited.length,
    untrackedMjs_cited_strict: untrackedMjsCitedStrict.length,
    untrackedMjs_uncited: untrackedMjsUncited.length,
    ambiguousBasenameCitations,
  },
  dead: {
    tokens: dead.length,
    distinctTokens: new Set(dead.map((d) => d.token)).size,
    reports: deadMd.size,
  },
  headline: {
    citedProbes: untrackedMjsCited.length,
    uncitedProbes: untrackedMjsUncited.length,
    deadLinks: new Set(dead.map((d) => d.token)).size,
    citedProbesStrict: untrackedMjsCitedStrict.length,
  },
  citedDetail: untrackedMjsCited
    .map((p) => ({
      path: p,
      basenameCopies: basenameCount(p),
      citedBy: [...cited.get(p)].sort(),
    }))
    .sort((a, b) => a.path.localeCompare(b.path)),
  uncitedDetail: untrackedMjsUncited.sort(),
  deadDetail: [...new Set(dead.map((d) => d.token))].sort().map((t) => ({
    token: t,
    count: dead.filter((d) => d.token === t).length,
    reports: [...new Set(dead.filter((d) => d.token === t).map((d) => d.md))].slice(0, 5),
  })),
  deadByReport: [...new Set(dead.map((d) => d.md))].sort().map((md) => ({
    md,
    dead: [...new Set(dead.filter((d) => d.md === md).map((d) => d.token))].length,
    samples: [...new Set(dead.filter((d) => d.md === md).map((d) => d.token))].slice(0, 5),
  })),
};

fs.writeFileSync(path.join(ROOT, 'deliverables/68-audit/_p3_refs2.json'), JSON.stringify(out, null, 2));
console.log('universe', JSON.stringify(out.universe));
console.log('reports', JSON.stringify(out.reports));
console.log('probes', JSON.stringify(out.probes, null, 2));
console.log('dead', JSON.stringify(out.dead, null, 2));
