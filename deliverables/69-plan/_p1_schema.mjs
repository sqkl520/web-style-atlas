// 探针 1：数据形状。30 案的字段名、capability 子字段、prompts 里的 dna 键。
import { loadCtx, out } from './_lib.mjs';

const w = loadCtx();
const S = w.SCHEMES;
const P = w.STYLE_PROMPTS;
out('SCHEMES =', S.length, ' P.schemes =', P.schemes.length, ' sceneIndex 词 =', Object.keys(P.sceneIndex).length,
  ' unsupported =', (P.unsupported || []).length);
out('顶键并集 =', [...new Set(S.flatMap((s) => Object.keys(s)))].join(' '));
out('\nS01 cap =', JSON.stringify(S[0].cap, null, 1));
out('\nS01 dna 键 =', Object.keys(P.schemes[0].dna).join(' '));
out('P.schemes[0] 顶键 =', Object.keys(P.schemes[0]).join(' '));
out('\n每个 dna 键的有值案数：');
const dkeys = [...new Set(P.schemes.flatMap((s) => Object.keys(s.dna || {})))];
for (const k of dkeys) {
  const vals = P.schemes.map((s) => (s.dna || {})[k]);
  const nonEmpty = vals.filter((v) => v !== undefined && v !== null && String(v).trim() !== '' && !(Array.isArray(v) && !v.length));
  const uniq = [...new Set(nonEmpty.map((v) => (typeof v === 'object' ? JSON.stringify(v) : String(v))))];
  out(`  ${k.padEnd(14)} 有值 ${String(nonEmpty.length).padStart(2)}/30  唯一值 ${String(uniq.length).padStart(3)}  e.g. ${String(uniq[0] ?? '—').slice(0, 70)}`);
}
out('\ndegrades / hard 分布：');
const deg = S.map((s) => [s.id, s.cap && s.cap.degrades, s.hard]);
out('  degrades=yes:', deg.filter((d) => d[1] === 'yes').map((d) => d[0]).join(' '));
out('  cap.degrades 取值:', [...new Set(deg.map((d) => d[1]))].join(' '));
out('  S[0].hard =', JSON.stringify(S[0].hard), ' 有 hard 键的案数 =', S.filter((s) => 'hard' in s).length);
out('  有 cap 的案数 =', S.filter((s) => s.cap).length);
