// 探针 3：把 30 案提示词里**可机械取值**的约束全部抽出来，并逐条与「运行期实测」
// （.inspect/report.json 的 1440 档 metrics）对齐。这是「选项 d：提示词自洽性验证」。
//
// 为什么用 .inspect/report.json 而不是读 style.css：
//   它是 tools/taste-skill 的 inspect.mjs 在真 Chrome 里量出来的（computed style + 布局），
//   原型 CSS 里可能有 var()、层叠、媒体查询；读 CSS 只能得到"声明了什么"，
//   report.json 给的是"渲染成了什么"。判据必须站在渲染后那一侧。
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { loadCtx, ROOT, out } from './_lib.mjs';

const w = loadCtx();
const P = w.STYLE_PROMPTS;
const buildPrompt = w.buildStylePrompt;
if (typeof buildPrompt !== 'function') { out('!! window.buildStylePrompt 不存在'); process.exit(1); }

const HEX = /#[0-9A-Fa-f]{6}\b/g;
const readJSON = (p) => JSON.parse(readFileSync(p, 'utf8'));

// 从 report.json 取 1440 档 metrics
function metrics1440(id) {
  const s = P.schemes.find((x) => x.id === id);
  const p = join(ROOT, 'prototypes', s.dir, '.inspect', 'report.json');
  if (!existsSync(p)) return null;
  const j = readJSON(p);
  const v = (j.viewports || []).find((x) => x.width === 1440);
  return v ? { ...v.metrics, at: j.at, allow: j.allow, findings: j.findings } : null;
}

// 抽提示词里的可机械约束
function extract(text, s) {
  const L = text.split('\n');
  const line = (re) => (L.find((x) => re.test(x)) || '');
  const palLine = line(/^1\. 配色只用这几个值/);
  const fontLine = line(/^2\. 字体/);
  const radLine = line(/^3\. 圆角/);
  const shaLine = line(/^4\. 阴影/);
  const lwLine = line(/^5\. 线宽只用这几级/);
  const cntLine = line(/^1\. 这个版式设计时排了/);
  const picLine = line(/^4\. 版式里至少要/);
  return {
    palette: [...new Set(palLine.match(HEX) || [])],
    paletteRaw: palLine,
    fontLine,
    fontNames: (fontLine.match(/[A-Za-z][A-Za-z0-9+.\- ]{2,30}/g) || []).map((x) => x.trim()).filter(Boolean),
    radius: radLine,
    shadow: shaLine,
    lineWidths: lwLine,
    count: (cntLine.match(/排了\s*(\d+)\s*个/) || [])[1],
    pics: (picLine.match(/至少要\s*(\d+)\s*个/) || [])[1],
    rules: L.filter((x) => /^\d+\. /.test(x)).length,
    banRules: L.filter((x) => /^[①②③④⑤⑥⑦⑧]/.test(x)).length,
    lines: L.length,
    chars: text.length,
    hasH1Size: /首屏主标题取/.test(text),
    degradesYes: /位置是按 \d+ 个数出来的/.test(text),
    hasVoidClause: /刻意留空/.test(text),
  };
}

const rows = [];
for (const s of P.schemes) {
  const text = buildPrompt(s.id, { biz: '', action: '' });
  const ex = extract(text, s);
  const M = metrics1440(s.id);
  const r = { id: s.id, ...ex, M };
  rows.push(r);
}

out('=== 每案提示词长度与硬约束条数 ===');
out('id   chars  lines  编号条  ①②③条  色值数  图片数  N');
for (const r of rows) {
  out(`${r.id}  ${String(r.chars).padStart(5)}  ${String(r.lines).padStart(5)}  ${String(r.rules).padStart(5)}  ${String(r.banRules).padStart(6)}  ${String(r.palette.length).padStart(5)}  ${String(r.pics ?? '-').padStart(5)}  ${r.count ?? '-'}`);
}
const sum = (a) => a.reduce((x, y) => x + y, 0);
out('\n合计：提示词字数 min/中位/max =',
  Math.min(...rows.map((r) => r.chars)), '/', rows.map((r) => r.chars).sort((a, b) => a - b)[15], '/',
  Math.max(...rows.map((r) => r.chars)));
out('编号约束条数 min/中位/max =', Math.min(...rows.map((r) => r.rules)),
  '/', rows.map((r) => r.rules).sort((a, b) => a - b)[15], '/', Math.max(...rows.map((r) => r.rules)));
out('每案可机械取值的"取值型"约束（色值+字体+圆角+阴影+线宽+h1+N+图片）条数：');
const perCaseMech = rows.map((r) => r.palette.length + 5 + (r.hasH1Size ? 1 : 0) + (r.count ? 1 : 0) + (r.pics ? 1 : 0));
out('  合计', sum(perCaseMech), '条，30 案平均', (sum(perCaseMech) / 30).toFixed(1), '条/案');

