// V5 攻击测试：在临时副本上造腐化，跑真 check-docs.mjs（--root 只换文档路径，数据源仍是真仓库）
// 用法：node deliverables/65-verify/corrupt-test.mjs
import { mkdtempSync, rmSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const CHECKER = join(ROOT, 'prototypes', '_build', 'check-docs.mjs');

const CASES = [
  {
    id: 'C1 总数 30→31',
    file: 'README.md',
    from: '这是一座风格标本库：30 个方案各配一个',
    to: '这是一座风格标本库：31 个方案各配一个',
  },
  {
    id: 'C2 hard 4→5（机制那句话）',
    file: 'README.md',
    from: '**4 案的机制绑在特定题材上**',
    to: '**5 案的机制绑在特定题材上**',
  },
  {
    id: 'C3 degrades 13→12',
    file: 'README.md',
    from: '**13 案的单元位置是手工排定的**',
    to: '**12 案的单元位置是手工排定的**',
  },
  {
    id: 'C4 并集 14→15',
    file: 'README.md',
    from: '**并集 14 案**',
    to: '**并集 15 案**',
  },
  {
    id: 'C5 提示词区间 1632→1500（下界）',
    file: 'README.md',
    from: '一份 1632–1920 字',
    to: '一份 1500–1920 字',
  },
  {
    id: 'C6 提示词中位 1822→1700',
    file: 'README.md',
    from: '中位 1822 字',
    to: '中位 1700 字',
  },
  {
    id: 'C7 达标数 26→27',
    file: 'README.md',
    from: '**26 个闸门 FAIL=0**',
    to: '**27 个闸门 FAIL=0**',
  },
  {
    id: 'C8 闸门失败总数 8→9',
    file: 'README.md',
    from: '合计 8 条',
    to: '合计 9 条',
  },
  {
    id: 'C9 FAIL 名录漏一案：S21 mono（1）删掉',
    file: 'README.md',
    from: '；`S21` `mono`（1）',
    to: '',
  },
  {
    id: 'C10 layout 字数 549→548',
    file: 'README.md',
    from: '**549 / 640 / 420 字，30 案全部有值**',
    to: '**548 / 640 / 420 字，30 案全部有值**',
  },
  {
    id: 'C11 场景词 44→45',
    file: 'README.md',
    from: '场景词 44',
    to: '场景词 45',
  },
  {
    id: 'C12 英文版 schemes 30→31',
    file: 'README-EN.md',
    from: 'A style specimen library: 30 schemes',
    to: 'A style specimen library: 31 schemes',
  },
  {
    id: 'C13 英文版 hard 4→5（The 4 schemes …）',
    file: 'README-EN.md',
    from: '**4 of the 30 schemes** carry a `⚠`',
    to: '**5 of the 30 schemes** carry a `⚠`',
  },
  {
    id: 'C14 任意瞎话（表格里把 4 案改成 3 案，换措辞）',
    file: 'README.md',
    from: '- **4 案的机制绑在特定题材上**',
    to: '- **只有 3 个方案**属于题材绑死这一类',
  },
];

const tmp = mkdtempSync(join(tmpdir(), 'v65-corrupt-'));
const out = [];
try {
  for (const c of CASES) {
    const src = readFileSync(join(ROOT, c.file), 'utf8');
    if (!src.includes(c.from)) {
      out.push({ id: c.id, status: 'PATCH-MISS', detail: `找不到锚点：${c.from.slice(0, 40)}` });
      continue;
    }
    const mutated = src.split(c.from).join(c.to);
    writeFileSync(join(tmp, c.file), mutated, 'utf8');
    let stdout = '', code = 0;
    try {
      stdout = execFileSync(process.execPath, [CHECKER, c.file, '--root', tmp], { encoding: 'utf8', maxBuffer: 1 << 26 });
    } catch (e) {
      stdout = (e.stdout || '') + (e.stderr || '');
      code = e.status;
    }
    const fails = [...stdout.matchAll(/✗ (\S+)/g)].map((m) => m[1]);
    const tail = (stdout.match(/README[A-Za-z-]*\.md: \d+ FAIL[^\n]*/) || [''])[0];
    out.push({ id: c.id, status: code === 0 ? 'CLEAN(未查出)' : `exit=${code}`, fails, tail });
  }
} finally {
  rmSync(tmp, { recursive: true, force: true });
}

for (const r of out) {
  if (r.status === 'PATCH-MISS') console.log(`  ? ${r.id} → ${r.detail}`);
  else console.log(`  ${r.status === 'CLEAN(未查出)' ? '✗盲区' : '✓'} ${r.id} → ${r.status} | ${r.tail} | hit: ${(r.fails || []).join(', ') || '—'}`);
}
