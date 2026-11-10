// 探针 3b：把「提示词声称的色值」分三种真相拆开 —— 这是 A 的关键校准。
//   (a) 色值在 style.css 的 :root 里声明了吗（= 它是这个案子的调色板成员）
//   (b) 有没有任何规则真的引用它（= 它不是死变量）
//   (c) report.json 的 4 类采样里有没有它（= 上一版判据只到这里，会假红）
// 只有 (a) 有 而 (c) 没有，才是"测量覆盖不足"；若 (b) 也没有，才是"提示词说了页面没用"。
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { loadCtx, ROOT, out } from './_lib.mjs';

const w = loadCtx();
const P = w.STYLE_PROMPTS;
const bp = w.buildStylePrompt;
const HEX = /#[0-9A-Fa-f]{6}\b/g;

function analyse(css, hex) {
  const H = hex.toUpperCase();
  // 是否作为变量值声明
  const varDecl = new RegExp('(--[\\w-]+)\\s*:\\s*' + H + '\\b', 'i').exec(css);
  // 直接以字面值出现在任何声明里（排除变量声明行本身）
  let literalUses = 0;
  for (const m of css.matchAll(new RegExp(H, 'gi'))) literalUses++;
  // 通过 var() 引用
  let varUses = 0;
  if (varDecl) {
    const vn = varDecl[1];
    varUses = (css.match(new RegExp('var\\(\\s*' + vn.replace(/[-]/g, '\\-') + '\\b', 'g')) || []).length;
  }
  return { inRoot: !!varDecl, varName: varDecl ? varDecl[1] : null, literalUses, varUses, used: literalUses > 1 || varUses > 0 };
}

const rows = [];
for (const s of P.schemes) {
  const cssPath = join(ROOT, 'prototypes', s.dir, 'style.css');
  const css = existsSync(cssPath) ? readFileSync(cssPath, 'utf8') : '';
  const htmlPath = join(ROOT, 'prototypes', s.dir, 'index.html');
  const html = existsSync(htmlPath) ? readFileSync(htmlPath, 'utf8') : '';
  const t = bp(s.id, { biz: '', action: '' });
  const palLine = t.split('\n').find((l) => /^1\. 配色只用这几个值/.test(l)) || '';
  const claimed = [...new Set(palLine.match(HEX) || [])].map((x) => x.toUpperCase());

  const rep = join(ROOT, 'prototypes', s.dir, '.inspect', 'report.json');
  let sampled = new Set();
  if (existsSync(rep)) {
    const j = JSON.parse(readFileSync(rep, 'utf8'));
    const v = (j.viewports || []).find((x) => x.width === 1440);
    if (v) {
      const c = v.metrics.color;
      sampled = new Set([c.bodyBg, c.button && c.button.bg, ...(c.sectionBgs || []).map((x) => x.color), ...(c.textColors || []).map((x) => x.color)].filter(Boolean).map((x) => x.toUpperCase()));
    }
  }
  const detail = claimed.map((h) => ({ hex: h, ...analyse(css + '\n' + html, h), sampled: sampled.has(h) }));
  rows.push({ id: s.id, claimed, detail });
}

const all = rows.flatMap((r) => r.detail);
const n = all.length;
out(`=== 30 案提示词共声称 ${n} 个色值（去重后逐案）===`);
out(`  (a) 在 style.css/html 里有声明或字面出现 : ${all.filter((x) => x.inRoot || x.literalUses > 0).length}/${n}`);
out(`  (b) 真的有引用（非死变量 / 字面出现 >1 次）: ${all.filter((x) => x.used).length}/${n}`);
out(`  (c) report 的 4 类采样里能对上              : ${all.filter((x) => x.sampled).length}/${n}`);
out('');
out('  ⚠️ 只有 (a)(c) 都缺的才是"提示词说了、页面根本没用"的真缺陷。');
const bad = rows.map((r) => ({ id: r.id, bad: r.detail.filter((d) => !d.used) }));
out(`  真缺陷（(b) 缺）的案与色值：`);
for (const b of bad.filter((x) => x.bad.length)) out(`    ${b.id}: ${b.bad.map((x) => x.hex).join(' ')}`);
out(`  完全干净（(b) 全中）的案数：${bad.filter((x) => !x.bad.length).length}/30`);

out('\n=== 逐案：声称色值 / 有引用 / 被采样 ===');
out('id   声称  有引用  被采样   缺引用的色值');
for (const r of rows) {
  const used = r.detail.filter((d) => d.used).length;
  const samp = r.detail.filter((d) => d.sampled).length;
  const miss = r.detail.filter((d) => !d.used).map((d) => d.hex);
  out(`${r.id}  ${String(r.claimed.length).padStart(4)}  ${String(used).padStart(5)}  ${String(samp).padStart(6)}   ${miss.join(' ') || '—'}`);
}
