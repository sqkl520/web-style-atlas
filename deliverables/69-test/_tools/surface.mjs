// 汇总 30 案提示词里的「可机械验证」表面：色数、线宽级数、圆角、阴影、数字型结构线索。
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const OUT = 'D:/Web/style/deliverables/69-test/_staging';
const idx = JSON.parse(readFileSync(join(OUT, 'index.json'), 'utf8'));
const rows = [];
for (const r of idx) {
  const p = readFileSync(join(OUT, `prompt-${r.id}.txt`), 'utf8');
  const lines = p.split('\n');
  const pal = lines.find((l) => l.startsWith('1. 配色')) || '';
  const font = lines.find((l) => l.startsWith('2. 字体')) || '';
  const rad = lines.find((l) => l.startsWith('3. 圆角')) || '';
  const sh = lines.find((l) => l.startsWith('4. 阴影')) || '';
  const lw = lines.find((l) => l.startsWith('5. 线宽')) || '';
  const mech = lines.find((l) => l.startsWith('这个风格的签名动作')) || '';
  const hexes = (pal.match(/#[0-9A-Fa-f]{6}/g) || []);
  const lwVals = (lw.match(/[\d.]+px/g) || []);
  // 机制句里的数字/可数线索
  const mechNums = (mech.match(/\d+(\.\d+)?(px|%|°| 个| 块| 栏| 行| 列| 条| 处| 段| 级| 档)?/g) || []);
  rows.push({
    id: r.id, n: r.minItems, pics: r.minPics, deg: r.degrades ? 'yes' : 'no',
    hexN: hexes.length, hexes: hexes.join(' '),
    lwN: lwVals.length, lw: lwVals.join(' '),
    radTxt: rad.slice(4, 60), shTxt: sh.slice(4, 70),
    tone: r.tone,
    mechShort: mech.replace(/^这个风格的签名动作：/, '').slice(0, 90),
    mechNumN: mechNums.length,
    hasPull: /--pull/.test(p) ? 'PULL' : '',
  });
}
writeFileSync(join(OUT, 'surface.json'), JSON.stringify(rows, null, 2), 'utf8');
for (const r of rows) {
  console.log(`${r.id}\tN=${r.n}\tpics=${r.pics}\tdeg=${r.deg}\thex=${r.hexN}\tlw=${r.lwN}(${r.lw})\t${r.hasPull}\t${r.tone}`);
}
console.log('\n-- 机制句 --');
for (const r of rows) console.log(`${r.id}\t[${r.mechNumN}数]\t${r.mechShort}`);
