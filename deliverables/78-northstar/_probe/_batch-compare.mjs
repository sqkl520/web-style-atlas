/* 批量对账：把沙箱盲测产物（C:\tmp\bb\<id>\out.html）与各自原型逐量比对。
 *
 * 用法：
 *   node deliverables/78-northstar/_probe/_batch-compare.mjs S04 S08 S13
 *   node deliverables/78-northstar/_probe/_batch-compare.mjs        # 读 batch-result.json
 *
 * 判定口径（与 compare.mjs 一致，但这里是**跨案汇总**，不做单案判分）：
 *   · 字号比 ±20% 内算命中
 *   · 线宽：产物必须包含提示词给的全部档位（少了是没照做，多了只是更丰富）
 *   · 配色：提示词给的色必须全部出现
 *   · 栏数：只在 layoutKind === 'fixed' 的案上比（auto-fit 的 columns 是运行时展开值）
 */
import { measure } from '../../74-q7/measure.mjs';
import { readFileSync, existsSync, readdirSync, mkdirSync, copyFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const BOX = 'C:/tmp/bb';
/* measure() 的静态服务器以**仓库根**为根，路径越出仓库就 403/拒绝。
 * 沙箱产物在 C:\tmp\bb\ 下，不在仓库里，所以要先搬进来再量。
 * （踩过：直接传 C:/tmp/... 给 measure 会得到 ERR_CONNECTION_REFUSED，
 *  看起来像服务没起，其实是路径越界。） */
const STAGING = join(ROOT, 'deliverables/78-northstar/_probe/_staged');

const load = (rel, key) => {
  const c = { window: {} };
  vm.createContext(c);
  vm.runInContext(readFileSync(join(ROOT, rel), 'utf8'), c);
  const v = c.window[key];
  if (v === undefined) throw new Error(`${rel} 没有 window.${key}`);
  return v;
};
const W = load('prototypes/_selection/data.js', 'SCHEMES');
const P = load('prototypes/_selection/prompts.js', 'STYLE_PROMPTS').schemes;
const dirOf = (id) => W.find((s) => s.id === id)?.dir;

let ids = process.argv.slice(2).filter((a) => /^S\d{2}$/.test(a));
if (!ids.length) {
  /* 没传案号就读 batch-result.json，只跑有产物的 */
  try {
    const r = JSON.parse(readFileSync(join(BOX, 'batch-result.json'), 'utf8'));
    ids = (Array.isArray(r) ? r : [r]).filter((x) => x.ok).map((x) => x.id);
  } catch { ids = []; }
}
if (!ids.length) { console.log('没有可对账的案。传案号，或先跑批量。'); process.exit(2); }

/* 从提示词里抽取「模型被告知的」约束，作为判据的真源 —— 不拿原型当基准，
 * 因为原型可以有提示词没说的派生值（见 compare.mjs:112-117 的长注释）。 */
function promptClaims(id) {
  const f = join(ROOT, 'deliverables/78-northstar/blind', id, 'task.txt');
  if (!existsSync(f)) return null;
  const t = readFileSync(f, 'utf8');
  const hexes = new Set((t.match(/#[0-9A-Fa-f]{6}/g) || []).map((h) => h.toUpperCase()));
  const lwLine = t.match(/线宽只用这几级：([^\n]*)/);
  const lws = lwLine ? [...new Set((lwLine[1].match(/[\d.]+(?=px)/g) || []).map((n) => parseFloat(n)))] : [];
  const bodyM = t.match(/正文约\s*(\d+)px/);
  const ratioM = t.match(/(\d+(?:\.\d+)?)\s*倍/);
  const picsM = t.match(/至少要\s*(\d+)\s*个\*?\*?不同的\*?\*?图片位置/);
  return {
    hexes, lineWidths: lws,
    bodyPx: bodyM ? Number(bodyM[1]) : null,
    ratio: ratioM ? Number(ratioM[1]) : null,
    minPics: picsM ? Number(picsM[1]) : 0,
  };
}

const rows = [];
for (const id of ids) {
  const dir = dirOf(id);
  /* 没有原型目录有两种完全不同的情况，报错措辞必须区分开 ——
   * 否则「对照组本来就没有原型」会被读成「脚本坏了 / 文件丢了」。
   *
   *   S99 是**虚构风格负对照**：它测的正是「给一个不存在的风格，
   *   模型还能不能做出像样的页面」。没有原型不是缺陷，是实验设计。
   *   详见 _probe/16-negative-control.md。
   *
   * 其他案缺原型目录才是真故障（prototypes/ 下被改名或删了）。 */
  if (!dir) {
    if (/^S(97|98|99)$/.test(id)) {
      rows.push({ id, skip: '对照组（虚构风格），本就不设原型目录' });
    } else {
      rows.push({ id, err: '原型目录找不到（prototypes/ 下应有 ' + id + '-*）' });
    }
    continue;
  }
  /* 产物可能是 out.html 或 index.html（运行器已处理，这里兜底） */
  /* 产物来源按优先级找三处：
   *   1. C:\tmp\bb\<id>\out.html       —— 刚跑完的运行
   *   2. C:\tmp\bb\<id>\index.html     —— 模型自己起的名字
   *   3. _probe/_staged/<id>-sandbox.html —— 已入库的副本
   *
   * 为什么要第三处：C:\tmp 是易失的。2026-11-13 系统把整个 C:\tmp 清掉了，
   * 十案产物一次全丢。幸好对账时会把每份产物复制进 _staged/（原本只是为了绕开
   * measure() 的仓库根限制），那些副本还在，证据因此没丢。
   * 不能把证据只放在 tmp 里。 */
  let gen = join(BOX, id, 'out.html');
  if (!existsSync(gen)) gen = join(BOX, id, 'index.html');
  if (!existsSync(gen)) {
    const stagedCopy = join(STAGING, `${id}-sandbox.html`);
    if (existsSync(stagedCopy)) gen = stagedCopy;
  }
  if (!existsSync(gen)) { rows.push({ id, err: '沙箱产物缺失' }); continue; }

  /* 搬进仓库再量 —— 见文件头 STAGING 的注释。
   *
   * ⚠️ 这里**不再无条件覆盖**。`_staged/` 里的副本是入库的证据：
   * 一旦被 C:\tmp 里的另一份产物悄悄换掉，`git diff` 才看得见，
   * 而所有引用那些字节数的报告就全部失去依据（2026-11-13 已经发生过一次：
   * S13 25730→31256、S29 59861→41371 都是这样变的，原数字再也复现不出来）。
   *
   * 新规则：
   *   · 副本不存在        → 复制（正常首次入库）
   *   · 副本存在且字节相同 → 什么都不做
   *   · 副本存在但字节不同 → **不覆盖**，把源另存成 <id>-sandbox-incoming.html
   *                        并在此案的 err 里报出来，由人决定要不要替换
   * 这样任何一次「证据被换掉」都会在输出里显形，而不是静默写进 git。 */
  mkdirSync(STAGING, { recursive: true });
  const staged = join(STAGING, `${id}-sandbox.html`);
  let stagedNote = null;
  if (!existsSync(staged)) {
    copyFileSync(gen, staged);
  } else if (resolve(gen) !== resolve(staged)) {
    const a = readFileSync(gen), b = readFileSync(staged);
    if (!a.equals(b)) {
      const incoming = join(STAGING, `${id}-sandbox-incoming.html`);
      copyFileSync(gen, incoming);
      stagedNote = `证据冲突: C:\\tmp 的产物与 _staged 副本不同（${a.length}B vs ${b.length}B），` +
        `已另存为 ${id}-sandbox-incoming.html，未覆盖`;
    }
  }
  gen = staged;

  const proto = join(ROOT, 'prototypes', dir, 'index.html');
  const claims = promptClaims(id);
  let w, g;
  try { [w, g] = [await measure(proto), await measure(gen)]; }
  catch (e) { rows.push({ id, err: '度量失败: ' + e.message.slice(0, 60) }); continue; }

  const gotHex = new Set((g.hexes || []).map((h) => h.toUpperCase()));
  const missHex = claims ? [...claims.hexes].filter((h) => !gotHex.has(h)) : [];
  /* 反向也查：产物用了提示词没给的色。
   *
   * 这条是复现性 Agent 抓出来的假绿：原实现只看「提示词给的色是否都出现」，
   * 不看「产物是否多用了未声明的色」。它构造的例子是 S15-oldverify 多加了 6 个
   * 未声明的 hex，仍然得 4/4「全中」。
   *
   * 为什么它算缺陷：提示词明写「配色只用这几个值。不新增更多彩色」，
   * 多用色就是没照做。只看单向会把这个漏掉。
   *
   * 注意区分严重度：少用色是「没执行到位」，多用色是「违反了明确禁令」。
   * 两者都记，但 extraHex 单独一列，不混进「全中」的计数里。 */
  /* UA 默认色不算「超用」。
   *
   * 回归审计（2026-11-13）指出：拿 35 个**原型**自己去过这条判据，
   * 27 个过不了 —— 7 案带 `#0000EE`（未设色的 <a> 链接蓝）、
   * 17 案带 `#FFFFFF`、2 案带 `#000000`。
   * 这些都不是作者选的颜色，是浏览器渲染未设样式元素时给的默认值。
   *
   * 加这条过滤之后，沙箱产物那十案本来就没有多余色（它们的 <a> 都上了色），
   * 所以结论不变；但判据对「原型 vs 原型」这类用途不再假阳性。 */
  const UA_DEFAULTS = new Set(['#0000EE', '#FFFFFF', '#000000', '#551A8B', '#00FF00', '#FF0000']);
  const extraHex = claims
    ? [...gotHex].filter((h) => !claims.hexes.has(h) && !UA_DEFAULTS.has(h))
    : [];

  /* 线宽判据：**方向是包含性，不是全覆盖。**
   *
   * 提示词原文（35/35 份都这句）：
   *   「线宽只用这几级：0.5px、0.8px、1px、1.2px、2px、3px，**全站线条都从这几级里取**。」
   *
   * 它约束的是「不许用档位表之外的值」，**不是**「档位表每一档都必须出现」。
   * 一个只用 1px 和 2px 的页面完全合规 —— 它没有需要 0.5px 的地方。
   *
   * 我原来的判据写反了（要求每档都出现），于是 S15「缺线宽」这类是**假失败**
   * （规划 Agent 2026-11-13 指出，我复核了原文）。
   *
   * 另外那个 0.6px 容差也太宽：
   *   miss([0.5,0.8,1,1.2,2,3], {1,2,3}) 在本该返回 [0.5,0.8,1.2] 时返回了 []
   *   —— 0.5 与 1 差 0.5 < 0.6 被误判为命中。
   * Chrome 的取整只在计算值上发生（0.5px 报成 1px），而这里是源码声明的档位，
   * 所以只保留「向上取整相等」这一种宽容，去掉 0.6 的粗容差。
   */
  const gotLW = new Set((g.borderWidths || []).map((x) => parseFloat(x)));
  /* Chrome 在 getComputedStyle 里把亚像素边框宽度**截断到整数**，不是四舍五入。
   *
   * 实测（`_roundtest.html`，一次声明四个值，用 measure.mjs 量）：
   *   声明 border-left: 5.5px / 5.4px / 1.25px / 0.5px
   *   量到 borderWidths: ["1.00", "5.00"]
   * 即：5.5 → 5.00（向下截断）、5.4 → 5.00、1.25 → 1.00、
   *     0.5 → 1.00（**小于 1px 时进到最小可见宽度**，这是唯一向上走的情况）
   *
   * 所以判据必须是「截断」而不是「四舍五入」：
   *   round(5.5)=6 ≠ 5 → 用四舍五入会把 S13 那个**完全正确**的 5.5px 判成违规。
   *   floor(5.5)=5 = 5 ✓，floor(1.25)=1 = 1 ✓
   *
   * `09-compare-fix.md` §1.5 写的是「两边都四舍五入到整像素」，那一条的表述不准
   * （它当时只观察到 0.5→1、0.8→1、2.4→2 这几个值，没测 5.5 这种 x.5 的情形，
   * 而四舍五入与截断只在 .5 处分歧）。按实测改成截断。
   *
   * 已知代价（与 §1.5 记录的一致）：0.4 与 0.8 在这一层分不开，都会量到 1。
   */
  const quantize = (v) => (v > 0 && v < 1 ? 1 : Math.floor(v));
  const near = (measured, declared) => Math.abs(measured - quantize(declared)) < 0.01;
  const scale = claims ? claims.lineWidths : [];
  /* 违规 = 产物用了一档，而档位表里没有 */
  const offScale = scale.length
    ? [...gotLW].filter((v) => !scale.some((n) => near(v, n)))
    : [];

  const hrOk = (claims && claims.ratio && g.headBodyRatio)
    ? Math.abs(g.headBodyRatio - claims.ratio) / claims.ratio <= 0.20 : null;

  const lk = (() => {
    try {
      const rp = join(ROOT, 'prototypes', dir, '.inspect', 'report.json');
      return JSON.parse(readFileSync(rp, 'utf8')).viewports?.[0]?.metrics?.structure?.layoutKind || null;
    } catch { return null; }
  })();

  rows.push({
    id, lk,
    stagedNote,
    hex: claims ? `${claims.hexes.size - missHex.length}/${claims.hexes.size}` : '?',
    missHex,
    extraHex,
    lw: scale.length ? `${[...gotLW].length - offScale.length}/${[...gotLW].length}` : '?',
    offScale,
    usedLW: [...gotLW].sort((a, b) => a - b),
    scaleLW: scale.slice().sort((a, b) => a - b),
    hr: claims?.ratio ?? null, gotHr: g.headBodyRatio,
    hrOk,
    pics: claims ? `${g.imgVisible}/${claims.minPics}` : '?',
    picturesOk: claims ? g.imgVisible >= claims.minPics : null,
    tracks: `${w.gridTracks}/${g.gridTracks}`,
    genBytes: readFileSync(gen).length,
  });
}

const w = (s, n) => String(s).padEnd(n);
console.log(w('案', 5) + w('layoutKind', 18) + w('配色', 7) + w('线宽', 7) +
  w('字号比', 14) + w('图', 8) + w('轨道', 8) + w('字节', 8));
console.log('─'.repeat(75));
for (const r of rows) {
  /* 跳过与失败分开显示：跳过用「·」，失败用「✗」。
   * 这两者混用会让「对照组按设计不参与」看起来像「有案子挂了」。 */
  if (r.skip) { console.log(w(r.id, 5) + '· 跳过 — ' + r.skip); continue; }
  if (r.err) { console.log(w(r.id, 5) + '✗ ' + r.err); continue; }
  const hr = r.hr ? `${r.hr}→${r.gotHr} ${r.hrOk ? '✓' : '✗'}` : '—';
  const pic = r.picturesOk === null ? '—' : `${r.pics} ${r.picturesOk ? '✓' : '✗'}`;
  console.log(w(r.id, 5) + w(r.lk || '?', 18) + w(r.hex, 7) + w(r.lw, 7) +
    w(hr, 14) + w(pic, 8) + w(r.tracks, 8) + w(r.genBytes, 8));
  /* 证据冲突单独一行，不塞进表格列 —— 它的长度会把表撑坏，
   * 但又必须让人看见（否则 _staged 里的入库证据被换掉时没有任何提示）。 */
  if (r.stagedNote) console.log('     ⚠️ ' + r.stagedNote);
}

console.log('\n=== 汇总 ===');
/* 三类要分开数，否则分母会骗人：
 *   good    真正对账成功的案 → 下面所有比率的分母
 *   skipped 按设计不参与的案（S97/S98/S99 对照组的虚构风格没有原型）
 *   failed  真故障（缺产物、度量失败、原型目录丢了）
 * 旧写法 `good = rows.filter(r => !r.err)` 会把 skipped 也算进 good，
 * 于是「各维度全中 11/12」看起来像有一案没中，实际是 1 案没参与。 */
const good = rows.filter((r) => !r.err && !r.skip);
const skipped = rows.filter((r) => r.skip);
const failed = rows.filter((r) => r.err);
console.log(`参与对账 ${good.length} 案` +
  (skipped.length ? `　跳过 ${skipped.length} 案（对照组）` : '') +
  (failed.length ? `　失败 ${failed.length} 案` : ''));
for (const r of skipped) console.log(`  · ${r.id}: ${r.skip}`);
for (const r of failed) console.log(`  ✗ ${r.id}: ${r.err}`);
console.log('');
if (good.length) {
  const hexFull = good.filter((r) => r.missHex.length === 0).length;
  const lwFull = good.filter((r) => r.offScale.length === 0).length;
  const hrGood = good.filter((r) => r.hrOk === true).length;
  const hrTotal = good.filter((r) => r.hrOk !== null).length;
  const picGood = good.filter((r) => r.picturesOk === true).length;
  console.log(`  配色全中:   ${hexFull}/${good.length}`);
  const extraClean = good.filter((r) => (r.extraHex || []).length === 0).length;
  console.log(`  配色未超用: ${extraClean}/${good.length}   ← 提示词写「不新增更多彩色」`);
  console.log(`  线宽全中:   ${lwFull}/${good.length}`);
  console.log(`  字号比达标: ${hrGood}/${hrTotal}`);
  console.log(`  图片数达标: ${picGood}/${good.length}`);
}

const detail = good.filter((r) => r.missHex.length || r.offScale.length);
if (detail.length) {
  console.log('\n=== 缺口明细 ===');
  for (const r of detail) {
    if (r.missHex.length) console.log(`  ${r.id} 缺色: ${r.missHex.join(' ')}`);
    /* 措辞要紧：这里第二个括号里的数是**产物实际用到的线宽**，不是档位表。
     * 原来写「（档位 1/3）」会被读成「档位表是 1px 和 3px」——
     * 实测 S31 的档位表是 1px、1.5px，产物用了 1/1.5/3，被误读成档位表只有两档。 */
    if (r.offScale.length) console.log(`  ${r.id} 用了档位表外的线宽 ${r.offScale.join('/')}px —— 档位表 [${r.scaleLW.join('/')}]，产物实际 [${r.usedLW.join('/')}]`);
  }
}

/* 超用色单独一节：它违反的是「不新增更多彩色」这条明确禁令，
 * 与「少用色」不是一个性质，不能混进上面那张缺口表。 */
const overuse = good.filter((r) => (r.extraHex || []).length > 0);
if (overuse.length) {
  console.log('\n=== 超用色（产物用了提示词没给的色）===');
  for (const r of overuse) {
    console.log(`  ${r.id} 多出 ${r.extraHex.length} 个: ${r.extraHex.join(' ')}`);
  }
} else {
  console.log('\n=== 超用色 ===\n  无 —— ' + good.length + ' 案都只用了提示词给的色。');
}

process.exit(0);
