import { readFileSync, writeFileSync, copyFileSync, unlinkSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
const ROOT = 'D:/Web/style';

const PROMPTS = 'prototypes/_selection/prompts.js';
const BACKUP = 'deliverables/70-plan/_prompts.js.bak';

console.log('=== 受控A/B：把 S19 主色改成 #FF00FF，看 check-docs 是否报 ===\n');

// 备份
copyFileSync(`${ROOT}/${PROMPTS}`, `${ROOT}/${BACKUP}`);
const orig = readFileSync(`${ROOT}/${PROMPTS}`, 'utf8');

function runCheckDocs() {
  try {
    const out = execSync('node prototypes/_build/check-docs.mjs', { cwd: ROOT, encoding: 'utf8', stdio: 'pipe' });
    return { code: 0, out };
  } catch (e) {
    return { code: e.status, out: (e.stdout || '') + (e.stderr || '') };
  }
}

console.log('--- 基线（HEAD 态）---');
const base = runCheckDocs();
console.log(`exit=${base.code}`);
const baseLines = base.out.split('\n').filter((l) => /FAIL|PASS|WARN|✓|✗/.test(l));
console.log(baseLines.slice(-18).join('\n'));

// 篡改：把 S19 的 #4A5C3A 改成 #FF00FF
const tampered = orig.replaceAll('#4A5C3A', '#FF00FF');
if (tampered === orig) { console.log('\n⚠ 替换失败——#4A5C3A 不在 prompts.js 里'); }
else {
  writeFileSync(`${ROOT}/${PROMPTS}`, tampered, 'utf8');
  console.log(`\n--- 篡改后（S19 主色 #4A5C3A → #FF00FF，改动 ${(orig.match(/#4A5C3A/g) || []).length} 处）---`);
  const t = runCheckDocs();
  console.log(`exit=${t.code}`);
  const tLines = t.out.split('\n').filter((l) => /FAIL|PASS|WARN|✓|✗/.test(l));
  console.log(tLines.slice(-18).join('\n'));

  // 对比
  console.log('\n=== 判定 ===');
  const baseSet = new Set(baseLines);
  const tSet = new Set(tLines);
  const added = [...tSet].filter((l) => !baseSet.has(l));
  const removed = [...baseSet].filter((l) => !tSet.has(l));
  console.log(`基线 exit=${base.code}  篡改后 exit=${t.code}`);
  console.log(`新增的行: ${added.length ? added.join(' | ') : '（无）'}`);
  console.log(`消失的行: ${removed.length ? removed.join(' | ') : '（无）'}`);
  if (base.code === t.code && added.length === 0 && removed.length === 0) {
    console.log('\n🔴 确认：check-docs 对提示词内容零反应（批判 Agent 的指控成立）');
  } else {
    console.log('\n✓ check-docs 有反应');
  }
}

// 恢复
copyFileSync(`${ROOT}/${BACKUP}`, `${ROOT}/${PROMPTS}`);
unlinkSync(`${ROOT}/${BACKUP}`);
console.log('\n=== 已恢复 ===');
console.log('git status:');
console.log(execSync('git status --porcelain -- prototypes/_selection/prompts.js', { cwd: ROOT, encoding: 'utf8' }).trim() || '（干净）');
