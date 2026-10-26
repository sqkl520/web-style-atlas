/**
 * 生成 prototypes/_selection/prompts.js —— 30 案的「可移植风格 DNA + 提示词模板」。
 *
 * 这是「复制 AI 提示词」功能的数据底座。设计要点：
 *
 * 1) **数据来自实测的 CSS，不是 from 回忆**：
 *    色值/字体/圆角/阴影/线宽全部由 extract-dna.mjs + clean-dna.mjs 从各案 style.css 抽出，
 *    见 prototypes/_prompts/dna-clean.json。
 * 2) **体积**：每案约 183 字的紧凑 DNA（对比 data.js 十字段 2447 字，压缩 13 倍）。
 *    30 案合计约 6KB，直接内联进 prompts.js，不放独立 json —— file:// 下 fetch 会被 CORS 拦。
 * 3) **提示词模板统一、DNA 分案**：不写 30 份长提示词。用户点哪案，就把该案 DNA 填进同一份模板。
 * 4) **人话版**：plain 字段 ≤20 字，让用户三秒判断"这适不适合我"。
 * 5) **场景索引**：sceneYes / sceneNo 都进索引（现在 app.js 只索引 sceneYes，
 *    导致「电商」这类搜 0 命中，而它其实写在 8 案的"不适合"里）。
 *
 * 产物：prototypes/_selection/prompts.js
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { MECHANISMS } from "./mechanisms.mjs";

/* 仓库根：从脚本自身位置推导，不再硬编码。
 * 原实现写死 "D:/Web/style"（本机绝对路径），克隆到任何别的路径都会立刻失败；
 * 而 prompts.js 是 tracked 的构建产物，读它的人有权复算它。 */
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const dna = JSON.parse(readFileSync(join(ROOT, "prototypes/_prompts/dna-clean.json"), "utf8"));

/* 逐案「反 AI 味风险与规避」——30/30 齐全、共 5761 字，是**唯一一份写给"会犯错的执行者"的
 * 具体禁令**，却从未进过提示词（两个独立验证 Agent 各自发现这一点）。
 * 典型内容（S01）：
 *   「最容易滑向"复古报纸风海报"——一张大图加做旧滤镜。规避动作：①纸纹只铺在满幅底色层，
 *     正文栏内部保持干净，禁止统一套做旧滤镜；②朱红只允许出现在楔形与栏目标题，
 *     不得铺满任何一个分区……」
 * 这比"防退化 8 条"（通用）精确得多：它讲的是**这一案最容易做成什么样**。
 * 从 data.js 读取（那里是权威来源），剥掉"规避动作"的编号前缀，压成一句进提示词。
 */
const RISK = (() => {
  const src = readFileSync(join(ROOT, "prototypes/_selection/data.js"), "utf8");
  const out = {};
  /* data.js 的形状是 `window.SCHEMES = [ { "id": "S01", ..., "risk": "..." }, ... ]`
   * ——键名带引号（是 JSON 字面量，不是手写对象）。正则必须按带引号的键匹配。 */
  const re = /"id":\s*"(S\d{2})"[\s\S]*?"risk":\s*"((?:[^"\\]|\\.)*)"/g;
  let m;
  while ((m = re.exec(src))) {
    out[m[1]] = m[2].replace(/\\"/g, '"').replace(/\\n/g, " ").trim();
  }
  return out;
})();

/* 内容量容限（minItems / degrades / minPics）：来自 deliverables/60-minitems-degrade-audit.md
 * 的 30 案实测表。判据见该报告：
 *  · minItems = 同构重复单元的**设计规模**（不是"至少要这么多"）；
 *  · degrades = yes 表示单元位置是作者数出来的（绝对定位/写死 grid 坐标/手绘 SVG/
 *    写死编号的行标题），内容变少会留洞 —— 这才是要警告用户的；
 *  · minPics = 必须放真图的槽位数。
 * 前两版我自己算的都不对：几何法把"删内容后页面变短"误当"散架"（与静态法 16/30 冲突），
 * 静态法的 class 规则又把图注/卡面当成条目（S22 判成 0 条、S19 取到 dw__card）。 */
