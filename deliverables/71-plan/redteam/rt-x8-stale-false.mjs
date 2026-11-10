/* P2 的决定性证据：链 A 的「§2 作废旧值」黑名单把**合法色**误判成了旧值。
 *
 * S17 的 `#C9BFA6`：
 *   · 规格字段 3 明写「压纸色 #C9BFA6 8%」（style.css:6 的行内注释逐字抄了这句）
 *   · style.css:10 真的用了它：`--stub: #C9BFA6;`
 *   · _CURRENT-VALUES.md:56 说明它是「次级纸色（存根联专用压纸色，此色不作背景）」——
 *     **是有效色，只是不许当背景**，不是"已作废"
 *   · 但 collect-schemes.mjs 的 stale 黑名单把它当「§2 作废旧值」剔除（PAL_DROPPED 日志原话）
 *
 * 后果：data.js 的 S17 少了一个规格声明占比 8%、CSS 真实使用的色；
 * 而 prompts.js 保留了它（clean-dna 不看 _CURRENT-VALUES）。
 * 因为「子集」是**单向**判据，data.js 少报不会让 R1 变红 —— 反而更容易通过。
 *
 *   node deliverables/71-plan/redteam/rt-x8-stale-false.mjs
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { P, ROOT, h1, h2 } from './rt-lib.mjs';

const git = (a) => execFileSync('git', a, { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
const HEAD = git(['rev-parse', 'HEAD']).trim();
const show = (p) => git(['show', `${HEAD}:${p}`]);
const evalWin = (src) => { const w = {}; new Function('window', src)(w); return w; };

const data = evalWin(show('prototypes/_selection/data.js')).SCHEMES;
const prompts = evalWin(show('prototypes/_selection/prompts.js')).STYLE_PROMPTS.schemes;
const HEX = /#([0-9A-Fa-f]{6})(?![0-9A-Fa-f])/g;
const hexes = (s) => [...new Set([...String(s).matchAll(HEX)].map((m) => m[0].toUpperCase()))];

h1('S17 #C9BFA6：一个被链 A 当作"作废旧值"剔除的合法色');
const s17 = data.find((s) => s.id === 'S17');
const p17 = prompts.find((s) => s.id === 'S17');
console.log('data.js  S17.palette =', JSON.stringify(s17.palette));
console.log('prompts  S17.palette =', hexes((p17.dna || {}).palette).join(' '));
console.log('C9BFA6 在 data.js 里？ ', (s17.palette || []).includes('#C9BFA6'));
console.log('C9BFA6 在 prompts 里？ ', hexes((p17.dna || {}).palette).includes('#C9BFA6'));

h2('三方证据：它是有效色，不是作废值');
const css = readFileSync(join(P, s17.dir, 'style.css'), 'utf8');
const cssLine = css.split('\n').findIndex((l) => /C9BFA6/i.test(l));
console.log(`style.css:${cssLine + 1}  ${css.split('\n')[cssLine].trim()}`);
const cssUse = (css.match(/var\(--stub\)/g) || []).length;
console.log(`style.css 里 var(--stub) 被引用 ${cssUse} 次`);
const cur = readFileSync(join(P, '_specs', '_CURRENT-VALUES.md'), 'utf8');
const curLine = cur.split('\n').find((l) => /C9BFA6/.test(l)) || '';
console.log('_CURRENT-VALUES.md 原话：');
console.log('  ' + (curLine.match(/\*\*`#C9BFA6`[^|]*/) || ['(未找到)'])[0].trim());

h2('链 A 的剔除日志（重跑生成器的 --check，只读）');
const out = execFileSync('node', [join(P, '_build', 'collect-schemes.mjs'), '--check'], { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
for (const l of out.split('\n')) {
  if (/S17 剔除/.test(l)) console.log('  ' + l.trim());
  if (/调色板剔除/.test(l)) console.log('  ' + l.trim());
}

h2('判定');
console.log('链 A 把「次级纸色（此色不作背景）」误读成「作废旧值」并剔除；');
console.log('`_CURRENT-VALUES.md` §2 的真实语义是"旧值→新值"的替换表，');
console.log('而 S17 这一行里的 #C9BFA6 是**限制性说明**（不许当背景），不是替换关系。');
console.log('');
console.log('⇒ 直接后果一：data.js 的 S17 少一个规格声明 8%、CSS 真实使用的色。');
console.log('⇒ 直接后果二：「data.js ⊆ prompts.js」这条关系**无法**发现这种少报 ——');
console.log('   子集判据是单向的。链 A 越漏，R1 越容易通过。');
console.log('⇒ 这是 P2「只从规格抽会不会丢色」的**实测答案：会，而且当前就在丢**。');
