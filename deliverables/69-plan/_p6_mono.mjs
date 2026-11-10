// 探针 6：mono 的根因是不是同一个？三条线索交叉：
//  (1) 提示词里是否**命令**用等宽（"数字用等宽 X、tabular-nums"）
//  (2) 原型 1440 实测 monoProseShare（正文区等宽占比 > 0 即 runtime mono FAIL）
//  (3) 提示词自己指定的等宽族名，是否就是实测报错的那个族
// 若 (1) 与 (2) 高度重合，则 mono 不是三个孤立的案，是**提示词与闸门互相矛盾**的系统性缺陷。
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { loadCtx, ROOT, out } from './_lib.mjs';

const w = loadCtx();
const P = w.STYLE_PROMPTS;
const bp = w.buildStylePrompt;

const rows = [];
for (const s of P.schemes) {
  const t = bp(s.id, { biz: '', action: '' });
  const monoLine = (t.split('\n').find((x) => /编号\/价格等数字用等宽/.test(x)) || '');
  const m = monoLine.match(/等宽\s*([^、，。]+)/);
  const p = join(ROOT, 'prototypes', s.dir, '.inspect', 'report.json');
  let mp = null, fams = null, at = null;
  if (existsSync(p)) {
    const j = JSON.parse(readFileSync(p, 'utf8'));
    const v = (j.viewports || []).find((x) => x.width === 1440);
    at = j.at;
    if (v) { mp = v.metrics.type.monoProseShare; fams = v.metrics.type.monoFamilies; }
  }
  const fsm = Math.max(...['style.css', 'index.html'].map((f) => join(ROOT, 'prototypes', s.dir, f))
    .filter(existsSync).map((f) => statSync(f).mtimeMs));
  const rsm = statSync(p).mtimeMs;
  rows.push({ id: s.id, instructsMono: !!monoLine, monoName: m ? m[1].trim() : '', monoProseShare: mp, monoFamilies: fams, at, staleMin: Math.round((rsm - fsm) / 60000) });
}

const ins = rows.filter((r) => r.instructsMono);
out('=== 提示词里"数字用等宽"这条指令 ===');
out(`  含该指令的案：${ins.length}/30`);
out('    ' + ins.map((r) => r.id + '(' + r.monoName + ')').join(' '));
out(`  不含的案：${30 - ins.length}  → ${rows.filter((r) => !r.instructsMono).map((r) => r.id).join(' ')}`);

out('\n=== 提示词指定等宽的案 vs runtime monoProseShare ===');
out('id   指令  等宽族                 monoProseShare  实测 monoFamilies');
for (const r of rows) {
  out(`${r.id}   ${r.instructsMono ? 'YES ' : ' -  '}  ${(r.monoName || '—').padEnd(20)}  ${String(r.monoProseShare ?? '—').padStart(6)}          ${(r.monoFamilies || []).join(',') || '—'}`);
}
const fail = rows.filter((r) => (r.monoProseShare ?? 0) > 0);
out(`\n  runtime mono FAIL（monoProseShare>0）的案：${fail.length}/30 → ${fail.map((r) => r.id).join(' ')}`);
out(`  其中"提示词命令用等宽"的：${fail.filter((r) => r.instructsMono).length}/${fail.length}`);
out(`  指令∩FAIL：${rows.filter((r) => r.instructsMono && (r.monoProseShare ?? 0) > 0).map((r) => r.id).join(' ') || '(无)'}`);
out(`  命令等宽 但没 FAIL：${rows.filter((r) => r.instructsMono && !(r.monoProseShare ?? 0)).map((r) => r.id).join(' ') || '(无)'}`);
out(`  没命令 却 FAIL：${rows.filter((r) => !r.instructsMono && (r.monoProseShare ?? 0) > 0).map((r) => r.id).join(' ') || '(无)'}`);

out('\n=== 陈旧度：report.json mtime vs 源文件 mtime ===');
const stale = rows.filter((r) => r.staleMin < -5);
if (!stale.length) out('  无陈旧报告（30/30 报告不早于源文件 5 分钟以上）');
for (const r of stale) out(`  ⚠️ ${r.id} 源文件比报告新 ${-r.staleMin} 分钟（at=${r.at}）`);
out('  最旧/最新 report at =', rows.map((r) => r.at).filter(Boolean).sort()[0], '/', rows.map((r) => r.at).filter(Boolean).sort().slice(-1)[0]);
