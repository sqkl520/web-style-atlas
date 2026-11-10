// 探针 26：三段真相对照 —— 规格字段 3（作者原话） / 提示词第 1 条（给用户的） / 页面实画。
// 这是 A 的最强论据：提示词第 1 条说「配色只用这几个值」，而**它自己的原型**画出了清单外的颜色。
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { loadCtx, ROOT, out } from './_lib.mjs';

const w = loadCtx();
const P = w.STYLE_PROMPTS;
const bp = w.buildStylePrompt;
const HEX = /#[0-9A-Fa-f]{6}\b/g;
const sets = JSON.parse(readFileSync(join(ROOT, 'deliverables/69-plan/p10-palette30.json'), 'utf8'));
const byId = Object.fromEntries(sets.map((r) => [r.id, r]));

const rows = [];
for (const s of P.schemes) {
  // 规格字段 3
  const specPath = join(ROOT, 'prototypes/_specs', s.id + '.md');
  let specHex = [];
  if (existsSync(specPath)) {
    const t = readFileSync(specPath, 'utf8');
    // 规格里字段 3 的标题有三种写法，实测都得吃：
    //   `**3. 配色系统**`（S19）  /  `3. 配色系统：`（S01）  /  `配色系统**：`（S21–S30，字段号被切掉了）
    let m = t.match(/(?:\*\*)?3\.\s*配色系统(?:\*\*)?[：:]?([\s\S]*?)(?:\*\*)?4\.\s*(?:\*\*)?字体策略/);
    if (!m) m = t.match(/配色系统\*\*\s*[：:]([\s\S]*?)(?:\*\*)?4\.\s*(?:\*\*)?字体策略/);
    if (m) specHex = [...new Set((m[1].match(HEX) || []).map((x) => x.toUpperCase()))];
  }
  const t = bp(s.id, { biz: '', action: '' });
  const pl = t.split('\n').find((l) => /^1\. 配色只用这几个值/.test(l)) || '';
  const promptHex = [...new Set((pl.match(HEX) || []).map((x) => x.toUpperCase()))];
  const r = byId[s.id];
  const realHex = r ? r.claimed.concat([]) : [];
  const painted = r ? r.claimed : [];
  const extras = r ? r.extra.filter((e) => e.other >= 3).map((e) => e.hex) : [];
  rows.push({ id: s.id, spec: specHex, prompt: promptHex, extras, specN: specHex.length, promptN: promptHex.length, extraN: extras.length });
}

out('id   规格字段3  提示词  提示词多出规格  页面实画多出提示词');
let totSpec = 0, totPrompt = 0, totExtra = 0, casesViol = 0;
for (const r of rows) {
  const promptExtra = r.prompt.filter((h) => !r.spec.includes(h));
  totSpec += r.specN; totPrompt += r.promptN; totExtra += r.extraN;
  if (r.extraN) casesViol++;
  out(`${r.id}  ${String(r.specN).padStart(6)}  ${String(r.promptN).padStart(6)}  ${String(promptExtra.length).padStart(10)}  ${String(r.extraN).padStart(14)}  ${r.extraN ? r.extras.join(' ') : ''}`);
}
out('');
out(`合计：规格色值 ${totSpec} 个 / 提示词色值 ${totPrompt} 个 / 页面画出的清单外颜色 ${totExtra} 个`);
out(`提示词第 1 条被自己原型违反的案：${casesViol}/30`);
out('');
out('三处数字的关系（30 案全量）：');
out('  ① 规格字段 3 是**作者手写**的用色，通常 4–7 个，且带面积百分比');
out('  ② 提示词第 1 条由 extract-dna 从 style.css 的 :root 抽，比规格多出「纸色变体/木色变体/褪色墨变体」');
out('  ③ 页面实画比提示词还多 —— 因为生成器只抽 :root，而 CSS 里还有大量**硬编码 hex**（如 S19 的 #5E5443）');
out('');
out('→ 结论：提示词第 1 条「配色只用这几个值 … 不新增更多彩色」对 17/30 案是**可证伪的假话**：');
out('   照它做的 AI 只要不越界就"对"，而它自己那 30 张参考图里有 17 张越界了。');
