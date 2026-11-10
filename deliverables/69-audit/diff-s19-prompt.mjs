// 探针 21：把 deliverables/99-scratch/prompt-s19.md（上次手工验证用的提示词）
// 与线上 buildPrompt('S19') 做结构化 diff —— Lead 已发现"不是同一条"，这里量化差多少。
import { readFileSync, writeFileSync } from 'node:fs';
const DIR = 'D:/Web/style';
const md = readFileSync(DIR + '/deliverables/99-scratch/prompt-s19.md', 'utf8');
const dump = JSON.parse(readFileSync(DIR + '/deliverables/69-audit/dump30.json', 'utf8'));
const live = dump.prompts.S19;

// 从 md 里抽出真正的提示词正文（第一个 --- 之后、第二个 --- 之前）
const parts = md.split(/\n---\n/);
const body = parts[1] || '';

const norm = (s) => s.replace(/\*\*/g, '').replace(/`/g, '').replace(/\s+/g, ' ').trim();

const facts = {
  mdChars: body.length,
  liveChars: live.length,
  mdHasHex: [...new Set((body.match(/#[0-9A-Fa-f]{6}/g) || []).map((x) => x.toUpperCase()))],
  liveHasHex: [...new Set((live.match(/#[0-9A-Fa-f]{6}/g) || []).map((x) => x.toUpperCase()))],
  mdHasStarRules: /--pull: 24px/.test(body),
  liveHasPull: /--pull/.test(live),
  mdDrawerHeight: /≥130px/.test(body),
  liveDrawerHeight: /130px/.test(live),
  mdSpectral: /Spectral/.test(body),
  liveSpectral: /Spectral/.test(live),
  mdNotoSerif: /Noto Serif SC/.test(body),
  liveNotoSerif: /Noto Serif SC/.test(live),
};

// 关键：md 里的色值集合 vs 线上
const hexDiff = {
  onlyInMd: facts.mdHasHex.filter((h) => !facts.liveHasHex.includes(h)),
  onlyInLive: facts.liveHasHex.filter((h) => !facts.mdHasHex.includes(h)),
  shared: facts.mdHasHex.filter((h) => facts.liveHasHex.includes(h)),
};

// 逐条比对：md 的 7 条视觉约束 vs 线上 5 条
const mdClauses = (body.match(/^\d+\.\s+.*$/gm) || []);
const liveClauses = (live.split('\n').filter((l) => /^\d+\. /.test(l)));

const res = {
  ...facts, hexDiff,
  mdClauseN: mdClauses.length, liveClauseN: liveClauses.length,
  mdMentions: {
    'Spectrum/Spectral 字体名': /Spectral/.test(body),
    '--pull 变量名': /--pull/.test(body),
    '≥130px 抽屉正面高': /≥130px/.test(body),
    'B-01-001 编号格式': /B-01-001/.test(body),
    '3+2 两行布局': /3\+2/.test(body),
    '五等分禁令': /五等分/.test(body),
    '#E4DECD 单一底色': /#E4DECD/.test(body),
  },
  liveMentions: {
    'Spectrum/Spectral 字体名': /Spectral/.test(live),
    '--pull 变量名': /--pull/.test(live),
    '≥130px 抽屉正面高': /≥130px/.test(live),
    'B-01-001 编号格式': /B-01-001/.test(live),
    '3+2 两行布局': /3\+2/.test(live),
    '五等分禁令': /五等分/.test(live),
    '#E4DECD 单一底色': /#E4DECD/.test(live),
  },
  liveOpener: live.split('\n').slice(0, 3),
  mdOpener: norm(body).slice(0, 120),
};
writeFileSync(DIR + '/deliverables/69-audit/s19-diff.json', JSON.stringify(res, null, 1), 'utf8');
console.log(JSON.stringify(res, null, 1));