out('\n=== 自洽性核对 1：提示词声称的色值，在原型 1440 渲染里出现过吗 ===');
out('判据：report.json 的 color.bodyBg / sectionBgs / textColors / button.bg 四组色值并集 ⊇ 提示词色值？');
let palOK = 0; const palBad = [];
for (const r of rows) {
  if (!r.M) { palBad.push(r.id + '(无 report)'); continue; }
  const c = r.M.color || {};
  const seen = new Set([c.bodyBg, c.button && c.button.bg,
    ...(c.sectionBgs || []).map((x) => x.color),
    ...(c.textColors || []).map((x) => x.color)].filter(Boolean).map((x) => x.toUpperCase()));
  // 提示词里的色值是否全都在"这张页面上真出现过"
  const miss = r.palette.filter((h) => !seen.has(h.toUpperCase()));
  if (miss.length === 0) palOK++; else palBad.push(`${r.id} 缺 ${miss.join(',')}（提示词 ${r.palette.length} 色，页面实测 ${seen.size} 色）`);
}
out(`  提示词色值全部出现在实测色值集合里：${palOK}/30`);
out('  未全中：'); for (const b of palBad) out('    ' + b);
out('  ⚠️ 注意：report 只记 bodyBg/section/text/button 四类，"装饰色只出现在边框/图形里"的案会假红。');

out('\n=== 自洽性核对 2：提示词声称的标题字体 == 实测 h1 字体？ ===');
let fOK = 0; const fBad = [];
for (const r of rows) {
  if (!r.M) continue;
  const real = (r.M.hero && r.M.hero.font) || '';
  const claimed = (r.fontLine.match(/标题按这个顺序取第一个可用的：([^（]+)/) || [])[1]
    || (r.fontLine.match(/标题用 ([^。]+)。/) || [])[1]
    || (r.fontLine.match(/全站只用一款字体：([^（]+)/) || [])[1] || '';
  const first = claimed.split('→')[0].trim();
  if (first && real && first === real) fOK++;
  else fBad.push(`${r.id} 提示词「${first}」 实测 h1「${real}」`);
}
out(`  首个字体名 == 实测 h1 字体：${fOK}/30`);
for (const b of fBad) out('    ' + b);

out('\n=== 自洽性核对 3：圆角 / 阴影 声明 vs 实测 ===');
let radOK = 0, shaOK = 0; const radBad = [], shaBad = [];
for (const r of rows) {
  if (!r.M) continue;
  const realR = r.M.buttons && r.M.buttons.radius;
  const claimedZero = /全站一律 0/.test(r.radius);
  if (claimedZero === (realR === 0)) radOK++; else radBad.push(`${r.id} 声称${claimedZero ? '0' : '非0'} 实测按钮 radius=${realR}`);
  const sShadow = r.M.surfaces && r.M.surfaces.shadowStatic;
  const claimsNone = /无阴影|不要|不许|只在|只用/.test(r.shadow) && !/都有|柔和/.test(r.shadow);
  if ((sShadow === 0) === claimsNone) shaOK++; else shaBad.push(`${r.id} shadowStatic=${sShadow} 声明「${r.shadow.replace(/^4\. 阴影：/, '').slice(0, 40)}」`);
}
out(`  圆角：${radOK}/30 一致`); for (const b of radBad) out('    ' + b);
out(`  阴影（shadowStatic==0 与否）：${shaOK}/30 一致`); for (const b of shaBad) out('    ' + b);

out('\n=== 自洽性核对 4：minPics 声称 vs 实测真图数 ===');
let picOK = 0; const picBad = [];
for (const r of rows) {
  if (!r.M || !r.pics) continue;
  const real = (r.M.page && r.M.page.realPictures) || 0;
  if (real >= +r.pics) picOK++; else picBad.push(`${r.id} 声称≥${r.pics} 实测 ${real}`);
}
out(`  真图数 ≥ 声称：${picOK}/30`); for (const b of picBad) out('    ' + b);

out('\n=== 提示词里"必须人眼判断"的部分（不可机械判定） ===');
out('  ① 气质/调性行（tone）：判据是"像不像"，没有可比较的取值');
out('  ② 机制句（mechanism）：文字描述几何关系，需读图判断');
out('  ③ risk 段 220 字：说"最容易做成什么错样"，无目标值');
out('  ④ 验收三问第 1 问「拿远半米看」：纯主观');
out('  ⑤ 防退化 8 条：多数可机械查（紫/emoji/渐变），但"三条等宽 feature 卡片"需布局几何');
