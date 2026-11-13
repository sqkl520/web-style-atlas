/* 盲测有效性证据闸门：把「64/64 判别值」这条结论变成可重跑、可自测的断言。
 *
 * 为什么需要它：这个数字目前只存在于两份 markdown 里。如果 _staged/ 的产物被清理、
 * 或判别逻辑改坏，报告里的 64/64 就变成一句无源之谈，而没有任何东西会报错。
 * 这正是本仓库最老的病（闸门读不到数据也不报错）。
 *
 * 五条断言：
 *   A. 判别值总数 = 64，且每案 100% 命中
 *   B. 阴性对照：非对角线命中率 < 15%，且与对角线差 ≥ 5 倍
 *   C. 剔除「在别的产物里也出现过」的弱判别值后，干净判别值仍 100% 命中
 *   D. 报告里引用的拆分数字（50 个 hex）与实测一致，且 hex+数值 = 总数
 *
 * 自测（--selftest）：故意破坏一个条件，断言闸门会 FAIL。
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '../../..');
const BLIND = join(ROOT, 'deliverables/78-northstar/blind');
const STAGED = join(ROOT, 'deliverables/78-northstar/_probe/_staged');

const tokensOf = (txt) => {
  const s = new Set();
  for (const m of txt.matchAll(/#[0-9A-Fa-f]{6}/g)) s.add(m[0].toUpperCase());
  for (const m of txt.matchAll(/\b\d+(?:\.\d+)?(?:px|vw|fr|mm|%)\b/g)) s.add(m[0]);
  return s;
};

const hitOne = (html, t) => {
  if (html.includes(t)) return true;
  const num = t.replace(/[a-z%]+$/, '');
  return new RegExp(`(^|[^\\d.])${num.replace('.', '\\.')}\\s*(px|vw|fr|mm|%)`, 'i').test(html);
};

export function collect(opts = {}) {
  const ids = readdirSync(BLIND, { withFileTypes: true })
    .filter((d) => d.isDirectory() && /^S\d{2}$/.test(d.name))
    .map((d) => d.name)
    .sort();

  const all = {};
  for (const id of ids) {
    const p = join(BLIND, id, 'task.txt');
    if (existsSync(p)) all[id] = tokensOf(readFileSync(p, 'utf8'));
  }

  const disc = {};
  for (const id of Object.keys(all)) {
    const others = new Set();
    for (const [o, s] of Object.entries(all)) {
      if (o === id) continue;
      for (const t of s) others.add(t);
    }
    disc[id] = [...all[id]].filter((t) => !others.has(t));
  }

  const artDir = opts.artDir || STAGED;
  const artifactOf = (id) => {
    for (const n of [`${id}-sandbox.html`, `${id}-judge.html`, `${id}.html`]) {
      const f = join(artDir, n);
      if (existsSync(f)) return readFileSync(f, 'utf8').toUpperCase();
    }
    return null;
  };

  const withArt = Object.keys(disc).filter((id) => disc[id].length && artifactOf(id));

  /* 对角线 */
  let diagH = 0, diagN = 0;
  const perCase = [];
  for (const id of withArt) {
    const html = artifactOf(id);
    const h = disc[id].filter((t) => hitOne(html, t)).length;
    diagH += h; diagN += disc[id].length;
    perCase.push({ id, n: disc[id].length, hit: h });
  }

  /* 非对角线 */
  let offH = 0, offN = 0;
  for (const r of withArt) {
    const html = artifactOf(r);
    for (const c of withArt) {
      if (r === c) continue;
      offH += disc[c].filter((t) => hitOne(html, t)).length;
      offN += disc[c].length;
    }
  }

  /* 干净判别值 */
  let cleanN = 0, cleanH = 0;
  const weak = [];
  for (const id of withArt) {
    const html = artifactOf(id);
    for (const t of disc[id]) {
      const inOthers = withArt.filter((x) => x !== id && hitOne(artifactOf(x), t)).length;
      if (inOthers > 0) { weak.push({ id, t, inOthers }); continue; }
      cleanN++;
      if (hitOne(html, t)) cleanH++;
    }
  }

  /* hex / 数值 拆分：报告 §三 与 §11.3 引用了「50 个唯一 hex」「14 个数值」，
     这两个数字必须与实测一致，否则报告会悄悄腐化。 */
  let hexN = 0, numN = 0;
  for (const id of withArt) {
    for (const t of disc[id]) { if (t.startsWith('#')) hexN++; else numN++; }
  }

  return { perCase, diagH, diagN, offH, offN, cleanN, cleanH, weak, withArt, hexN, numN };
}