const CAPACITY = Object.fromEntries(
  JSON.parse(readFileSync(join(ROOT, "prototypes/_prompts/minitems-parsed.json"), "utf8").replace(/^\uFEFF/, ""))
    .map((x) => [x.id, x])
);

/* 机制句合并：S01–S10 用 _specs 里原有的（dna-clean 已抓到），S11–S30 用 mechanisms.mjs 补的。
 * 补的这 20 条都附了数值来源（哪个文件哪一行），可逐条复核。 */
let mechFromSpec = 0, mechFromPatch = 0;
for (const d of dna) {
  if (!d.mechanism && MECHANISMS[d.id]) {
    d.mechanism = MECHANISMS[d.id].text;
    d.mechanismSource = MECHANISMS[d.id].source;
    mechFromPatch++;
  } else if (d.mechanism) {
    mechFromSpec++;
  }
}

// ── 人话版 / 场景 / 内容量：人工裁定，逐条在此集中维护（不散落在模板里）────────────────
// 判据：plain ≤20 字，不含 px/HEX/角度；能让人三秒判断"适不适合我"。
/* `hard` 标注（2026-10-27 重新实测后从 9 个缩到 4 个）
 * 判据：机制的实现是否**读取**数据的具体值/形态，而不只是数量。
 * 背景：这个标注从首次写下起从未复验过，于是 8 个 Agent 分头重审，四份独立名单
 * 并集 8、交集只有 3 —— 差别全部集中在「需要真跑一次页面才能确认」的地方
 * （它们把源数据当成了渲染结果）。最终裁决以 CDP 渲染实测为准，见
 * deliverables/63-plan/SYNTHESIS-hard-revalidation.md。
 * 留 S15：14 个 SVG 矩形面积与声明 m² 残差 0.00%，三层年代内容各异
 * 留 S18：机制绑 --at 行号定位，改一行下游全要手改（但有 off-by-2 bug，已修）
 * 留 S21：14 条锁互斥图 pairs==excl 14/14，angle==15×pairs 14/14
 * 留 S29：23≡23≡23 有序全等、0 重复，getElementById('part-'+no) 是真读取
 * 撤 S03：年代轴是 5 个字面量 [1957..1977]，与 8 条带零耦合，且轴停在 1977 而数据到 1978
 * 撤 S05：8 块面板写死网格坐标，属 degrades；点阵算法换任何数字都能画
 * 撤 S10：要的是「同一集合两套排序」，换内容仍成立
 * 撤 S14：estimate_h 在 9/11 条撞 max(3,·) 下限，字数不参与；正文涨 1.7× 仍零重叠
 * 撤 S20：图由参数生成，不读条目，连音频都不解析（index.html:392）
 * 四个 Agent 给出四份不同名单（并集 8、交集 3），这次裁决以「渲染实测」为准，
 * 因为出错全部集中在需要跑一次页面才能确认的地方。
 */
