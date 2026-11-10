// 红队探针公共库（只读；不写仓库任何既有文件）。
// 放在 deliverables/65-plan/ 内，不在仓库根目录。
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

export const ROOT = 'D:/Web/style';
export const PROTO = join(ROOT, 'prototypes');
export const SPECS = join(PROTO, '_specs');

// 与 collect-schemes.mjs 同源的解码器（照抄 dec，便于对照）
export const dec = (s) => String(s).replace(/\*\*/g, '').replace(/`/g, '').replace(/\s+/g, ' ').trim();

// 加载 data.js：它是 `window.SCHEMES = [...]` 的脚本，不能直接 import。
export function loadData() {
  const t = readFileSync(join(PROTO, '_selection', 'data.js'), 'utf8');
  const json = t.slice(t.indexOf('= ') + 2).replace(/;\s*$/, '');
  return JSON.parse(json);
}

export function ids() {
  return readdirSync(PROTO, { withFileTypes: true })
    .filter((d) => d.isDirectory() && /^S\d{2}-/.test(d.name))
    .map((d) => d.name.slice(0, 3))
    .sort();
}

// 手工切 _specs/Sxx.md 的「N. 字段名」块（不复用 collect-schemes 的正则，
// 因为本轮就是要独立复核它的切分结果）。
export function rawSpec(id) {
  return readFileSync(join(SPECS, id + '.md'), 'utf8');
}

// 用三种书写惯例的宽松联合正则切字段，返回 { key: text } 以及每个字段的行号
export function splitSpec(text) {
  const lines = text.split(/\r?\n/);
  const marks = [];
  const NAME = '([^\\n：*\\d][^\\n：*]{0,60}?)';
  const res = [
    new RegExp('^(\\d{1,2})(-附)?[.．]?\\s*' + NAME + '[：:]'),
    new RegExp('^\\*\\*(\\d{1,2})(-附)?[.．]?\\s*' + NAME + '\\*\\*\\s*$'),
    new RegExp('^(\\d{1,2})(-附)?[.．]?\\s*\\*\\*' + NAME + '\\*\\*\\s*[：:]'),
  ];
  lines.forEach((ln, i) => {
    for (const re of res) {
      const m = re.exec(ln);
      if (m) { marks.push({ line: i + 1, num: +m[1], att: !!m[2], key: m[3].replace(/（[^）]*）/g, '').trim(), inline: ln.slice(m[0].length) }); break; }
    }
  });
  const out = {};
  for (let i = 0; i < marks.length; i++) {
    const m = marks[i];
    const end = i + 1 < marks.length ? marks[i + 1].line - 1 : lines.length;
    const body = [m.inline, ...lines.slice(m.line, end)].join('\n');
    const k = (m.att ? '附:' : '') + m.key;
    if (!(k in out)) out[k] = { line: m.line, num: m.num, text: dec(body) };
  }
  return { marks, fields: out };
}
