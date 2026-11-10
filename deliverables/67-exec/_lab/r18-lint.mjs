// r18-lint.mjs — 用仓库自带的 lint.mjs 扫这两个文件，看静态规则怎么说（不修改任何东西）
import { spawnSync } from 'node:child_process';
const r = spawnSync(process.execPath, [
  'tools/taste-skill/skills/taste-skill/scripts/lint.mjs',
  'prototypes/_selection/style.css',
  'prototypes/_selection/app.js',
], { encoding: 'utf8' });
console.log(r.stdout || '');
if (r.stderr) console.log('STDERR:', r.stderr.slice(0, 800));
console.log('exit =', r.status);
