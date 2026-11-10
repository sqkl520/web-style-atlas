import { readFileSync, existsSync, readdirSync } from 'node:fs';

// 验证规划 Agent 的推论：照提示词做的复刻（69-test 3 案 + 62-verify 3 案）
// 是否比原型参考图更遵守「配色只用这几个值」
const DUMP = 'deliverables/69-plan/dump';

function claimedOf(id) {
  const p = readFileSync(`${DUMP}/${id}.txt`, 'utf8');
  const seg = /配色只用这几个值[:：]([\s\S]*?)(?:不新增|$)/.exec(p);
  return seg ? [...new Set((seg[1].match(/#[0-9a-fA-F]{6}/g) || []).map(x => x.toUpperCase()))] : [];
}

// 从 HTML/CSS 文本里抽实际用到的 hex（粗略，不含浏览器默认色）
function usedOf(htmlPath, cssPath) {
  let txt = '';
  if (existsSync(htmlPath)) txt += readFileSync(htmlPath, 'utf8');
  if (cssPath && existsSync(cssPath)) txt += readFileSync(cssPath, 'utf8');
  // 剥注释
  txt = txt.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/<!--[\s\S]*?-->/g, ' ');
  const hexes = [...new Set((txt.match(/#[0-9a-fA-F]{6}/g) || []).map(x => x.toUpperCase()))];
  return hexes.filter(h => h !== '#000000' && h !== '#FFFFFF');
}

console.log('=== 照提示词做的复刻 vs 原型参考图：谁更遵守「配色只用这几个值」===\n');

// 1) 69-test 的 3 案（本轮端到端产物）
console.log('[本轮端到端产物 deliverables/69-test/]');
for (const id of ['S20', 'S21', 'S28']) {
  const claimed = new Set(claimedOf(id));
  const used = usedOf(`deliverables/69-test/${id}/index.html`, null);
  const outside = used.filter(h => !claimed.has(h));
  console.log(`  ${id}: 声称 ${claimed.size} / 实现用 ${used.length} / 集合外 ${outside.length} ${outside.length ? '→ ' + outside.slice(0,4).join(' ') : '✓ 全在集合内'}`);
}

// 2) 62-verify 的 3 案（上一轮历史产物，规划 Agent 说也可用）
console.log('\n[历史产物 deliverables/62-verify/impl/]');
const implDir = 'deliverables/62-verify/impl';
if (existsSync(implDir)) {
  for (const d of readdirSync(implDir, { withFileTypes: true })) {
    if (!d.isDirectory()) continue;
    const m = /^(S\d{2})/.exec(d.name);
    if (!m) continue;
    const id = m[1];
    const dir = `${implDir}/${d.name}`;
    const cands = readdirSync(dir).filter(f => f.endsWith('.html'));
    if (!cands.length) { console.log(`  ${id} (${d.name}): 无 html`); continue; }
    const claimed = new Set(claimedOf(id));
    const used = usedOf(`${dir}/${cands[0]}`, null);
    const outside = used.filter(h => !claimed.has(h));
    console.log(`  ${id} (${d.name}): 声称 ${claimed.size} / 实现用 ${used.length} / 集合外 ${outside.length} ${outside.length ? '→ ' + outside.slice(0,4).join(' ') : '✓ 全在集合内'}`);
  }
} else {
  console.log('  (目录不存在)');
}

// 3) 对照：原型自己
console.log('\n[对照：原型索引 HTML+CSS 里声明的 hex]');
for (const id of ['S20', 'S21', 'S28']) {
  const dirs = readdirSync('prototypes').filter(d => d.startsWith(id + '-'));
  if (!dirs.length) continue;
  const claimed = new Set(claimedOf(id));
  const used = usedOf(`prototypes/${dirs[0]}/index.html`, `prototypes/${dirs[0]}/style.css`);
  const outside = used.filter(h => !claimed.has(h));
  console.log(`  ${id}: 声称 ${claimed.size} / 原型声明 ${used.length} / 集合外 ${outside.length} ${outside.length ? '→ ' + outside.slice(0,4).join(' ') : '✓'}`);
}
