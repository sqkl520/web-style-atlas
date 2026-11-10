// 探针 6：S12/S15/S19 的 layout 为什么是空 —— 到底是"规格没写"还是"解析器把正文数字当成字段号"？
// 同时抓出「（…）」被剥空导致整段蒸发的全部实例（机制 / 反套路改造三指标）。
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PROTO } from './_rt_lib.mjs';

const SPECS = join(PROTO, '_specs');
const dec = (s) => s.replace(/\*\*/g, '').replace(/`/g, '').replace(/\s+/g, ' ').trim();

function track(text) {
  const starts = [];
  const NAME = '([^\\n：*\\d][^\\n：*]{0,38}?)';
  const add = (m, how) => starts.push({ i: m.index, end: m.index + m[0].length, key: m[3], num: m[1], att: m[2], how, raw: m[0] });
  for (const m of text.matchAll(new RegExp('^(\\d{1,2})(-附)?[.．]?\\s*' + NAME + '：', 'gm'))) add(m, 'R1 同行冒号');
  for (const m of text.matchAll(new RegExp('^\\*\\*(\\d{1,2})(-附)?[.．]?\\s*' + NAME + '\\*\\*\\s*$', 'gm'))) add(m, 'R2 加粗独行');
  for (const m of text.matchAll(new RegExp('^(\\d{1,2})(-附)?[.．]?\\s*\\*\\*' + NAME + '\\*\\*\\s*[：:]', 'gm'))) add(m, 'R3 加粗带冒号');
  starts.sort((a, b) => a.i - b.i);
  const tailRe = /^\s*(?:\*\*)?(?:真实上站文案|自评|版本|校验|审查)(?:\*\*)?\s*[：:]/m;
  const tailM = tailRe.exec(text.slice(starts[0].i));
  const tailAbs = tailM ? starts[0].i + tailM.index : text.length;
  const fields = {};
  const segs = [];
  for (let i = 0; i < starts.length; i++) {
    const s = starts[i];
    const key = s.key.replace(/（[^）]*）/g, '').trim();
    let to = i + 1 < starts.length ? starts[i + 1].i : tailAbs;
    if (to > tailAbs) to = tailAbs;
    const seg = dec(text.slice(s.end, to));
    segs.push({ ...s, keyStripped: key, segLen: seg.length, segHead: seg.slice(0, 60) });
    if (key && !fields[key]) fields[key] = seg;
  }
  return { starts, segs, fields, tailAbs };
}

for (const id of ['S12', 'S15', 'S19', 'S03', 'S08', 'S01']) {
  const text = readFileSync(join(SPECS, id + '.md'), 'utf8');
  const { segs, fields } = track(text);
  console.log('╔══ ' + id + ' ══════════════════════════════════');
  console.log('║ starts 总 ' + segs.length + ' 个；fields 键 ' + Object.keys(fields).length + ' 个');
  console.log('║ layout = ' + JSON.stringify((fields['布局与网格'] || '').slice(0, 80)));
  console.log('║ 逐段：num 规则 key→stripped  段长  段首');
  for (const s of segs) {
    const flag = s.num === '1' || +s.num <= 12 ? '' : '';
    console.log(`║   ${String(s.num).padStart(2)} ${s.att ? '附' : '  '} [${s.how}] ${JSON.stringify(s.key).slice(0, 34)} → ${JSON.stringify(s.keyStripped).slice(0, 20)}  len=${String(s.segLen).padStart(3)}  ${JSON.stringify(s.segHead.slice(0, 44))}${s.keyStripped === '' ? '   ⚠ 键被剥空，整段丢弃' : ''}`);
  }
  console.log('╚═══════════════════════════════════════════');
  console.log('');
}

// 全库统计：被剥空的段
console.log('=== 全 30 案：键被括号剥空而丢弃的段 ===');
let totChar = 0, totSeg = 0;
for (let i = 1; i <= 30; i++) {
  const id = 'S' + String(i).padStart(2, '0');
  const text = readFileSync(join(SPECS, id + '.md'), 'utf8');
  const { segs } = track(text);
  for (const s of segs) if (s.keyStripped === '') {
    totSeg++; totChar += s.segLen;
    console.log(`  ${id}  原始key=${JSON.stringify(s.key)}  段长=${s.segLen}  ${JSON.stringify(s.segHead.slice(0, 40))}`);
  }
}
console.log(`  合计 ${totSeg} 段 / ${totChar} 字被丢弃`);

// 全库统计：正文首句被误认成字段起点的段（num 与真实字段号不符的"伪字段"）
console.log('');
console.log('=== 全 30 案：疑似"正文数字被当成字段号"的伪起点 ===');
let spoof = 0;
for (let i = 1; i <= 30; i++) {
  const id = 'S' + String(i).padStart(2, '0');
  const text = readFileSync(join(SPECS, id + '.md'), 'utf8');
  const { segs, fields } = track(text);
  const realKeys = new Set(['一句话视觉定义', '美学家族与参考', '配色系统', '字体策略', '布局与网格', '关键视觉元素', '动效与交互', '去 AI 味审查点', '反 AI 味风险与规避', '适用场景', '可落地要点', '设计师签名式怪癖']);
  for (const s of segs) {
    if (!realKeys.has(s.keyStripped) && s.keyStripped !== '' && s.how === 'R1 同行冒号' && /^(栏|列|个|条|块)/.test(s.keyStripped)) {
      spoof++;
      console.log(`  ${id}  num=${s.num} how=${s.how} 伪造key=${JSON.stringify(s.keyStripped)}  吞掉段长=${s.segLen}`);
      console.log(`      段首: ${JSON.stringify(s.segHead.slice(0, 70))}`);
    }
  }
}
console.log(`  合计 ${spoof} 处`);
