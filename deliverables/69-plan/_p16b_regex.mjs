// 探针 16b：精确验证 lint.mjs 的 shadow / emoji 正则为何在 S13 上误伤。
// 直接 import 不到（lint.mjs 是脚本，不是模块），所以把它的 R 表原文抽出来逐条重建。
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, out } from './_lib.mjs';

const LINT = join(ROOT, 'tools/taste-skill/skills/taste-skill/scripts/lint.mjs');
const src = readFileSync(LINT, 'utf8');
const line = src.split(/\r?\n/).find((l) => l.includes("'shadow'"));
out('=== lint.mjs 里 shadow 这一条规则的原文 ===');
out(line.trim());

// 手工重建（与源码同一字符串）
const m = line.match(/\/(.+)\/([a-z]*),\s*'Shadow/);
const re = new RegExp(m[1], '');
out('\n=== 逐条断言（用真正则测）===');
const cases = [
  'box-shadow: none;',
  'box-shadow: 0 0 #0000;',
  'box-shadow: 0 2px 4px rgba(0,0,0,.2);',
  'box-shadow: inset 0 1px 0 #000;',
  'filter: drop-shadow(2px 2px 3px rgba(0,0,0,.08));',
  '/* 闸门 shadow 的判据不是注释 */',
  'text-shadow: none;',
  '--lift-2: drop-shadow(2px 2px 3px rgba(36,31,23,.08));',
];
for (const c of cases) {
  const hit = c.match(re);
  out(`  ${hit ? 'FAIL ' : 'pass '} ${JSON.stringify(c).padEnd(58)} ${hit ? '→ 命中 ' + JSON.stringify(hit[0]) : ''}`);
}

out('\n=== emoji 规则原文与断言 ===');
const eLine = src.split(/\r?\n/).find((l) => l.includes("'emoji',"));
out(eLine.trim());
const em = new RegExp(eLine.match(/\/(.+)\/([a-z]*),\s*'Emoji/)[1], eLine.match(/\/(.+)\/([a-z]*),\s*'Emoji/)[2]);
for (const c of ['⚠️ 凸（二级）', '<span>⚠</span>', '正常文字']) out(`  ${em.test(c) ? 'FAIL ' : 'pass '} ${JSON.stringify(c)}`);

out('\n=== 结论 ===');
out('  lint.mjs 的 shadow 规则把三类**不是静止态外投影**的东西判成 FAIL：');
out('   1) `box-shadow: none;`（显式声明无阴影）—— 实测命中');
out('   2) `filter: drop-shadow(...)`（_CONTRACT §9.3 明写不算 shadow）—— 实测命中');
out('   3) 注释里的 "shadow" / "box-shadow: ..." 字样 —— 实测命中（注释不渲染）');
out('  emoji 规则同理：注释里的 ⚠️ 被计入，而 tools/taste-skill 的运行时 probe 只扫渲染文本。');
