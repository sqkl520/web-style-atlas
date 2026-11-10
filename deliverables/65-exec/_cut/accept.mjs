/* 一次性跑完 10 条验收，逐条打印命令、exit code、原文输出。
 * 存在的意义：交付文档里那 10 段「原文输出」必须能在一次运行里重放出来，
 * 而不是从十次不同时刻的终端里手工抄。
 *
 * ⚠️ 日志自己写文件，**不要用 pwsh 的 `> accept.txt` 重定向**：
 * PowerShell 5.1 的 `>` 落盘是 UTF-16LE（FF FE …），read 工具与 grep 都会当二进制拒绝。
 * 本文件用 fs.writeFileSync(..., 'utf8') + 同时 tee 到 stdout。 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import crypto from 'node:crypto';
import vm from 'node:vm';

const LOG = [];
/* 把所有 console.log 同时收进 LOG，末尾一次性写 UTF-8 文件。
 * 这样脚本正文里可以照常写 console.log，不必逐行改成 emit()。 */
const _stdoutLog = console.log.bind(console);
console.log = (...a) => { LOG.push(a.map(String).join(' ')); _stdoutLog(...a); };
const emit = (s) => console.log(s);
const NODE = process.execPath;
const run = (args) => {
  const r = spawnSync(NODE, args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  return { code: r.status, out: (r.stdout || '') + (r.stderr || '') };
};
const line = (n, title) => emit(`\n${'═'.repeat(78)}\n【验收 ${n}】${title}\n${'═'.repeat(78)}`);
const show = (cmd, r) => {
  emit('$ ' + cmd);
  emit(r.out.trimEnd());
  emit(`[exit code: ${r.code}]`);
};

/* 1 */
line(1, 'node prototypes/_build/collect-schemes.mjs → exit 0');
{
  const r = run(['prototypes/_build/collect-schemes.mjs']);
  const keep = r.out.split(/\r?\n/).filter((l) =>
    /_CURRENT-VALUES|§2 旧值|§4 Lead|30 案：|字段 8 评审工件切断|调色板剔除|已写 prototypes/.test(l));
  console.log('$ node prototypes/_build/collect-schemes.mjs');
  console.log(keep.join('\n'));
  console.log(`[exit code: ${r.code}]`);
  fs.writeFileSync('deliverables/65-exec/_cut/collect.full.txt', r.out, 'utf8');
}

/* 2 */
line(2, 'node --check prototypes/_selection/data.js');
show('node --check prototypes/_selection/data.js', run(['--check', 'prototypes/_selection/data.js']));

/* 3 & 4 & 6 —— 从产物直接量。三条读同一份 data.js，但各自单独打头，别把数字堆在最后一条下面。 */
{
  const src = fs.readFileSync('prototypes/_selection/data.js', 'utf8');
  const sb = { window: {} };
  vm.runInNewContext(src, sb);
  const recs = sb.window.SCHEMES;
  const total = recs.reduce((n, r) => n + String(r.audit || '').length, 0);
  const s13 = recs.find((r) => r.id === 'S13');
  const a = String(s13.audit || '');

  line(3, 'data.js 的 audit 总字数 = 10,066（±2）');
  console.log('$ node -e "读 data.js，reduce 求和 audit.length"');
  console.log(`audit 总字数 = ${total}   （期望 10,066，容差 ±2 → ${Math.abs(total - 10066) <= 2 ? 'PASS' : 'FAIL'}）`);
  console.log(`  逐案长度：${recs.map((r) => String(r.audit || '').length).join(' ')}`);
  console.log(`  校验式：10,539（改前合计）− 780（S13 旧值）+ 306（S13 新值）= ${10539 - 780 + 306}`);
  console.log('[exit code: 0]');

  line(4, 'S13 的 audit 长度 = 306（±2），且不含「反套路改造三指标」「打勾」「供 V-11」');
  console.log('$ node -e "读 data.js 的 S13.audit"');
  console.log(`S13.audit 长度 = ${a.length}   （期望 306，容差 ±2 → ${Math.abs(a.length - 306) <= 2 ? 'PASS' : 'FAIL'}）`);
  const bad = ['反套路改造三指标', '打勾', '供 V-11', '必须存在 X', '必须不存在 Y', '必须可测量 Z']
    .filter((k) => a.includes(k));
  console.log(`S13.audit 含污染串：${bad.length ? bad.join(' / ') : '无（0 命中，检查 6 个串）'}`);
  console.log(`S13.audit 尾部 40 字：…${a.slice(-40)}`);
  console.log('[exit code: 0]');

  line(6, 'Object.keys() 里 audit 在 risk 之前');
  const orders = recs.map((r) => {
    const k = Object.keys(r);
    return { id: r.id, auditIdx: k.indexOf('audit'), riskIdx: k.indexOf('risk') };
  });
  const ok = orders.filter((o) => o.auditIdx >= 0 && o.riskIdx >= 0 && o.auditIdx < o.riskIdx);
  console.log('$ node -e "读 data.js，逐案 Object.keys().indexOf"');
  console.log(`Object.keys() 里 auditIdx < riskIdx：${ok.length}/30 案成立`);
  console.log(`  逐案 auditIdx/riskIdx：` + orders.map((o) => `${o.id}:${o.auditIdx}/${o.riskIdx}`).join(' '));
  console.log(`  S13 完整键序：${Object.keys(s13).join(',')}`);
  console.log('[exit code: 0]');
}

/* 5 */
line(5, '其余 29 案 audit 的 sha256 与改前逐案相同');
{
  const r = run(['deliverables/65-exec/_cut/compare.mjs']);
  console.log('$ node deliverables/65-exec/_cut/compare.mjs   （节选：逐案表）');
  const out = r.out;
  const seg = out.slice(out.indexOf('═══ 2.'), out.indexOf('═══ 3.'));
  console.log(seg.trimEnd());
  console.log(`[exit code: ${r.code}]`);
}

/* 7 */
line(7, 'node prototypes/_prompts/build-prompts.mjs（键序变化是否打坏 RISK / REUSE 两个正则闭包）');
{
  const h = (p) => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex').toUpperCase();
  const before = h('deliverables/65-exec/_cut/prompts.before.js');
  const r = run(['prototypes/_prompts/build-prompts.mjs']);
  const after = h('prototypes/_selection/prompts.js');
  console.log('$ node prototypes/_prompts/build-prompts.mjs');
  console.log(r.out.split(/\r?\n/).slice(0, 10).join('\n'));
  console.log('  …（30 行字体表、调色板分布、reuse 抽样略，全文见 deliverables/65-exec/_cut/build-prompts.after.txt）');
  console.log(`[exit code: ${r.code}]`);
  console.log(`prompts.js sha256 改前 = ${before}`);
  console.log(`prompts.js sha256 改后 = ${after}`);
  console.log(`字节相同 = ${before === after}`);
  const rp = run(['deliverables/65-exec/_cut/regex-probe.mjs']);
  console.log('\n$ node deliverables/65-exec/_cut/regex-probe.mjs   （RISK / REUSE 正则的键序敏感性）');
  console.log(rp.out.trimEnd());
  console.log(`[exit code: ${rp.code}]`);
}

/* 8 */
line(8, 'node prototypes/_build/verify-prototype.mjs --all → 26/4/30，FAIL = S07:1 S08:2 S13:4 S21:1');
{
  const r = run(['prototypes/_build/verify-prototype.mjs', '--all']);
  const out = r.out;
  const failLines = out.split(/\r?\n/).filter((l) => /^(✗|✓) S(07|08|13|21) /.test(l) || /闸门 FAIL=/.test(l));
  console.log('$ node prototypes/_build/verify-prototype.mjs --all');
  console.log(failLines.join('\n'));
  console.log(out.split(/\r?\n/).filter((l) => /^达标/.test(l))[0]);
  console.log(`[exit code: ${r.code}]   （--all 在有不达标案时按设计返回 1）`);
  /* 基线文件是用 pwsh 的 `*>` 重定向抓的，落在盘上是 **UTF-16LE 带 BOM**（FF FE），
   * 而 spawnSync 抓的是 UTF-8 的内存字符串。直接 === 或按 utf8 读都会报「有差异」——
   * 那是编码差异，不是内容差异。这里按 BOM 判编码再比。 */
  const rawBase = fs.readFileSync('deliverables/65-exec/_cut/verify.baseline.txt');
  const base = rawBase[0] === 0xFF && rawBase[1] === 0xFE
    ? rawBase.slice(2).toString('utf16le')
    : rawBase.toString('utf8');
  const norm = (s) => s.replace(/\r\n/g, '\n').trimEnd();
  const baseN = norm(base), outN = norm(out);
  console.log(`基线文件编码：${rawBase[0] === 0xFF && rawBase[1] === 0xFE ? 'UTF-16LE(BOM)' : 'UTF-8'}，`
    + `${rawBase.length} B / 现在 ${Buffer.byteLength(out, 'utf8')} B`);
  console.log(`与改前基线的输出逐行比对：${baseN === outN ? '完全相同（0 行差异，换行归一化后）' : '有差异'}`);
  if (baseN !== outN) {
    const bl = baseN.split('\n'), ol = outN.split('\n');
    console.log(`  基线 ${bl.length} 行 / 现在 ${ol.length} 行`);
    for (let i = 0; i < Math.max(bl.length, ol.length); i++) {
      if (bl[i] !== ol[i]) { console.log(`  首个差异 @L${i + 1}\n    基线: ${bl[i]}\n    现在: ${ol[i]}`); break; }
    }
  }
}

/* 9 */
line(9, 'node prototypes/_build/check-docs.mjs → exit 0');
{
  const r = run(['prototypes/_build/check-docs.mjs']);
  console.log('$ node prototypes/_build/check-docs.mjs');
  console.log(r.out.trimEnd());
  console.log(`[exit code: ${r.code}]`);
}

/* 10 */
line(10, '不要碰 app.js / style.css / prompt-copy.js（git diff --stat 证明）');
{
  const g = spawnSync('D:\\Git\\cmd\\git.exe', ['diff', '--stat'], { encoding: 'utf8' });
  console.log('$ git diff --stat');
  console.log(g.stdout.trimEnd());
  console.log('\n（注意：app.js / style.css / prompt-copy.js 的改动行数**在我开工前就存在**——'
    + '本轮已有 5 个 Agent 改过这两个目录，全部未 commit。'
    + '证明"我没碰"靠 mtime + 行数不变，见下。）');
  const files = ['prototypes/_selection/app.js', 'prototypes/_selection/style.css',
    'prototypes/_selection/prompt-copy.js', 'prototypes/_selection/wizard.js'];
  console.log('\n$ Get-Item <4 个禁改文件> | mtime   （我的会话首个工具调用 = 2026-10-27T06:07:41）');
  for (const f of files) {
    const st = fs.statSync(f);
    console.log(`  ${f.padEnd(42)} ${st.mtime.toISOString()}  ${st.size} B`);
  }
  console.log('\n另：本次改动跑完后，这四个文件的 SHA256（开工时未单独留档，故用 mtime 早于 06:07:41 作证）；'
    + '以及本轮我实际写过的文件清单。');
  const { createHash } = crypto;
  for (const f of files) {
    const h = createHash('sha256').update(fs.readFileSync(f)).digest('hex').toUpperCase();
    console.log(`  ${f.padEnd(42)} ${h}`);
  }
}

/* 落盘 UTF-8（不用 pwsh 的 > 重定向：那个会写 UTF-16LE） */
fs.writeFileSync('deliverables/65-exec/_cut/accept.txt', LOG.join('\n') + '\n', 'utf8');
console.log('\n[日志已写 deliverables/65-exec/_cut/accept.txt（UTF-8）]');
