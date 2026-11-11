/* 手工验证 CONTRACT_PROTOS_OVERRIDE 是否生效：复制 35 案的 report.json 到临时目录，
 * 删掉 S08 的 layoutKind，然后用 --json 跑子进程，看 C7 有没有响。 */
import { mkdtempSync, mkdirSync, copyFileSync, readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const tmp = mkdtempSync(join(tmpdir(), 'ckdbg-'));
console.log('临时目录:', tmp);

for (const d of readdirSync(join(ROOT, 'prototypes')).filter((x) => /^S\d\d-/.test(x))) {
  const dst = join(tmp, d, '.inspect');
  mkdirSync(dst, { recursive: true });
  const src = join(ROOT, 'prototypes', d, '.inspect', 'report.json');
  if (existsSync(src)) copyFileSync(src, join(dst, 'report.json'));
}

const target = join(tmp, 'S08-amber-overprint-lightbox', '.inspect', 'report.json');
const j = JSON.parse(readFileSync(target, 'utf8'));
const had = j.viewports[0].metrics.structure.layoutKind;
delete j.viewports[0].metrics.structure.layoutKind;
writeFileSync(target, JSON.stringify(j));
console.log('S08 原 layoutKind:', had, '→ 已删除');

let out = '', err = '', code = 0;
try {
  out = execFileSync(process.execPath, [join(ROOT, 'prototypes/_build/check-contract.mjs'), '--json'],
    { env: { ...process.env, CONTRACT_PROTOS_OVERRIDE: tmp }, encoding: 'utf8', timeout: 180000 });
} catch (e) {
  out = e.stdout || '';
  err = e.stderr || '';
  code = e.status ?? 1;
}
console.log('退出码:', code, '| stdout 长度:', out.length, '| stderr 长度:', err.length);
if (err) console.log('stderr:', err.slice(0, 500));
try {
  const r = JSON.parse(out);
  const c7 = r.findings.filter((f) => /C7/.test(f.rule || ''));
  console.log('C7 findings:', c7.length, c7.map((f) => f.rule + ':' + f.scope).join(' '));
} catch (e2) {
  console.log('JSON 解析失败:', e2.message);
  console.log('stdout 前 400:', out.slice(0, 400));
}
