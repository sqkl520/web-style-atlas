import { readFileSync } from 'node:fs';
const ROOT = 'D:/Web/style';

const raw = JSON.parse(readFileSync(ROOT + '/prototypes/_prompts/dna-raw.json', 'utf8'));
const clean = JSON.parse(readFileSync(ROOT + '/prototypes/_prompts/dna-clean.json', 'utf8'));
const arr = Array.isArray(clean) ? clean : Object.values(clean);
const rawArr = (raw.rows || raw);

console.log('=== 执行 Agent 改动后，30 案 h1Size 全景 ===\n');
console.log('案    h1Size                       来源说明');
console.log('-'.repeat(105));
for (const e of arr) {
  console.log(`${e.id}  ${String(e.h1Size || '(空)').padEnd(30)} ${String(e.h1SizeWhy || '').slice(0, 60)}`);
}

console.log('\n=== 关键检查：哪些 h1Size 的值在 CSS 里只出现在 @media 块内？===\n');
const cases = [];
for (const e of arr) {
  const dir = e.dir;
  const css = readFileSync(`${ROOT}/prototypes/${dir}/style.css`, 'utf8');
  const val = String(e.h1Size || '').trim();
  if (!val) continue;
  // 取数值（clamp 取中间那个或第一个 px）
  const px = val.match(/(\d+)px/);
  if (!px) continue;
  const num = px[1];

  // 找所有包含该数值的 font-size 规则，以及它们在不在 @media 里
  const lines = css.split(/\r?\n/);
  let inMedia = [];
  let outside = [];
  let depth = 0;
  let mediaStack = [];
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (/@media/.test(l)) mediaStack.push(l.trim().slice(0, 50));
    const opens = (l.match(/\{/g) || []).length;
    const closes = (l.match(/\}/g) || []).length;
    if (/font-size\s*:\s*[^;]*\b/.test(l) && new RegExp(`\\b${num}px`).test(l)) {
      if (mediaStack.length && depth <= mediaStack.length) inMedia.push({ n: i + 1, l: l.trim().slice(0, 90), media: mediaStack[mediaStack.length - 1] });
      else outside.push({ n: i + 1, l: l.trim().slice(0, 90) });
    }
    depth += opens - closes;
    if (depth === 0 && mediaStack.length) mediaStack = [];
  }
  const onlyInMedia = inMedia.length > 0 && outside.length === 0;
  if (onlyInMedia) {
    cases.push({ id: e.id, val, inMedia, outside });
    console.log(`  ⚠ ${e.id}  h1Size=${val}  该值只出现在 @media 内:`);
    for (const x of inMedia) console.log(`       L${x.n} [${x.media}] ${x.l}`);
  }
}
if (!cases.length) console.log('  （未发现只出现在 @media 内的 h1Size 值）');

console.log('\n=== 与 HEAD 版对比：哪些案的 h1Size 变了 ===');
import { execSync } from 'node:child_process';
try {
  const headClean = JSON.parse(execSync('git show HEAD:prototypes/_prompts/dna-clean.json', { cwd: ROOT, encoding: 'utf8' }));
  const hArr = Array.isArray(headClean) ? headClean : Object.values(headClean);
  const hMap = new Map(hArr.map((e) => [e.id, e.h1Size]));
  let changed = 0;
  for (const e of arr) {
    const old = hMap.get(e.id);
    if (String(old) !== String(e.h1Size)) {
      changed++;
      console.log(`  ${e.id}  ${JSON.stringify(old)} → ${JSON.stringify(e.h1Size)}`);
    }
  }
  console.log(`\n共 ${changed}/30 案的 h1Size 变了`);
} catch (err) {
  console.log('git show 失败: ' + err.message.slice(0, 100));
}
