/* 生成 35 份提示词，检查「第四处字体分工」这一句到底出现在哪几案。 */
import { readFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '..', '..', '..');
const SEL = join(REPO, 'prototypes', '_selection');

/* prompt-copy.js 是浏览器脚本（window.xxx），用 vm 在沙箱里跑出来 */
const { createContext, runInContext } = await import('node:vm');
const ctx = { window: {}, document: { getElementById: () => null, querySelector: () => null } };
ctx.window = ctx;
createContext(ctx);
for (const f of ['data.js', 'prompts.js', 'prompt-copy.js']) {
  runInContext(readFileSync(join(SEL, f), 'utf8'), ctx, { filename: f });
}

const build = ctx.buildStylePrompt || ctx.window.buildStylePrompt;
if (!build) { console.error('拿不到 buildStylePrompt'); process.exit(1); }

const ids = [];
for (const s of ctx.SCHEMES) ids.push(s.id);

let hit = 0;
for (const id of ids) {
  const p = build(id, { biz: '一家修鞋配钥匙的小店', action: '打电话约个时间', have: 5 });
  const has = p.includes('第四处字体分工');
  if (has) {
    hit++;
    const line = p.split('\n').find((l) => l.includes('第四处字体分工'));
    console.log(`${id}  ${line.trim().slice(0, 150)}`);
  }
}
console.log(`\n${hit}/35 案带第四角色说明`);

/* 反向断言：这句话里有没有出现「新增」这种会被读成许可的字眼 */
console.log('\n措辞体检：');
const sample = build('S19', { biz: 'x', action: 'y', have: 5 });
const l = sample.split('\n').find((x) => x.includes('第四处字体分工')) || '';
console.log('  含「不是让你新增字体」：' + (l.includes('不是让你新增字体') ? '✓' : '✗'));
console.log('  含「只在那一小块用」：' + (l.includes('只在那一小块用') ? '✓' : '✗'));
console.log('  含「不要把标题、正文或数字改成它」：' + (l.includes('不要把标题、正文或数字改成它') ? '✓' : '✗'));
