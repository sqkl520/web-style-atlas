// 探针 v2：Q5 受控 A/B —— 同一份副本，只切换 prompts.js 的「干净/腐化」两态，
// 比较 check-docs 的 PASS/FAIL 集合。这样副本自身的路径缺失是**常量**，会被抵消，
// 剩下的差异才归因于「重生成把色板写错」。
import { readFileSync, writeFileSync, mkdirSync, cpSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';

const ROOT = 'D:/Web/style';
const WORK = join(ROOT, 'deliverables/70-plan/critique/_q5-copy');
const target = join(WORK, 'prototypes/_selection/prompts.js');
const orig = readFileSync(target, 'utf8');
const corrupted = orig.replace(/#4A5C3A/g, '#FF00FF');

function runCheckDocs() {
  try {
    const out = execFileSync('node', ['prototypes/_build/check-docs.mjs'], {
      cwd: WORK, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
    });
    return { code: 0, out };
  } catch (e) {
    return { code: e.status, out: (e.stdout || '') + (e.stderr || '') };
  }
}

const parse = (out) => {
  const pass = [...out.matchAll(/✓\s+(\S+)/g)].map((m) => m[1]).sort();
  const fail = [...out.matchAll(/✗\s+(\S+)/g)].map((m) => m[1]).sort();
  const warn = [...out.matchAll(/⚠\s+(\S+)/g)].map((m) => m[1]).sort();
  return { pass, fail, warn };
};

writeFileSync(target, orig, 'utf8');
const clean = runCheckDocs();
const C = parse(clean.out);

writeFileSync(target, corrupted, 'utf8');
const bad = runCheckDocs();
const B = parse(bad.out);
writeFileSync(target, orig, 'utf8');

const diff = (a, b) => a.filter((x) => !b.includes(x));
const rep = [];
rep.push('=== check-docs A/B（同一副本，只改 prompts.js 的 S19 主色 #4A5C3A → #FF00FF）===');
rep.push(`干净态：exit ${clean.code}，PASS ${C.pass.length} / FAIL ${C.fail.length} / WARN ${C.warn.length}`);
rep.push(`腐化态：exit ${bad.code}，PASS ${B.pass.length} / FAIL ${B.fail.length} / WARN ${B.warn.length}`);
rep.push('');
rep.push(`腐化后**新增**的 FAIL：${diff(B.fail, C.fail).join(', ') || '（无）'}`);
rep.push(`腐化后**消失**的 PASS：${diff(C.pass, B.pass).join(', ') || '（无）'}`);
rep.push(`腐化后新增 WARN：${diff(B.warn, C.warn).join(', ') || '（无）'}`);
rep.push('');
rep.push('=== 副本自身的固有 FAIL（两态都有，与腐化无关）===');
rep.push(B.fail.filter((x) => C.fail.includes(x)).join(', ') || '（无）');
rep.push('');
rep.push('=== 判定 ===');
const caught = diff(B.fail, C.fail).length > 0 || diff(C.pass, B.pass).length > 0;
rep.push(caught
  ? '有检查项对这次腐化有反应 —— 需逐项确认它是否真在查色板。'
  : '**零反应**：把 S19 主色改成一个设计上完全不可能的颜色，check-docs 的 13 条断言一条都不响。');
rep.push('原因：check-docs 只读 prompts.js 的 schemes.length / hard / capacity.degrades（app.js 那 5 处引用之外的字段），');
rep.push('而 dna.palette 在 check-docs.mjs 里 grep "palette" 命中 0 次。');
writeFileSync(join(ROOT, 'deliverables/70-plan/critique/p-q5-ab.txt'), rep.join('\n'), 'utf8');
console.log(rep.join('\n'));
