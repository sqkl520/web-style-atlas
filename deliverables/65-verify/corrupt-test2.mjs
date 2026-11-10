// V5 攻击测试第二轮：专打"方向"和"口径"盲区
import { mkdtempSync, rmSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const CHECKER = join(ROOT, 'prototypes', '_build', 'check-docs.mjs');

const CASES = [
  { id: 'D1 总数多报 30→31（同 C1，定位复现）', file: 'README.md',
    from: '这是一座风格标本库：30 个方案各配一个', to: '这是一座风格标本库：31 个方案各配一个' },
  { id: 'D2 总数少报 30→29', file: 'README.md',
    from: '这是一座风格标本库：30 个方案各配一个', to: '这是一座风格标本库：29 个方案各配一个' },
  { id: 'D3 总数多报 30→40', file: 'README.md',
    from: '这是一座风格标本库：30 个方案各配一个', to: '这是一座风格标本库：40 个方案各配一个' },
  { id: 'D4 degrades 13→12', file: 'README.md',
    from: '**13 案的单元位置是手工排定的**', to: '**12 案的单元位置是手工排定的**' },
  { id: 'D5 并集 14→15', file: 'README.md',
    from: '**并集 14 案**', to: '**并集 15 案**' },
  { id: 'D6 并集 14→13', file: 'README.md',
    from: '**并集 14 案**', to: '**并集 13 案**' },
  { id: 'D7 S12 layout 549→548', file: 'README.md',
    from: '**549 / 640 / 420 字，30 案全部有值**', to: '**548 / 640 / 420 字，30 案全部有值**' },
  { id: 'D8 S15 layout 640→639', file: 'README.md',
    from: '**549 / 640 / 420 字，30 案全部有值**', to: '**549 / 639 / 420 字，30 案全部有值**' },
  { id: 'D9 闸门 FAIL 总条数 8→9', file: 'README.md', from: '合计 8 条', to: '合计 9 条' },
  { id: 'D10 闸门 FAIL 总条数 8→7', file: 'README.md', from: '合计 8 条', to: '合计 7 条' },
  { id: 'D11 删掉 S21 的 FAIL 条目', file: 'README.md', from: '；`S21` `mono`（1）', to: '' },
  { id: 'D12 把 S13 的 FAIL 从 4 条写成 3 条', file: 'README.md',
    from: '`S13` `mono` + `shadow`（17 处）+ `button-fx` + `empty-screens`（4）',
    to: '`S13` `mono` + `shadow`（17 处）+ `button-fx`（3）' },
  { id: 'D13 场景词 44→45', file: 'README.md', from: '44 个行业词', to: '45 个行业词' },
  { id: 'D14 场景直连 16→17', file: 'README.md', from: '16 个有直连方案', to: '17 个有直连方案' },
  { id: 'D15 英文 hard 4→5', file: 'README-EN.md',
    from: '**4 案的机制', to: '**5 案的机制' },
  { id: 'D16 英文 14 of 30 → 15 of 30', file: 'README-EN.md',
    from: '**14 of the 30 schemes** carry', to: '**15 of the 30 schemes** carry' },
  { id: 'D17 英文 26→27 达标', file: 'README-EN.md',
    from: '**26 prototypes pass the gate with FAIL = 0**',
    to: '**27 prototypes pass the gate with FAIL = 0**' },
  { id: 'D18 中文 26→27 达标（应为 FAIL=0 案数）', file: 'README.md',
    from: '**26 个闸门 FAIL=0**', to: '**27 个闸门 FAIL=0**' },
  { id: 'D19 底同质 18/30→19/30', file: 'README.md',
    from: '**18 / 30 = 60% 落在', to: '**19 / 30 = 60% 落在' },
  { id: 'D20 提示词区间上界 1920→1930', file: 'README.md',
    from: '一份 1632–1920 字', to: '一份 1632–1930 字' },
];

const tmp = mkdtempSync(join(tmpdir(), 'v65-corrupt2-'));
const out = [];
try {
  for (const c of CASES) {
    const src = readFileSync(join(ROOT, c.file), 'utf8');
    if (!src.includes(c.from)) { out.push({ id: c.id, status: 'PATCH-MISS' }); continue; }
    writeFileSync(join(tmp, c.file), src.split(c.from).join(c.to), 'utf8');
    let stdout = '', code = 0;
    try {
      stdout = execFileSync(process.execPath, [CHECKER, c.file, '--root', tmp], { encoding: 'utf8', maxBuffer: 1 << 26 });
    } catch (e) { stdout = (e.stdout || '') + (e.stderr || ''); code = e.status; }
    const fails = [...stdout.matchAll(/✗ (\S+)/g)].map((m) => m[1]);
    out.push({ id: c.id, status: code === 0 ? 'CLEAN' : `exit=${code}`, fails,
      tail: (stdout.match(/README[A-Za-z-]*\.md: \d+ FAIL[^\n]*/) || [''])[0] });
  }
} finally { rmSync(tmp, { recursive: true, force: true }); }

const blind = out.filter((r) => r.status === 'CLEAN');
for (const r of out) {
  console.log(r.status === 'PATCH-MISS' ? `  ?  ${r.id} (锚点缺失)`
    : r.status === 'CLEAN' ? `  ✗盲区 ${r.id}`
    : `  ✓ ${r.id} → ${r.status} hit: ${r.fails.join(', ')}`);
}
console.log(`\n汇总：${out.length} 个腐化，抓出 ${out.filter((r) => r.status !== 'CLEAN' && r.status !== 'PATCH-MISS').length}，漏检 ${blind.length}`);
