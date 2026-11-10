/* 死数据闸门：dna.* 里每个字段，是否真的被 prompt-copy.js 消费？
 *
 * 为什么需要它：本轮 6e0ca82 修好了 `dna.primary` 的召回（9 案空 → 0 案空），
 * 但上一轮 `h1Size` 的教训是「数据修好了、代码路径仍然是死的」。
 * 这个探针逐字段回答：这个字段进入用户能看到的文本了吗？
 */
import { readFileSync } from 'node:fs';

const R = new URL('../../prototypes/', import.meta.url);
const pc = readFileSync(new URL('_selection/prompt-copy.js', R), 'utf8');
const promptSrc = readFileSync(new URL('_selection/prompts.js', R), 'utf8');
const sp = JSON.parse(promptSrc.slice(promptSrc.indexOf('{', promptSrc.indexOf('window.STYLE_PROMPTS'))).replace(/;\s*$/, ''));

/* dna 里有哪些字段 */
const fields = new Set();
for (const s of sp.schemes) for (const k of Object.keys(s.dna || {})) fields.add(k);

/* 剥掉注释后的 prompt-copy（注释里提到字段名不算消费） */
const code = pc.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');

console.log('字段            出现次数(去注释)  首次出现处');
console.log('─'.repeat(90));
const dead = [];
for (const f of [...fields].sort()) {
  const re = new RegExp(`\\.${f}\\b|\\[["']${f}["']\\]`, 'g');
  const hits = [...code.matchAll(re)];
  const lines = code.split('\n');
  let where = '';
  for (let i = 0; i < lines.length; i++) if (re.test(lines[i])) { where = `${i + 1}: ${lines[i].trim().slice(0, 70)}`; break; }
  re.lastIndex = 0;
  if (!hits.length) dead.push(f);
  console.log(`${f.padEnd(16)} ${String(hits.length).padStart(6)}          ${where}`);
}

console.log('\n═══ 从未被消费的 dna 字段 ═══');
console.log(dead.length ? dead.join(', ') : '（无）');

/* 关键复核：primary 到底有没有进文本 */
console.log('\n═══ dna.primary 的取证 ═══');
console.log('  code 里出现 .primary 次数:', [...code.matchAll(/\.primary\b/g)].length);
console.log('  code 里出现 "主色" 次数:', [...code.matchAll(/主色/g)].length);
for (const m of code.matchAll(/.{50}主色.{70}/gs)) console.log('   …', m[0].replace(/\n/g, ' '));
