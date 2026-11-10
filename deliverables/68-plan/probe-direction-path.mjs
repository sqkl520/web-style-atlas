// Probe 7: prove the direction.json auto-allow lookup is inert for per-scheme files.
// We do NOT touch prototypes/. We build a throwaway page + a direction.json at the exact
// path draw.mjs/notes imply (outDir/../.taste-skill/direction.json) and one at the path
// inspect.mjs actually probes, then report which one inspect reads.
import { mkdirSync, writeFileSync, readFileSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const TMP = 'deliverables/68-plan/probe-out/dirtest';
rmSync(TMP, { recursive: true, force: true });
mkdirSync(join(TMP, 'site'), { recursive: true });

// a minimal page that WILL trip `hairline` (a 1px-bordered 400px wide div at rest)
writeFileSync(join(TMP, 'site', 'index.html'), `<!doctype html><meta charset=utf-8>
<style>
  body{margin:0;background:#fff;color:#111;font:16px/1.5 Georgia,serif}
  .rule{width:600px;height:120px;border-top:1px solid #111}
  h1{font-size:64px;margin:0;padding:40px}
</style>
<h1>A headline on the first screen</h1>
<div class="rule">text under a thin rule</div>
`);

// Place the declaration where a per-scheme run would naturally put it:
const perScheme = join(TMP, 'site', '.taste-skill');
mkdirSync(perScheme, { recursive: true });
writeFileSync(join(perScheme, 'direction.json'), JSON.stringify({ allow: ['hairline'], note: 'probe: per-scheme declaration' }, null, 1));

// And the two paths inspect.mjs actually probes when cwd=repo root and --out=<site>/.inspect:
const outDir = join(TMP, 'site', '.inspect');
console.log('inspect.mjs probes exactly these two paths:');
console.log(`  1) .taste-skill/direction.json            exists=${existsSync('.taste-skill/direction.json')}`);
console.log(`  2) ${outDir}/../direction.json  exists=${existsSync(join(outDir, '..', 'direction.json'))}`);
console.log(`\nthe declaration a per-scheme run writes:`);
console.log(`  ${perScheme}/direction.json  exists=${existsSync(join(perScheme, 'direction.json'))}`);
console.log('\n=> neither probed path equals the written path. The declaration cannot be read.');
