/* 每个可度量在产品提示词里的指令覆盖率 —— 修正版。
 * 上一版扫的 blind/task.txt 是我自己拼的简化提示词，结论作废。
 * 这一版扫 blind/task.txt（现在就是 buildStylePrompt 的输出）。 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const BLIND = join(ROOT, 'deliverables/78-northstar/blind');
const ids = readdirSync(BLIND, { withFileTypes: true })
  .filter((d) => d.isDirectory() && /^S\d{2}$/.test(d.name)).map((d) => d.name).sort();

const CHECKS = {
  cols: { label: '栏数', re: /(\d+)\s*[栏列]|[栏列]\s*\d+|\d+\s*:\s*\d+\s*:\s*\d+/ },
  headBody: { label: '字号比', re: /正文约\s*\d+px[^。]*\d+(\.\d+)?\s*倍/ },
  lineWidths: { label: '线宽', re: /线宽只用这几级：\s*[\d.]/ },
  palette: { label: '配色', re: /配色只用这几个值：\s*#[0-9A-Fa-f]{6}/ },
  minPics: { label: '图片数', re: /至少要\s*\d+\s*个[^。]*图片位置/ },
  minItems: { label: '条目数', re: /排了\s*\d+\s*个条目|设计规模是\s*\d+/ },
  antiDegrade: { label: '防退化', re: /防退化/ },
  acceptance: { label: '验收三问', re: /验收|自检三问|检查这一条/ },
};

const rows = [];
for (const id of ids) {
  const p = join(BLIND, id, 'task.txt');
  if (!existsSync(p)) continue;
  const t = readFileSync(p, 'utf8');
  const r = { id, lines: t.split('\n').length, bytes: Buffer.byteLength(t) };
  for (const [k, c] of Object.entries(CHECKS)) r[k] = c.re.test(t);
  rows.push(r);
}

const w = (s, n) => String(s).padEnd(n);
console.log(w('案', 5) + w('行', 4) + w('字节', 7) + Object.values(CHECKS).map((c) => w(c.label, 9)).join(''));
console.log('─'.repeat(5 + 4 + 7 + Object.keys(CHECKS).length * 9));
for (const r of rows) {
  console.log(w(r.id, 5) + w(r.lines, 4) + w(r.bytes, 7) +
    Object.keys(CHECKS).map((k) => w(r[k] ? '有' : '无', 9)).join(''));
}
console.log('\n=== 覆盖率（产品提示词）===');
for (const [k, c] of Object.entries(CHECKS)) {
  const n = rows.filter((r) => r[k]).length;
  const flag = n === rows.length ? '✅' : n === 0 ? '❌' : '⚠️';
  console.log(`  ${flag} ${w(c.label, 8)} ${n}/${rows.length}`);
}
