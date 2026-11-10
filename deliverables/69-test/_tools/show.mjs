import { readFileSync } from 'node:fs';
import { join } from 'node:path';
const OUT = 'D:/Web/style/deliverables/69-test/_staging';
const idx = JSON.parse(readFileSync(join(OUT, 'index.json'), 'utf8'));
const want = process.argv.slice(2);
for (const r of idx) {
  if (want.length && !want.includes(r.id)) continue;
  const p = readFileSync(join(OUT, `prompt-${r.id}.txt`), 'utf8');
  const L = p.split('\n');
  const g = (pre) => (L.find((l) => l.startsWith(pre)) || '').replace(/^\d+\. /, '');
  console.log('==== ' + r.id + '  N=' + r.minItems + ' pics=' + r.minPics + ' ' + (r.degrades ? 'degrades' : 'autoflow') + ' tone=' + r.tone);
  console.log('PLAIN: ' + r.plain);
  console.log('PAL  : ' + g('1. 配色'));
  console.log('FONT : ' + g('2. 字体').slice(0, 210));
  console.log('RAD  : ' + g('3. 圆角'));
  console.log('SHAD : ' + g('4. 阴影'));
  console.log('LW   : ' + g('5. 线宽'));
  console.log('MECH : ' + g('这个风格的签名动作'));
  console.log('');
}
