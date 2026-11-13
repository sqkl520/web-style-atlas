/* S21 与成功案的 stream 里，"产物内容"出现过没有？
 *
 * 目的：找一个能区分「在思考要写什么」与「已经在写」的信号。
 * 如果 S21 的 stream 里一次 `<!DOCTYPE` / `<html` 都没有，说明它从未进入
 * 构造产物的阶段 —— 那不是"快写完了但没落盘"，是"一直在权衡要不要开始"。
 */
import { readFileSync } from 'node:fs';

const CASES = [
  ['S21 (stalled)', 'C:/tmp/bb/S21/stream.jsonl'],
  ['S99 (success)', 'deliverables/78-northstar/_probe/_s99-stream-final.jsonl'],
];

const KEYS = ['<!DOCTYPE', '<html', '</html>', '<style', '<div', 'Write', 'out.html', 'index.html'];

for (const [label, p] of CASES) {
  let s;
  try { s = readFileSync(p, 'utf8'); } catch { console.log(label, 'MISSING'); continue; }
  const counts = {};
  for (const k of KEYS) {
    let n = 0, i = 0;
    while ((i = s.indexOf(k, i)) >= 0) { n++; i += k.length; }
    counts[k] = n;
  }
  console.log(label.padEnd(16), JSON.stringify(counts));
}
