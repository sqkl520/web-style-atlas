// r16-lines.mjs — 打印报告里需要引用的当前行号（并发编辑会让行号漂移，必须现取）
import { readFileSync } from 'node:fs';
const L = readFileSync('prototypes/_selection/style.css', 'utf8').split('\n');
const A = readFileSync('prototypes/_selection/app.js', 'utf8').split('\n');

const show = (title, lines, re) => {
  const out = [];
  lines.forEach((l, i) => { if (re.test(l)) out.push(`   L${i + 1}: ${l.trim().slice(0, 95)}`); });
  console.log(`## ${title}${out.length ? '' : '   (none)'}`);
  out.forEach((x) => console.log(x));
};
show('--ink-3', L, /--ink-3:/);
show('--s-h1 定义', L, /--s-h1:/);
show('var(--s-h1) 引用', L, /var\(--s-h1\)/);
show('.mast h1 (基础)', L, /^\.mast h1 \{/);
show('.mast h1 620档', L, /max\(26px, 6\.6vw\)/);
show('code 0.94em', L, /font-size: 0\.94em/);
show('.mast-kicker', L, /^\.mast-kicker/);
show('.bar 不sticky 注释', L, /不 sticky/);
show('position: sticky', L, /position: sticky/);
show('.scene-tpl 块', L, /^\.scene-tpl \{/);
show('.scene-tpl 字号行', L, /font-size: var\(--s-13\); margin-left: 5px/);
show('.cap', L, /^\.cap \{/);
show('.shot figcaption 基础', L, /^\.shot figcaption \{/);
show('.shot 基础', L, /^\.shot \{/);
show('.row-meta 基础', L, /^\.row-meta \{/);
show('1px 分隔线', L, /border-(top|bottom|left|right)?\s*:\s*1px/);
show('.cap-warn', L, /^\.cap-warn/);
show('.cap-ok', L, /^\.cap-ok/);
console.log('\nstyle.css 总行数:', L.length);
console.log('app.js 总行数:', A.length);
show('app.js cap-warn 分支', A, /if \(cap\.degrades === 'yes'\)/);
show('app.js 内容少于', A, /内容少于 ' \+ cap\.minItems/);
