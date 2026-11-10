// 探针 22：确认 layout/visuals/motion/landing 是「渲染了」还是「只在搜索索引里」
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, loadSchemes, loadPrompts } from './lib-load.mjs';

const SEL = join(ROOT, 'prototypes/_selection');
const app = readFileSync(join(SEL, 'app.js'), 'utf8').split(/\r?\n/);
const label = (s, n) => console.log(`${String(n).padStart(4)}| ${app[n - 1]}`);

console.log('=== app.js 里 layout / visuals / motion 的全部出现 ===');
for (const key of ['layout', 'visuals', 'motion']) {
  console.log(`\n----- ${key} -----`);
  app.forEach((l, i) => {
    const ln = i + 1;
    if (new RegExp('(r\\.' + key + '\\b|\\b' + key + '\\s*:)').test(l)) {
      // 判上下文：是否在 hay 数组里
      const inHay = /r\.errorCode, r\.threshold, r\.layout, r\.visuals, r\.quirk,|r\.scenesYes,/.test(l) ||
        app.slice(Math.max(0, i - 6), i + 3).join('').includes('var hay = [');
      const inField = /field\('/.test(l);
      console.log(`${String(ln).padStart(4)}| ${l.trim()}    ${inField ? '→ 渲染进详情面板' : inHay ? '→ 只在搜索索引 hay[]' : ''}`);
    }
  });
}

console.log('\n\n=== 「只在搜索索引」的含义：把字段从 hay 拿掉，用户还能看到吗？ ===');
console.log('详情面板 field() 调用的字段清单（app.js L437-456）:');
for (let i = 437; i <= 456; i++) if (/field\(/.test(app[i - 1])) console.log(`  ${i}| ${app[i - 1].trim()}`);

console.log('\n搜索索引 hay 的字段清单（app.js L146-150）:');
for (let i = 146; i <= 150; i++) console.log(`  ${i}| ${app[i - 1].trim()}`);

// 计算：哪些字段只进 hay、没有 field()
const hayLine = app.slice(145, 150).join(' ');
const hayFields = [...hayLine.matchAll(/r\.(\w+)/g)].map((m) => m[1]);
const fieldLines = app.slice(436, 456).join(' ');
const renderedFields = [...fieldLines.matchAll(/field\('[^']+',\s*(?:\([^)]*\)|r\.(\w+))/g)].map((m) => m[1]).filter(Boolean);
console.log('\nhay 里的 data 字段: ' + [...new Set(hayFields)].join(' '));
console.log('详情面板渲染的 data 字段: ' + [...new Set(renderedFields)].join(' '));
console.log('只进 hay、不渲染: ' + [...new Set(hayFields)].filter((f) => !renderedFields.includes(f)).join(' '));
