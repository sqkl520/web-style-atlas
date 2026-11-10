// 绕过 process.exit 读 findStale：把源码里的 CLI 部分截掉再求值
import { readFileSync } from 'node:fs';
const ROOT = 'D:/Web/style';

let src = readFileSync(ROOT + '/prototypes/_build/check-stale.mjs', 'utf8');
// 截掉 `const stale = findStale();` 之后的所有 CLI 代码
const cut = src.indexOf('const stale = findStale();');
if (cut < 0) { console.log('找不到 CLI 入口'); process.exit(1); }
src = src.slice(0, cut);
// 把 import 换成绝对路径
src = src.replace(/from ['"]\.\/_entries\.mjs['"]/, `from 'file:///D:/Web/style/prototypes/_build/_entries.mjs'`);
// 把 URL('..', import.meta.url) 换成硬编码（因为要写到临时文件里执行）
src = src.replace(/const P = .*?;/, `const P = 'D:/Web/style/prototypes';`);
src += `\nglobalThis.__findStale = findStale;\n`;

// 写到仓库内临时文件（确保 import 相对路径有效）
const tmp = ROOT + '/deliverables/70-plan/_findstale-probe.mjs';
const { writeFileSync } = await import('node:fs');
// 保留原 import 语句（node:fs / node:path）与 _entries 的绝对路径
writeFileSync(tmp, src, 'utf8');

const mod = await import('file:///' + tmp.replace(/\\/g, '/') + '?t=' + Date.now());
const rows = mod.findStale?.() || globalThis.__findStale?.();
console.log('=== findStale() 返回的完整数组 ===');
console.log(JSON.stringify(rows, null, 1));
console.log(`\n条数: ${rows ? rows.length : 'null'}`);
