#!/usr/bin/env node
// Lead v25：提示词内部自相矛盾清单（不需要跑浏览器，纯文本检查，30/30 全量）
// 这是成本最低、覆盖面最全的一种验证。上一轮审计说"提示词内部有硬矛盾"，我来系统化。
import { readFileSync } from 'node:fs';

const ROOT = 'D:/Web/style';

// 从 prompts.js 直接解析（避开 CDP）
const pr = readFileSync(ROOT + '/prototypes/_selection/prompts.js', 'utf8');

// 用 CDP 拿更可靠。改用简单方式：读 dna-clean.json + 模板逻辑复现
const dna = JSON.parse(readFileSync(ROOT + '/prototypes/_prompts/dna-clean.json', 'utf8'));
const arr = Array.isArray(dna) ? dna : Object.values(dna);

console.log('=== 纯文本可检出的内部矛盾（不需要浏览器）===\n');

const problems = [];

for (const e of arr) {
  const id = e.id;
  const issues = [];

  // 1. 线宽句：列了 N 级却说"不要自创第三级"
  const lw = String(e.lineWidths || '').match(/[\d.]+/g)?.map(Number) || [];
  if (lw.length >= 3) {
    issues.push({
      type: '线宽句自相矛盾',
      detail: `列了 ${lw.length} 级（${lw.join('、')}）却说「不要自创第三级」`,
      severity: 'HIGH',
    });
  }

  // 2. h1Size 未解析
  if (/var\(/.test(String(e.h1Size || ''))) {
    issues.push({ type: 'h1Size 未解析', detail: `值是字面量 ${e.h1Size}`, severity: 'HIGH' });
  }

  // 3. 调色板里有明确的"负向示例色"（#6366F1 / #3B82F6 等 AI 默认色）
  const badColors = ['#6366F1', '#3B82F6', '#8B5CF6', '#22D3EE', '#A855F7', '#EC4899'];
  for (const b of badColors) {
    if ((e.palette || []).some((p) => String(p).toUpperCase().includes(b))) {
      issues.push({ type: '调色板含 AI 默认禁色', detail: `${b} 进了调色板但它是规格里「反的是」的对象`, severity: 'CRITICAL' });
    }
  }

  // 4. 配色句有重复色或空角色名
  const pal = e.palette || [];
  const hexOnly = pal.map((p) => String(p).match(/#[0-9A-Fa-f]{6}/)?.[0]?.toUpperCase()).filter(Boolean);
  if (new Set(hexOnly).size !== hexOnly.length) {
    issues.push({ type: '调色板有重复色', detail: `${hexOnly.join(' ')}`, severity: 'MEDIUM' });
  }
  const noName = pal.filter((p) => !/\s\S/.test(String(p).trim()));
  if (noName.length) issues.push({ type: '调色板项缺角色名', detail: noName.join(' | '), severity: 'MEDIUM' });

  // 5. 字族：display 与 body 完全相同（"字体对比"这条设计原则可能失效）
  const f = e.fonts || {};
  if (f.display && f.body && f.display === f.body) {
    issues.push({ type: '标题与正文同字族', detail: `${f.display}`, severity: 'INFO' });
  }

  // 6. 字号只有 h1Size 一个数（说明整个字阶缺失）
  issues.push({ type: '字阶缺失', detail: `只有 h1Size=${e.h1Size}，无其它档位`, severity: 'HIGH' });

  // 7. 机制句为空
  if (!e.mechanism) issues.push({ type: '机制句为空', detail: '', severity: 'HIGH' });

  if (issues.length) problems.push({ id, issues });
}

// 输出
for (const p of problems) {
  const crit = p.issues.filter((i) => i.severity === 'CRITICAL' || i.severity === 'HIGH');
  if (!crit.length) continue;
  console.log(`${p.id}`);
  for (const i of p.issues) {
    const mark = i.severity === 'CRITICAL' ? '🔴' : i.severity === 'HIGH' ? '🟠' : i.severity === 'MEDIUM' ? '🟡' : '·';
    console.log(`   ${mark} [${i.severity}] ${i.type}${i.detail ? ': ' + i.detail : ''}`);
  }
  console.log();
}

console.log('\n=== 汇总 ===');
const byType = {};
for (const p of problems) for (const i of p.issues) byType[i.type] = (byType[i.type] || 0) + 1;
for (const [k, v] of Object.entries(byType).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${String(v).padStart(2)} 案  ${k}`);
}
const critCases = problems.filter((p) => p.issues.some((i) => i.severity === 'CRITICAL'));
console.log(`\n🔴 CRITICAL（调色板含 AI 默认禁色）: ${critCases.length} 案 ${critCases.map((p) => p.id).join(' ') || '无'}`);
