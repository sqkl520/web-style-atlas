/* 字体来源约束：35 案都必须带，且措辞必须是正面的。
 *
 * 为什么单独一条：
 * 2026-11-23 补进提示词之前，全文 0 处提到 @font-face / woff / @import，
 * 于是 28 份产物里 12 份（43%）只写了族名 —— 本地看着完全正常，
 * 换台机器就换字，开发时不会暴露。这是这个仓库最隐蔽的一档缺陷。
 *
 * 它守三件事：
 *   ① 35/35 都带这句（漏一案的后果是那一案的产物没有字体来源依据）
 *   ② 措辞是正面处方（不含「不要只写…」这类负面点名 —— 按 arXiv 2601.08070，
 *      被点名的做法会被加权）
 *   ③ 三条路都在（CDN / 自托管 / 完整回退链），少一条就等于少一个合法选项
 */
import { readFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createContext, runInContext } from 'node:vm';

const HERE = dirname(fileURLToPath(import.meta.url));
const SEL = join(resolve(HERE, '..', '..', '..'), 'prototypes', '_selection');

const ctx = { window: {}, document: { getElementById: () => null, querySelector: () => null } };
ctx.window = ctx;
createContext(ctx);
for (const f of ['data.js', 'prompts.js', 'prompt-copy.js']) {
  runInContext(readFileSync(join(SEL, f), 'utf8'), ctx, { filename: f });
}

const build = ctx.buildStylePrompt || ctx.window.buildStylePrompt;
if (!build) { console.error('拿不到 buildStylePrompt'); process.exit(1); }

const ids = ctx.SCHEMES.map((s) => s.id);
const LINE = /字体必须写清来源/;

let missing = 0, negative = 0, incomplete = 0;
for (const id of ids) {
  const p = build(id, { biz: 'x', action: 'y', have: 5 });
  const oj = p.search(/^输出要求：/m);
  if (oj < 0) { console.error(`✗ ${id} 没有输出要求段`); missing++; continue; }
  const seg = p.slice(oj);
  const line = seg.split('\n').find((l) => LINE.test(l)) || '';
  if (!line) { console.error(`✗ ${id} 缺字体来源句`); missing++; continue; }

  /* ② 负面点名检查。允许的：「不要为了加载字体牺牲首屏」——
   * 它的宾语是**做法**（牺牲首屏），不是某个可被复制的具体值。
   * 不允许的：「不要只写族名」这种直接点名某个做法的句式。 */
  if (/不要只写|禁止只写|别只写/.test(line)) {
    console.error(`✗ ${id} 措辞含负面点名：「${line.slice(0, 60)}」`);
    negative++;
  }

  /* ③ 三条路都在 */
  const has = {
    cdn: /@import|<link>|公共字体服务/.test(line),
    self: /@font-face/.test(line),
    chain: /回退链/.test(line),
  };
  const lacking = Object.entries(has).filter(([, v]) => !v).map(([k]) => k);
  if (lacking.length) {
    console.error(`✗ ${id} 缺选项：${lacking.join(' ')}`);
    incomplete++;
  }
}

console.log(`字体来源约束：${ids.length} 案`);
console.log(`  缺句 ${missing} ／ 负面措辞 ${negative} ／ 选项不全 ${incomplete}`);

if (missing || negative || incomplete) {
  console.error('\n✗ 字体来源约束不完整');
  process.exit(1);
}
console.log('  ✓ 35/35 都带，措辞正面，三条路齐全');

/* 附带的现状提醒：这条约束生效后还没有任何产物验证过。
 * 不打印的话，下一个人会以为「加了就等于好了」—— 而 §四十六 那一类教训说明
 * 「字段进了提示词」和「产物照做了」之间还隔着一层。 */
console.log('');
console.log('  ⚠️ 还没验证生效：现有产物都不是用带这句的提示词跑的。');
console.log('     验法：跑一个案，看它的 <head> 里有没有 @import / <link> / @font-face。');
