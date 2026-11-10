#!/usr/bin/env node
/* 74-w4 needsJS classifier — final resolution.
 *
 * Two verdicts per scheme, each COMPUTED from explicit axes, so a reviewer can
 * flip one axis and watch the table move. No fused hand verdicts.
 *
 * AXES (hand, each with a reason in the `why` string):
 *   motion   — does the mechanism SENTENCE itself contain a motion/interaction
 *              clause (滚动 / 跟随 / 漂移 / 进视口 / 按下 / 时相)?  [sentence.mjs + review]
 *   cssMotion— if it does, is that motion expressible in pure CSS?  The repo
 *              proves scroll-mapping is: S16 ships
 *              @supports (animation-timeline: scroll()) at style.css:505-512.
 *              Press is :active; viewport-sequence is view-animation / IO; a
 *              light-source flip is a class. So almost all motion is CSS-doable.
 *              FALSE only where the motion's *value* is a runtime computation.
 *   geoRuntime — is the signature GEOMETRY derived at runtime (measured from live
 *              DOM, or a closed-form formula over a variable parameter)?  If yes,
 *              no static CSS/SVG declaration reproduces it.
 *   onMech   — is the JS geometry/motion the region the sentence names?
 *              ('yes' | 'partial' | 'no')
 *   chrome   — is the only moving JS geometry a pointer-follower cursor, i.e.
 *              not content?  (S13's 6×6 压痕)
 *
 * VERDICTS
 *   LITERAL   (sentence as written):
 *       A iff motion && !cssMotion          (sentence asks for motion CSS can't do)
 *       B iff (motion && cssMotion) || (!motion && geoRuntime)
 *       C otherwise
 *     The `!motion && geoRuntime` arm is what makes S20 an A on the literal
 *     reading: the sentence has no motion word, but it describes 1840 segments of
 *     trig-derived走线, which no static declaration produces.
 *   PROTOTYPE (the prototype on the bench):
 *       A iff geoRuntime && onMech != 'no'
 *       B iff !A && (geometry moves under any driver) && !chrome
 *       C otherwise
 *
 * MACHINE facts come from classify.json:
 *   synthSites  — createElement(NS)/setAttribute(d|points|cx|…) sites
 *   measureSites— getBoundingClientRect/getComputedStyle/offsetWidth sites
 *   motionGeo   — geometric writes reachable from scroll|pointer|raf (call graph)
 *   stateGeo    — geometric writes reachable from io|ui
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = 'D:/Web/style';
const classify = JSON.parse(fs.readFileSync(path.join(ROOT, 'deliverables/74-w4/classify.json'), 'utf8'));
const structure = JSON.parse(fs.readFileSync(path.join(ROOT, 'deliverables/74-w4/structure.json'), 'utf8'));

const I = {
  S01: { motion: false, cssMotion: true, geoRuntime: false, onMech: 'no', chrome: false,
    why: '脚本零几何写入；唯一 getBoundingClientRect 在 index.html:321 只读栏顶做锚点跳转。句子全静态：11° 楔形、24px 隔条、4 栏版心。' },
  S02: { motion: false, cssMotion: true, geoRuntime: false, onMech: 'yes', chrome: false,
    why: 'index.html:266 在 scroll→rAF 内写 foilB.style.transform = scaleX(-1) translateY(p)，p=−(scrollY/100)×3，与 :250 注释「滚动 100px 对应纹样相位 3px」逐字对应。但句子的「相位」是静态镜像相位，style.css:149 scaleX(-1) translateY(-28px) 已写死；句子无运动子句。' },
  S03: { motion: true, cssMotion: true, geoRuntime: false, onMech: 'yes', chrome: false,
    why: 'index.html:62 空 <svg id="scale">；:229-232 循环造 81 条 line，:234-250 造 5 text + 5 rect；:259-262 在 scroll 里按 getBoundingClientRect 把影像带整体上移 0.5px。刻度线可用两条 repeating-linear-gradient 等价（细 8px 步进 #4A5A5E 起 x208 / 粗 40px 步进 #C9D6CF 起 x176）→ geoRuntime=false；但「随滚动固定 / 游标随焦距比移动」是句子里的运动子句。' },
  S04: { motion: false, cssMotion: true, geoRuntime: false, onMech: 'no', chrome: false,
    why: '脚本零几何写入。±1.2° 是有界静态倾斜、色版偏移 3–7px 是定值，全在 HTML 内联 style 与 class。' },
  S05: { motion: false, cssMotion: true, geoRuntime: false, onMech: 'partial', chrome: false,
    why: ':303-311 paint() 用 <use> 重写 .lattice-cells 并改 viewBox，但首屏 7 处点阵已由 HTML 写死（:76/:99/:125/:136/:147/:164/:179），脚本只在 input/click 重绘；触发源非滚动/指针。' },
  S06: { motion: true, cssMotion: true, geoRuntime: false, onMech: 'yes', chrome: false,
    why: ':353-369 drift()：:357 每卡 getBoundingClientRect、:361 读 --coef、:365 写 --dy、:369 写 --rail-drift（模 96px）。句子「漂移速度为滚动量的 0.6 倍」逐字对应。geoRuntime=false：结果是 CSS 变量驱动的位移，@keyframes + animation-timeline 可等价（各卡系数作为每条规则的 --coef）。' },
  S07: { motion: false, cssMotion: true, geoRuntime: true, onMech: 'yes', chrome: false,
    why: 'app.js:15-46 buildGhost()：:28-30 逐行 getBoundingClientRect+getComputedStyle 取 left/top/fontSize，:23-24 建 <g transform="translate(W,1) scale(-1,1)">，:35-43 建 <text>，灌进空 <svg class="ghost">(index.html:94)；:10 MIRROR_BUDGET=46。坐标来自实测字号与位置 —— 无法静态声明。' },
  S08: { motion: true, cssMotion: true, geoRuntime: false, onMech: 'yes', chrome: false,
    why: ':300-315 par() 在 scroll→rAF 内：:303 p=min(1,scrollY/200)，:309/:310 写三层 transform（振幅 3/6/12px）。句子「滚动 200px 走 6px」。geoRuntime=false：线性映射，CSS scroll-timeline 可等价。' },
  S09: { motion: false, cssMotion: true, geoRuntime: false, onMech: 'no', chrome: false,
    why: ':223-231 watch() 写 --d 错开动画延迟（由 :232 watch(document) 调用，非滚动）；:259 void lamp.offsetWidth 只是重启动画的 reflow 技巧。1.5° 倾斜与 4–12px 起点错开全在 CSS。' },
  S10: { motion: true, cssMotion: true, geoRuntime: false, onMech: 'yes', chrome: false,
    why: '句子「进视口时先错 3px 再收到 1.5px」由 style.css:32-33 --misreg/--misreg-start、:211/:216 两条 transform 规则、:212 transition 240ms 承载；index.html:486 setTimeout 260ms 加 .settled 收位（:490 IO 兜底）。' },
  S11: { motion: false, cssMotion: true, geoRuntime: false, onMech: 'no', chrome: false,
    why: '脚本只做 IO 逐行落位（:351 --i、:378 reflow）与复核状态机。三层重影 0.5/1.5/3px、第三层 12% 在 style.css:24-26。' },
  S12: { motion: false, cssMotion: true, geoRuntime: false, onMech: 'no', chrome: false,
    why: ':248/:277 只读 getBoundingClientRect/offsetWidth 算进度，写的是 class（源码注释「只加类，位移交给 CSS」）。挖空几何在 style.css:263-269。' },
  S13: { motion: true, cssMotion: true, geoRuntime: false, onMech: 'no', chrome: true,
    why: '句子「按下时方位角 135°→315° 并下沉 0.8px」由 :373 flip() 改 body[data-azimuth] + style.css:439 .btn:active{transform:translateY(0.8px)} + :613/:645 反向阴影完成 —— 纯 CSS 态。唯一 JS 几何是 :404 的 6×6 压痕光标，跟指针的非内容件。' },
  S14: { motion: false, cssMotion: true, geoRuntime: false, onMech: 'partial', chrome: false,
    why: '极坐标站位由 build/polar-layout.py 烘出、写进 index.html:70-133 内联 --dx/--dy/--w，由 style.css:166-171 .tag 渲染；句子说的 48px 平漂是 style.css:281-291 @keyframes drift（纯 CSS），--dr:48 在 :130。句子无运动子句（「平漂」可读作静态圆弧轨迹）。脚本额外件：:345-346 指针牵引、:363 scroll 写 --sy。' },
  S15: { motion: false, cssMotion: true, geoRuntime: false, onMech: 'no', chrome: false,
    why: ':481 只写 --trace36（第二层不透明度）与状态条文案。三层错位 0/3/7px、56% 在 style.css:171-173 写死。' },
  S16: { motion: false, cssMotion: true, geoRuntime: false, onMech: 'no', chrome: false,
    why: '句子要的 12°/24px/4-6-7-9 栏在 style.css:221-222 的 calc() 里完整表达，--span/--slot 由 index.html:56-161 内联 style 写死，脚本 :255 只在断点换成另一组写死值（:242 SPANS 表）。脚本的滚动件 --shift(:291 平方关系)/--rung(:294 进度尺) 不在句子所述区域。' },
  S17: { motion: false, cssMotion: true, geoRuntime: false, onMech: 'no', chrome: false,
    why: '129 行全是业务状态机：:54-80 核验 draft→mismatch→verified（错误码 STUB-17）、:82-104 CSV 导出（:96-99 Blob+createObjectURL、:286 createElement("a")）、:106-128 期号切换改 innerHTML。几何只有 :211 --row-index(i%20)。' },
  S18: { motion: false, cssMotion: true, geoRuntime: false, onMech: 'partial', chrome: false,
    why: '句子「行尾 8×14px 块 530ms 方波」是 style.css:191-193 的 CSS 动画（cu-blink 1060ms steps(1,end) infinite，半周期 530ms）。脚本另有 :427 walk() 写 --tug（scrollY%24 取整到 6px），style.css:73 background-position-y 消费 —— 走纸，句子没写。' },
  S19: { motion: false, cssMotion: true, geoRuntime: false, onMech: 'no', chrome: false,
    why: '两个脚本：第一个只有 documentElement.classList.add("js")；第二个只有 IO 抽拉与检索号联动，零几何写入。面板几何在 style.css:63-66 与 HTML 的行/档变量。' },
  S20: { motion: false, cssMotion: true, geoRuntime: true, onMech: 'yes', chrome: false,
    why: ':272-274 现算 r = 96 + i·sp + t·(25 sin(11θ+0.35) + 8 sin(13θ+2.1))、xs.push(CX + r·cos(θ))；:286 createElementNS("path")、:311 setAttribute("d", r.d)。:96 scrollY → PAR(n) 换三参数后整图重排。23 圈 × 80 点 = 1840 段。句子无运动词，但描述的走线是 trig 导出 → geoRuntime=true。注意 :72-73 有 3 圈手写 <path d>（各 81 组坐标），见 §5。' },
  S21: { motion: false, cssMotion: true, geoRuntime: false, onMech: 'no', chrome: false,
    why: '114 行全是互斥对、IO arm 与悬停回话，零几何写入。三档斜切在 style.css:559-561 的 clip-path polygon 写死（30/45/60° → 56.7%/75%/85.57%）。' },
  S22: { motion: false, cssMotion: true, geoRuntime: false, onMech: 'no', chrome: false,
    why: '脚本只切 class：IO 折痕加深、翻折 is-folded、按钮回话，零几何写入。中缝 88px、折痕 3px、下端 4px 起毛在 CSS。' },
  S23: { motion: false, cssMotion: true, geoRuntime: false, onMech: 'no', chrome: false,
    why: ':388 只写 --dl 错开揭幕延迟。9 处开口、62° 斜痕、层间 1px 亮线全在 HTML/SVG 静态标记里。' },
  S24: { motion: false, cssMotion: true, geoRuntime: false, onMech: 'no', chrome: false,
    why: '零几何写入。:421 getBoundingClientRect 只判入场。8 栏中轴、5:3 宽比、2.5→1/0.6/0.4px 线宽在 26 个静态 <svg> 的 71 条手写 path 里（最长 22 组坐标）。' },
  S25: { motion: false, cssMotion: true, geoRuntime: false, onMech: 'no', chrome: false,
    why: ':364-370 在 scroll 里 getBoundingClientRect 写 --follow（1:0.94 跟随，style.css:197 translateY(var(--follow)) 消费）；:373-374 写序号 --d。句子写的是「两版错开 0.8 至 1.6px、行首按 0/12/24px 缩进」—— 静态量。' },
  S26: { motion: false, cssMotion: true, geoRuntime: false, onMech: 'no', chrome: false,
    why: ':465-469 在 scroll→rAF 里逐块 getBoundingClientRect 写 --p（中心距×24px，钳 ±1.4），style.css:147 transform:translateY(calc(var(--p)*var(--rate,1))) 消费。句子写的倾 11°、5:3:4、压叠 1.5/1.2px 全静态。' },
  S27: { motion: false, cssMotion: true, geoRuntime: false, onMech: 'no', chrome: false,
    why: '两处只是重启动 CSS 动画的 reflow 技巧（:418/:452 void offsetWidth 后加 class），零几何合成。9 栏、基线 7px、错开 1.8px 在 CSS。' },
  S28: { motion: false, cssMotion: true, geoRuntime: false, onMech: 'partial', chrome: false,
    why: ':440-451 drift() 在 scroll 内逐块 getBoundingClientRect，:449 img.style.transform 平移（三速率 1.0/0.92/1.06），:451 写 --edge（style.css:120/128/212 drop-shadow 消费）。句子「裁切边按 4 至 14px 写死值错开并外出血 24px」是静态量。' },
  S29: { motion: false, cssMotion: true, geoRuntime: false, onMech: 'no', chrome: false,
    why: '零几何写入。三处 getBoundingClientRect（:499/:518/:537）只判入场与章节高亮，写 class/aria-current。47 条手写 path 承载穿孔线与章节几何。' },
  S30: { motion: false, cssMotion: true, geoRuntime: false, onMech: 'yes', chrome: false,
    why: ':279-289 tick() 用三角波把 --push 推到 24px、--mis 从 9px 收到 0 再放回，style.css:193/196/437 消费。句子明写「下半错开 9px」但未写三角波 —— 静态读法是定值 9px；「先后由错位量与深度给出」仍是静态解读，故 motion=false。' },
};

const rows = [];
for (const r of classify) {
  const st = structure.find((x) => x.id === r.id);
  const i = I[r.id];
  if (!i) throw new Error('missing input for ' + r.id);

  // ---- machine facts ----
  const motionGeo = r.motionGeomVars.length > 0 || r.motionDirectGeom.length > 0;
  const stateGeo = r.geomVars.length > 0 &&
    r.writes.some((w) => w.drivers && w.drivers.some((k) => k === 'io' || k === 'ui'));
  const protoMoves = motionGeo || stateGeo;
  const synthOnMech = r.creates.length > 0 && i.onMech !== 'no';

  // ---- LITERAL ----
  // A: the sentence's geometry is only derivable at runtime (measured from live
  //    DOM, or a closed-form formula) — no finite hand-authored CSS/SVG equals it.
  // B: the sentence asks for motion. NOTE: nearly all motion here is CSS-doable —
  //    the repo itself ships @supports (animation-timeline: scroll()) at
  //    S16 style.css:505-512, so scroll-mapping is CSS; press is :active;
  //    viewport-sequencing is view-timeline. B therefore means "give the CSS
  //    recipe, JS is optional", not "JS required".
  // C: static geometry, fully declarable.
  let literal;
  if (i.geoRuntime) literal = 'A';
  else if (i.motion) literal = 'B';
  else literal = 'C';

  // ---- PROTOTYPE-STRICT: only the mechanism's OWN motion counts ----
  // B requires the moving geometry to be what the sentence describes. Motion the
  // sentence never mentions (a cursor, a speed-line) does not upgrade the verdict.
  let protoStrict;
  if (i.geoRuntime && synthOnMech) protoStrict = 'A';
  else if (protoMoves && !i.chrome && i.onMech !== 'no') protoStrict = 'B';
  else protoStrict = 'C';

  // ---- PROTOTYPE-LOOSE: reproduce what is actually on the bench ----
  // Any content geometry that moves under any driver counts, on-mechanism or not.
  // This is the reading that matches what a user clicking the prototype sees.
  let protoLoose;
  if (i.geoRuntime && synthOnMech) protoLoose = 'A';
  else if (protoMoves && !i.chrome) protoLoose = 'B';
  else protoLoose = 'C';

  rows.push({
    id: r.id, literal, protoStrict, protoLoose,
    protoMoves,
    onMech: i.onMech,
    offMechMotion: protoMoves && i.onMech === 'no',
    chromeOnly: protoMoves && i.chrome,
    axes: { motion: i.motion, cssMotion: i.cssMotion, geoRuntime: i.geoRuntime },
    why: i.why,
    machine: {
      roots: r.roots,
      synthSites: r.creates.map((c) => c.at + ' ' + c.kinds.join('+')),
      measureSites: r.measures.map((m) => m.at),
      motionGeo: r.motionGeomVars.map((g) => `${g.var} ${g.at} ←${g.drivers.join('|')} → css:${g.css.map((c) => c.line).join(',')}`)
        .concat(r.motionDirectGeom.map((d) => `${d.at} ←${d.drivers.join('|')}`)),
      trig: r.trig,
      emptySvg: st.emptySvg,
      handPaths: st.handPaths,
      keyframes: st.keyframes.map((k) => k.name),
    },
  });
}

fs.writeFileSync(path.join(ROOT, 'deliverables/74-w4/resolved.json'), JSON.stringify(rows, null, 2));

const tally = (k) => rows.reduce((a, r) => { a[r[k]] = (a[r[k]] || 0) + 1; return a; }, {});
const list = (k, v) => rows.filter((r) => r[k] === v).map((r) => r.id).join(' ');
console.log('LITERAL       :', JSON.stringify(tally('literal')), ' A:', list('literal', 'A'), '| B:', list('literal', 'B'));
console.log('PROTO-STRICT  :', JSON.stringify(tally('protoStrict')), ' A:', list('protoStrict', 'A'), '| B:', list('protoStrict', 'B'));
console.log('PROTO-LOOSE   :', JSON.stringify(tally('protoLoose')), ' A:', list('protoLoose', 'A'), '| B:', list('protoLoose', 'B'));
console.log('\noff-mech motion (moves, sentence silent):', rows.filter((r) => r.offMechMotion).map((r) => r.id).join(' ') || '-');
console.log('chrome-only motion:', rows.filter((r) => r.chromeOnly).map((r) => r.id).join(' ') || '-');
console.log('\nid  lit  strict loose  motion cssMotion geoRt onMech offMech');
for (const r of rows) {
  console.log(`${r.id}  ${r.literal}    ${r.protoStrict}      ${r.protoLoose}      ${String(r.axes.motion).padEnd(6)} ${String(r.axes.cssMotion).padEnd(9)} ${String(r.axes.geoRuntime).padEnd(5)} ${String(r.onMech).padEnd(7)} ${r.offMechMotion ? 'Y' : ''}`);
}
