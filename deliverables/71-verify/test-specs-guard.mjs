// 验证 check-stale 新增的「规格链」守卫真的在工作（不是静默失效）
// 70 轮我踩过：路径写错 → existsSync 恒 false → 看起来"全部新鲜" → 摆设
import { statSync, utimesSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
const ROOT = 'D:/Web/style';

const SOURCE = 'deliverables/05-schemes-11-20.md';
const PRODUCT = 'prototypes/_specs/S01.md';

console.log('=== 前置检查 ===');
console.log(`源文件 ${SOURCE}: ${existsSync(`${ROOT}/${SOURCE}`) ? '存在' : '缺失'}`);
console.log(`产物   ${PRODUCT}: ${existsSync(`${ROOT}/${PRODUCT}`) ? '存在' : '缺失'}`);
if (!existsSync(`${ROOT}/${SOURCE}`) || !existsSync(`${ROOT}/${PRODUCT}`)) {
  console.log('无法测试，退出。');
  process.exit(0);
}
const srcSt = statSync(`${ROOT}/${SOURCE}`);
const prodSt = statSync(`${ROOT}/${PRODUCT}`);
console.log(`源 mtime:  ${srcSt.mtime.toISOString()}`);
console.log(`产物 mtime: ${prodSt.mtime.toISOString()}`);
console.log(`产物比源新? ${prodSt.mtimeMs > srcSt.mtimeMs ? '是（当前不陈旧，正确）' : '否（已陈旧）'}`);

function runStale() {
  try { return { code: 0, out: execSync('node prototypes/_build/check-stale.mjs', { cwd: ROOT, encoding: 'utf8' }) }; }
  catch (e) { return { code: e.status, out: (e.stdout || '') + (e.stderr || '') }; }
}

console.log('\n=== 基线 ===');
const base = runStale();
console.log(`exit=${base.code}  ${base.out.trim().split('\n').slice(-1)[0]}`);

console.log('\n=== 把源文件 mtime 调到 30 秒后，守卫应当报「规格链·_specs」===');
const at = srcSt.atimeMs / 1000, mt = srcSt.mtimeMs / 1000;
try {
  utimesSync(`${ROOT}/${SOURCE}`, at, Date.now() / 1000 + 30);
  const r = runStale();
  const hitLine = r.out.split('\n').find((l) => l.includes('规格链') || l.includes('_specs'));
  const ok = r.code === 1 && hitLine;
  console.log(`exit=${r.code}`);
  console.log(`${ok ? '✓ 守卫抓到' : '✗ 守卫静默失效（摆设）'}`);
  if (hitLine) console.log(`  ${hitLine.trim()}`);
  else console.log(`  完整输出:\n${r.out}`);
} finally {
  utimesSync(`${ROOT}/${SOURCE}`, at, mt);
}

console.log('\n=== 恢复后 ===');
const after = runStale();
console.log(`exit=${after.code}  ${after.out.trim().split('\n').slice(-1)[0]}`);
console.log(`源 mtime 已复原: ${statSync(`${ROOT}/${SOURCE}`).mtime.toISOString()}`);
