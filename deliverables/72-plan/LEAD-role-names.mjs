/* S14 是不是唯一一个「调色板条目全无角色名」的案？
 * 角色名是 AI 判断哪个色当底色、哪个当主色的唯一线索。
 */
import { readFileSync } from 'node:fs';

const R = new URL('../../prototypes/', import.meta.url);
const ps = readFileSync(new URL('_selection/prompts.js', R), 'utf8');
const sp = JSON.parse(ps.slice(ps.indexOf('{', ps.indexOf('window.STYLE_PROMPTS'))).replace(/;\s*$/, ''));

console.log('═══ 每案调色板：条目数 / 有角色名的条目数 ═══\n');
console.log('案    条目  有角色名  配色句');
console.log('─'.repeat(100));
const bad = [];
for (const s of sp.schemes) {
  const pal = String(s.dna.palette);
  const items = pal.split(/[、,，]/).map((x) => x.trim()).filter(Boolean);
  const named = items.filter((i) => /[（(][^）)]+[）)]/.test(i) || /\s[A-Za-z][\w-]*$/.test(i)).length;
  if (named === 0) bad.push(s.id);
  console.log(`${s.id}  ${String(items.length).padStart(4)}  ${String(named).padStart(6)}    ${pal.slice(0, 60)}`);
}
console.log(`\n═══ 无任何角色名的案: ${bad.length} 个 → ${bad.join(', ') || '（无）'}`);

if (bad.length) {
  const s = sp.schemes.find((x) => x.id === bad[0]);
  const txt = s.text || '';
  const i = txt.indexOf('配色只用这几个值');
  console.log(`\n═══ ${bad[0]} 提示词里的配色段原文 ═══`);
  console.log(txt.slice(Math.max(0, i - 60), i + 320));
}
