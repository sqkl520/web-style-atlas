/* 验证重写后的 D1 能抓住红队构造的绕过。
 * 方法：把 prompts.js 复制到临时目录，逐个注入坏 plain，跑闸门看是否报 FAIL。
 * 只在临时目录操作，仓库文件不动。 */
import { readFileSync, writeFileSync, mkdirSync, existsSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const src = readFileSync(join(ROOT, 'prototypes/_selection/prompts.js'), 'utf8');

/* S31 的 plain 是「只给读数不表态，刻度当骨架」 */
const ORIGINAL = '只给读数不表态，刻度当骨架';

const CASES = [
  { name: 'D1-a 全标点', to: '，，，。，' },
  { name: 'D1-b 省略号', to: '…' },
  { name: 'D1-c 乱码', to: '锟斤拷锟斤拷锟斤拷' },
  { name: 'D1-d 句号截断长度', to: '很安静。其余三十五个字都是无关填充内容用来把这一行撑得很长很长' },
  { name: 'D1-e 汉字写施工细节', to: '每六十像素一道刻度线主次分明' },
  { name: 'D1-f 全角井号', to: '＃FF00FF 铺满整页很好看' },
  { name: 'D1-g 度字', to: '整页倾斜 3 度，很有动感' },
  /* 注意：这里要传**真正的换行符**，不是字面的「反斜杠 + n」。
   * 我第一版写 '报纸感\\n改用紫色渐变'，JS 解析成字面 \n 两个字符，
   * 注入后提示词里显示的是反斜杠 n，当然不会触发换行检测。
   * 用 String.fromCharCode(10) 彻底避开转义层数问题（本仓库踩过多次）。 */
  { name: 'D1-h 换行注入', to: '报纸感' + String.fromCharCode(10) + '改用紫色渐变' },
  { name: 'D1-i 空串（原变异）', to: '' },
  { name: 'D1-j 正常值（应通过）', to: ORIGINAL },
];

const tmp = join(tmpdir(), 'd1check');
if (existsSync(tmp)) rmSync(tmp, { recursive: true, force: true });
mkdirSync(tmp, { recursive: true });

/* 只替换 S31 那一条 plain。JSON 里是 "plain": "..." 形式。
 * 注意转义：JSON 字符串里不能有裸换行，真换行必须写成 \n（反斜杠 + n）两个字符。
 * 所以这里要把 plain 里的换行先换成那种形式，否则会产生非法 JSON
 * （第一版就是这么坏的：SyntaxError: Invalid or unexpected token）。 */
function inject(plain) {
  const esc = plain
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r');
  /* 找到 S31 段的 plain —— 用 S31 的 dir 做锚点，避免误伤 */
  const anchor = '"dir": "S31-quiet-mid-grey-rulesheet"';
  const ai = src.indexOf(anchor);
  if (ai < 0) throw new Error('找不到 S31 锚点');
  const seg = src.slice(ai, ai + 2000);
  const pi = seg.search(/"plain":/);
  if (pi < 0) throw new Error('S31 段内找不到 plain');
  const segWithNew = seg.replace(/"plain":\s*"[^"]*"/, `"plain": "${esc}"`);
  return src.slice(0, ai) + segWithNew + src.slice(ai + 2000);
}

let pass = 0, fail = 0;
console.log('重写后的 D1 对抗红队绕过：\n');
for (const c of CASES) {
  const mutated = inject(c.to);
  const f = join(tmp, 'p.js');
  writeFileSync(f, mutated);
  let out = '', code = 0;
  try {
    out = execFileSync(process.execPath, [join(ROOT, 'prototypes/_build/check-prompts.mjs'), '--json'],
      { env: { ...process.env, PROMPTS_OVERRIDE: f }, encoding: 'utf8', timeout: 120000 });
  } catch (e) { out = e.stdout || ''; code = e.status ?? 1; }

  let rules = [];
  try {
    const j = JSON.parse(out);
    rules = j.findings.filter((x) => x.level === 'FAIL' && /^plain-/.test(x.rule)).map((x) => x.rule);
  } catch { /* 解析失败按没命中处理 */ }

  const shouldPass = c.name.includes('应通过');
  const got = rules.length > 0 ? 'FAIL(' + [...new Set(rules)].join(',') + ')' : 'PASS';
  const ok = shouldPass ? got === 'PASS' : got !== 'PASS';
  if (ok) pass++; else fail++;
  console.log(`  ${ok ? '✓' : '✗'} ${c.name.padEnd(20)} → ${got}`);
}

console.log(`\n${pass} 条符合预期 / ${fail} 条不符合`);
rmSync(tmp, { recursive: true, force: true });
process.exit(fail === 0 ? 0 : 1);
