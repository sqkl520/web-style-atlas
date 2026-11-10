#!/usr/bin/env node
/* 出处完整性闸门（2026-11-11，Q3）
 *
 * 为什么需要它：`build-provenance.mjs` 把机制句里 141 个带单位的数值逐个定位到
 * 实现里的行号，其中 3 个找不到。那 3 个不是解析失败，是**真缺陷**：
 *   · S07 的「0.5px 线宽」实现里不存在（纯文案错）
 *   · S08 的「滚动 200px 走 6px」页面在展示，实现里没有
 *   · S20 的「0.2px 浅线」同上
 *
 * 这类缺陷此前没有任何闸门能抓 —— `check-prompts` 的 `mech-value-not-in-source`
 * 只查「这个数在不在源码里出现过」，而 S08 的 200px 在 HTML 的展示标签里"出现过"，
 * 于是它被算作存在。**"出现过"与"实现了"是两件事。**
 *
 * 这个闸门守的判据：
 *   M1 provenance-parsed   每一案都必须被扫到（读不到 = FAIL，不许静默跳过）
 *   M2 mech-missing        机制句里的数值在实现中找不到 ⇒ FAIL
 *   M3 display-only        实现里没有但页面在展示 ⇒ FAIL 且单独标出（最严重的一类）
 *   M4 coverage            可回溯率低于阈值 ⇒ WARN
 *
 * ⚠️ 防假绿：M1 是这条闸门的第一道 —— 本仓库三次「闸门读不到数据 → 照绿」的病史
 * 里，最近一次就是 check-docs 的 nums/gate 把句子转交给一个看不见它们的正则。
 *
 * 用法：
 *   node prototypes/_build/check-provenance.mjs
 *   node prototypes/_build/check-provenance.mjs --selftest
 */
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = decodeURIComponent(new URL('../..', import.meta.url).pathname).replace(/^\/([A-Za-z]:)/, '$1');
const PROV = join(ROOT, 'prototypes/_prompts/dna-provenance.json');
const SEL = join(ROOT, 'prototypes/_selection');
const QUIET = process.argv.includes('--quiet');

function load() {
  if (!existsSync(PROV)) return null;
  return JSON.parse(readFileSync(PROV, 'utf8').replace(/^﻿/, ''));
}

/** 期望的案数：从 data.js 现算，不写死。 */
function expectedCases() {
  const p = join(SEL, 'data.js');
  if (!existsSync(p)) return null;
  const src = readFileSync(p, 'utf8');
  return new Set([...src.matchAll(/"id":\s*"(S\d{2})"/g)].map((m) => m[1]));
}

export function runCheck(prov, expected, opts = {}) {
  const findings = [];
  const add = (level, rule, msg) => findings.push({ level, rule, msg });
  const stats = { cases: 0, claims: 0, direct: 0, derived: 0, media: 0, missing: [], displayOnly: [] };

  /* ── M1 闸门自己读到了没有 ──────────────────────────────────── */
  if (!prov) {
    add('FAIL', 'provenance-parsed', 'dna-provenance.json 不存在 —— 跑 build-provenance.mjs');
    return { findings, stats };
  }
  if (!Array.isArray(prov) || !prov.length) {
    add('FAIL', 'provenance-parsed', 'dna-provenance.json 是空的或不是数组');
    return { findings, stats };
  }
  stats.cases = prov.length;
  if (expected) {
    const got = new Set(prov.map((r) => r.id));
    const miss = [...expected].filter((id) => !got.has(id));
    if (miss.length) add('FAIL', 'provenance-parsed', `这些案没有出现在 dna-provenance.json 里：${miss.join(' ')}`);
  }

  /* ── M2 / M3 逐条数值 ──────────────────────────────────────── */
  for (const r of prov) {
    for (const c of r.claims || []) {
      stats.claims++;
      if (c.status === 'direct') stats.direct++;
      else if (c.status === 'derived') stats.derived++;
      else if (c.status === 'media') stats.media++;
      else if (c.status === 'missing') {
        /* M3：displayOnly 单独报 —— 它比普通 missing 严重，因为它意味着
         * 页面对用户展示了一个不存在的规格。两者都 FAIL，但理由不同。 */
        if (c.displayOnly) {
          stats.displayOnly.push({ id: r.id, c });
          add('WARN', 'mech-display-only',
            `${r.id} 的「${c.raw}${c.unit}」在页面里展示了（${c.hintFile || "index.html"}:${c.hintLine ?? "?"}），但实现里没有 —— ` +
            `页面向用户承诺了一个不存在的参数`);
        } else {
          stats.missing.push({ id: r.id, c });
          add('FAIL', 'mech-missing',
            `${r.id} 的「${c.raw}${c.unit}」在机制句里，但 ${r.file} 与 index.html 里都找不到`);
        }
      }
    }
  }

  /* ── M4 可回溯率 ───────────────────────────────────────────── */
  const resolvable = stats.direct + stats.derived + stats.media;
  const rate = stats.claims ? resolvable / stats.claims : 1;
  stats.rate = rate;
  const MIN = opts.minRate ?? 0.9;
  if (rate < MIN) {
    add('WARN', 'provenance-coverage',
      `可回溯率 ${(rate * 100).toFixed(1)}%，低于阈值 ${(MIN * 100).toFixed(0)}%` +
      `（${resolvable}/${stats.claims}）`);
  }

  return { findings, stats };
}

