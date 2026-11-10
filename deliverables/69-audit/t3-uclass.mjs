// 任务 3 探针：U1–U6「看起来像判据、实际没有正确/错误之分」的分类扫描。
//
// 为什么要机器判 + 人工复核两道：
//   U 类的定义本身是**语义**判断，纯正则只能给出候选。所以本脚本的做法是：
//   1) 用 pattern 给每条约束打候选标签（可复现、可讨价还价）
//   2) 输出全部命中原文，供逐条人工核（核过的结论另存 t3-verdicts.json）
//   3) 报告里两个数分开写：机器候选数 / 人工复核后确证数
//   这一轮我不再犯上一轮"把验证器自己的口径当成真相"的错。
//
// 关键：分母问题。constraints.json 有 1327 条 item，但**去重后只有 1011 条**
// （palette 一行被拆成 4 条、font 一行拆成 4 条）。占比必须用去重后的分母，
// 否则同类问题会被重复计入而虚高。
import { readFileSync, writeFileSync } from 'node:fs';

const OUT = 'D:/Web/style/deliverables/69-audit';
const con = JSON.parse(readFileSync(OUT + '/constraints.json', 'utf8'));

/* ── U 类判据 ──────────────────────────────────────────────────────────
 * U1 无定义：关键术语无定义，不同读法不同答案
 *    - 「不新增更多彩色」：同色系深浅/alpha 派生算不算？
 *    - 「不同的图片」：尺寸不同算不同，还是内容不同？
 *    - 「编号连续」：跳号的定义？
 *    - 「半透明浮层」：alpha < 1 算不算？
 * U2 无参照系：相对量没说相对什么
 *    - 「外出血 24px」：相对视口/网格/content-box？
 *    - 「占 1 至 8 栏」「高度只到图幅 62%」
 * U3 数学不可能：约束互相矛盾
 *    - 「16 栏放 12 块，最小 2 栏」→ 12×2=24 > 16
 *    - 「至少 N 个不同图片位」+「不编造内容」
 * U4 语义歧义：一个词两种读法都对
 *    - 「24×96px 横条」：宽×高 还是 高×宽？
 *    - 「栏距 0」+「gap」？
 * U5 不可执行：人能做、AI 不能（或换了内容就不成立）
 *    - 「6 个位的图片内容必须不同」——AI 只能造占位符
 *    - 「用你自己的真实数量」——AI 没有"你"
 * U6 自指冲突：同一提示词里两条互斥
 *    - 「只给代码」vs「请先告诉我」（21/30 案实测）
 */

const U = {
  U1: {
    name: '无定义',
    test: (t) => {
      const hits = [];
      if (/不新增更多彩色/.test(t)) hits.push('「不新增更多彩色」：同色系深浅/alpha 派生算不算新增？无定义');
      if (/不同的\*\*图片位置|不同的图片|图片内容|同一张图重复用不算/.test(t)) hits.push('「不同图片」：尺寸不同/内容不同/裁切不同，无定义');
      if (/编号连续|不跳号|同一串/.test(t)) hits.push('「编号连续/同一串」：跳号与等值的判定边界未定义');
      if (/半透明浮层/.test(t)) hits.push('「半透明浮层」：opacity<1 还是 alpha<1？阈值未定义');
      if (/扁平插画/.test(t)) hits.push('「扁平插画」：无任何可操作定义');
      if (/发光字|霓虹色|扫描线/.test(t)) hits.push('「发光字/霓虹/扫描线」：text-shadow 算不算发光？未定义');
      if (/视差|卡片翻转/.test(t)) hits.push('「视差/卡片翻转」：位移阈值未定义');
      if (/三条等宽|等宽 feature/.test(t)) hits.push('「等宽」：像素相等还是视觉相近？未定义');
      if (/居中大标题|视觉主次|副标题/.test(t)) hits.push('「大标题/主次」：字号档与视觉权重无阈值');
      return hits;
    },
  },
  U2: {
    name: '无参照系',
    test: (t) => {
      const hits = [];
      if (/出血\s*\d+px|外出血/.test(t)) hits.push('「出血 Npx」：相对视口/网格/content-box？未说');
      if (/占\s*\d+\s*(至|-|–|到)\s*\d+\s*栏|占\s*\d+\s*栏/.test(t)) hits.push('「占 N 栏」：栏宽的参照（网格列轨道）未在提示词内定义');
      if (/高度只到|只到图幅\s*\d+%|\d+%\s*不透明/.test(t)) hits.push('「只到 X%」：相对父容器/图幅/视口？未说');
      if (/得出\s*\d+%|误差|校正\s*\d/.test(t)) hits.push('百分比基准未声明');
      return hits;
    },
  },
  U3: {
    name: '数学不可能',
    test: (t, ctx) => {
      const hits = [];
      // 网格容量：N 栏放 M 块、每块最小 k 栏
      const g = t.match(/(\d+)\s*栏[^。]{0,60}?(\d+)\s*块[^。]{0,40}?最小\s*(\d+)\s*栏/);
      if (g) {
        const [_, cols, blocks, min] = g.map(Number);
        if (blocks * min > cols) hits.push(`网格容量矛盾：${cols} 栏放 ${blocks} 块、每块最小 ${min} 栏 → ${blocks}×${min}=${blocks * min} > ${cols}`);
      }
      const g2 = t.match(/(\d+)\s*块[^。]{0,40}?最大\s*(\d+)\s*栏[^。]{0,30}?最小\s*(\d+)\s*栏/);
      if (g2 && ctx) { /* 需与栏数合看，交给人工 */ }
      return hits;
    },
  },
  U4: {
    name: '语义歧义',
    test: (t) => {
      const hits = [];
      if (/\d+\s*[×x]\s*\d+\s*px/.test(t)) hits.push('「A×B px」：宽×高 还是 高×宽？未说');
      if (/栏距\s*0/.test(t)) hits.push('「栏距 0」：gap:0 还是无 gap 属性？两者渲染可不同');
      if (/错位\s*[\d./]+\s*px/.test(t)) hits.push('「错位量」：正向偏移还是双向展开？未说');
      return hits;
    },
  },
  U5: {
    name: '不可执行',
    test: (t) => {
      const hits = [];
      if (/保证.*真实数量|用你自己的真实数量|有几个排几个/.test(t)) hits.push('「用你自己的真实数量」：AI 没有"你"，无从得知真实数量');
      if (/图片内容|必须不同.*图|真实可见的尺寸/.test(t)) hits.push('「图片内容必须不同」：AI 只能产出占位路径，无法保证内容不同');
      if (/如果你的内容里没有这个东西，请先告诉我/.test(t)) hits.push('「请先告诉我」：与同文件的「只给代码」互斥（见 U6）');
      if (/按真实|真实档案|真实唱片|真实编号/.test(t)) hits.push('「真实 X」：AI 无该领域数据源');
      return hits;
    },
  },
  U6: {
    name: '自指冲突',
    test: (t) => {
      const hits = [];
      if (/只给代码|不要解释、不要设计说明/.test(t) && /请先告诉我|先告诉我/.test(t)) hits.push('「只给代码」vs「请先告诉我」：同一文件内互斥');
      return hits;
    },
  },
};

