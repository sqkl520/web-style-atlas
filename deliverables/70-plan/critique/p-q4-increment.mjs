// 探针：Q4 —— 「再加字号+配比+色板」会加多少条约束？
// 上一轮口径（deliverables/69-audit/PROMPT-VERIFIABILITY.md）：30 条提示词共 1327 条原子约束
//   M 机械可验 646 / S 半可验 540 / J 不可验 141。
// 这里不重抽 1327 条（那是另一支工具的事），只做**增量估算**：数每条提示词里
// 「字号档位数」「面积百分比数」「色值数」，乘以 30，就是新增约束的下界。
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = 'D:/Web/style';
const dump = JSON.parse(readFileSync(join(ROOT, 'deliverables/70-plan/critique/p-prompts-dump.json'), 'utf8'));
const ids = Object.keys(dump.full).sort();

const rows = [];
for (const id of ids) {
  const t = dump.full[id];
  // 现有提示词里已经出现的数值（px 值去重）
  const px = [...new Set((t.match(/\d+(?:\.\d+)?px/g) || []))];
  const hex = [...new Set((t.match(/#[0-9a-fA-F]{6}/g) || []).map((h) => h.toUpperCase()))];
  // 摘要里提到的「栏」数
  const cols = [...new Set((t.match(/(\d+)\s*栏/g) || []))];
  rows.push({ id, pxN: px.length, hexN: hex.length, colN: cols.length, chars: t.length });
}

// 从原型 CSS 侧统计「真实存在多少字号档位」——这是"若要把字号写进提示词"的新增量
import { readdirSync } from 'node:fs';
const P = join(ROOT, 'prototypes');
const DIRS = readdirSync(P, { withFileTypes: true })
  .filter((d) => d.isDirectory() && /^S\d{2}-/.test(d.name)).map((d) => d.name).sort();
const fsCount = [];
for (const dir of DIRS) {
  const css = readFileSync(join(P, dir, 'style.css'), 'utf8');
  const sizes = [...new Set((css.match(/font-size:\s*(\d+(?:\.\d+)?)px/g) || [])
    .map((s) => parseFloat(s.replace(/[^\d.]/g, ''))))];
  const lh = [...new Set((css.match(/line-height:\s*([\d.]+)/g) || []).map((s) => s.replace(/[^\d.]/g, '')))];
  fsCount.push({ id: dir.slice(0, 3), sizes: sizes.length, lh: lh.length, sizeList: sizes.sort((a, b) => a - b) });
}

const totalPx = rows.reduce((a, r) => a + r.pxN, 0);
const totalHex = rows.reduce((a, r) => a + r.hexN, 0);
const totalFs = fsCount.reduce((a, r) => a + r.sizes, 0);
const totalLh = fsCount.reduce((a, r) => a + r.lh, 0);

const rep = [];
rep.push('=== 现有提示词的数值密度 ===');
rep.push(`30 条合计：去重 px 数值 ${totalPx} 个，去重 hex ${totalHex} 个`);
rep.push(`单案 px 数中位 ${rows.map((r) => r.pxN).sort((a, b) => a - b)[15]}，最多 ${Math.max(...rows.map((r) => r.pxN))}`);
rep.push('');
rep.push('=== 若把「字号层级」写进提示词，新增多少 ===');
rep.push('id   CSS 里不同 font-size 档位   不同 line-height 档位');
for (const r of fsCount) rep.push(`${r.id}  ${String(r.sizes).padStart(24)}  ${String(r.lh).padStart(20)}   ${r.sizeList.slice(0, 12).join(' ')}`);
rep.push('');
rep.push(`30 案合计：font-size 档位 ${totalFs} 个（平均 ${(totalFs / 30).toFixed(1)}），line-height 档位 ${(totalLh / 30).toFixed(1)} 个/案`);
rep.push('');
rep.push('=== 三条拟增项的约束增量估算 ===');
rep.push(`① 字号层级：至少 ${totalFs} 条新约束（每案 ${(totalFs / 30).toFixed(1)} 档，每档一条），`);
rep.push(`   若同时给行高则再加 ${totalLh} 条；若按「档位+用途」写（如 h1/h2/正文/注脚）则按每案 6 档 × 30 = 180 条起。`);
rep.push(`② 色板配比：每条提示词已有 ${totalHex} 个色值，给每个色配一个百分比 = 再加 ${totalHex} 条。`);
rep.push(`③ 色板补全（把派生色也写上）：按我 p-derived-vs-new 测的页面 250 个 hex，`);
rep.push(`   现在提示词覆盖约 ${totalHex} 个，补到全量再加约 ${250 - totalHex} 条。`);
rep.push('');
rep.push(`合计增量下界 ≈ ${totalFs + totalHex + (250 - totalHex)} = ${totalFs + 250} 条；`);
rep.push(`相对现有 1327 条，是 +${((totalFs + 250) / 1327 * 100).toFixed(0)}%。`);
rep.push('');
rep.push('=== 关键反问 ===');
rep.push('提示词现在 1639–1998 字承载 1327 条约束 = 约 1.2 字/条。');
rep.push('再加 300+ 条而字数不加，就是每条摊到不足 1 字 —— 那不是"更精确"，是把约束压成噪声。');
rep.push(`若按每条约 8 字写清楚，新增 ${totalFs + 250} 条需要再写 ${((totalFs + 250) * 8 / 1000).toFixed(1)}k 字，`);
rep.push(`提示词会从 1.8k 字涨到约 ${((1800 + (totalFs + 250) * 8) / 1000).toFixed(1)}k 字。`);

writeFileSync(join(ROOT, 'deliverables/70-plan/critique/p-q4-increment.txt'), rep.join('\n'), 'utf8');
console.log('written');
