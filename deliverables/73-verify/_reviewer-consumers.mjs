/* 全库 tracked 代码扫描：找所有仍然按"字段名"读 fonts 的地方，
 * 不管是 r.fonts、row['fonts']、解构 {fonts}、还是 d.fonts。
 * 目的：确认改名后在仓库里有没有任何**未被改到**的消费者。
 */
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const ROOT = 'D:/Web/style';
const files = execSync('git ls-files', { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 28 })
  .split('\n').filter((f) => /\.(mjs|js|html|json|md)$/.test(f));

const isProd = (f) => f.startsWith('prototypes/') || f.startsWith('templates/');
const pats = [
  [/\.fonts\b/g, '.fonts'],
  [/\[\s*['"]fonts['"]\s*\]/g, "['fonts']"],
  [/\bfonts\s*:/g, 'fonts:'],
  [/\{[\s\S]{0,40}\bfonts\b[\s\S]{0,40}\}\s*=/g, 'destructure?'],
];

const prodHits = [], deliverableHits = [];
let scanned = 0;
for (const f of files) {
  let s; try { s = readFileSync(ROOT + '/' + f, 'utf8'); } catch { continue; }
  if (s.length > 3_000_000) continue;
  scanned++;
  const lines = s.split('\n');
  lines.forEach((l, i) => {
    /* 跳过纯注释行里的叙述性提及？不跳：注释也要看，但要标注 */
    for (const [re] of pats) {
      re.lastIndex = 0;
      if (re.test(l)) {
        const rec = `${f}:${i + 1}: ${l.trim().slice(0, 150)}`;
        (isProd(f) ? prodHits : deliverableHits).push(rec);
        break;
      }
    }
  });
}
console.log(`扫描 tracked 文件 ${scanned} 个（代码+文档）`);
console.log(`\n═══ A) prototypes/ 与 templates/ 内的命中（${prodHits.length} 条）—— 这些是"生产代码" ═══`);
prodHits.forEach((h) => console.log('  ' + h));

console.log(`\n═══ B) deliverables/ 与其他目录的命中（${deliverableHits.length} 条，只列前 40）═══`);
deliverableHits.slice(0, 40).forEach((h) => console.log('  ' + h));
if (deliverableHits.length > 40) console.log(`  …其余 ${deliverableHits.length - 40} 条略`);