// ── 全局 U6：跨行判定（同一案内同时出现两句）──
const items = [];
for (const [id, v] of Object.entries(con.per)) {
  for (const it of v.items) items.push({ id, ...it });
}
// 按案聚合全文
const fullText = {};
for (const it of items) (fullText[it.id] = fullText[it.id] || []).push(it.text);
for (const id of Object.keys(fullText)) fullText[id] = fullText[id].join('\n');

// 去重（同案同文只计一次）
const seen = new Set();
const uniqItems = [];
for (const it of items) {
  const k = it.id + '\u0000' + it.text;
  if (seen.has(k)) continue;
  seen.add(k);
  uniqItems.push(it);
}

const hits = [];
for (const it of uniqItems) {
  for (const [code, def] of Object.entries(U)) {
    const h = def.test(it.text, fullText[it.id]);
    for (const reason of h) hits.push({ id: it.id, cat: it.cat, kind: it.kind, code, reason, text: it.text.slice(0, 160) });
  }
}
// 全局 U6（按案）
for (const [id, t] of Object.entries(fullText)) {
  if (/只给代码|不要解释、不要设计说明/.test(t) && /请先告诉我/.test(t)) {
    hits.push({ id, cat: '?', kind: '(case-level)', code: 'U6', reason: '同一案内「只给代码」与「请先告诉我」互斥', text: '(该案全文)' });
  }
}

writeFileSync(OUT + '/t3-uclass.json', JSON.stringify({ nItems: items.length, nUniq: uniqItems.length, hits }, null, 1), 'utf8');

// ── 统计 ──
const byCode = {};
for (const h of hits) byCode[h.code] = (byCode[h.code] || 0) + 1;
const casesByCode = {};
for (const h of hits) (casesByCode[h.code] = casesByCode[h.code] || new Set()).add(h.id);
const flaggedItems = new Set(hits.map((h) => h.id + '\u0000' + h.text));
const flaggedCases = new Set(hits.map((h) => h.id));

console.log('=== U 类命中统计（去重后分母）===');
console.log('item 总数        :', items.length);
console.log('去重后 item 数   :', uniqItems.length, '（重复', items.length - uniqItems.length, '条）');
console.log('');
console.log('类型  命中条数  涉及案数  案号');
for (const code of ['U1', 'U2', 'U3', 'U4', 'U5', 'U6']) {
  const n = byCode[code] || 0;
  const cs = casesByCode[code] ? [...casesByCode[code]].sort() : [];
  console.log(code, U[code].name.padEnd(8), String(n).padEnd(9), String(cs.length).padEnd(9), cs.join(','));
}
console.log('');
console.log('被标 U 类的去重 item 数 :', flaggedItems.size, '/', uniqItems.length,
  '=', (flaggedItems.size / uniqItems.length * 100).toFixed(1) + '%');
console.log('至少含一条 U 类的案数   :', flaggedCases.size, '/30');
