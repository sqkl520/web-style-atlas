/* 独立复算：每案产物里命中了多少个「只属于自己提示词」的判别值？
 *
 * 逻辑：从该案 task.txt 抽出所有数值/色值 token，去掉那些在其他任务书里也出现过的，
 * 剩下的就是「判别值」——模型若没读到这份提示词，不可能凭空命中。
 *
 * 这不是「产物里有没有 60px」这种弱检验，而是「产物里有没有那个只在这一份里的值」。
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const BLIND = join(ROOT, 'deliverables/78-northstar/blind');
const STAGED = join(ROOT, 'deliverables/78-northstar/_probe/_staged');

/* 收集所有任务的 token */
const ids = readdirSync(BLIND, { withFileTypes: true })
  .filter((d) => d.isDirectory() && /^S\d{2}$/.test(d.name))
  .map((d) => d.name)
  .sort();

const tokensOf = (txt) => {
  const s = new Set();
  for (const m of txt.matchAll(/#[0-9A-Fa-f]{6}/g)) s.add(m[0].toUpperCase());
  for (const m of txt.matchAll(/\b\d+(?:\.\d+)?(?:px|vw|fr|mm|%)\b/g)) s.add(m[0]);
  return s;
};

const all = {};
for (const id of ids) {
  const p = join(BLIND, id, 'task.txt');
  if (!existsSync(p)) continue;
  all[id] = tokensOf(readFileSync(p, 'utf8'));
}

let total = 0, hits = 0;
const rows = [];
for (const id of Object.keys(all)) {
  const mine = all[id];
  /* 判别值 = 只在我这一份里出现的 */
  const others = new Set();
  for (const [other, set] of Object.entries(all)) {
    if (other === id) continue;
    for (const t of set) others.add(t);
  }
  const discriminators = [...mine].filter((t) => !others.has(t));
  if (!discriminators.length) { rows.push({ id, n: 0, hit: 0, note: '无判别值' }); continue; }

  /* 找产物 */
  let gen = null;
  for (const n of [`${id}-sandbox.html`, `${id}-judge.html`, `${id}.html`]) {
    const f = join(STAGED, n);
    if (existsSync(f)) { gen = f; break; }
  }
  if (!gen) { rows.push({ id, n: discriminators.length, hit: 0, note: '无产物' }); continue; }

  const html = readFileSync(gen, 'utf8').toUpperCase();
  /* hex 直接在文本里搜；像素值可能写成 60px 或 60.0px 或 clamp(...60px...) */
  const found = discriminators.filter((t) => {
    if (t.startsWith('#')) return html.includes(t);
    const num = t.replace(/[a-z%]+$/, '');
    return html.includes(t.toUpperCase()) || new RegExp(`(^|[^\\d.])${num.replace('.', '\\.')}\\s*(px|vw|fr|mm|%)`, 'i').test(html);
  });
  total += discriminators.length;
  hits += found.length;
  rows.push({ id, n: discriminators.length, hit: found.length, miss: discriminators.filter((t) => !found.includes(t)).slice(0, 4) });
}

console.log('案    判别值  命中  未命中');
console.log('─'.repeat(60));
for (const r of rows) {
  const pct = r.n ? Math.round((r.hit / r.n) * 100) : 0;
  console.log(
    String(r.id).padEnd(5) +
    String(r.n).padStart(5) +
    String(r.hit).padStart(6) +
    ('  ' + pct + '%').padEnd(6) +
    (r.note || (r.miss && r.miss.length ? r.miss.join(' ') : ''))
  );
}
console.log('─'.repeat(60));
console.log(`TOTAL discriminators: ${total} hits: ${hits}`);
