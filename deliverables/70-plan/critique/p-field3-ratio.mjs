// 探针：30/30 规格字段 3（配色系统）里到底写了什么？
// 判定 Q2：规格是「色板 + 面积比」的权威来源，还是只有色值？
// 只读：不写任何受跟踪文件。
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = 'D:/Web/style';
const SPECS = join(ROOT, 'prototypes/_specs');
const IDS = readdirSync(join(ROOT, 'prototypes'), { withFileTypes: true })
  .filter((d) => d.isDirectory() && /^S\d{2}-/.test(d.name))
  .map((d) => d.name.slice(0, 3))
  .sort();

// 规格有三种格式（必须全认，否则会把整批案误判成"字段3 没有 hex"）：
//   A: `**3. 配色系统**` 独占一行，正文在下面（S11–S20）
//   B: `3. 配色系统：…`  裸标题同行（S01–S10）
//   C: `3. **配色系统**：…` 只把标题加粗（S21–S30）
// 统一做法：先把整行的 `**` 全剥掉，再按「裸标题」判，三种写法就归一了。
function field3(md) {
  const out = [];
  let on = false;
  for (const l of md.split(/\r?\n/)) {
    const s = l.trim().replace(/\*\*/g, '');
    if (!on && /^3[.．]\s*配色系统/.test(s)) {
      on = true;
      out.push(s);           // 标题行本身也要算进来（格式 B/C 正文就在这一行）
      continue;
    }
    if (on) {
      if (/^\d+[.．]\s*\S/.test(s)) break;   // 下一个字段
      out.push(l);
    }
  }
  return out.join('\n');
}

const rows = [];
for (const id of IDS) {
  const p = join(SPECS, id + '.md');
  const md = existsSync(p) ? readFileSync(p, 'utf8') : '';
  const f3 = field3(md);
  const hexes = [...new Set([...f3.matchAll(/#[0-9a-fA-F]{6}/g)].map((m) => m[0].toUpperCase()))];
  const pcts = [...f3.matchAll(/(\d{1,3})\s*%/g)].map((m) => Number(m[1]));
  // 面积比判据：出现 "面积和 100" 或 至少 2 个 10–90 的百分数
  const area = pcts.filter((n) => n >= 1 && n <= 100);
  rows.push({
    id,
    hexes: hexes.length,
    pct: pcts.length,
    sum100: /面积和\s*100|面积和100/.test(f3),
    lens: f3.length,
    areaList: area.slice(0, 8),
  });
}

console.log('=== 每案规格字段3：hex 数 / 百分号数 / 是否声明"面积和 100" ===\n');
for (const r of rows) {
  console.log(
    `${r.id}  hex=${String(r.hexes).padStart(2)}  %=${String(r.pct).padStart(2)}  ` +
    `sum100=${r.sum100 ? 'YES' : 'no '}  字段3字数=${String(r.lens).padStart(4)}  ${r.areaList.join('/')}`
  );
}
const with100 = rows.filter((r) => r.sum100).length;
const withPct = rows.filter((r) => r.pct > 0).length;
const withHex = rows.filter((r) => r.hexes > 0).length;
console.log(`\n规格字段3 声明"面积和 100"：${with100}/30`);
console.log(`规格字段3 出现任何百分数：${withPct}/30`);
console.log(`规格字段3 出现 hex 色值：${withHex}/30`);
console.log(`字段3 完全没有 hex 的案：${rows.filter((r) => !r.hexes).map((r) => r.id).join(' ') || '无'}`);
