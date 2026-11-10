/* 边界检查：其余 29 案的 audit 是否以空白开头/结尾（决定 S13 切完要不要 trimEnd 才与全库风格一致）。 */
import fs from 'node:fs';
import vm from 'node:vm';
const sb = { window: {} };
vm.runInNewContext(fs.readFileSync('prototypes/_selection/data.js', 'utf8'), sb);
const recs = sb.window.SCHEMES;
const lead = [], trail = [];
for (const r of recs) {
  const a = String(r.audit || '');
  if (/^\s/.test(a)) lead.push(r.id);
  if (/\s$/.test(a)) trail.push(r.id);
}
console.log('audit 以空白开头：' + (lead.join(' ') || '无'));
console.log('audit 以空白结尾：' + (trail.join(' ') || '无'));
console.log('S13 末字符码点：' + JSON.stringify(String(recs.find((r) => r.id === 'S13').audit.slice(-2))));
