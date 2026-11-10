// 探针 13：**推翻/确认 0/30 的关键** —— 仓库里到底有没有"照线上提示词实现"的现成产物？
// 候选：62-verify/impl/S07.html S23.html S30.html + 62-verify/prompts/S07.txt S23.txt S30.txt
// 判据：prompts/*.txt 是否 == buildPrompt(id) 的当前输出（逐字符）；impl/*.html 是否用了该提示词里的色值。
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { loadCtx, ROOT, out } from './_lib.mjs';

const w = loadCtx();
const bp = w.buildStylePrompt;
const hexes = (t) => [...new Set((t.match(/#[0-9A-Fa-f]{6}\b/g) || []).map((x) => x.toUpperCase()))];

for (const id of ['S07', 'S23', 'S30']) {
  const pt = join(ROOT, `deliverables/62-verify/prompts/${id}.txt`);
  const ih = join(ROOT, `deliverables/62-verify/impl/${id}.html`);
  if (!existsSync(pt)) { out(`${id}: 无 prompt 文件`); continue; }
  const saved = readFileSync(pt, 'utf8').replace(/^\uFEFF/, '');
  const live = bp(id, { biz: '', action: '' });
  const eq = saved.trim() === live.trim();
  out(`=== ${id} ===`);
  out(`  存档 prompt: ${saved.length} 字  ${saved.split('\n').length} 行`);
  out(`  线上 prompt: ${live.length} 字  ${live.split('\n').length} 行`);
  out(`  逐字符相同 = ${eq}${eq ? '' : '   ← 不是同一条链路'}`);
  if (!eq) {
    // 找第一处不同
    const a = saved.trim(), b = live.trim();
    let i = 0; while (i < Math.min(a.length, b.length) && a[i] === b[i]) i++;
    out(`  第一处不同 @${i}: 存档「${a.slice(i, i + 50).replace(/\n/g, '⏎')}」 vs 线上「${b.slice(i, i + 50).replace(/\n/g, '⏎')}」`);
  }
  const savedHex = new Set(hexes(saved)), liveHex = new Set(hexes(live));
  out(`  存档色值 [${[...savedHex].join(' ')}]`);
  out(`  线上色值 [${[...liveHex].join(' ')}]`);
  if (existsSync(ih)) {
    const h = readFileSync(ih, 'utf8');
    const hh = new Set(hexes(h));
    out(`  impl 色值 [${[...hh].join(' ')}]`);
    out(`  impl ∩ 存档色值 = ${[...hh].filter((x) => savedHex.has(x)).length}/${savedHex.size}    impl ∩ 线上色值 = ${[...hh].filter((x) => liveHex.has(x)).length}/${liveHex.size}`);
    const fontOf = (t) => (t.match(/标题按这个顺序取第一个可用的：([^（]+)/) || [])[1] || (t.match(/标题用 ([^。]+)。/) || [])[1] || '';
    out(`  存档声称标题字体「${fontOf(saved)}」  impl 里出现该字体名 = ${h.includes(fontOf(saved).split('→')[0].trim())}`);
  }
  out('');
}

out('=== 这三个 impl 是不是"照提示词实现"（看 REPLACE-EXPERIMENT / 相关文档怎么说）===');
