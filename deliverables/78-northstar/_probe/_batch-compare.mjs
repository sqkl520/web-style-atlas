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
  if (!dir) { rows.push({ id, err: '原型目录找不到' }); continue; }
  /* 产物可能是 out.html 或 index.html（运行器已处理，这里兜底） */
  let gen = join(BOX, id, 'out.html');
  if (!existsSync(gen)) gen = join(BOX, id, 'index.html');
  if (!existsSync(gen)) { rows.push({ id, err: '沙箱产物缺失' }); continue; }

  /* 搬进仓库再量 —— 见文件头 STAGING 的注释 */
  mkdirSync(STAGING, { recursive: true });
  const staged = join(STAGING, `${id}-sandbox.html`);
  copyFileSync(gen, staged);
  gen = staged;

  const proto = join(ROOT, 'prototypes', dir, 'index.html');
  const claims = promptClaims(id);
  let w, g;
  try { [w, g] = [await measure(proto), await measure(gen)]; }
  catch (e) { rows.push({ id, err: '度量失败: ' + e.message.slice(0, 60) }); continue; }

  const gotHex = new Set((g.hexes || []).map((h) => h.toUpperCase()));
  const missHex = claims ? [...claims.hexes].filter((h) => !gotHex.has(h)) : [];

  const gotLW = new Set((g.borderWidths || []).map((x) => parseFloat(x)));
  const missLW = claims ? claims.lineWidths.filter((n) => {
    /* 允许取整误差：Chrome 会把 0.5px 报成 1px（见 compare.mjs 的注释） */
    return ![...gotLW].some((v) => Math.abs(v - n) < 0.6 || Math.abs(v - Math.ceil(n)) < 0.01);
  }) : [];

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
    hex: claims ? `${claims.hexes.size - missHex.length}/${claims.hexes.size}` : '?',
    missHex,
    lw: claims && claims.lineWidths.length ? `${claims.lineWidths.length - missLW.length}/${claims.lineWidths.length}` : '?',
    missLW,
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
  if (r.err) { console.log(w(r.id, 5) + '✗ ' + r.err); continue; }
  const hr = r.hr ? `${r.hr}→${r.gotHr} ${r.hrOk ? '✓' : '✗'}` : '—';
  const pic = r.picturesOk === null ? '—' : `${r.pics} ${r.picturesOk ? '✓' : '✗'}`;
  console.log(w(r.id, 5) + w(r.lk || '?', 18) + w(r.hex, 7) + w(r.lw, 7) +
    w(hr, 14) + w(pic, 8) + w(r.tracks, 8) + w(r.genBytes, 8));
}

console.log('\n=== 汇总 ===');
const good = rows.filter((r) => !r.err);
console.log(`成功对账 ${good.length} / ${rows.length}`);
if (good.length) {
  const hexFull = good.filter((r) => r.missHex.length === 0).length;
  const lwFull = good.filter((r) => r.missLW.length === 0).length;
  const hrGood = good.filter((r) => r.hrOk === true).length;
  const hrTotal = good.filter((r) => r.hrOk !== null).length;
  const picGood = good.filter((r) => r.picturesOk === true).length;
  console.log(`  配色全中:   ${hexFull}/${good.length}`);
  console.log(`  线宽全中:   ${lwFull}/${good.length}`);
  console.log(`  字号比达标: ${hrGood}/${hrTotal}`);
  console.log(`  图片数达标: ${picGood}/${good.length}`);
}

const detail = good.filter((r) => r.missHex.length || r.missLW.length);
if (detail.length) {
  console.log('\n=== 缺口明细 ===');
  for (const r of detail) {
    if (r.missHex.length) console.log(`  ${r.id} 缺色: ${r.missHex.join(' ')}`);
    if (r.missLW.length) console.log(`  ${r.id} 缺线宽: ${r.missLW.join(' ')}`);
  }
}

process.exit(0);
