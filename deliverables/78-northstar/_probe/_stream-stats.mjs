/* 分析某个沙箱 stream：thinking / 工具调用 / 是否越界访问别案目录。
 * 用法：node _stream-stats.mjs S04 [更多案号...] */
import { readFileSync, existsSync } from 'node:fs';

const ids = process.argv.slice(2).filter((a) => /^S\d{2}$/.test(a));
if (!ids.length) { console.log('用法: node _stream-stats.mjs S04 [S08 ...]'); process.exit(2); }

for (const id of ids) {
  const p = `C:/tmp/bb/${id}/stream.jsonl`;
  if (!existsSync(p)) { console.log(`${id}: 没有 stream.jsonl`); continue; }
  const lines = readFileSync(p, 'utf8').split('\n').filter((l) => l.trim().startsWith('{'));

  let thinking = 0, textN = 0, tools = [], finished = null;
  for (const l of lines) {
    let j;
    try { j = JSON.parse(l); } catch { continue; }
    if (j.type === 'system' && j.subtype === 'thinking_tokens') thinking++;
    if (j.type === 'assistant') {
      for (const x of j.message?.content || []) {
        if (x.type === 'thinking') thinking++;
        if (x.type === 'text') textN++;
        if (x.type === 'tool_use') tools.push({ name: x.name, input: JSON.stringify(x.input) });
      }
    }
    if (j.type === 'result') finished = j.subtype;
  }

  /* 越界检查：任何指向 C:\tmp\bb\<别的案号> 的调用 */
  const leaks = [];
  for (const t of tools) {
    for (const m of t.input.matchAll(/tmp[\\/]+bb[\\/]+(S\d{2})/gi)) {
      if (m[1].toUpperCase() !== id.toUpperCase()) leaks.push({ tool: t.name, target: m[1], input: t.input.slice(0, 160) });
    }
  }

  const outHtml = existsSync(`C:/tmp/bb/${id}/out.html`);
  const outIndex = existsSync(`C:/tmp/bb/${id}/index.html`);
  console.log(`${id}: ${lines.length} 行 | thinking ${thinking} | text ${textN} | 工具 ${tools.length} | ` +
    `result=${finished || '(未完成)'} | 产物 out=${outHtml} index=${outIndex}`);
  if (leaks.length) {
    console.log(`  ⚠ ${leaks.length} 处指向别案：`);
    for (const lk of leaks.slice(0, 5)) console.log(`    [${lk.tool}] -> ${lk.target}  ${lk.input}`);
  }
}
