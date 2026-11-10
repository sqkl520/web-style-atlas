/* P2 改名后的回归验证：搜索索引与字段展示有没有断。
 *
 * 风险：`r.fonts` 在 app.js:235 的搜索索引里。改名后若只改一处，
 * 搜索会**静默**少索引一个字段（不报错、不崩，就是搜不到）。
 * 这类静默失效比崩溃更难发现，必须显式验证。
 */
import { readFileSync } from 'node:fs';

const ROOT = 'D:/Web/style/prototypes/_selection';
const data = JSON.parse(readFileSync(ROOT + '/data.js', 'utf8').match(/window\.SCHEMES\s*=\s*(\[[\s\S]*\])\s*;/)[1]);
const app = readFileSync(ROOT + '/app.js', 'utf8');

console.log('═══ 1) app.js 里还有裸 `r.fonts` 吗（不兼容的读法）═══');
const bare = [...app.matchAll(/\br\.fonts\b(?!Spec)/g)];
console.log('  出现次数:', bare.length);
for (const m of bare) {
  const line = app.slice(0, m.index).split('\n').length;
  console.log(`    app.js:${line}  ${app.split('\n')[line - 1].trim().slice(0, 100)}`);
}

console.log('\n═══ 2) 搜索索引是否包含 fontsSpec ═══');
const hayLine = app.split('\n').find((l) => l.includes('var hay ='));
console.log('  ', hayLine.trim().slice(0, 130));
console.log('  含 fontsSpec:', /fontsSpec/.test(hayLine));
console.log('  含 fonts 回退:', /fontsSpec\s*\|\|\s*r\.fonts/.test(hayLine));

console.log('\n═══ 3) 字段展示是否读 fontsSpec ═══');
const fieldLine = app.split('\n').find((l) => l.includes("field('字体策略'"));
console.log('  ', fieldLine.trim().slice(0, 110));

console.log('\n═══ 4) 从字体名反查：搜索能否命中所有案 ═══');
/* 取每案 fontsSpec 里第一个引号内的英文字体名，模拟用户搜索 */
let hit = 0, miss = [];
for (const r of data) {
  const spec = String(r.fontsSpec || '');
  const fam = (spec.match(/[（(]?(?:用|＝|=)?\s*([A-Z][A-Za-z0-9 ]{2,24}?)(?=[（(，,、。]|$)/) || [])[1];
  if (!fam) continue;
  const hay = [r.id, r.cn, r.en, r.family, r.fontsSpec, r.def, r.tone, r.structure,
    r.errorCode, r.threshold, r.layout, r.visuals, r.quirk, r.scenesYes,
    (r.palette || []).join(' ')].join(' ').toLowerCase();
  if (hay.includes(fam.trim().toLowerCase())) hit++;
  else miss.push({ id: r.id, fam: fam.trim() });
}
console.log(`  用每案 fontsSpec 里第一个字体名搜索: 命中 ${hit}，未命中 ${miss.length}`);
for (const m of miss.slice(0, 5)) console.log(`    ${m.id}  "${m.fam}"`);

console.log('\n═══ 5) 与 HEAD 对比：改名前后搜索索引的字符总数 ═══');
import('node:child_process').then(({ execSync }) => {
  const headSrc = execSync('git show HEAD:prototypes/_selection/data.js', { cwd: 'D:/Web/style', encoding: 'utf8', maxBuffer: 1 << 28 });
  const head = JSON.parse(headSrc.match(/window\.SCHEMES\s*=\s*(\[[\s\S]*\])\s*;/)[1]);
  const lenOf = (arr, key) => arr.reduce((a, r) => a + String(r[key] || '').length, 0);
  console.log(`  HEAD  fonts  合计字符: ${lenOf(head, 'fonts')}`);
  console.log(`  NOW   fontsSpec 合计字符: ${lenOf(data, 'fontsSpec')}`);
  console.log(`  差值: ${lenOf(data, 'fontsSpec') - lenOf(head, 'fonts')}  （应为 0）`);

  /* 逐案内容比对 */
  let same = 0; const diff = [];
  for (const r of data) {
    const h = head.find((x) => x.id === r.id);
    if (!h) { diff.push(r.id + ':HEAD 缺失'); continue; }
    if (String(h.fonts || '') === String(r.fontsSpec || '')) same++;
    else diff.push(r.id);
  }
  console.log(`  逐案内容一致: ${same}/30`);
  if (diff.length) console.log('  不一致:', diff.join(', '));
});
