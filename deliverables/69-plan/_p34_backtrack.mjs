// 探针 34：lint.mjs 的 shadow 规则为什么把 `box-shadow: none` 判成 FAIL？
// 假设：`\s*` 可回溯 —— 正则先吃掉冒号后的空格再做否定环视，失败后回溯成"不吃空格"，
//       此时环视看到的是" none"（前面带空格），不以 none 开头 → 通过。
// 验证：用同一模式在 " none" 与 "none" 两种对齐下测。
import { out } from './_lib.mjs';

const RE = /box-shadow\s*:\s*(?!none|0 0 #0000|var\(--tw)|\bshadow(-(sm|md|lg|xl|2xl|inner|\[[^\]]+\]))?(?=["'\s`])(?<!-shadow)|drop-shadow\(|\bdrop-shadow(-|\b)|text-shadow\s*:\s*(?!none)/;

const cases = [
  'box-shadow: none;',
  'box-shadow:none;',
  'box-shadow:  none;',
  'box-shadow: none',
  'box-shadow: 0 0 #0000;',
  'box-shadow:0 0 #0000;',
  'box-shadow: 0 2px 4px rgba(0,0,0,.2);',
];
out('=== 同一正则，冒号后空格数不同的行为 ===');
for (const c of cases) {
  const m = c.match(RE);
  out(`  ${String(m ? 'FAIL' : 'pass').padEnd(5)} ${JSON.stringify(c).padEnd(42)} ${m ? '→ 命中 ' + JSON.stringify(m[0]) : ''}`);
}
out('');
out('=== 定位：哪一段命中的 ===');
for (const c of ['box-shadow: none;', 'box-shadow:none;']) {
  const m = c.match(RE);
  out(`  ${JSON.stringify(c)} → match[0]=${JSON.stringify(m && m[0])}  index=${m && m.index}`);
}
out('');
out('=== 结论 ===');
out('  `box-shadow: none;`（冒号后无空格）→ 第一支的 (?!none) 正常生效，不命中；');
out('  `box-shadow: none;`（冒号后 1 个空格）→ \\s* 先吃掉空格，环视见 "none" 失败；');
out('     正则会**回溯**成"只吃冒号、不吃空格"，环视见 " none"（以空格开头）→ 通过 → 判 FAIL。');
out('  这就是 lint.mjs 把「显式声明无阴影」判成「有阴影」的机制。');