const HUMAN = {
  S01: { plain: "没裁齐的报纸感，红斜块压住版面", scenes: ["内容媒体", "文化机构"], minItems: 3, minPics: 4 },
  S02: { plain: "金色中缝对切，左右镜像，很贵", scenes: ["高定品牌", "拍卖行"], minItems: 3, minPics: 5 },
  S03: { plain: "纵向年代轴，像观测记录仪", scenes: ["科研机构", "气象看板"], minItems: 8, minPics: 3 },
  S04: { plain: "手贴满的展览墙，色块互相压边", scenes: ["展览导览", "艺术家主页"], minItems: 6, minPics: 9 },
  S05: { plain: "冷库铁皮控制面板，八块分区", scenes: ["工业监控", "硬件产品"], minItems: 8, minPics: 3 },
  S06: { plain: "咖啡泡过的纸，卡片沿斜轨漂", scenes: ["咖啡馆", "播客", "手作品牌"], minItems: 4, minPics: 5 },
  S07: { plain: "老报纸目录跨页，左窄右宽", scenes: ["期刊目录", "档案机构"], minItems: 5, minPics: 4 },
  S08: { plain: "琥珀亚克力板叠起来，有厚度", scenes: ["设计工作室", "香氛烈酒"], minItems: 3, minPics: 6 },
  S09: { plain: "亮黄手写价目板，小店摆摊那种热闹", scenes: ["修鞋理发", "小吃店", "市集"], minItems: 5, minPics: 4 },
  S10: { plain: "五栏不等宽对撞，红版压过黑栏", scenes: ["B端采购", "工程规格"], minItems: 5, minPics: 3 },
  S11: { plain: "七层复写纸打的检修手册", scenes: ["档案项目", "文档工具"], minItems: 8, minPics: 3 },
  S12: { plain: "青柠塑料墙挖七个洞，很吵", scenes: ["游戏官网", "潮牌快闪"], minItems: 3, minPics: 6 },
  S13: { plain: "棉纸公函，条款标题压出凹痕", scenes: ["合同审批", "公文发布"], minItems: 6, minPics: 3 },
  S14: { plain: "舱壁铝箔标贴，十一枚绕一个心", scenes: ["开发者工具", "基础设施"], minItems: 8, minPics: 3 },
  S15: { plain: "三层硫酸纸叠在同一张平面图上", scenes: ["地图GIS", "专题数据库"], minItems: 9, minPics: 3, hard: true },
  S16: { plain: "九个词块沿斜线堆叠，速度感", scenes: ["创意机构", "字体厂商"], minItems: 5, minPics: 3 },
  S17: { plain: "印花税票对账联，小数点对齐", scenes: ["财务对账", "票据系统"], minItems: 6, minPics: 3 },
  S18: { plain: "机房墙上挂一条打印纸，磷光绿", scenes: ["运维日志", "工单系统"], minItems: 10, minPics: 2, hard: true },
  S19: { plain: "暖米纸感+抽屉网格，像老书店选品柜", scenes: ["咖啡馆", "书店", "选品店", "标本馆"], minItems: 4, minPics: 6 },
  S20: { plain: "白图纸上针笔单线走位", scenes: ["音频设备", "测量仪器"], minItems: 6, minPics: 3 },
  S21: { plain: "值班台上的联锁释放簿，左右两栏", scenes: ["工序依赖", "调度排班"], minItems: 9, minPics: 2, hard: true },
  S22: { plain: "日式纸张对折，安静，适合长文", scenes: ["长篇博客", "手作品牌", "书店"], minItems: 2, minPics: 4 },
  S23: { plain: "同一面墙铲开九处，露出不同年份", scenes: ["城市更新", "口述史"], minItems: 6, minPics: 8 },
  S24: { plain: "蓝晒法印的雨林叶脉，蓝得发沉", scenes: ["科普站点", "自然教育"], minItems: 6, minPics: 5 },
  S25: { plain: "手工装订刊物目录，两专色叠第三色", scenes: ["独立杂志", "出版书系"], minItems: 5, minPics: 5 },
  S26: { plain: "三块硬边色版在斜线上对撞", scenes: ["数据看板", "方案对比"], minItems: 5, minPics: 3 },
  S27: { plain: "手绘海报当公文用，墨绿与炭黑错位", scenes: ["戏剧演出", "影展", "文化节"], minItems: 5, minPics: 6 },
  S28: { plain: "唱片封套裁开重拼，暗紫配黑", scenes: ["音频设备", "音乐产品", "限量售卖"], minItems: 8, minPics: 10 },
  S29: { plain: "钢丝圈装订的工业规程册", scenes: ["工业设备", "说明书", "售后支持"], minItems: 12, minPics: 3, hard: true },
  S30: { plain: "荧光绿贴纸撕成两半，潮流有劲", scenes: ["游戏周边", "潮牌", "快闪活动"], minItems: 4, minPics: 6 },
};

// 不能大众化的 4 案（机制真的读取数据的具体值/形态，换普通内容会退化）——如实标注，不硬接
// 9 → 4 的撤销理由逐条写在上面 HUMAN 前的注释里；这里不再重复。
const HARD_IDS = Object.keys(HUMAN).filter((k) => HUMAN[k].hard);

