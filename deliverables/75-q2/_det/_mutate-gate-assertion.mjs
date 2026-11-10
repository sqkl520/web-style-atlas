// 变异测试：证明修好后的 nums/gate 既不是恒真、也不是恒假。
//
// ⚠️ 第一版脚手架的错：它把变异副本写进临时目录、`cwd` 设成那里就去跑 check-docs，
// 而 check-docs 的 REAL_ROOT 是从**脚本自身位置**推出来的 ⇒ 读的始终是真 README，
// 8 条用例里 4 条"期望绿"全红，看起来像断言坏了，实际是脚手架根本没把变异送进去。
// 正确入口是 `--root <dir>`（check-docs.mjs:74「只换文档从哪读，数据源永远是真仓库」）。
// 这条教训本身也是本仓库那个病：**测试装置读错了对象，得到一串看似有意义的结论**。
import { readFileSync, writeFileSync, mkdtempSync, cpSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';import { basename } from 'node:path';
import { tmpdir } from 'node:os';

const ROOT = process.cwd();
const DATA = ['data.js', 'prompts.js', 'prompt-copy.js'].map((f) => join(ROOT, 'prototypes/_selection', f));

const CASES = [
  { label: '基线（原文不改，26/8 是真缺陷）', file: 'README.md', wantFail: true,
    why: 'README.md:576 写 26 prototypes / 8 remaining，实测 29 / 2 —— 必须红' },
  { label: '只把 26 改对 → 29', file: 'README.md',
    from: '26 prototypes pass the mechanical gate with FAIL = 0', to: '29 prototypes pass the mechanical gate with FAIL = 0',
    wantFail: true, why: '还剩"8 remaining"没改，仍应红（证明两条数各管各的）' },
  { label: '只把 8 remaining 改对 → 2', file: 'README.md',
    from: '8 remaining gate failures', to: '2 remaining gate failures',
    wantFail: true, why: '还剩 26 没改，仍应红' },
  { label: '两处都改对', file: 'README.md',
    from: '26 prototypes pass the mechanical gate with FAIL = 0. What this repository cannot do — 8 remaining gate failures',
    to: '29 prototypes pass the mechanical gate with FAIL = 0. What this repository cannot do — 2 remaining gate failures',
    wantFail: false, why: '全改对必须转绿 —— 这是断言不恒真的关键证据' },
  { label: '改坏：29 → 31（上界）', file: 'README.md', from: '29 个闸门 FAIL=0', to: '31 个闸门 FAIL=0',
    wantFail: true, why: '中文句妄报 2 案' },
  { label: '改坏：29 → 28（下界）', file: 'README.md', from: '29 个闸门 FAIL=0', to: '28 个闸门 FAIL=0',
    wantFail: true, why: '中文句少报 1 案' },
  { label: '老正则看不见的语序：26 → 27', file: 'README-EN.md',
    from: 'this README says 26 schemes at FAIL = 0', to: 'this README says 27 schemes at FAIL = 0',
    wantFail: true, why: '修好后必须能抓（修复前这里是静默放过）' },
  { label: '误报：追加一行「30 个场景词」', file: 'README.md', from: '## English',
    to: '（复算备注：本层另有 30 个场景词。）\n\n## English',
    wantFail: true, why: '这一行本身不含达标语义词，不该由它引起红；但文档里 26/8 缺陷仍在，故整体仍红 —— 靠下面单独核对' },
  { label: '误报隔离：先把真缺陷改对，再加「30 个场景词」', file: 'README.md',
    from: '26 prototypes pass the mechanical gate with FAIL = 0. What this repository cannot do — 8 remaining gate failures',
    to: '29 prototypes pass the mechanical gate with FAIL = 0. What this repository cannot do — 2 remaining gate failures\n\n（复算备注：本层另有 30 个场景词。）',
    wantFail: false, why: '真缺陷修完后，追加别的量不得引起红 —— 这是误报的判据' },
];

const results = [];
for (const c of CASES) {
  const dir = mkdtempSync(join(tmpdir(), 'gd-'));
  try {
    for (const f of DATA) cpSync(f, join(dir, basename(f)));
    let txt = readFileSync(join(ROOT, c.file), 'utf8');
    if (c.from) {
      if (!txt.includes(c.from)) { results.push({ c, ok: false, got: null, note: '夹具锚点找不到' }); continue; }
      txt = txt.replace(c.from, c.to);
    }
    writeFileSync(join(dir, c.file), txt);
    // README-EN 的 i18n/pair 需要对面那份存在，一并放进去（不改动它）
    cpSync(join(ROOT, c.file === 'README.md' ? 'README-EN.md' : 'README.md'), join(dir, c.file === 'README.md' ? 'README-EN.md' : 'README.md'));
    let out = '';
    try { out = execFileSync(process.execPath, [join(ROOT, 'prototypes/_build/check-docs.mjs'), '--root', dir, c.file], { encoding: 'utf8' }); }
    catch (e) { out = (e.stdout || '') + (e.stderr || ''); }
    const gateLine = (out.split('\n').find((l) => l.includes('nums/gate')) || '').trim();
    const got = /✗/.test(gateLine);
    results.push({ c, ok: got === c.wantFail, got, note: gateLine.slice(0, 150) });
  } finally { rmSync(dir, { recursive: true, force: true }); }
}

console.log('变异测试 nums/gate（README.md 与 README-EN.md 各一组）\n');
let pass = 0;
for (const r of results) {
  console.log((r.ok ? '  ✓ ' : '  ✗ ') + r.c.label + '  → 实际' + (r.got === null ? '未跑' : r.got ? '红' : '绿') + '（期望' + (r.c.wantFail ? '红' : '绿') + '）');
  console.log('     ' + r.c.why);
  if (!r.ok) console.log('     输出: ' + r.note);
  if (r.ok) pass++;
}
console.log('\n' + pass + '/' + results.length + ' 条符合预期');
process.exit(pass === results.length ? 0 : 1);
