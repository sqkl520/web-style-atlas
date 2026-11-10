import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
const ROOT = 'D:/Web/style';

console.log('=== 核实：执行 Agent 把 h1Size 从 72px 改成 40px 是否正确？===\n');

const cases = ['S04-mango-collage-wall', 'S05-pixel-cold-storage-console', 'S03-long-exposure-observatory'];
for (const d of cases) {
  const id = d.slice(0, 3);
  const css = readFileSync(join(ROOT, 'prototypes', d, 'style.css'), 'utf8');
  console.log(`\n──── ${id} (${d}) ────`);
  // 找所有与 h1 相关的 font-size 规则
  const lines = css.split(/\r?\n/);
  lines.forEach((l, i) => {
    if (/h1/.test(l) || /--fs-h1|--display|clamp\(/.test(l)) {
      console.log(`  ${String(i + 1).padStart(4)}: ${l.trim().slice(0, 150)}`);
    }
  });
}
