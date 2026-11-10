/* 基线/复核两用：把 data.js 里每案的 audit 长度、sha256、键序 dump 成 JSON。
 * 用法：node deliverables/65-exec/_cut/dump.mjs <data.js 路径> <输出 json 路径>
 * 为什么用 vm 而不是 import：data.js 是 `window.SCHEMES = [...]`，不是模块。 */
import fs from 'node:fs';
import vm from 'node:vm';
import crypto from 'node:crypto';

const src = fs.readFileSync(process.argv[2], 'utf8');
const sandbox = { window: {} };
vm.runInNewContext(src, sandbox);
const recs = sandbox.window.SCHEMES;

const sha = (s) => crypto.createHash('sha256').update(String(s), 'utf8').digest('hex');
const out = {
  count: recs.length,
  totalAuditLen: recs.reduce((n, r) => n + String(r.audit || '').length, 0),
  totalRiskLen: recs.reduce((n, r) => n + String(r.risk || '').length, 0),
  cases: recs.map((r) => ({
    id: r.id,
    auditLen: String(r.audit || '').length,
    auditSha: sha(r.audit || ''),
    riskSha: sha(r.risk || ''),
    auditIdx: Object.keys(r).indexOf('audit'),
    riskIdx: Object.keys(r).indexOf('risk'),
    keys: Object.keys(r),
  })),
};
fs.writeFileSync(process.argv[3], JSON.stringify(out, null, 1), 'utf8');
console.log(`dumped ${out.count} cases; totalAuditLen=${out.totalAuditLen}`);
