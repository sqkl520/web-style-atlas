/* 验证 gradient 线宽抽取：把 CSS 里 repeating-linear-gradient 的硬停宽度
 * 手工独立算一遍，与 dna-clean.json 的 lineWidths 对照。
 *
 * 为什么需要这个独立脚本：闸门（check-prompts.mjs）和抽取器（clean-dna.mjs）
 * 现在用的是同一套判据。同一套判据写两遍，只能证明"两次算得一样"，
 * 不能证明"算得对"。这里换一种写法重算 —— 纯粹的字符串切分，不走变量解析，
 * 只看字面上 `Xpx Ypx` 之间的差。
 *
 * 用法：node _verify-gradient-widths.mjs
 */
import { readFileSync, readdirSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const PROTOS = join(ROOT, 'prototypes');

/* 独立实现：不用 resolveVars，不解析 @media。只看字面 px。
 * 返回 Map<schemeId, Set<number>> */
function literalGradientWidths(css) {
  const out = new Set();
  /* 逐字符扫，遇 repeating-linear-gradient( 就配平括号取整段 */
  const tag = 'repeating-linear-gradient(';
  let at = css.toLowerCase().indexOf(tag);
  while (at >= 0) {
    let i = at + tag.length, depth = 1;
    while (i < css.length && depth > 0) {
      if (css[i] === '(') depth++;
      else if (css[i] === ')') depth--;
      if (depth === 0) break;
      i++;
    }
    const body = css.slice(at + tag.length, i);
    /* 按深度切色标 */
    const stops = [];
    let d = 0, cur = '';
    for (const ch of body) {
      if (ch === '(') d++;
      if (ch === ')') d--;
      if (ch === ',' && d === 0) { stops.push(cur); cur = ''; continue; }
      cur += ch;
    }
    stops.push(cur);
    for (const raw of stops) {
      const s = raw.trim();
      if (/^to\s|^at\s|deg$|^\.?\d+deg/.test(s)) continue;          // 方向，不是色标
      if (/^transparent\b/i.test(s)) continue;                       // 间隙
      /* 取这个色标里所有 px 值。要两个才有区间。 */
      const px = [...s.matchAll(/(\d+(?:\.\d+)?)px/g)].map((m) => parseFloat(m[1]));
      /* `color 0 1px` 这种，0 是不带单位的 —— 只认带 px 的部分会少一个，
         但 0 与第一个 px 常常就是区间。补一条：色标里出现裸 0 时视作起点 */
      const bare0 = /(^|\s)0(\s|$)/.test(s);
      const seq = bare0 && px.length === 1 ? [0, px[0]] : px;
      if (seq.length >= 2) {
        const w = Math.round((seq[1] - seq[0]) * 100) / 100;
        if (w > 0 && w <= 8) out.add(w);
      }
    }
    at = css.toLowerCase().indexOf(tag, i + 1);
  }
  return out;
}

const cleanRaw = JSON.parse(readFileSync(join(ROOT, 'prototypes/_prompts/dna-clean.json'), 'utf8'));
const cleanArr = Array.isArray(cleanRaw) ? cleanRaw : Object.values(cleanRaw);

const dirs = readdirSync(PROTOS, { withFileTypes: true })
  .filter((d) => d.isDirectory() && /^S\d{2}-/.test(d.name))
  .map((d) => d.name);

let checked = 0, agreed = 0;
const rows = [];
for (const dir of dirs) {
  const id = dir.slice(0, 3);
  let css;
  try { css = readFileSync(join(PROTOS, dir, 'style.css'), 'utf8'); } catch { continue; }
  const mine = literalGradientWidths(css);
  if (!mine.size) continue;
  const rec = cleanArr.find((x) => x && x.id === id);
  if (!rec) continue;
  const claimed = [...String(rec.lineWidths || '').matchAll(/(\d+(?:\.\d+)?)px/g)].map((m) => parseFloat(m[1]));
  /* 独立算出来的每一级必须在提示词的档位表里。
   * 注意方向：抽取器可能因为 @media 过滤少收（降级态不算），这是**对的**；
   * 反过来，提示词声称的每一级必须在 CSS 字面上成立 —— 这才是要查的。 */
  const missing = [...mine].filter((w) => !claimed.some((c) => Math.abs(c - w) < 0.01 || Math.abs(c - Math.ceil(w)) < 0.01));
  /* 残缺检测：字面有的但没进档位表的，只在我们知道原因时才算通过 */
  checked++;
  rows.push({ id, literal: [...mine].sort((a, b) => a - b), claimed, missing });
  if (!missing.length) agreed++;
}

console.log('=== gradient 线宽：字面独立重算 vs 提示词档位表 ===\n');
for (const r of rows) {
  const ok = r.missing.length === 0;
  console.log(
    `${ok ? '✓' : '✗'} ${r.id}  字面[${r.literal.join('、')}]  档位表[${r.claimed.join('、')}]` +
      (ok ? '' : `  ← 字面有但档位表没有: ${r.missing.join('、')}`)
  );
}
console.log(`\n${agreed}/${checked} 案的 CSS 字面线宽全部体现在档位表里`);

/* 反向检查：档位表里有没有凭空多出来的（字面找不到、又不在 border 里） */
console.log('\n=== 反向：字面 gradient 里没有、但档位表声称的（可能是 border 来的，需人工看）===');
for (const r of rows) {
  const extra = r.claimed.filter((c) => !r.literal.some((w) => Math.abs(w - c) < 0.01));
  if (extra.length) console.log(`· ${r.id}  档位表多出 [${extra.join('、')}]（若来自 border 属正常）`);
}

/* ── 怎么读这个结果 ────────────────────────────────────────────────────
 *
 * 本脚本**故意**不做 @media 过滤（它是独立实现，不走 resolveVars/conditionApplies），
 * 所以「字面有、档位表没有」有两种可能，必须分别看：
 *
 *   a) 抽取器对了，本脚本把降级态算进来了 —— 这是**预期内的不一致**。
 *      实例：S31 在 @media (prefers-reduced-motion: reduce)（style.css:574-585）
 *      里把刻度一次性加粗到 2px。那是降级态，不是桌面版式线宽，抽取器排掉它对。
 *      所以 S31 的 2px 出现在上面那行「字面有但档位表没有」是**健康的**。
 *
 *   b) 抽取器漏了 —— 那才是缺陷。判据：那个值所在的位置**不在**任何
 *      prefers-reduced-motion / print / max-width 里。
 *
 * 同理，反向那一段里 S23 多出的 1.5px / 6px 也不是错：它们来自 border 与别的声明，
 * 本脚本只扫 gradient，当然看不到。
 */
