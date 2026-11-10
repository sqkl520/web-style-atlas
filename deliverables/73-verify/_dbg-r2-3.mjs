import { readFileSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const ROOT = 'D:/Web/style';
const CON = `${ROOT}/prototypes/_CONTRACT.md`;
const orig = readFileSync(CON, 'utf8');

const S = '`S13` 的 17 处 `shadow` 属真未修——该规则从未被任何断言检测到已清。';

/* 手工复现判据 */
const win = S;
const sentences = win.split(/[。！？\n]/).filter((s) => s.trim());
console.log('句子切分:', JSON.stringify(sentences));

const CLAIM_CORE = /真未修|未修|未清|genuinely unresolved|还欠|仍欠/;
for (const s of sentences) {
  const hasSubject = /本闸门|这条断言|检查器|check-contract|check-twolines|C[1-6]\b|该规则|这个工具/.test(s);
  const hasAction = /抓到|报出|检测到|发现|上线当天|会红|报\s*WARN|拦下|据此/.test(s);
  const negatedAction = /没有?发现|未发现|没报出|未报出|从未.{0,12}(检测|发现|报|清)|不报|只会据此放行|未被.{0,6}检测/.test(s);
  const claimCore = CLAIM_CORE.test(s);
  console.log(`\n句: ${s}`);
  console.log(`  hasSubject=${hasSubject}  hasAction=${hasAction}`);
  console.log(`  CLAIM_CORE=${claimCore}  negatedAction=${negatedAction}`);
  console.log(`  → isMeta = ${hasSubject && hasAction && !claimCore && !negatedAction}`);
}

/* 实际跑 */
const next = orig.replace('## 10 ', S + '\n\n## 10 ');
writeFileSync(CON, next, 'utf8');
try { execSync('node prototypes/_build/check-contract.mjs', { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }); console.log('\n闸门 exit 0（未抓到）'); }
catch (e) {
  const out = String(e.stdout || '');
  console.log('\n闸门 exit', e.status);
  const line = out.split('\n').find((l) => /C4-doc-claims|C4-no-claims/.test(l));
  console.log('C4 相关输出:', line || '(无)');
}
writeFileSync(CON, orig, 'utf8');
