#!/usr/bin/env node
/* 攻击 F：① 配色判据只查"缺"，不查"多"。
 *
 * 提示词第 1 条最后一句是「不新增更多彩色」—— 这是一条封闭指令。
 * 但 ① 的全部计算是：
 *   want = 提示词里的 hex 去重数
 *   got  = 其中在 HTML 里出现了几个
 * 产物里凭空多出来的颜色（比如 #FF00FF、紫色渐变、奶白阴影）不在判据视野里。
 *
 * 本探针直接跑 ① 的算法，并额外算"多出来的"，两者并列显示。
 */
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { BT, score } from './_rt-scorelib.mjs';

const ids = readdirSync(BT, { withFileTypes: true })
  .filter(d => d.isDirectory() && /^S\d/.test(d.name)).map(d => d.name).sort();

console.log('══ F1 真实产物：提示词 hex vs 产物 hex ══\n');
let any = 0;
for (const id of ids) {
  const hp = join(BT, id, 'index.html'), pp = join(BT, id, '_prompt.txt');
  if (!existsSync(hp) || !existsSync(pp)) continue;
  const h = readFileSync(hp, 'utf8'), p = readFileSync(pp, 'utf8');
  const promptHex = new Set((p.match(/#[0-9A-Fa-f]{6}\b/g) || []).map(x => x.toUpperCase()));
  /* 产物里出现的 hex 集合 —— 按 ① 的口径（6 位） */
  const htmlHex = new Set((h.match(/#[0-9A-Fa-f]{6}\b/g) || []).map(x => x.toUpperCase()));
  const extra = [...htmlHex].filter(x => !promptHex.has(x));
  const r = score(id);
  if (extra.length) {
    any++;
    console.log(`  ${id}  提示词 ${promptHex.size} 个 hex，产物 ${htmlHex.size} 个；` +
      `多出 ${extra.length} 个：${extra.slice(0, 6).join(' ')}${extra.length > 6 ? ' …' : ''}`);
    console.log(`       ① 的输出：${r.colors.got}/${r.colors.want} 个出现${r.colors.missing.length ? '；缺 ' + r.colors.missing.join(' ') : ''}　← 一个字都没提"多出 ${extra.length} 个"`);
  }
}
console.log(`\n  ${any}/${ids.length} 案的产物含提示词未点名的 hex，① 全部未报。`);

console.log('\n══ F2 #fff 简写 vs #FFFFFF ══\n');
{
  /* 提示词给 #FFFFFF，产物写 #fff —— 同一个颜色，两种字面。
   * ① 用的是 /#[0-9A-Fa-f]{6}\b/，三位简写根本不在正则里。 */
  const probeId = 'S99probe';
  const TMP = join(BT, probeId);
  const prompt = '1. 配色只用这几个值：#C1121F（red）、#EFE7D7（paper）、#1A1614（ink）、#6E6A5E（lead）。页面底色用 #EFE7D7。';
  const html = `<!DOCTYPE html><html><head><style>
    body{background:#EFE7D7;color:#1A1614}
    .a{color:#C1121F}
    .b{color:#6E6A5E}
    .c{color:#fff}      /* 新增白色，用简写 */
    .d{color:#000}      /* 新增黑色，用简写 */
  </style></head><body></body></html>`;
  const { mkdirSync, writeFileSync, rmSync } = await import('node:fs');
  rmSync(TMP, { recursive: true, force: true });
  mkdirSync(TMP, { recursive: true });
  writeFileSync(join(TMP, 'index.html'), html);
  writeFileSync(join(TMP, '_prompt.txt'), prompt);
  const r = score(probeId);
  rmSync(TMP, { recursive: true, force: true });
  const promptHex = new Set((prompt.match(/#[0-9A-Fa-f]{6}\b/g) || []).map(x => x.toUpperCase()));
  const htmlHex = new Set((html.match(/#[0-9A-Fa-f]{6}\b/g) || []).map(x => x.toUpperCase()));
  console.log(`  提示词 4 色全用对，另加 #fff + #000 两个新色（简写）`);
  console.log(`  ① 输出：${r.colors.got}/${r.colors.want}，missing=${JSON.stringify(r.colors.missing)}`);
  console.log(`  三位 hex 是否被计入产物色：${[...htmlHex].join(' ')}`);
  console.log(`  → 判据把 #fff/#000 读成"不存在"，所以即使想查"多"也查不到。`);
}

console.log('\n══ F3 rgb()/hsl()/颜色关键字写法 ══\n');
{
  /* 提示词给 #C1121F，产物写成 rgb(193,18,31) —— 同一个颜色。 */
  const probeId = 'S99probe';
  const TMP = join(BT, probeId);
  const prompt = '1. 配色只用这几个值：#C1121F（red）、#EFE7D7（paper）、#1A1614（ink）、#6E6A5E（lead）。页面底色用 #EFE7D7。';
  const html = `<!DOCTYPE html><html><head><style>
    body{background:rgb(239,231,215);color:rgb(26,22,20)}
    .a{color:rgb(193,18,31)}
    .b{color:rgb(110,106,94)}
  </style></head><body></body></html>`;
  const { mkdirSync, writeFileSync, rmSync } = await import('node:fs');
  rmSync(TMP, { recursive: true, force: true });
  mkdirSync(TMP, { recursive: true });
  writeFileSync(join(TMP, 'index.html'), html);
  writeFileSync(join(TMP, '_prompt.txt'), prompt);
  const r = score(probeId);
  rmSync(TMP, { recursive: true, force: true });
  console.log(`  4 色全部用 rgb() 写，语义完全正确`);
  console.log(`  ① 输出：${r.colors.got}/${r.colors.want}，missing=${JSON.stringify(r.colors.missing)}`);
  console.log(`  → 正确实现被判成"4 个色全缺"。这是假阳性方向。`);
}