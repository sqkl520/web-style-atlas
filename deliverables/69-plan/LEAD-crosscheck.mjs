import { readFileSync, existsSync } from 'node:fs';

// 从各报告里抽取「建议做什么」，交叉核对有没有互相冲突或遗漏
const files = [
  ['REDTEAM', 'deliverables/69-plan/REDTEAM-five-gaps.md'],
  ['COVERAGE', 'deliverables/69-audit/COVERAGE-AND-ROUTING.md'],
  ['MOBILE', 'deliverables/69-audit/MOBILE-LENGTH.md'],
  ['FAIL-TRIAGE', 'deliverables/69-audit/FAIL-TRIAGE.md'],
  ['VERIFIABILITY', 'deliverables/69-audit/PROMPT-VERIFIABILITY.md'],
  ['E2E', 'deliverables/69-test/REPORT.md'],
];

const KEYS = /建议|推荐|该做|第一步|优先级|必修|应改|修法|处置/;

for (const [name, p] of files) {
  if (!existsSync(p)) { console.log(`${name}: 缺`); continue; }
  const s = readFileSync(p, 'utf8');
  console.log(`\n${'='.repeat(70)}\n${name}  (${(s.length / 1024).toFixed(1)}KB)\n${'='.repeat(70)}`);
  const lines = s.split('\n');
  let shown = 0;
  for (let i = 0; i < lines.length && shown < 14; i++) {
    const l = lines[i];
    // 抓「### 建议」「## 7. 推荐」这类小节标题 + 紧跟的第一句
    if (/^#{2,4}\s*.*(建议|推荐|该做|优先级|必修|下一步|结论)/.test(l)) {
      console.log('\n' + l.trim());
      // 打印该节前 4 行非空内容
      let n = 0;
      for (let j = i + 1; j < lines.length && n < 4; j++) {
        const t = lines[j].trim();
        if (!t) continue;
        if (/^#{2,4}\s/.test(t)) break;
        console.log('   ' + t.slice(0, 200));
        n++;
      }
      shown++;
    }
  }
}
