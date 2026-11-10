/* plan-probe-p3.mjs — 只读：量出 P3「机械可核」这一类到底有几条真的能跑、跑完红几个。
 *
 * 权威来源不是 `_specs/Sxx.md`（那是修正前原文，契约 §8.1 明写不要照它建），
 * 而是 `_specs/_CURRENT-VALUES.md`：
 *   §1 逐案表   : 背景（当前） | 主色（当前） | 按钮字色 | 错误码
 *   §2 旧值表   : 被替换掉的旧值「不得再出现在原型里」
 * 这两张表是**几乎纯机械的**（一律是 #RRGGBB 与「错误码」字符串）。
 * 本探针把它们抽出来，逐案对 style.css / index.html 核一遍。
 *
 * 每条判据都报三件事：能动判定的案数、通过的案数、**解析不出来的案数**。
 * 第三个数必须显式打印 —— 否则"解析失败"会被读成"合规"。
 */
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const P = join(ROOT, 'prototypes');
const CV = readFileSync(join(P, '_specs', '_CURRENT-VALUES.md'), 'utf8');

const cases = readdirSync(P, { withFileTypes: true })
  .filter((d) => d.isDirectory() && /^S\d{2}-/.test(d.name)).map((d) => d.name).sort();

/* ── 解析 §1 逐案表：| **S01** 红黑斜排报 | `#EFE7D7`（旧…） | … | 见规格 | 见规格 | ── */
const cur = new Map();
for (const line of CV.split(/\r?\n/)) {
  const m = line.match(/^\|\s*\*\*(S\d{2})\*\*[^|]*\|([\s\S]*)$/);
  if (!m) continue;
  const cells = line.split('|').map((c) => c.trim());
  const id = m[1];
  const hexOf = (s) => { const x = String(s).match(/#([0-9A-Fa-f]{6})(?![0-9A-Fa-f])/); return x ? '#' + x[1].toUpperCase() : null; };
  const bg = hexOf(cells[2] || '');
  // 主色列：可能是「见 `_specs/Sxx.md`」，那就回字段 3（下面再补）
  const primaryCell = cells[3] || '';
  const primary = /见\s*`?_specs/.test(primaryCell) ? null : hexOf(primaryCell);
  // 按钮字色列（cells[5]）：**`#111111`**（4.88:1） 或 见规格
  const btnCell = cells[5] || '';
  const btn = /见规格/.test(btnCell) ? null : hexOf(btnCell);
  // 错误码列（cells[6]）
  const codeM = (cells[6] || '').match(/\*\*`([A-Z][A-Z0-9-]{1,20})`\*\*|`([A-Z][A-Z0-9-]{1,20})`/);
  const code = /见规格/.test(cells[6] || '') ? null : (codeM ? (codeM[1] || codeM[2]) : null);
  cur.set(id, { bg, primary, btn, code, cells: cells.length });
}

/* 主色为「见规格」的，回 `_specs/Sxx.md` 字段 3 抽（口径与 collect-schemes.mjs:312-325 同） */
function specPrimary(id) {
  const p = join(P, '_specs', id + '.md');
  if (!existsSync(p)) return null;
  const t = readFileSync(p, 'utf8');
  const i = t.indexOf('配色系统');
  const seg = i < 0 ? t : t.slice(i, i + 1200);
  const NEG = /(反的是|反\s|不采用|修正前|不是|禁止|不新增|旧值|避免|不用)/;
  for (const s of seg.split(/[；。\n]/)) {
    if (!/主色/.test(s)) continue;
    if (NEG.test(s)) continue;
    const m = s.match(/#([0-9A-Fa-f]{6})(?![0-9A-Fa-f])/);
    if (m) return '#' + m[1].toUpperCase();
  }
  return null;
}

/* ── 解析 §2 旧值表：| S01 | 背景 | `#F2E8D5` | `#EFE7D7` | ── */
const old = new Map();   // id -> [{field, hex, now}]
for (const line of CV.split(/\r?\n/)) {
  const m = line.match(/^\|\s*(S\d{2})\s*\|\s*([^|]+)\|\s*`#([0-9A-Fa-f]{6})`\s*\|\s*`#([0-9A-Fa-f]{6})`/);
  if (!m) continue;
  const id = m[1];
  if (!old.has(id)) old.set(id, []);
  old.get(id).push({ field: m[2].trim(), gone: '#' + m[3].toUpperCase(), now: '#' + m[4].toUpperCase() });
}

/* ── 解析错误码：§1 说「见规格」的，回规格里的错误码 ── */
function specErrorCode(id) {
  const p = join(P, '_specs', id + '.md');
  if (!existsSync(p)) return null;
  const t = readFileSync(p, 'utf8');
  const CODE = '([A-Z][A-Z0-9]{0,12}-[A-Z]{0,2}\\d{1,4}(?:-\\d{1,3})?)';
  const m = new RegExp('错误码[\\s：:]*' + CODE).exec(t);
  return m ? m[1] : null;
}

/* ── 逐案核 ── */
const rows = [];
for (const dir of cases) {
  const id = dir.slice(0, 3);
  const c = cur.get(id) || {};
  const css = existsSync(join(P, dir, 'style.css')) ? readFileSync(join(P, dir, 'style.css'), 'utf8') : '';
  const html = existsSync(join(P, dir, 'index.html')) ? readFileSync(join(P, dir, 'index.html'), 'utf8') : '';
  const all = css + '\n' + html;
  const has = (hex) => hex && new RegExp(hex.slice(1) + '(?![0-9A-Fa-f])', 'i').test(all);

  const primary = c.primary || specPrimary(id);
  const code = c.code || specErrorCode(id);
  const oldRows = old.get(id) || [];
  const oldPresent = oldRows.filter((o) => has(o.gone));

  rows.push({
    id, dir,
    bg: c.bg, bgHit: has(c.bg),
    primary, priHit: has(primary),
    btn: c.btn, btnHit: c.btn ? has(c.btn) : null,
    code, codeHit: code ? html.includes(code) : null,
    oldRows: oldRows.length, oldPresent: oldPresent.map((o) => `${o.gone}(${o.field})`),
  });
}

console.log('═══ P3 · 从 _CURRENT-VALUES.md 能机械核的四条（30 案）═══\n');
console.log('  判据：背景/主色/按钮字色/错误码 ✅=在文件里找到（合规），❌=找不到（缺陷）；旧值 ✅=零残留');
console.log('');
console.log('  案    背景          主色          按钮字色  错误码     §2 旧值残留');
for (const r of rows) {
  const m = (hit, val) => (val === null ? ' —  ' : hit ? `✅${val}` : `❌${val}`);
  console.log(`  ${r.id}  ${m(r.bgHit, r.bg).padEnd(12)}  ${m(r.priHit, r.primary).padEnd(12)}  ` +
    `${m(r.btnHit, r.btn).padEnd(9)}  ${m(r.codeHit, r.code).padEnd(11)}  ` +
    `${r.oldRows === 0 ? '（表里无旧值）' : r.oldPresent.length ? '❌ ' + r.oldPresent.join(' ') : '✅ 零残留'}`);
}

const n = rows.length;
/* 只统计「解析得出」的那批；解析不出的单独计数，绝不算通过 */
const stat = (name, parsedRows, passPred) => {
  const pass = parsedRows.filter(passPred).length;
  console.log(`  ${name.padEnd(24)} 可判定 ${String(parsedRows.length).padStart(2)}/${n} → 通过 ${String(pass).padStart(2)}，失败 ${String(parsedRows.length - pass).padStart(2)}，` +
    `**解析不出 ${String(n - parsedRows.length).padStart(2)}**`);
};
const withBg = rows.filter((r) => r.bg);
const withPri = rows.filter((r) => r.primary);
const withBtn = rows.filter((r) => r.btn);
const withCode = rows.filter((r) => r.code);
const withOld = rows.filter((r) => r.oldRows > 0);
console.log('\n  ── 逐条统计（"解析不出"不计入通过）──');
stat('背景 HEX 在案文件里', withBg, (r) => r.bgHit);
stat('主色 HEX 在案文件里', withPri, (r) => r.priHit);
stat('按钮字色在案文件里', withBtn, (r) => r.btnHit);
stat('错误码在 index.html 里', withCode, (r) => r.codeHit);
stat('§2 旧值零残留', withOld, (r) => r.oldPresent.length === 0);

console.log('\n  ── 失败的案（这些是 P3 首轮就会红的候选）──');
const fails = [];
for (const r of rows) {
  if (r.bg && !r.bgHit) fails.push(`${r.id} 背景 ${r.bg} 未出现`);
  if (r.primary && !r.priHit) fails.push(`${r.id} 主色 ${r.primary} 未出现`);
  if (r.btn && !r.btnHit) fails.push(`${r.id} 按钮字色 ${r.btn} 未出现`);
  if (r.code && !r.codeHit) fails.push(`${r.id} 错误码 ${r.code} 未出现在 index.html`);
  if (r.oldPresent.length) fails.push(`${r.id} 旧值残留 ${r.oldPresent.join(' ')}`);
}
console.log(fails.length ? fails.map((f) => '     ' + f).join('\n') : '     （无）');

console.log('\n  ── 解析不出来的格（必须显式跳过，不能算通过）──');
for (const r of rows) {
  const miss = [];
  if (!r.bg) miss.push('背景');
  if (!r.primary) miss.push('主色');
  if (!r.btn) miss.push('按钮字色');
  if (!r.code) miss.push('错误码');
  if (r.oldRows === 0) miss.push('§2旧值（表里没有该案行）');
  if (miss.length) console.log(`     ${r.id}  ${miss.join(' / ')}`);
}

console.log('\n  ── §1 那 4 列的抽取形状（判断"公式化程度"）──');
const shape = new Map();
for (const [, v] of cur) shape.set(v.cells, (shape.get(v.cells) || 0) + 1);
console.log('     每行 split("|") 后的单元格数分布：', [...shape.entries()].map(([k, v]) => `${k}列×${v}案`).join('  '));
console.log(`     §2 旧值表能解析出「案|字段|旧值|新值」四格的行：${[...old.values()].reduce((a, b) => a + b.length, 0)} 行，覆盖 ${old.size} 案`);
