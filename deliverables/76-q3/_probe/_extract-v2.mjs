// 第二版：带行号、区分基础规则与媒体查询覆写。
// 「每行可回溯到 CSS」的核心是行号 —— 没有行号的抽取等于没有出处。
import { readFileSync } from 'node:fs';

export function parse(cssPath) {
  const raw = readFileSync(cssPath, 'utf8');
  const lines = raw.split('\n');

  // 逐字符扫，记录每个 { } 块的行范围与所处 media 条件
  const decls = [];          // { sel, prop, val, line, media }
  const mediaStack = [];
  let buf = '';
  let bufStart = 0;
  let i = 0;
  let line = 1;
  let depth = 0;
  let curSel = '';
  let blockStartLine = 1;

  // 简易状态机：跳过注释，记录 @media 嵌套
  let inComment = false;
  while (i < raw.length) {
    const c = raw[i];
    const c2 = raw.slice(i, i + 2);
    if (c === '\n') { line++; i++; continue; }
    if (!inComment && c2 === '/*') { inComment = true; i += 2; continue; }
    if (inComment) { if (c2 === '*/') { inComment = false; i += 2; } else i++; continue; }

    if (c === '{') {
      const head = buf.trim();
      depth++;
      if (head.startsWith('@media')) {
        mediaStack.push(head.replace(/^@media\s*/, '').trim());
        buf = '';
        blockStartLine = line;
      } else if (depth === 1 || (mediaStack.length && depth === mediaStack.length + 1)) {
        curSel = head;
        blockStartLine = line;
        buf = '';
      } else {
        buf = '';
      }
      i++; continue;
    }
    if (c === '}') {
      if (depth === mediaStack.length + (mediaStack.length ? 0 : 0)) {}
      depth--;
      if (mediaStack.length && depth < mediaStack.length) mediaStack.pop();
      buf = '';
      i++; continue;
    }
    if (c === ';' && curSel && depth >= 1) {
      const d = buf.trim();
      const mm = d.match(/^([\w-]+)\s*:\s*([\s\S]+)$/);
      if (mm) decls.push({ sel: curSel, prop: mm[1], val: mm[2].trim(), line: blockStartLine, media: mediaStack[mediaStack.length - 1] || null });
      buf = '';
      i++; continue;
    }
    buf += c;
    i++;
  }
  return decls;
}

const d = parse('prototypes/S17-revenue-stamp-stub/style.css');
console.log('总声明数:', d.length);
console.log('');
console.log('=== grid-template-columns（带行号与 media）===');
d.filter(x => x.prop === 'grid-template-columns').forEach(x => console.log(`  L${x.line} ${x.media ? '[' + x.media + ']' : '[base]'} ${x.sel} → ${x.val}`));
console.log('');
console.log('=== line-height（前 8 条）===');
d.filter(x => x.prop === 'line-height').slice(0, 8).forEach(x => console.log(`  L${x.line} ${x.media ? '[' + x.media + ']' : '[base]'} ${x.sel} → ${x.val}`));
