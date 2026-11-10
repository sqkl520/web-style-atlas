// 建立 3 个案例的隔离目录：PROMPT.md 逐字节复制（避免转录误差），只放提示词。
import { copyFileSync, mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = 'D:/Web/style/deliverables/69-test';
const STAGE = join(ROOT, '_staging');
const CASES = ['S20', 'S21', 'S28'];

for (const id of CASES) {
  const dir = join(ROOT, id);
  mkdirSync(join(dir, 'shots'), { recursive: true });
  mkdirSync(join(dir, 'images'), { recursive: true });
  copyFileSync(join(STAGE, `prompt-${id}.txt`), join(dir, 'PROMPT.md'));
  console.log('ok', dir, existsSync(join(dir, 'PROMPT.md')));
}