// 场景索引：把 45 个常见行业词映射到案号。测出零命中的如实列 unsupported。
const SCENE_INDEX = {
  "咖啡店": { direct: ["S06"], near: ["S19", "S22", "S09"] },
  "茶饮": { direct: [], near: ["S06", "S19"] },
  "餐厅": { direct: [], near: ["S09", "S19"] },
  "烘焙": { direct: ["S06"], near: ["S09", "S19"] },
  "书店": { direct: [], near: ["S19", "S22", "S25"] },
  "手作品牌": { direct: ["S22"], near: ["S06", "S19", "S25"] },
  "设计工作室": { direct: ["S08"], near: ["S16", "S28"] },
  "作品集": { direct: ["S08", "S16"], near: ["S25", "S28"] },
  "内容媒体": { direct: ["S01"], near: ["S07", "S25"] },
  "博客": { direct: [], near: ["S22"] },
  "播客": { direct: [], near: ["S06", "S22"] },
  "独立杂志": { direct: ["S25"], near: ["S07"] },
  "出版": { direct: ["S25"], near: ["S07"] },
  "展览": { direct: ["S04"], near: ["S23", "S27"] },
  "戏剧": { direct: [], near: ["S27", "S16"] },
  "影展": { direct: [], near: ["S27"] },
  "文化节": { direct: [], near: ["S27", "S16"] },
  "游戏": { direct: ["S12"], near: ["S30"] },
  "潮牌": { direct: ["S12"], near: ["S30", "S28"] },
  "快闪": { direct: [], near: ["S12", "S30"] },
  "音乐产品": { direct: ["S28"], near: ["S30"] },
  "音频设备": { direct: ["S28"], near: ["S20"] },
  "工业设备": { direct: [], near: ["S29", "S05"] },
  "说明书": { direct: [], near: ["S29", "S11"] },
  "开发者工具": { direct: [], near: ["S14", "S18"] },
  "运维": { direct: [], near: ["S18"] },
  "数据看板": { direct: [], near: ["S26", "S03"] },
  "档案": { direct: [], near: ["S07", "S11", "S23"] },
  "科普": { direct: [], near: ["S24", "S03"] },
  "教育": { direct: [], near: ["S24"] },
  "修鞋理发": { direct: ["S09"], near: [] },
  "小吃店": { direct: ["S09"], near: [] },
  "市集": { direct: ["S09"], near: ["S04"] },
  "花店": { direct: [], near: ["S22", "S19"] },
  "民宿": { direct: [], near: ["S02", "S22"] },
  "婚礼": { direct: [], near: ["S02", "S22"] },
  "摄影": { direct: [], near: ["S02", "S08"] },
  "健身": { direct: [], near: ["S12", "S30"] },
  "宠物": { direct: [], near: ["S30", "S12"] },
  "诊所": { direct: [], near: ["S13", "S29"] },
  "律师": { direct: [], near: ["S13", "S11"] },
  "会计": { direct: [], near: ["S17"] },
  "招聘": { direct: [], near: ["S07", "S11"] },
  "非营利": { direct: [], near: ["S23", "S04"] },
};

const UNSUPPORTED = [
  "电商", "网店", "服装", "乐队", "家教", "培训", "独立开发者", "个人主页", "简历",
  "社团", "捐款", "甜品", "酒吧", "美甲", "展会", "政务", "金融", "医疗", "地产",
  "旅游", "汽车", "母婴", "儿童", "时尚", "美妆", "数码", "家居", "农业", "物流",
];

