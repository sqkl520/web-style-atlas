// 一次性把两份 README 的所有数字同步到 35 案的实测值。
// 每条替换都断言「旧串存在」，不存在就报错——不许静默跳过（本仓库那个病）。
import { readFileSync, writeFileSync } from 'node:fs';

const F = { N: 35, fail0: 29, failTotal: 17, failCases: 6, auditSum: 11365, warm: 18, warmPct: 51, shots: 308, plen: [1601, 2159], pmed: 1968 };

const JOBS = {
  'README.md': [
    ['31 个方案各配一个', `${F.N} 个方案各配一个`],
    ['一屏摊开 31 个案子。', `一屏摊开 ${F.N} 个案子。`],
    ['**31 个设计方案**——它不是配色皮肤', `**${F.N} 个设计方案**——它不是配色皮肤`],
    ['**31 个可运行原型**——真排版', `**${F.N} 个可运行原型**——真排版`],
    ['选型台不是 31 个案之一', `选型台不是 ${F.N} 个案之一`],
    ['│   └── S01-… S31-…/            # 31 个原型', `│   └── S01-… S35-…/            # ${F.N} 个原型`],
    ['all 31 schemes appear on one page', `all ${F.N} schemes appear on one page`],
    ['[![Schemes: 31]', `[![Schemes: ${F.N}]`],
    ['badge/Schemes-31-blue', `badge/Schemes-${F.N}-blue`],
    ['**31/31 有值**（最短 276 字、最长 444 字、全库合计 10,419 字，中位数 324）',
     `**${F.N}/${F.N} 有值**（最短 276 字、最长 444 字、全库合计 ${F.auditSum.toLocaleString('en-US')} 字，中位数 324）`],
    ['（31 案实测：中位 1988 字）', `（${F.N} 案实测：中位 ${F.pmed} 字）`],
    ['**29 个闸门 FAIL=0**。剩下 2 个的 5 条失败', `**${F.fail0} 个闸门 FAIL=0**。剩下 ${F.failCases} 个的 ${F.failTotal} 条失败`],
    ['— 5 remaining gate failures, measured ground-colour homogeneity (18 / 31 = 58% in a warm pale band)',
     `— ${F.failTotal} remaining gate failures, measured ground-colour homogeneity (${F.warm} / ${F.N} = ${F.warmPct}% in a warm pale band)`],
    ['（**272 张**', `（**${F.shots} 张**`],
    ['# 272 张三档真实渲染截图', `# ${F.shots} 张三档真实渲染截图`],
    ['`272 张`全部在库里', `\`${F.shots} 张\`全部在库里`],
    ['# 文中写 272', `# 文中写 ${F.shots}`],
    ['看效果：打开选型台，272 张真截图摊在一页', `看效果：打开选型台，${F.shots} 张真截图摊在一页`],
    ['(#看效果打开选型台272-张真截图摊在一页)', `(#看效果打开选型台${F.shots}-张真截图摊在一页)`],
    ['18 / 30 = 60% 落在"暖浅色带"', `${F.warm} / ${F.N} = ${F.warmPct}% 落在"暖浅色带"`],
  ],
  'README-EN.md': [
    ['**A style specimen library: 31 schemes', `**A style specimen library: ${F.N} schemes`],
    ['All 31 schemes on one screen.', `All ${F.N} schemes on one screen.`],
    ['## What you get: 31 schemes, 31 prototypes, 3 templates', `## What you get: ${F.N} schemes, ${F.N} prototypes, 3 templates`],
    ['**Why does this layer have different rules from the 31 schemes?**', `**Why does this layer have different rules from the ${F.N} schemes?**`],
    ['The 31 schemes follow a strict', `The ${F.N} schemes follow a strict`],
    ['The bench is not one of the 31 schemes', `The bench is not one of the ${F.N} schemes`],
    ['31 个案子摊在一页', `${F.N} 个案子摊在一页`],
    ['[![Schemes: 31]', `[![Schemes: ${F.N}]`],
    ['badge/Schemes-31-blue', `badge/Schemes-${F.N}-blue`],
    ['(#what-you-get-31-schemes-31-prototypes-3-templates)', `(#what-you-get-${F.N}-schemes-${F.N}-prototypes-3-templates)`],
    ['**31 of 31 schemes** (shortest 276 characters, longest 444, 10,419 in total, median 324)',
     `**${F.N} of ${F.N} schemes** (shortest 276 characters, longest 444, ${F.auditSum.toLocaleString('en-US')} in total, median 324)`],
    ['(31 schemes measured; median 1,988)', `(${F.N} schemes measured; median ${F.pmed.toLocaleString('en-US')})`],
    ['**14 of the 31 schemes**', `**14 of the ${F.N} schemes**`],
    ['5 remaining failures in the two remaining', `${F.failTotal} remaining failures in the ${F.failCases} remaining`],
    ['all 32 style.css files (31 schemes + the picker)', `all 33 style.css files (${F.N} schemes + the picker)`],
    ['剩余 5 条 FAIL、底色同质（18/31 = 58% 落在暖浅色带）', `剩余 ${F.failTotal} 条 FAIL、底色同质（${F.warm}/${F.N} = ${F.warmPct}% 落在暖浅色带）`],
    ['**12/31 prototypes have an `index.html` of 30–48.4 KB**', `**12/${F.N} prototypes have an \`index.html\` of 30–48.4 KB**`],
    ['it is 12/31 = 39%, not a few', `it is 12/${F.N} = 34%, not a few`],
    ['**18 / 31 = 58% sit in a warm pale band**', `**${F.warm} / ${F.N} = ${F.warmPct}% sit in a warm pale band**`],
    ['（**272 张**', `（**${F.shots} 张**`],
    ['# this README says 272', `# this README says ${F.shots}`],
  ],
};

let totalChanged = 0, totalMissed = 0;
for (const [file, pairs] of Object.entries(JOBS)) {
  let s = readFileSync(file, 'utf8');
  let changed = 0;
  for (const [from, to] of pairs) {
    if (s.includes(from)) { s = s.split(from).join(to); changed++; }
    else { console.log(`  ⚠ ${file}: 未命中 ${JSON.stringify(from.slice(0, 55))}`); totalMissed++; }
  }
  writeFileSync(file, s);
  console.log(`${file}: 改了 ${changed}/${pairs.length}`);
  totalChanged += changed;
}
console.log(`\n合计改 ${totalChanged} 处，未命中 ${totalMissed} 处`);
