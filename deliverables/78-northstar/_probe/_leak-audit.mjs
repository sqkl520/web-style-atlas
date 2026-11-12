/* 调查 S04 的沙箱 agent 是否读到了别案的内容。
 * 这是隔离性的一次严重检验：如果它能在 C:\tmp\bb\ 下自由漫游，那么
 * 前面所有「盲测」的产物都可能被别的案子污染。 */
import { readFileSync, existsSync } from 'node:fs';

const p = 'C:/tmp/bb/S04/stream.jsonl';
if (!existsSync(p)) { console.log('没有 S04 stream'); process.exit(1); }
const lines = readFileSync(p, 'utf8').split('\n').filter((l) => l.trim().startsWith('{'));

const calls = [];
const results = [];
for (const l of lines) {
  let j;
  try { j = JSON.parse(l); } catch { continue; }
  if (j.type === 'assistant') {
    for (const x of j.message?.content || []) {
      if (x.type === 'tool_use') calls.push({ name: x.name, input: x.input });
    }
  }
  if (j.type === 'user') {
    for (const x of j.message?.content || []) {
      if (x.type === 'tool_result') {
        const c = typeof x.content === 'string' ? x.content : JSON.stringify(x.content);
        results.push({ err: !!x.is_error, text: c });
      }
    }
  }
}

console.log(`工具调用 ${calls.length} 次，结果 ${results.length} 条\n`);

/* 关键检查：有没有任何调用触及 C:\tmp\bb\ 下**别的案**的目录 */
const SUSPECT = /C:[\\/]+tmp[\\/]+bb[\\/]+(S\d{2})/i;
let leaks = [];
calls.forEach((c, i) => {
  const s = JSON.stringify(c.input);
  const m = s.match(SUSPECT);
  if (m && m[1] !== 'S04') {
    leaks.push({ i, tool: c.name, target: m[1], input: s.slice(0, 200), result: results[i] });
  }
});

if (!leaks.length) {
  console.log('✓ 没有触及别案目录');
} else {
  console.log(`⚠ ${leaks.length} 处触及别案目录：\n`);
  for (const lk of leaks) {
    console.log(`  [${lk.tool}] 指向 ${lk.target}`);
    console.log(`    input: ${lk.input}`);
    if (lk.result) {
      console.log(`    结果(${lk.result.err ? 'ERR' : 'ok'}): ${lk.result.text.slice(0, 300)}`);
    }
    console.log('');
  }
}

/* 再查：有没有读到 S31 的 task.txt 或 out.html 的实际内容 */
const GOT_S31_TASK = /只给读数不表态|横向尺规|刻度当骨架/;
const GOT_S31_OUT = /--scale-major|tick-major-len/;
for (const r of results) {
  if (GOT_S31_TASK.test(r.text)) console.log('⚠ 某次工具结果含 S31 提示词的特征文本');
  if (GOT_S31_OUT.test(r.text)) console.log('⚠ 某次工具结果含 S31 产物的特征（--scale-major）');
}