/* ── 提示词模板：已删除 ─────────────────────────────────────────────
 * 这里原本有一份 875 字的 TEMPLATE 常量，作为 `template` 字段写进 prompts.js。
 * 但实测（2026-10-25）：**没有任何代码读 P.template** ——
 *   `Select-String -Pattern 'P\.template|STYLE_PROMPTS\.template'` 在
 *   `prototypes/_selection/*.js` 与 `*.html` 上零命中。
 * 真正拼提示词的是 prompt-copy.js 的 buildPrompt()，里面有另一份逐字相同的模板。
 *
 * 两份副本已经同步过一次（7 个探针句子全 same），但这正是这个仓库记录在案的分叉教训：
 * `templates/M01` 的 box-shadow 就曾出现中英文档结论相反。
 * 留一份 875 字的死副本在 prompts.js 里，等于给下一次改模板埋一颗哑弹 ——
 * 只要有人只改了其中一份，「模板」与「实际输出」就会静默背离，而两边都不会报错。
 * 故删除：模板唯一真源是 buildPrompt()。
 */


// ── 组装 ────────────────────────────────────────────────────────────
const out = [];
for (const d of dna) {
  const h = HUMAN[d.id] || { plain: "", scenes: [], minItems: 3, minPics: 3 };
  /* 调色板：不再 slice(0,5)。
   * 2026-10-26 复算证实：:root 实际声明数远超 5，而底色通常排在前面，
   * S19 的主色 #4A5C3A（第 6 位）、S24 的主色 #5D43AD（第 7 位）都被切掉了，
   * 提示词却写着「配色只用这几个值」—— 主色不在列，AI 永远不会用它。
   * 现在上限由 clean-dna 控制在 7 个、且主色已排到最前，这里只负责格式化。
   */
  const pal = d.palette.length
    ? d.palette.map((p) => {
        const parts = p.split(" ");
        /* 去掉频次权重后缀：S14 无 :root，兜底走「全文件字面量按出现次数取前 6」，
         * 产出的形如 "#C9C4B8 ×16"。那个 ×16 是**抽取过程的元信息**，
         * 直接拼进提示词会变成「配色只用这几个值：#C9C4B8 ×16、…」——AI 无法执行。
         * 只保留色值本身与可选的变量名。
         */
        const hex = parts[0];
        const name = parts[1] && !/^×\d+$/.test(parts[1]) ? parts[1] : "";
        return hex + (name ? "（" + name + "）" : "");
      }).join("、")
    : "（该案未在 :root 声明色变量，需读 CSS 正文）";

  /* 内容量：三个来源的优先级
   *   1) 实测 CAPACITY（60-minitems-degrade-audit.md，逐案读 style.css 定位规则得出）
   *   2) HUMAN 里的人工估计（早期手写，26/30 与实测不一致，仅作兜底）
   *   3) 3
   * 之前只用 HUMAN，导致 S07 的提示词写「我实际有 5 个条目」——而那案设计规模是 46 条，
   * AI 照 5 条去排，等于把「46 份分类广告的目录跨页」压成一个小列表，风格当场失效。
   */
  const cap = CAPACITY[d.id] || null;
  const count = (cap && cap.minItems) || h.minItems || 3;
  const degrades = cap && cap.degrades === "yes";

  out.push({
    id: d.id,
    dir: d.dir,
    plain: h.plain,
    scenes: h.scenes,
    minItems: count,
    minPics: (cap && cap.minPics) || h.minPics,
    hard: !!h.hard,
    // 实测的内容量容限（优先用实测值，没有才回退到上面的人工估计）
    capacity: cap,
    dna: {
      palette: pal,
      /* fonts 从数组改成 {display, body, mono}。
       * 原先是 fonts:["Noto Serif SC","IBM Plex Mono","Spectral"] 这种按抽取顺序排的数组，
       * prompt-copy 只能靠正则"猜"谁是标题 —— 30 案里猜错 7 案（S04/S06/S08/S10/S18/S19/S23）。
       * 现在标题字体由 clean-dna 从 h1 规则（展开 var）直接解析，谁读谁直接用，不再猜。
       */
      fonts: d.fonts,
      radius: d.radius,
      radiusBare: !!d.radiusBare,
      shadow: d.shadow,
      lineWidths: d.lineWidths,
      h1Size: d.h1Size,
      mechanism: d.mechanism,
      degrades: degrades,
      /* 逐案「最容易做成什么样 + 怎么避开」——5761 字里最该给 AI 看的部分。
       * 它比通用的"防退化 8 条"精确一个数量级：那 8 条说"不要紫蓝渐变"，
       * 而这里说"纸纹只铺在满幅底色层，正文栏内部保持干净，禁止统一套做旧滤镜"。 */
      risk: RISK[d.id] || "",
    },
  });
}

