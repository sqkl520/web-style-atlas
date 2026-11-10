// 任务 2 探针 B：提及字数的**多种归属规则**对比。
// Lead 给的锚点：S19=3128、S06=3122、S18=1355、S20/S21/S28=0。
// 我第一版用"整块注释全文"归属，得 S19=11294 / S06=9418 / S18=9403 —— 与锚点差 3~7 倍。
// 说明锚点用的是更细的粒度。这里并排跑 4 种规则，看哪种复现锚点，
// 并回答真正要紧的问题：**哪些案在所有规则下都是 0**（隔离结论对这个选择是否稳健）。
import { readFileSync, writeFileSync } from 'node:fs';

const F = 'D:/Web/style/prototypes/_selection/prompt-copy.js';
const OUT = 'D:/Web/style/deliverables/69-audit';
const src = readFileSync(F, 'utf8');
const ids = Array.from({ length: 30 }, (_, i) => 'S' + String(i + 1).padStart(2, '0'));
const has = (s, id) => new RegExp('(^|[^A-Za-z0-9])' + id + '(?!\\d)').test(s);

const comments = [...src.matchAll(/\/\*[\s\S]*?\*\//g)].map((m) => m[0]);

// 规则 1：整块注释（粗）
// 规则 2：含案号的**段落**（以空行为界）
// 规则 3：含案号的**句子**（以 。；！？ 为界，中英混排）
// 规则 4：案号前后各 60 字的窗口（"就近上下文"）
const rules = {
  block: (id) => comments.filter((c) => has(c, id)).reduce((a, c) => a + c.length, 0),
  para: (id) => {
    let n = 0;
    for (const c of comments) for (const p of c.split(/\n\s*\n/)) if (has(p, id)) n += p.trim().length;
    return n;
  },
  sentence: (id) => {
    let n = 0;
    for (const c of comments) {
      const body = c.replace(/^\/\*+|\*+\/$/g, '');
      for (const s of body.split(/(?<=[。；！？])|\n/)) if (has(s, id)) n += s.trim().length;
    }
    return n;
  },
  window: (id) => {
    let n = 0;
    for (const c of comments) {
      const re = new RegExp('(^|[^A-Za-z0-9])' + id + '(?!\\d)', 'g');
      let m;
      while ((m = re.exec(c))) {
        const at = m.index + m[0].length;
        n += c.slice(Math.max(0, at - 60), at + 60).trim().length;
        re.lastIndex = at;
      }
    }
    return n;
  },
};

const table = {};
for (const id of ids) table[id] = Object.fromEntries(Object.entries(rules).map(([k, f]) => [k, f(id)]));
writeFileSync(OUT + '/t2-isolation-rules.json', JSON.stringify(table, null, 1), 'utf8');

console.log('id    整块   段落   句子   窗口60   │ Lead 锚点');
const anchor = { S19: 3128, S06: 3122, S18: 1355, S20: 0, S21: 0, S28: 0 };
for (const id of ids) {
  const t = table[id];
  console.log(id.padEnd(6), String(t.block).padEnd(7), String(t.para).padEnd(7), String(t.sentence).padEnd(7), String(t.window).padEnd(7),
    '│', anchor[id] !== undefined ? anchor[id] : '');
}
console.log('\n各规则下为 0 的案（交集 = 稳健的"干净"清单）：');
for (const k of Object.keys(rules)) {
  console.log('  ' + k.padEnd(9), ids.filter((id) => table[id][k] === 0).join(',') || '无');
}
const cleanAll = ids.filter((id) => Object.keys(rules).every((k) => table[id][k] === 0));
const notCleanAny = ids.filter((id) => Object.keys(rules).some((k) => table[id][k] === 0));
console.log('\n所有规则下都为 0：', cleanAll.join(','), '(' + cleanAll.length + ' 案)');
console.log('某规则为 0 但并非全 0：', notCleanAny.filter((x) => !cleanAll.includes(x)).join(',') || '无');
