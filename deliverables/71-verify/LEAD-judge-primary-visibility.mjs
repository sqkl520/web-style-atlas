// 关键判断：dna.primary 为空时，提示词里「主色」这件事对 AI 还可见吗？
// 提示词的配色段格式是：「#XXXXXX（name）、#YYYYYY（name）…」
// 如果 palette 每一项都带角色名，那 AI 能读出哪个是主色；若是无意义名字（如 paper-2），就不能。
import { readFileSync } from 'node:fs';
const ROOT = 'D:/Web/style';
const P = ROOT + '/prototypes';

const dna = JSON.parse(readFileSync(P + '/_prompts/dna-clean.json', 'utf8'));
const DNA = Array.isArray(dna) ? dna : Object.values(dna);

const pr = readFileSync(P + '/_selection/prompts.js', 'utf8');
const sbP = { window: {} };
new Function('window', pr)(sbP.window);
const pM = new Map((sbP.window.STYLE_PROMPTS.schemes || []).map((s) => [s.id, s]));

const HEXT = /#([0-9a-fA-F]{6})(?![0-9a-fA-F])/g;
const NO_PRI = ['S01', 'S08', 'S13', 'S14', 'S17', 'S18', 'S20', 'S25', 'S26'];

// 有主色语义的角色名
const PRIMARY_ROLE = /(green|grape|plum|amber|red|blue|carmine|gold|lime|magenta|rust|yellow|spot|accent|primary|brand|orange|teal|moss|clay|ink-red|paint)/i;

console.log('════ 9 案的实际 palette 条目（看 AI 能否读出主色）════\n');
for (const id of NO_PRI) {
  const sc = pM.get(id);
  const rawPal = sc?.dna?.palette;
  const entries = Array.isArray(rawPal) ? rawPal : String(rawPal || '').split('、');
  console.log(`\n${id}`);
  for (const e of entries) {
    const m = String(e).match(HEXT);
    const nameM = String(e).match(/[（(]([^）)]+)[）)]/);
    const name = nameM ? nameM[1] : '';
    const looksPrimary = PRIMARY_ROLE.test(name);
    console.log(`   ${m ? m[0] : '?'}  （${name || '无名字'}）${looksPrimary ? '  ← 像主色名' : ''}`);
  }
}

console.log('\n\n════ 全 30 案：palette 里的角色名能否让 AI 识别主色？════\n');
let roleVisible = 0;
const noRoleList = [];
for (const e of DNA) {
  const sc = pM.get(e.id);
  const rawPal = sc?.dna?.palette;
  const entries = Array.isArray(rawPal) ? rawPal : String(rawPal || '').split('、');
  const names = entries.map((x) => (String(x).match(/[（(]([^）)]+)[）)]/) || [])[1] || '');
  const hasPrimaryRole = names.some((n) => PRIMARY_ROLE.test(n));
  // 或者 dna.primary 非空
  const hasExplicitPri = (e.primary || []).length > 0;
  if (hasPrimaryRole || hasExplicitPri) roleVisible++;
  else noRoleList.push({ id: e.id, names });
}
console.log(`能识别主色的案: ${roleVisible}/30`);
if (noRoleList.length) {
  console.log('\n不能识别的案:');
  for (const x of noRoleList) console.log(`  ${x.id}  names=${JSON.stringify(x.names)}`);
}

console.log('\n\n════ 结论 ════');
console.log('若 roleVisible === 30，则「9 案缺 primary」只是**数据字段**缺失，');
console.log('提示词的**文字消费方**（AI）仍能从角色名读出主色 → 不是 P0。');
console.log('若 < 30，那才是真的「AI 不知道哪个是主色」。');
