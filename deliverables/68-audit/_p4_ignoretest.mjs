// _p4_ignoretest.mjs
// Verify PROPOSED .gitignore rules in a throwaway fake repo under the OS temp dir.
// The real repo's .gitignore is never touched.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const GIT = 'D:\\Git\\cmd\\git.exe';

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ignoretest-'));
const git = (args) => {
  try {
    return execFileSync(GIT, args, { cwd: tmp, encoding: 'utf8', maxBuffer: 1 << 26, stdio: ['ignore', 'pipe', 'pipe'] });
  } catch (e) {
    return `ERR(${e.status}): ${e.stdout || ''}${e.stderr || ''}`;
  }
};

const PROPOSED = `# ── 审查 agent 的过程产物：探针 / 中间 JSON / 截图 / 日志，不入库 ──
# 报告（*.md）与最终证据图仍入库；下列是"用完即弃"的执行痕迹。
deliverables/*/shots*/
deliverables/*/snap/
deliverables/*/frozen*/
deliverables/*/frozen-now/
deliverables/*/prompts*/
deliverables/*/lab/
deliverables/*/_*/
deliverables/*/tmp/
deliverables/*/trials/
deliverables/*/baseline/
deliverables/*/replica/
deliverables/*/impl/
deliverables/*/r2/
deliverables/*/data/
!deliverables/*/data/*.md
deliverables/*/*.mjs
deliverables/*/*.json
deliverables/*/*.txt
deliverables/*/*.log
deliverables/*/_*/
`;

fs.writeFileSync(path.join(tmp, '.gitignore'), PROPOSED, 'utf8');
git(['init', '-q']);

const SAMPLE = [
  // [path, expectedIgnored, why]
  ['deliverables/66-plan/REPORT.md', false, '方案报告必须入库'],
  ['deliverables/66-audit/AUDIT.md', false, '审计报告必须入库'],
  ['deliverables/66-plan/_p1_list.mjs', true, '一次性探针'],
  ['deliverables/65-exec/_cut/x.mjs', true, '_ 前缀过程目录'],
  ['deliverables/66-exec/shots/a.png', true, '截图目录'],
  ['deliverables/66-exec/_out/measure.json', true, '中间数据'],
  ['deliverables/67-exec/_lab/p2-variants.json', true, '3.8MB 中间数据'],
  ['deliverables/63-test/replica/S05/build/ground/x.otf', true, '8.7MB 复刻字体'],
  ['deliverables/67-audit/_probe.mjs', true, '_ 前缀脚本'],
  ['deliverables/68-audit/REPO-HYGIENE.md', false, '本轮交付报告'],
  ['deliverables/68-audit/_p1_inventory.mjs', true, '本轮探针'],
  ['deliverables/62-exec/tpl-integration/serve.mjs', true, '服务脚本'],
  ['deliverables/65-audit/lab/measure.mjs', true, 'lab 目录'],
  ['deliverables/62-verify/impl/x.mjs', true, 'impl 目录'],
  ['deliverables/63-test/data/rows.json', true, 'data 目录'],
  ['deliverables/63-test/data/README.md', false, 'data 下的说明文档保留'],
  ['deliverables/66-audit/prompts-live/x.txt', true, 'prompts 目录'],
  ['deliverables/65-verify/shots-final/x.png', true, 'shots 目录'],
  ['deliverables/66-audit/tpl-audit/x.json', true, 'tpl-audit 目录'],
];

for (const [p] of SAMPLE) {
  const abs = path.join(tmp, p);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, 'x');
}

let pass = 0;
const results = [];
for (const [p, expected, why] of SAMPLE) {
  let out;
  try {
    out = execFileSync(GIT, ['check-ignore', '-v', '--no-index', p], {
      cwd: tmp,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  } catch (e) {
    out = null;
  }
  const ignored = out !== null;
  const ok = ignored === expected;
  if (ok) pass++;
  results.push({ path: p, expected, actual: ignored, ok, rule: out ? out.trim() : '(not ignored)', why });
}

// also confirm the tracked/untracked reality in the fake repo
const porcelain = git(['status', '--porcelain', '-uall']);

const out = {
  generatedAt: new Date().toISOString(),
  tmpRepo: tmp,
  passRate: `${pass}/${SAMPLE.length}`,
  results,
  statusSample: porcelain.split('\n').slice(0, 40),
};
fs.writeFileSync(
  'D:\\Web\\style\\deliverables\\68-audit\\_p4_ignoretest.json',
  JSON.stringify(out, null, 2),
  'utf8'
);
console.log(`PASS ${pass}/${SAMPLE.length}`);
for (const r of results) console.log((r.ok ? 'OK  ' : 'FAIL') + ' ' + (r.actual ? 'IGN ' : 'TRK ') + r.path + '  <= ' + r.rule);
console.log('tmp=' + tmp);
