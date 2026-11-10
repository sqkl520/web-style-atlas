import { readFileSync } from 'node:fs';
const s = readFileSync('tools/taste-skill/skills/taste-skill/scripts/lib/probe.mjs', 'utf8');

// 找 m.type.body 的赋值
const idx = s.indexOf('body: {');
console.log('=== m.type.body 的赋值上下文 ===');
if (idx >= 0) console.log(s.slice(Math.max(0, idx - 1500), idx + 700));
else {
  // 换个找法
  const j = s.indexOf('body=');
  console.log('找不到 body: {，尝试其它定位。body= 位置:', j);
  const k = s.indexOf('.body =');
  console.log('.body = 位置:', k);
  if (k >= 0) console.log(s.slice(Math.max(0, k - 1200), k + 500));
}