export function judge(r, opts = {}) {
  const f = [];
  const diagRate = r.diagH / Math.max(1, r.diagN);
  const offRate = r.offH / Math.max(1, r.offN);
  const cleanRate = r.cleanH / Math.max(1, r.cleanN);
  const expectTotal = opts.expectTotal ?? 64;

  if (r.diagN !== expectTotal) {
    f.push({ rule: 'A-TOTAL', level: 'FAIL', msg: `判别值总数 ${r.diagN}，期望 ${expectTotal}` });
  }
  if (diagRate < 1) {
    const miss = r.perCase.filter((c) => c.hit < c.n);
    f.push({ rule: 'A-DIAG', level: 'FAIL', msg: `对角线未满 ${(diagRate * 100).toFixed(1)}%，缺: ${miss.map((m) => `${m.id} ${m.hit}/${m.n}`).join(', ')}` });
  }
  if (offRate >= 0.15) {
    f.push({ rule: 'B-CONTROL', level: 'FAIL', msg: `非对角线命中 ${(offRate * 100).toFixed(1)}% ≥ 15%，判别法测到的可能是巧合` });
  }
  if (diagRate / Math.max(offRate, 0.001) < 5) {
    f.push({ rule: 'B-RATIO', level: 'FAIL', msg: `对角线/非对角线 = ${(diagRate / Math.max(offRate, 0.001)).toFixed(1)} 倍 < 5 倍` });
  }
  if (cleanRate < 1) {
    f.push({ rule: 'C-CLEAN', level: 'FAIL', msg: `干净判别值命中 ${(cleanRate * 100).toFixed(1)}% < 100%` });
  }
  /* 报告里引用的两个拆分数字（29-prompt-truncation-bug.md §三 / §11.3） */
  const expectHex = opts.expectHex ?? 50;
  if (r.hexN !== expectHex) {
    f.push({ rule: 'D-HEX', level: 'FAIL', msg: `唯一 hex 数 ${r.hexN}，报告写的是 ${expectHex}` });
  }
  if (r.hexN + r.numN !== r.diagN) {
    f.push({ rule: 'D-SUM', level: 'FAIL', msg: `hex ${r.hexN} + 数值 ${r.numN} ≠ 总数 ${r.diagN}` });
  }
  return f;
}

/* ---------- CLI ---------- */
const isMain = resolve(process.argv[1] || '') === fileURLToPath(import.meta.url);

if (isMain) {
  const selftest = process.argv.includes('--selftest');

  if (selftest) {
    /* 变异测试：证明闸门会响，不是恒真 */
    const base = collect();
    const mutations = [
      { name: '把判别值总数改成 65', run: () => judge({ ...base }, { expectTotal: 65 }), expect: 'A-TOTAL' },
      { name: '假装对角线少命中一个', run: () => judge({ ...base, diagH: base.diagH - 1 }), expect: 'A-DIAG' },
      { name: '假装非对角线命中 50%', run: () => judge({ ...base, offH: Math.round(base.offN * 0.5) }), expect: 'B-CONTROL' },
      { name: '假装干净判别值少命中一个', run: () => judge({ ...base, cleanH: base.cleanH - 1 }), expect: 'C-CLEAN' },
      { name: '报告把 50 个 hex 写成 45', run: () => judge({ ...base }, { expectHex: 45 }), expect: 'D-HEX' },
      { name: 'hex 与数值之和对不上总数', run: () => judge({ ...base, numN: base.numN + 3 }), expect: 'D-SUM' },
      { name: '产物目录换成空的', run: () => judge(collect({ artDir: join(HERE, '_nonexistent') })), expect: null },
    ];
    let bad = 0;
    for (const m of mutations) {
      const f = m.run();
      if (m.expect === null) {
        /* 空产物目录：判据应是「总数对不上」或「对角线空」而不是静默通过 */
        const fired = f.some((x) => ['A-TOTAL', 'A-DIAG'].includes(x.rule));
        console.log(`${fired ? '✓' : '✗'} ${m.name} → ${fired ? '响了' : '没响（闸门恒真）'}`);
        if (!fired) bad++;
      } else {
        const hit = f.some((x) => x.rule === m.expect);
        console.log(`${hit ? '✓' : '✗'} ${m.name} → 期望 ${m.expect} ${hit ? '响了' : '没响（闸门恒真）'}`);
        if (!hit) bad++;
      }
    }
    console.log(bad === 0
      ? `\n自测全部通过：${mutations.length}/${mutations.length} 变异都让闸门响了。`
      : `\n自测失败：${bad}/${mutations.length} 个变异没响。`);
    process.exit(bad === 0 ? 0 : 1);
  }

  const r = collect();
  const f = judge(r);

  console.log('=== 盲测有效性证据 ===\n');
  console.log(`有产物的案: ${r.withArt.length}　(${r.withArt.join(' ')})`);
  console.log(`判别值总数: ${r.diagN}　命中: ${r.diagH}　= ${((r.diagH / Math.max(1, r.diagN)) * 100).toFixed(1)}%`);
  console.log(`阴性对照（非对角线）: ${r.offH}/${r.offN} = ${((r.offH / Math.max(1, r.offN)) * 100).toFixed(1)}%`);
  console.log(`倍数: ${((r.diagH / Math.max(1, r.diagN)) / Math.max(r.offH / Math.max(1, r.offN), 0.001)).toFixed(1)}×`);
  console.log(`干净判别值（零份无关产物含它）: ${r.cleanH}/${r.cleanN} = ${((r.cleanH / Math.max(1, r.cleanN)) * 100).toFixed(1)}%`);
  console.log(`\n弱判别值 ${r.weak.length} 个（在别的产物里也出现过，已从「干净」里剔除）:`);
  for (const w of r.weak) console.log(`  ${w.id.padEnd(5)} ${w.t.padEnd(9)} 在 ${w.inOthers} 份无关产物里出现`);

  console.log('');
  if (f.length === 0) {
    console.log('✓ 五条断言全部成立');
    process.exit(0);
  }
  for (const x of f) console.log(`${x.level === 'FAIL' ? '✗' : '⚠'} [${x.rule}] ${x.msg}`);
  process.exit(f.some((x) => x.level === 'FAIL') ? 1 : 0);
}
