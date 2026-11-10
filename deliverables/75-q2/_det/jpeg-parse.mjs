#!/usr/bin/env node
// 解析 JPEG 段结构，定位 offset 51023 落在哪个段；并 dump 附近字节。
import { readFileSync } from 'node:fs';

const F = 'deliverables/75-q2/_det';
const targets = [
  ['run1', `${F}/run1/tablet-page-01.jpg`],
  ['run3', `${F}/run3/tablet-page-01.jpg`],
];

function parseSegments(buf) {
  const segs = [];
  let i = 0;
  while (i < buf.length - 1) {
    if (buf[i] !== 0xff) { i++; continue; }
    let m = buf[i + 1];
    if (m === 0xff) { i++; continue; }
    if (m === 0xd8) { segs.push({ name: 'SOI', start: i, len: 2 }); i += 2; continue; }
    if (m === 0xd9) { segs.push({ name: 'EOI', start: i, len: 2 }); i += 2; continue; }
    if (m >= 0xd0 && m <= 0xd7) { segs.push({ name: 'RST' + (m - 0xd0), start: i, len: 2 }); i += 2; continue; }
    if (m === 0x01) { segs.push({ name: 'TEM', start: i, len: 2 }); i += 2; continue; }
    // 带长度的段
    const L = buf.readUInt16BE(i + 2);
    const names = { 0xe0: 'APP0', 0xe1: 'APP1', 0xe2: 'APP2', 0xdb: 'DQT', 0xc0: 'SOF0', 0xc1: 'SOF1', 0xc2: 'SOF2', 0xc4: 'DHT', 0xdd: 'DRI', 0xda: 'SOS', 0xfe: 'COM' };
    const nm = names[m] || ('0x' + m.toString(16));
    segs.push({ name: nm, start: i, len: L + 2 });
    i += L + 2;
    if (m === 0xda) break; // SOS 之后是熵编码数据
  }
  return segs;
}

for (const [name, path] of targets) {
  const b = readFileSync(path);
  const segs = parseSegments(b);
  console.log(`\n### ${name}  (${b.length} bytes)`);
  for (const s of segs) console.log(`  ${s.name.padEnd(6)} start=${String(s.start).padStart(7)} len=${String(s.len).padStart(6)} end=${s.start + s.len - 1}`);
  const sos = segs.find((s) => s.name === 'SOS');
  console.log(`  -> 51023 落在: ` + (() => {
    const s = segs.find((x) => 51023 >= x.start && 51023 < x.start + x.len);
    if (s) return `${s.name} 段内偏移 ${51023 - s.start}`;
    return `SOS(${sos.start}) 与 EOI 之间的扫描数据区，距 SOS 头 ${51023 - sos.start} 字节，距文件尾 ${b.length - 51023} 字节`;
  })());
  // hex dump 51023±48
  const A = 51023 - 48, B = 51023 + 48;
  console.log(`  hex dump [${A}, ${B}):`);
  for (let o = A; o < B; o += 16) {
    const row = [];
    for (let k = 0; k < 16 && o + k < B; k++) row.push(b[o + k].toString(16).padStart(2, '0'));
    console.log(`    ${String(o).padStart(7)}  ${row.join(' ')}`);
  }
  // 前后各 32 字节是否相同
  const other = readFileSync(targets.find(([n]) => n !== name)[1]);
  let beforeDiff = 0, afterDiff = 0;
  for (let o = Math.max(0, 51023 - 512); o < 51023; o++) if (b[o] !== other[o]) beforeDiff++;
  for (let o = 51023 + 1; o < Math.min(b.length, 51023 + 512); o++) if (b[o] !== other[o]) afterDiff++;
  console.log(`  邻域对比(±512B): 前 512B 内差异=${beforeDiff}, 后 512B 内差异=${afterDiff}`);
  console.log(`  该字节值=${b[51023]} (0x${b[51023].toString(16)})`);
}
const a = readFileSync(targets[0][1]), c = readFileSync(targets[1][1]);
console.log(`\n>>> 51023: run1=0x${a[51023].toString(16).padStart(2,'0')}  run3=0x${c[51023].toString(16).padStart(2,'0')}  XOR=0x${(a[51023]^c[51023]).toString(16).padStart(2,'0')}`);
