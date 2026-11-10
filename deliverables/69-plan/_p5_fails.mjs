// 探针 5：D 的 FAIL 逐条定性。**现在重渲染** 4 个不达标案（不读历史 .inspect），
// 把每个 FAIL 追到源码行，并区分 runtime 判据命中 vs static lint 命中。
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { ROOT, out } from './_lib.mjs';

const NODE = process.execPath;
const TASTE = join(ROOT, 'tools/taste-skill/skills/taste-skill/scripts');
const dirs = ['S07-slate-ink-contents', 'S08-amber-overprint-lightbox', 'S13-blind-debossed-dispatch', 'S21-interlocking-release-book'];

const summary = {};
for (const d of dirs) {
  const id = d.slice(0, 3);
  const od = join(ROOT, 'deliverables/69-plan/inspect-live-' + id);
  let code = 0, stderr = '';
  try {
    execFileSync(NODE, [join(TASTE, 'inspect.mjs'), join(ROOT, 'prototypes', d, 'index.html'),
      '--out', od, '--widths', '1440,768,390'],
    { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'ignore', 'pipe'] });
  } catch (e) { code = e.status; stderr = String(e.stderr || '').slice(0, 300); }
  const rep = JSON.parse(readFileSync(join(od, 'report.json'), 'utf8'));
  const fails = (rep.findings || []).filter((f) => f.level === 'FAIL');
  summary[id] = {
    exit: code, at: rep.at, allow: rep.allow,
    fails: fails.map((f) => ({ id: f.id, width: f.width, msg: f.message, alsoAt: f.alsoAt })),
    warnIds: [...new Set((rep.findings || []).filter((f) => f.level === 'WARN').map((f) => f.id))],
  };
  out(`=== ${id}  exit=${code}  at=${rep.at}  allow=[${rep.allow}] ===`);
  for (const f of summary[id].fails) out(`  FAIL ${f.id.padEnd(18)} @${f.width}  ${String(f.msg).slice(0, 110)}`);
  out(`  WARN ${summary[id].warnIds.join(' ')}`);
  if (stderr) out('  stderr: ' + stderr);
}
writeFileSync(join(ROOT, 'deliverables/69-plan/p2-fails-live.json'), JSON.stringify(summary, null, 1), 'utf8');
out('\nwrote p2-fails-live.json');
