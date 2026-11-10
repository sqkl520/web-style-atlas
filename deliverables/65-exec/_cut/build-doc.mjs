/* 把 EXEC-data-cut.tpl.md 里的 {{占位符}} 换成实跑产出的原文，写 deliverables/65-exec/EXEC-data-cut.md。
 *
 * 为什么用占位符而不是手抄：文档里那几段是**证据**，手抄一个字都可能走样。
 * 这里每一段都直接来自一次真实运行的日志文件；重跑本脚本即可重放整份文档。
 * 唯一需要手写的是散文部分（模板里的说明文字）。
 */
import fs from 'node:fs';

const R = (p) => fs.readFileSync(p, 'utf8').replace(/\r\n/g, '\n').trimEnd();

/* ── {{S13FULL}}：S13 改前/改后全文 + 切掉的片段 ───────────────────────── */
const forDoc = R('deliverables/65-exec/_cut/for-doc.md');
const s13full = forDoc.slice(forDoc.indexOf('### 改前（780 字'), forDoc.indexOf('## 素材 ②'))
  .replace(/^### /gm, '#### ')
  .trimEnd();

/* ── {{SHATABLE}}：30 案 sha256 全 64 位对照表 ─────────────────────────── */
const shaTable = forDoc.slice(forDoc.indexOf('| 案号 | 改前长度 |'), forDoc.indexOf('## 素材 ③'))
  .replace(/^\n+/, '')
  .trimEnd();

/* ── {{KEYORDER}}：键序对照表 + 两组键序原文 ───────────────────────────── */
const keyorder = forDoc.slice(forDoc.indexOf('| 项 | 改前 | 改后 |'))
  .replace(/\*\*注意：改前就已经是 audit 在 risk 之前\*\*[\s\S]*$/, '')
  .trimEnd();

/* ── 其余占位符直接读对应日志 ─────────────────────────────────────────── */
const map = {
  '{{SCAN}}': R('deliverables/65-exec/_cut/scan-before-after.md'),
  '{{S13FULL}}': s13full,
  '{{SHATABLE}}': shaTable,
  '{{KEYORDER}}': keyorder,
  '{{ACCEPT}}': R('deliverables/65-exec/_cut/accept.txt'),
  '{{REGEX}}': R('deliverables/65-exec/_cut/regex-probe.txt'),
  '{{FRAGILE}}': R('deliverables/65-exec/_cut/regex-fragility.txt'),
};

let doc = R('deliverables/65-exec/_cut/EXEC-data-cut.tpl.md');
for (const [k, v] of Object.entries(map)) {
  if (!doc.includes(k)) { console.error('⚠ 模板里没有占位符 ' + k); continue; }
  doc = doc.split(k).join(v);
}
const left = doc.match(/\{\{[A-Z0-9_]+\}\}/g);
if (left) { console.error('⚠ 还有没替换的占位符：' + left.join(' ')); process.exitCode = 1; }

fs.writeFileSync('deliverables/65-exec/EXEC-data-cut.md', doc + '\n', 'utf8');
console.log('已写 deliverables/65-exec/EXEC-data-cut.md');
console.log('  行数 ' + doc.split('\n').length + '｜字符 ' + doc.length + '｜UTF-8 字节 ' + Buffer.byteLength(doc, 'utf8'));
