// 复核任务书给的两个 S19 数字（字数 / hex 数），以及三案的声称值抽取。
import { readFileSync } from 'node:fs';
const S = 'D:/Web/style/deliverables/69-test/_staging';
const p19 = readFileSync(`${S}/prompt-S19.txt`, 'utf8');
const hexes = [...new Set(p19.match(/#[0-9A-Fa-f]{6}/g) || [])];
console.log('S19 字数(codepoints) =', [...p19].length);
console.log('S19 行数 =', p19.split('\n').length);
console.log('S19 hex 总数 =', (p19.match(/#[0-9A-Fa-f]{6}/g) || []).length, ' 去重 =', hexes.length);
console.log('S19 hexes =', hexes.join(' '));
const fontLine = p19.split('\n').find((l) => l.startsWith('2. 字体'));
console.log('S19 字体行 =', fontLine.slice(0, 90));
// 段落结构：是否存在「二、」「三、」这类编号段
console.log('S19 含中文数字章节标题 =', /^[一二三四五六七]、/m.test(p19));