const banner = [
  "/* 自动生成，勿手改。生成器：prototypes/_prompts/build-prompts.mjs",
  " * 数据来源：各案 style.css 实测抽取（色值/字体/圆角/阴影/线宽），见 dna-clean.json。",
  " * 人话版 plain 与场景 scenes 是人工裁定，集中维护在生成器里。",
  " *",
  " * 2026-10-26 数据形状变更（读端需知）：",
  " *   dna.fonts 由数组改成 {display, body, mono} —— 标题字体不再按数组顺序猜，",
  " *     由 clean-dna 从各案 h1 规则（展开 var()）解析，30/30 与实测一致；",
  " *   dna.palette 由最多 5 色放宽到最多 7 色，主强调色排在最前（S19/S24 的主色曾被截掉）；",
  " *   dna.radius 一律是可执行的一句话，不再出现「未声明」「0 / 50%」这类抽取记号；",
  " *   dna.lineWidths 形如「1px、3px」，不再出现「未声明」。",
  " */",
  "",
].join("\n");

const body = [
  banner,
  "window.STYLE_PROMPTS = " + JSON.stringify({
    /* 这里**不再输出 `template` 字段**。
     * 模板的唯一真源是 `prototypes/_selection/prompt-copy.js` 里的 buildPrompt()。
     * 原先这里同步输出一份 875 字的逐字副本，但没有任何代码读它（实测零命中），
     * 属于「改了不生效、不报错」的哑弹，已删。详见上方注释。 */
    sceneIndex: SCENE_INDEX,
    unsupported: UNSUPPORTED,
    hardIds: HARD_IDS,
    schemes: out,
  }, null, 1) + ";",
  "",
].join("\n");

writeFileSync(join(ROOT, "prototypes/_selection/prompts.js"), body, "utf8");

const kb = Buffer.byteLength(body, "utf8") / 1024;
console.log("=== prompts.js 已生成 ===");
console.log("  体积：" + kb.toFixed(1) + " KB（30 案 DNA + 场景索引）");
console.log("  场景索引：" + Object.keys(SCENE_INDEX).length + " 个行业词，其中 unsupported 单列 " + UNSUPPORTED.length + " 个");
console.log("  不能大众化的案：" + HARD_IDS.join(", "));
const noPlain = out.filter((x) => !x.plain).map((x) => x.id);
console.log("  缺人话版的案：" + (noPlain.join(",") || "无"));
const noMech = out.filter((x) => !x.dna.mechanism).length;
console.log("  有机制句的案：30/" + (30 - noMech) + " → 实际 " + (30 - noMech) + "/30");
console.log("  平均每案 DNA 字数：" + Math.round(out.reduce((s, x) => s + JSON.stringify(x.dna).length, 0) / out.length));
console.log("");
console.log("=== 字体（P0-2：标题字＝h1 规则解析结果，不再按数组顺序猜）===");
for (const x of out) {
  const f = x.dna.fonts;
  console.log("  " + x.id + "  标题 " + (f.display || "—") + " ｜ 正文 " + (f.body || "—") + " ｜ 等宽 " + (f.mono || "（无）"));
}
console.log("");
console.log("=== 调色板色数（P0-4：上限 7，主色在最前）===");
const dist = {};
for (const x of out) {
  const n = x.dna.palette.split("、").length;
  dist[n] = (dist[n] || 0) + 1;
}
for (const k in dist) console.log("  " + k + " 色：" + dist[k] + " 案");
const withPrimary = dna.filter((d) => d.primary && d.primary.length);
console.log("  识别出主色的案：" + withPrimary.length + "/30（其余按 :root 声明顺序取前 7，主色本来就在前 7 位内）");
