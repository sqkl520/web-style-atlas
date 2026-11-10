// 探针 28：把 B 的 73 词结果按「词属于哪一层」重新切，并核对用户的原话是否还成立。
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadCtx, ROOT, out } from './_lib.mjs';

const w = loadCtx();
const P = w.STYLE_PROMPTS;
const idxTerms = Object.keys(P.sceneIndex);
const uns = P.unsupported || [];
const typed = JSON.parse(readFileSync(join(ROOT, 'deliverables/69-plan/p7-typed73.json'), 'utf8'));
const byTerm = Object.fromEntries(typed.map((r) => [r.term, r]));

const grp = (t) => (uns.includes(t) ? 'unsupported(29)' : (P.sceneIndex[t].direct || []).length ? 'direct(16)' : 'near-only(28)');
const tally = {};
for (const r of typed) {
  const g = grp(r.term);
  tally[g] = tally[g] || {};
  tally[g][r.kind] = (tally[g][r.kind] || 0) + 1;
}
out('=== 73 词 × 打字路径，按词所属层切 ===');
for (const [g, m] of Object.entries(tally)) {
  const tot = Object.values(m).reduce((a, b) => a + b, 0);
  out(`  ${g.padEnd(16)} ${tot} 词：` + Object.entries(m).map(([k, v]) => `${k}=${v}`).join('  '));
}
out('');
out('=== 用户原话核对 ===');
out('  用户说：「用户搜『餐厅』，最可能的结果是空页面。」');
const c = byTerm['餐厅'];
out(`  我实测：搜「餐厅」→ ${c.rows} 行，kind=${c.kind}`);
out(`  空状态原文：「${c.et.slice(0, 110)}」`);
out('  → **不是空页面**。它给的是一句明确结论 + 一张 M02 模板卡 + 一个「打开 M02 ↗」链接。');
out('    这条前提在 1753f94（修 6 个「界面在说谎」的地方）之后已经变了。');
out('');
out('  用户说：「29 个标为没有的提示当前收在 #more-host 折叠区里」');
out('  → **已经不在折叠区里起作用了**：折叠区里那 29 个词只在「点开『还有 28 个只有近似的 →』」后可见；');
out('    但**搜到一个 unsupported 词**时，界面走的是 #empty-tpl（空状态模板块），那句结论直接出现在缺省态，不用点任何东西。');
out('    所以折叠区里那段的实际作用只剩「浏览式的告知」，不是唯一的告知通道。');
out('');
out('=== 真正的缺口在哪 ===');
const none = typed.filter((r) => r.kind === 'empty+none');
out(`  「30 案没有 + 模板层也没有」的词：${none.length} 个`);
out(`  ${none.map((r) => r.term).join('、')}`);
out(`  其中属于 29 unsupported 的：${none.filter((r) => uns.includes(r.term)).length} 个`);
out(`  属于 44 索引词的：${none.filter((r) => !uns.includes(r.term)).length} 个 → ${none.filter((r) => !uns.includes(r.term)).map((r) => r.term).join('、')}`);
out('');
const other = typed.filter((r) => r.kind === 'empty+other');
out(`  「30 案没有 + 模板层没有 + 给了相邻候选」的词：${other.length} 个 → ${other.map((r) => r.term).join('、')}`);
