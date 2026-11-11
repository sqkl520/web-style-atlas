/* 每条可度量在提示词里到底有没有指令？
 *
 * 这是 compare.mjs 注释里那句「FAIL 时要能回答是提示词没写清楚，还是模型没听话」的
 * 机械化版本。原实现靠 /字号|字阶|font-size|标题/i.test(prompt) 这种粗判，
 * 而实测发现它会把「标题」这种在结构约束里出现的词也算成「有字号约束」。
 *
 * 这里逐量给判据，并输出全库统计 —— 验货时用它决定哪些量能判、哪些只能报。 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const BLIND = join(ROOT, 'deliverables/78-northstar/blind');

/* 先确保提示词已生成（--prepare-only 跑过）。没跑就用全库重新生成一份在内存里。 */
const ids = readdirSync(BLIND, { withFileTypes: true })
  .filter((d) => d.isDirectory() && /^S\d{2}$/.test(d.name))
  .map((d) => d.name)
  .sort();

if (!ids.length) {
  console.log('blind/ 下没有提示词。先跑：node blind-run.mjs --ids S01,...,S35 --prepare-only');
  process.exit(2);
}

/* 逐量的「提示词是否有指令」判据。
 * 每条都写成可解释的：为什么这个词意味着有指令。
 * 刻意要求**具体名词**而非泛词 —— 「标题」出现在 risk 字段里不算字号指令。 */
const CHECKS = {
  cols: {
    label: '栏数',
    /* 必须出现「N 栏」或「N 列」这种带数字的表述，或 repeat(auto-fit...) 的显式描述。
     * 只出现「栏」字不算 —— S31 的 risk 里有「方阵」，但没有任何栏数指令。 */
    re: /(\d+)\s*[栏列]|[栏列]\s*\d+/,
    why: '需要「N 栏/N 列」或明确的分栏比（如 5:7）',
  },
  headBody: {
    label: '字号比',
    re: /正文约\s*\d+px[^。]*\d+(\.\d+)?\s*倍|最大标题[^。]*\d+/,
    why: '需要写出「正文约 Npx」+「最大标题 N 倍」',
  },
  lineWidths: {
    label: '线宽',
    re: /线宽只用这几级：\s*[\d.]/,
    why: '需要明列线宽级数',
  },
  palette: {
    label: '配色',
    re: /配色只用这几个值：\s*#[0-9A-Fa-f]{6}/,
    why: '需要给出具体色值',
  },
  imgs: {
    label: '图片数',
    /* 提示词里目前**从不**给图片数量 —— 它给的是「设计规模 N 个服务格」，
     * 那是条目数不是图片数。所以这条大概率是全 0，这本身就是发现。 */
    re: /(\d+)\s*[张幅个]\s*图|图片[^。]*\d+\s*[张个]/,
    why: '需要明确图片数量下限',
  },
};

const rows = [];
for (const id of ids) {
  const p = join(BLIND, id, 'task.txt');
  if (!existsSync(p)) continue;
  const t = readFileSync(p, 'utf8');
  const r = { id, bytes: Buffer.byteLength(t) };
  for (const [k, c] of Object.entries(CHECKS)) r[k] = c.re.test(t);
  rows.push(r);
}

const w = (s, n) => String(s).padEnd(n);
console.log(w('案', 5) + w('字节', 7) + Object.values(CHECKS).map((c) => w(c.label, 9)).join(''));
console.log('─'.repeat(5 + 7 + Object.keys(CHECKS).length * 9));
for (const r of rows) {
  console.log(w(r.id, 5) + w(r.bytes, 7) +
    Object.keys(CHECKS).map((k) => w(r[k] ? '有' : '无', 9)).join(''));
}
console.log('\n=== 覆盖率（有指令的案数 / 总案数）===');
for (const [k, c] of Object.entries(CHECKS)) {
  const n = rows.filter((r) => r[k]).length;
  console.log(`  ${w(c.label, 8)} ${n}/${rows.length}   ${c.why}`);
}
console.log('\n结论：只有覆盖率高的量才能当验货判据；覆盖率低的量即使测出差异，也该记 INFO。');
