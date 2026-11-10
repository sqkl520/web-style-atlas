import { statSync, utimesSync } from 'node:fs';
import { execSync } from 'node:child_process';
const ROOT = 'D:/Web/style';

// 先确保选型台不陈旧（它是干扰项）：把它的 report.at 之后的 source mtime 都当成"正常"
// 做法：只调 dna-raw.json，然后看**完整输出**（不只最后一行）
const p = `${ROOT}/prototypes/_prompts/dna-raw.json`;
const st = statSync(p);
const at = st.atimeMs / 1000, mt = st.mtimeMs / 1000;
try {
  utimesSync(p, at, Date.now() / 1000 + 60);
  let out;
  try { out = execSync('node prototypes/_build/check-stale.mjs', { cwd: ROOT, encoding: 'utf8' }); }
  catch (e) { out = (e.stdout || '') + (e.stderr || ''); }
  console.log('=== 调新 dna-raw.json 后的完整输出 ===\n');
  console.log(out);
} finally {
  utimesSync(p, at, mt);
}
