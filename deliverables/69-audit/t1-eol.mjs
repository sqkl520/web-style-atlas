// 行尾符审计：为什么 Select-String / Get-Content / node split('\n') 给出三个不同的行号。
//
// 起因：给 S27 的 @media 里那个 :root 定位时，三个工具分别报 L521 / L507 / L496。
// 这说明 style.css 里混用了 \r\n 与孤立的 \r（旧 Mac 风格）。
// 任何"改第 N 行"的 patch 建议都必须先说清用哪种行号约定，否则改错地方。
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const P = 'D:/Web/style/prototypes';
const OUT = 'D:/Web/style/deliverables/69-audit';
const dirs = readdirSync(P).filter((d) => /^S\d\d-/.test(d)).sort();

const rows = [];
for (const dir of dirs) {
  const buf = readFileSync(join(P, dir, 'style.css'));
  const s = buf.toString('utf8');
  const crlf = (s.match(/\r\n/g) || []).length;
  const loneCR = (s.match(/\r(?!\n)/g) || []).length;
  const loneLF = (s.match(/(?<!\r)\n/g) || []).length;
  // 三种工具的"行号"约定
  const linesByLF = s.split('\n').length;                    // node split('\n')
  const linesByAny = s.split(/\r\n|\r|\n/).length;           // Get-Content 风格
  const linesByCR = s.split(/\r\n|\r/).length;               // Select-String 风格
  rows.push({ id: dir.slice(0, 3), dir, crlf, loneCR, loneLF, linesByLF, linesByAny, linesByCR, mixed: loneCR > 0 });
}

writeFileSync(join(OUT, 't1-eol.json'), JSON.stringify(rows, null, 1), 'utf8');
console.log('id   CRLF  孤立CR  孤立LF  split(\\n)  任意换行  CR风格  混用?');
for (const r of rows) {
  console.log(r.id.padEnd(5), String(r.crlf).padEnd(5), String(r.loneCR).padEnd(7), String(r.loneLF).padEnd(7),
    String(r.linesByLF).padEnd(10), String(r.linesByAny).padEnd(9), String(r.linesByCR).padEnd(6), r.mixed ? '⚠ 是' : '');
}
const bad = rows.filter((r) => r.mixed);
console.log('\n混用行尾符的案：', bad.length, '/30', bad.map((x) => x.id).join(',') || '');
console.log('孤立 CR 总数：', rows.reduce((a, x) => a + x.loneCR, 0));
