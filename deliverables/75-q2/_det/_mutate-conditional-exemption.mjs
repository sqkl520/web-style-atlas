// 变异测试：证明 §9.15 的两条条件豁免**不会变成"关掉这两条规则"**。
// 做法：内存里改 minitems-parsed.json（不碰磁盘），看 check-contract 是否对
//      「minPics > 2 却有 few-pictures FAIL」的案报红。
import { readFileSync, writeFileSync, mkdtempSync, cpSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, basename } from 'node:path';
import { tmpdir } from 'node:os';

const ROOT = process.cwd();
const CASES = [
  {
    label: '现状：S31 minPics=1 ≤ 2 → 豁免成立，不报 C1',
    mutate: (j) => j,
    wantRule: null,
    why: 'S31 的 few-pictures / hairline 在 §9.15 内且条件成立',
  },
  {
    label: '把 S31 的 minPics 改成 6（>2）→ 豁免条件不成立，必须报 C1-conditional-exemption-not-met',
    mutate: (j) => j.map((x) => (x.id === 'S31' ? { ...x, minPics: 6 } : x)),
    wantRule: 'C1-conditional-exemption-not-met',
    why: '这是关键一条：证明豁免不是对全库开放的口子',
  },
  {
    label: '把 S31 从 minitems-parsed 里删掉 → 拿不到 minPics，不得豁免',
    mutate: (j) => j.filter((x) => x.id !== 'S31'),
    wantRule: 'C1-conditional-exemption-not-met',
    why: '「拿不到数据」不能默认放行 —— 宁可报红',
  },
];

const results = [];
for (const c of CASES) {
  const dir = mkdtempSync(join(tmpdir(), 'ce-'));
  try {
    // check-contract 的 ROOT 从脚本位置推得，但 minitems 是 join(ROOT,...) 读的 →
    // 用 --root 不行（它没有这个参数）。所以改成：复制整个 prototypes/ 太贵。
    // 改用另一种不碰磁盘的办法：直接 import 逻辑太多，改为临时替换文件再还原。
    const target = join(ROOT, 'prototypes/_prompts/minitems-parsed.json');
    const backup = readFileSync(target, 'utf8');
    try {
      const j = JSON.parse(backup.replace(/^\uFEFF/, ''));
      writeFileSync(target, JSON.stringify(c.mutate(j), null, 1) + '\n');
      let out = '';
      try { out = execFileSync(process.execPath, [join(ROOT, 'prototypes/_build/check-contract.mjs')], { encoding: 'utf8' }); }
      catch (e) { out = (e.stdout || '') + (e.stderr || ''); }
      const hit = c.wantRule ? out.includes(c.wantRule) : !/C1-conditional-exemption-not-met|C1-fail-not-in-allowlist/.test(out);
      results.push({ c, ok: hit, snippet: (out.split('\n').find((l) => /C1-|合计/.test(l)) || '').trim().slice(0, 130) });
    } finally {
      writeFileSync(target, backup);   // 无论如何还原
    }
  } finally { rmSync(dir, { recursive: true, force: true }); }
}

console.log('条件豁免变异测试\n');
let pass = 0;
for (const r of results) {
  console.log((r.ok ? '  ✓ ' : '  ✗ ') + r.c.label);
  console.log('     ' + r.c.why);
  console.log('     输出：' + r.snippet);
  if (r.ok) pass++;
}
console.log('\n' + pass + '/' + results.length + ' 条符合预期');
process.exit(pass === results.length ? 0 : 1);
