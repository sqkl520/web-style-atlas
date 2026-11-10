/* 终验 Agent 的现场快照 / 恢复工具。
 *
 * 目的：变异测试会写 prototypes/ 下的文件。git 只保护**内容**，不保护 **mtime**，
 * 而 check-stale.mjs 的判据完全建立在 mtime 上。所以"用 git 恢复"不足以证明
 * 我没有改变仓库的判定状态——必须连 mtime 一起快照。
 *
 * 用法：
 *   node _review-snapshot.mjs save     → 写 _snapshot.json
 *   node _review-snapshot.mjs diff     → 对比当前与快照（内容 hash + mtime）
 *   node _review-snapshot.mjs restore  → 按快照写回内容并还原 mtime
 */
import { readFileSync, writeFileSync, readdirSync, statSync, utimesSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';
import { createHash } from 'node:crypto';

const ROOT = 'D:/Web/style';
const SNAP = join(ROOT, 'deliverables/73-verify/_snapshot.json');

/* 覆盖范围：变异测试可能触碰的一切。
 * 不递归仓库根（那是 1800+ 文件的噪声），只递归 prototypes/ 与 tools/ 下的规则引擎。 */
function walk(dir, out = []) {
  let ents;
  try { ents = readdirSync(dir, { withFileTypes: true }); } catch { return out; }
  for (const e of ents) {
    if (e.name === 'node_modules' || e.name === '.git') continue;
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

function collect() {
  const files = new Set();
  for (const f of walk(join(ROOT, 'prototypes'))) files.add(f);
  for (const f of ['README.md', 'README-EN.md', 'tools/taste-skill/skills/taste-skill/scripts/lib/rules.mjs']) {
    const p = join(ROOT, f);
    if (existsSync(p)) files.add(p);
  }
  const map = {};
  for (const p of [...files].sort()) {
    const key = relative(ROOT, p).replace(/\\/g, '/');
    const st = statSync(p);
    map[key] = {
      h: createHash('sha256').update(readFileSync(p)).digest('hex').slice(0, 16),
      m: st.mtimeMs,
      a: st.atimeMs,
    };
  }
  return map;
}

const mode = process.argv[2] || 'diff';

if (mode === 'save') {
  const m = collect();
  writeFileSync(SNAP, JSON.stringify(m, null, 0), 'utf8');
  console.log(`快照已存：${Object.keys(m).length} 个文件 → ${relative(ROOT, SNAP)}`);
} else if (mode === 'diff') {
  const old = JSON.parse(readFileSync(SNAP, 'utf8'));
  const now = collect();
  const changedContent = [], changedMtimeOnly = [], added = [], gone = [];
  for (const k of Object.keys(now)) {
    if (!(k in old)) { added.push(k); continue; }
    if (old[k].h !== now[k].h) changedContent.push(k);
    else if (Math.abs(old[k].m - now[k].m) > 1) changedMtimeOnly.push(k);
  }
  for (const k of Object.keys(old)) if (!(k in now)) gone.push(k);
  console.log(`内容变化   ${changedContent.length}`);
  for (const k of changedContent) console.log(`   ! ${k}`);
  console.log(`仅 mtime 变化 ${changedMtimeOnly.length}`);
  for (const k of changedMtimeOnly) console.log(`   ~ ${k}  Δ=${(((now[k]?.m ?? 0) - old[k].m) / 1000).toFixed(0)}s`);
  console.log(`新增 ${added.length} / 消失 ${gone.length}`);
  for (const k of added) console.log(`   + ${k}`);
  for (const k of gone) console.log(`   - ${k}`);
} else if (mode === 'restore') {
  const old = JSON.parse(readFileSync(SNAP, 'utf8'));
  const now = collect();
  let n = 0;
  for (const [k, v] of Object.entries(old)) {
    const p = join(ROOT, k);
    if (!existsSync(p)) { console.log(`缺失，无法恢复：${k}`); continue; }
    if (now[k] && now[k].h !== v.h) { console.log(`内容已被改，恢复：${k}`); }
    utimesSync(p, new Date(v.a), new Date(v.m));
    n++;
  }
  console.log(`mtime 已按快照还原：${n} 个文件`);
} else {
  console.log('用法: save | diff | restore');
}
