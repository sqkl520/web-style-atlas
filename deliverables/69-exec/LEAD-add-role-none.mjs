import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';

const ROOT = 'D:/Web/style';
const sha = (s) => createHash('sha256').update(s).digest('hex').slice(0, 16);

for (const id of ['S07', 'S13', 'S21']) {
  const dirs = readdirSync(`${ROOT}/prototypes`).filter(d => d.startsWith(id + '-'));
  if (!dirs.length) { console.log(`${id}: 目录找不到`); continue; }
  const path = `${ROOT}/prototypes/${dirs[0]}/index.html`;
  const before = readFileSync(path, 'utf8');
  const h0 = sha(before);

  // 只给「没有 role 属性」的 <code> 加 role="none"
  let n = 0;
  const after = before.replace(/<code(?![^>]*\brole=)([^>]*)>/g, (m, attrs) => { n++; return `<code role="none"${attrs}>`; });

  if (n === 0) { console.log(`${id}: 无需修改`); continue; }
  writeFileSync(path, after, 'utf8');
  console.log(`${id}: 加了 ${n} 个 role="none"  (sha ${h0} → ${sha(after)}, +${after.length - before.length} 字节)`);
}