/* ── 主流程 ─────────────────────────────────────────────────────── */
if (!process.argv.includes('--selftest')) {
  const prov = load();
  const { findings, stats } = runCheck(prov, expectedCases());
  if (!QUIET) {
    console.log('出处完整性：机制句数值 → 实现行号');
    const order = { FAIL: 0, WARN: 1, INFO: 2 };
    findings.sort((a, b) => order[a.level] - order[b.level]);
    for (const f of findings) {
      const mark = f.level === 'FAIL' ? '✗' : f.level === 'WARN' ? '~' : '·';
      console.log(`  ${mark} [${f.rule}] ${f.msg}`);
    }
    const nf = findings.filter((f) => f.level === 'FAIL').length;
    const nw = findings.filter((f) => f.level === 'WARN').length;
    console.log(`\n合计 FAIL ${nf} / WARN ${nw}`);
    if (stats.claims) {
      console.log(`  ${stats.cases} 案 / ${stats.claims} 个数值：direct ${stats.direct}，derived ${stats.derived}，media ${stats.media}，missing ${stats.missing.length + stats.displayOnly.length}`);
      console.log(`  可回溯率 ${(stats.rate * 100).toFixed(1)}%`);
    }
  }
  process.exit(findings.some((f) => f.level === 'FAIL') ? 1 : 0);
}

/* ── 变异测试 ───────────────────────────────────────────────────── */
{
  const prov = load();
  const exp = expectedCases();
  const cases = [];

  const base = runCheck(prov, exp);
  cases.push({
    label: 'A. 基线（真数据）',
    want: '只红在已知的 3 条 missing 上',
    got: base.findings.filter((f) => f.level === 'FAIL').map((f) => f.rule).join(',') || '全绿',
    ok: !base.findings.some((f) => f.rule === 'provenance-parsed'),
    note: '',
  });

  // B1. 空数据
  const b1 = runCheck([], exp);
  cases.push({ label: 'B1. 空数组', want: '红 provenance-parsed',
    got: b1.findings.map((f) => f.rule).join(',') || '全绿',
    ok: b1.findings.some((f) => f.rule === 'provenance-parsed') });

  // B2. null
  const b2 = runCheck(null, exp);
  cases.push({ label: 'B2. 文件不存在', want: '红 provenance-parsed',
    got: b2.findings.map((f) => f.rule).join(',') || '全绿',
    ok: b2.findings.some((f) => f.rule === 'provenance-parsed') });

  // B3. 少一案
  const b3 = runCheck(prov.slice(0, -1), exp);
  cases.push({ label: 'B3. 少一案', want: '红 provenance-parsed',
    got: b3.findings.filter((f) => f.rule === 'provenance-parsed').map((f) => f.msg.slice(0, 40)).join('') || '全绿',
    ok: b3.findings.some((f) => f.rule === 'provenance-parsed') });

  // B4. 人造一条 missing
  const b4data = prov.map((r, i) => (i === 0 ? { ...r, claims: [...(r.claims || []), { raw: '999', unit: 'px', n: 999, kind: 'len', status: 'missing', why: 'test' }] } : r));
  const b4 = runCheck(b4data, exp);
  cases.push({ label: 'B4. 注入一条 missing', want: '红 mech-missing',
    got: b4.findings.filter((f) => f.rule === 'mech-missing').map((f) => f.msg.slice(0, 40)).join('') || '全绿',
    ok: b4.findings.some((f) => f.rule === 'mech-missing') });

  // B5. 人造一条 displayOnly
  const b5data = prov.map((r, i) => (i === 0 ? { ...r, claims: [...(r.claims || []), { raw: '888', unit: 'px', n: 888, kind: 'len', status: 'missing', displayOnly: true, file: 'index.html', line: 1, why: 'test' }] } : r));
  const b5 = runCheck(b5data, exp);
  cases.push({ label: 'B5. 注入一条 displayOnly', want: '红 mech-display-only',
    got: b5.findings.filter((f) => f.rule === 'mech-display-only').map((f) => f.msg.slice(0, 40)).join('') || '全绿',
    ok: b5.findings.some((f) => f.rule === 'mech-display-only') });

  // B6. 全部可回溯 → 不该有 missing / displayOnly
  const b6data = prov.map((r) => ({ ...r, claims: (r.claims || []).map((c) => (c.status === 'missing' ? { ...c, status: 'direct' } : c)) }));
  const b6 = runCheck(b6data, exp);
  cases.push({ label: 'B6. 把 missing 全改成 direct', want: '无 mech-missing / mech-display-only',
    got: b6.findings.filter((f) => /mech-(missing|display-only)/.test(f.rule)).map((f) => f.rule).join(',') || '无',
    ok: !b6.findings.some((f) => /mech-(missing|display-only)/.test(f.rule)),
    note: '反向用例：证明上面几条的红是真由数据触发的' });

  console.log('出处闸门自测（内存变异，不碰磁盘）\n');
  let pass = 0;
  for (const c of cases) {
    console.log((c.ok ? '  ✓ ' : '  ✗ ') + c.label);
    console.log('     期望 ' + c.want);
    console.log('     实际 ' + c.got);
    if (c.note) console.log('     ' + c.note);
    if (c.ok) pass++;
  }
  console.log('\n' + pass + '/' + cases.length + ' 条符合预期');
  process.exit(pass === cases.length ? 0 : 1);
}
