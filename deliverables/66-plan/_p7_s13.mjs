// P7：S13 的 17 处 shadow 到底是什么形状（inset / 外投影 / 混合），button-fx 是几个按钮
//     再判「迁移到 drop-shadow」这条出路对各处是否物理可行（drop-shadow 没有 inset 形式）
import { Browser } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { HERE, ROOT, dirOf } from './_lib.mjs';

const dir = dirOf('S13');
const PAGE = 'file:///' + join(dir, 'index.html').replace(/\\/g, '/');
const b = await Browser.launch({ width: 1440, height: 900 });
const p = await b.newPage({ width: 1440, height: 900, dsf: 1 });
await p.goto(PAGE, { settleMs: 1500 });

const r = await p.eval(() => {
  const splitTop = (sh) => sh.split(/,(?![^(]*\))/).map((s) => s.trim()).filter(Boolean);
  const out = { all: [], buttons: [], total: 0 };
  for (const el of document.querySelectorAll('*')) {
    const cs = getComputedStyle(el);
    const sh = cs.boxShadow;
    if (!sh || sh === 'none') continue;
    const parts = splitTop(sh);
    const inset = parts.filter((x) => /inset/.test(x)).length;
    const outer = parts.length - inset;
    out.all.push({
      tag: el.tagName.toLowerCase(),
      cls: (el.className && String(el.className).slice(0, 40)) || '',
      id: el.id || '',
      inset, outer,
      radius: cs.borderRadius,
      sample: sh.slice(0, 90),
    });
    out.total++;
  }
  for (const btn of document.querySelectorAll('button, a[role=button], .btn, [type=submit]')) {
    const cs = getComputedStyle(btn);
    if (cs.boxShadow && cs.boxShadow !== 'none') {
      out.buttons.push({ text: (btn.textContent || '').trim().slice(0, 18), cls: String(btn.className).slice(0, 30), shadow: cs.boxShadow.slice(0, 70) });
    }
  }
  // 纸面/亮度：确认这些影子是不是唯一的深度手段
  out.bodyShadow = getComputedStyle(document.body).boxShadow;
  return out;
});

writeFileSync(join(HERE, 'p7-s13-shadow.json'), JSON.stringify(r, null, 1), 'utf8');
console.log('实际算出 box-shadow 的非 none 元素：%d 个（闸门报 17，其判据是「有外层分量」）', r.total);
const pureInset = r.all.filter((x) => x.outer === 0);
const mixed = r.all.filter((x) => x.outer > 0 && x.inset > 0);
const pureOuter = r.all.filter((x) => x.inset === 0 && x.outer > 0);
console.log('  纯 inset（只有凹槽、没有外接触阴影）：%d', pureInset.length);
console.log('  混合（inset + 外接触阴影）：%d', mixed.length);
console.log('  纯外投影：%d', pureOuter.length);
console.log('\n== 混合的（这些是「凹槽 + 接触阴影」，闸门按外层分量计一处）==');
for (const x of mixed) console.log(`  ${x.tag}${x.id ? '#' + x.id : ''}.${x.cls} insets=${x.inset} outer=${x.outer} r=${x.radius}`);
console.log('\n== 纯外投影 ==');
for (const x of pureOuter) console.log(`  ${x.tag}${x.id ? '#' + x.id : ''}.${x.cls} outer=${x.outer} r=${x.radius} | ${x.sample}`);
console.log('\n== 带 box-shadow 的按钮（button-fx 的 4 个）==');
for (const x of r.buttons) console.log(`  「${x.text}」 .${x.cls} → ${x.shadow}`);
console.log('\n判定：');
console.log('  可迁 drop-shadow（纯外投影）：%d 处', pureOuter.length);
console.log('  不可迁（含 inset，drop-shadow 没有 inset 形式）：%d 处', pureInset.length + mixed.length);
await b.close();
