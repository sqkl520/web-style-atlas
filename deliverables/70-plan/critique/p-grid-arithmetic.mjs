// 探针：Q3 —— 静态全查「提示词内部硬矛盾」，能不能替代端到端验证？
// 测的是一条可机械判定的矛盾类型：**栅格算术自洽性**。
//   提示词声明「N 栏」「M 块」「每块最窄 k 栏」→ 若 M×k > N 且这些块同处一行，无解。
// 同时把每案的提示词原文按 utf8 落盘，供人工读（PowerShell 控制台编码不可靠）。
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = 'D:/Web/style';
const dump = JSON.parse(readFileSync(join(ROOT, 'deliverables/70-plan/critique/p-prompts-dump.json'), 'utf8'));
const ids = Object.keys(dump.full).sort();

// 1) 全文落盘，一行一案，方便 grep
writeFileSync(join(ROOT, 'deliverables/70-plan/critique/p-prompts-all.txt'),
  ids.map((id) => `\n${'='.repeat(20)} ${id} ${'='.repeat(20)}\n${dump.full[id]}\n`).join(''),
  'utf8');

// 2) 抽「栏」相关算术
const out = [];
for (const id of ids) {
  const t = dump.full[id];
  const lines = t.split('\n');
  const colLine = lines.find((l) => /\d+\s*栏/.test(l)) || '';
  const blk = t.match(/(\d+)\s*块/);
  const cols = t.match(/(\d+)\s*栏/);
  const minW = t.match(/最小\s*(\d+)\s*栏|最窄\s*(\d+)\s*栏/);
  const maxW = t.match(/最大\s*(\d+)\s*栏|最宽\s*(\d+)\s*栏/);
  out.push({
    id,
    cols: cols ? Number(cols[1]) : null,
    blocks: blk ? Number(blk[1]) : null,
    minW: minW ? Number(minW[1] || minW[2]) : null,
    maxW: maxW ? Number(maxW[1] || maxW[2]) : null,
    colLine: colLine.slice(0, 120),
  });
}

const rows = [];
for (const r of out) {
  let verdict = '-';
  if (r.cols && r.blocks && r.minW) {
    const need = r.blocks * r.minW;
    verdict = need > r.cols ? `超栏 ${need}>${r.cols}` : `可容 ${need}<=${r.cols}`;
  }
  rows.push({ ...r, verdict });
}

const txt = [
  'id   栏数  块数  最窄栏  最宽栏  算术判定        声明行',
  ...rows.map((r) =>
    `${r.id} ${String(r.cols ?? '-').padStart(5)} ${String(r.blocks ?? '-').padStart(5)} ` +
    `${String(r.minW ?? '-').padStart(6)} ${String(r.maxW ?? '-').padStart(6)}  ${r.verdict.padEnd(14)} ${r.colLine}`),
  '',
  `出现「N 栏」的案：${rows.filter((r) => r.cols).length}/30`,
  `出现「N 块」的案：${rows.filter((r) => r.blocks).length}/30`,
  `出现「最小/最窄 N 栏」的案：${rows.filter((r) => r.minW).length}/30`,
  `算术上无解的案：${rows.filter((r) => r.verdict.startsWith('超栏')).map((r) => r.id).join(' ') || '无'}`,
].join('\n');

writeFileSync(join(ROOT, 'deliverables/70-plan/critique/p-grid-arithmetic.txt'), txt, 'utf8');
console.log('written');
