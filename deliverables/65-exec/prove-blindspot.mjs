/* 任务 1 的取证工具（复查用，不属于产品代码）：把 README 改坏 / 加上诱饵，看 check-docs 的反应。
 *
 * 为什么单独留一份在这：`--selftest` 里已经把 6 个用例固化成断言了，但**断言跑在检查器内部**，
 * 下一个人要自己复现"改坏一句话它到底报什么"时，需要看到原始输出。这份脚本就是那台复现机：
 *   node deliverables/65-exec/prove-blindspot.mjs
 * 每条用例都在独立临时目录里跑，不碰真仓库，跑完删目录。
 *
 * 两类用例：
 *   改坏（必须 FAIL）：四个方向的错写 —— 中文数字、上界、下界、大数
 *   误报（必须不报）：别的量（场景词 / 字数 / 条数 / 模板数 / 行业词数）
 * ⚠️ 误报用例一律用**追加**，不用替换：替换会连带打掉 44 个行业词那条事实，
 *    i18n/facts 会红，那就分不清红的是 nums/schemes 还是别的断言了（实测踩过）。
 */
import { readFileSync, writeFileSync, mkdtempSync, rmSync, copyFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '../..');
const SCRIPT = join(ROOT, 'prototypes', '_build', 'check-docs.mjs');
const base = readFileSync(join(ROOT, 'README.md'), 'utf8');

const CASES = [
  ['改坏 1  三十个可运行的原型 → 三十一个', 'replace',
    '**30 个可运行原型**', '**三十一个可运行的原型**', 'FAIL'],
  ['改坏 2  30 个方案 → 31 个方案', 'replace',
    '**这是一座风格标本库：30 个方案', '**这是一座风格标本库：31 个方案', 'FAIL'],
  ['改坏 3  30 个方案 → 29 个方案', 'replace',
    '**这是一座风格标本库：30 个方案', '**这是一座风格标本库：29 个方案', 'FAIL'],
  ['改坏 4  30 个方案 → 40 个方案', 'replace',
    '**这是一座风格标本库：30 个方案', '**这是一座风格标本库：40 个方案', 'FAIL'],
  ['误报 1  追加「30 个场景词」「1815 字」', 'append',
    '\n\n（复算备注：本层另有 30 个场景词，本节合计 1815 字。）\n', null, 'PASS'],
  ['误报 2  追加「26 条 / 40 个模板 / 120 个行业词」', 'append',
    '\n\n（复算备注：26 条闸门规则、40 个模板、120 个行业词分属别的层。）\n', null, 'PASS'],
  ['对照    30 个方案 → 三十个方案（中文写对了，必须不报）', 'replace',
    '**这是一座风格标本库：30 个方案', '**这是一座风格标本库：三十个方案', 'PASS'],
];

let bad = 0;
for (const [label, kind, a, b, want] of CASES) {
  const doc = kind === 'append' ? base + a : base.replace(a, b);
  if (kind === 'replace' && doc === base) {
    console.log(`\n## ${label}\n   变异没生效：README 里找不到 ${JSON.stringify(a)}`);
    bad++;
    continue;
  }
  const dir = mkdtempSync(join(tmpdir(), 'prove-blindspot-'));
  writeFileSync(join(dir, 'README.md'), doc, 'utf8');
  copyFileSync(join(ROOT, 'README-EN.md'), join(dir, 'README-EN.md'));
  let out = '', code = 0;
  try {
    out = execFileSync(process.execPath, [SCRIPT, '--root', dir], { encoding: 'utf8', cwd: ROOT });
  } catch (e) {
    out = (e.stdout || '') + (e.stderr || '');
    code = e.status ?? 1;
  }
  rmSync(dir, { recursive: true, force: true });

  const nums = (out.split('\n').find((l) => /nums\/schemes/.test(l)) || '(没有 nums/schemes)').trim();
  const got = code === 1 ? 'FAIL' : 'PASS';
  const ok = got === want && new RegExp(`[✓✗]\\s+nums/schemes`).test(nums);
  if (!ok) bad++;
  console.log(`\n## ${label}`);
  console.log(`   期望 ${want} / 实得 ${got}（exit ${code}）  ${ok ? '✓' : '✗'}`);
  console.log(`   ${nums}`);
}
console.log(`\n${bad ? `✗ ${bad} 条不符合预期` : `✓ ${CASES.length} 条全部符合预期`}`);
process.exit(bad ? 1 : 0);
