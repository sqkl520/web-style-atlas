/* 自动生成，勿手改。生成器：deliverables/99-scratch/build-prompts.mjs
 * 数据来源：各案 style.css 实测抽取（色值/字体/圆角/阴影/线宽），见 dna-clean.json。
 * 人话版 plain 与场景 scenes 是人工裁定，集中维护在生成器里。
 */

window.STYLE_PROMPTS = {
 "template": "我经营{{生意}}。{{一句话说清你卖什么、给谁看}}。页面需要{{你要访客做的唯一动作}}。\n\n请把整页做成这个风格：{{风格气质，一句话}}。\n\n视觉硬约束（逐条执行，不得改色改字）：\n1. 配色只用这几个值：{{palette}}。不新增第六种彩色。\n2. 字体：标题 {{fontDisplay}}，正文 {{fontBody}}。不要用 Playfair Display、Inter、Roboto，也不许回退成系统无衬线。\n3. 圆角：{{radius}}。\n4. 阴影：{{shadow}}。不许用柔和外投影制造浮起。\n5. 线宽只用这几级：{{lineWidths}}，不要自创第三级。\n\n结构约束：\n1. 我实际有 {{数量}} 个{{内容单位}}，就排 {{数量}} 个，不凑整、不留空位、编号连续不跳号。\n2. 如果数量不够，按实际数量收敛，不要拉高填满。\n3. 首屏不要轮播。\n\n防退化（出现任何一条就重做）：\n① 不要紫蓝渐变、#6366F1、蓝紫光斑。\n② 不要圆角卡片配柔和外投影。\n③ 不要居中大标题加两个并排 CTA 的首屏。\n④ 不要三条等宽 feature 卡片（图标+标题+两行说明）。\n⑤ 不要 emoji、彩色 iconfont。\n⑥ 不要玻璃拟态、毛玻璃、半透明浮层。\n⑦ 不要暗底发光字、霓虹色、扫描线。\n⑧ 不要自动轮播、滚动视差、卡片翻转。\n\n验收三问（做完自己看）：\n1. 拿远半米看，整页像{{风格气质短}}，还是像一张通用落地页？\n2. 随便挑一条内容，首屏/卡片/页脚上的编号是不是同一串？有一处对不上就重做。\n3. 扫一眼：有没有圆角、影子跑到纸外、发光字、表情图标、两个主按钮？有任何一个就重做。\n\n输出：只给一个完整单文件 HTML（<!DOCTYPE html> 开头，CSS 内联在 <style>），\n不引 React/Vue/Tailwind/Bootstrap，不拆文件、不构建。图片用 images/ 下的占位路径。\n移动端单列，顺序不变。不要解释、不要设计说明，只给代码。",
 "sceneIndex": {
  "咖啡店": {
   "direct": [
    "S06"
   ],
   "near": [
    "S19",
    "S22",
    "S09"
   ]
  },
  "茶饮": {
   "direct": [],
   "near": [
    "S06",
    "S19"
   ]
  },
  "餐厅": {
   "direct": [],
   "near": [
    "S09",
    "S19"
   ]
  },
  "烘焙": {
   "direct": [
    "S06"
   ],
   "near": [
    "S09",
    "S19"
   ]
  },
  "书店": {
   "direct": [],
   "near": [
    "S19",
    "S22",
    "S25"
   ]
  },
  "手作品牌": {
   "direct": [
    "S22"
   ],
   "near": [
    "S06",
    "S19",
    "S25"
   ]
  },
  "设计工作室": {
   "direct": [
    "S08"
   ],
   "near": [
    "S16",
    "S28"
   ]
  },
  "作品集": {
   "direct": [
    "S08",
    "S16"
   ],
   "near": [
    "S25",
    "S28"
   ]
  },
  "内容媒体": {
   "direct": [
    "S01"
   ],
   "near": [
    "S07",
    "S25"
   ]
  },
  "博客": {
   "direct": [],
   "near": [
    "S22"
   ]
  },
  "播客": {
   "direct": [],
   "near": [
    "S06",
    "S22"
   ]
  },
  "独立杂志": {
   "direct": [
    "S25"
   ],
   "near": [
    "S07"
   ]
  },
  "出版": {
   "direct": [
    "S25"
   ],
   "near": [
    "S07"
   ]
  },
  "展览": {
   "direct": [
    "S04"
   ],
   "near": [
    "S23",
    "S27"
   ]
  },
  "戏剧": {
   "direct": [],
   "near": [
    "S27",
    "S16"
   ]
  },
  "影展": {
   "direct": [],
   "near": [
    "S27"
   ]
  },
  "文化节": {
   "direct": [],
   "near": [
    "S27",
    "S16"
   ]
  },
  "游戏": {
   "direct": [
    "S12"
   ],
   "near": [
    "S30"
   ]
  },
  "潮牌": {
   "direct": [
    "S12"
   ],
   "near": [
    "S30",
    "S28"
   ]
  },
  "快闪": {
   "direct": [],
   "near": [
    "S12",
    "S30"
   ]
  },
  "音乐产品": {
   "direct": [
    "S28"
   ],
   "near": [
    "S30"
   ]
  },
  "音频设备": {
   "direct": [
    "S28"
   ],
   "near": [
    "S20"
   ]
  },
  "工业设备": {
   "direct": [],
   "near": [
    "S29",
    "S05"
   ]
  },
  "说明书": {
   "direct": [],
   "near": [
    "S29",
    "S11"
   ]
  },
  "开发者工具": {
   "direct": [],
   "near": [
    "S14",
    "S18"
   ]
  },
  "运维": {
   "direct": [],
   "near": [
    "S18"
   ]
  },
  "数据看板": {
   "direct": [],
   "near": [
    "S26",
    "S03"
   ]
  },
  "档案": {
   "direct": [],
   "near": [
    "S07",
    "S11",
    "S23"
   ]
  },
  "科普": {
   "direct": [],
   "near": [
    "S24",
    "S03"
   ]
  },
  "教育": {
   "direct": [],
   "near": [
    "S24"
   ]
  },
  "修鞋理发": {
   "direct": [
    "S09"
   ],
   "near": []
  },
  "小吃店": {
   "direct": [
    "S09"
   ],
   "near": []
  },
  "市集": {
   "direct": [
    "S09"
   ],
   "near": [
    "S04"
   ]
  },
  "花店": {
   "direct": [],
   "near": [
    "S22",
    "S19"
   ]
  },
  "民宿": {
   "direct": [],
   "near": [
    "S02",
    "S22"
   ]
  },
  "婚礼": {
   "direct": [],
   "near": [
    "S02",
    "S22"
   ]
  },
  "摄影": {
   "direct": [],
   "near": [
    "S02",
    "S08"
   ]
  },
  "健身": {
   "direct": [],
   "near": [
    "S12",
    "S30"
   ]
  },
  "宠物": {
   "direct": [],
   "near": [
    "S30",
    "S12"
   ]
  },
  "诊所": {
   "direct": [],
   "near": [
    "S13",
    "S29"
   ]
  },
  "律师": {
   "direct": [],
   "near": [
    "S13",
    "S11"
   ]
  },
  "会计": {
   "direct": [],
   "near": [
    "S17"
   ]
  },
  "招聘": {
   "direct": [],
   "near": [
    "S07",
    "S11"
   ]
  },
  "非营利": {
   "direct": [],
   "near": [
    "S23",
    "S04"
   ]
  }
 },
 "unsupported": [
  "电商",
  "网店",
  "服装",
  "乐队",
  "家教",
  "培训",
  "独立开发者",
  "个人主页",
  "简历",
  "社团",
  "捐款",
  "甜品",
  "酒吧",
  "美甲",
  "展会",
  "政务",
  "金融",
  "医疗",
  "地产",
  "旅游",
  "汽车",
  "母婴",
  "儿童",
  "时尚",
  "美妆",
  "数码",
  "家居",
  "农业",
  "物流"
 ],
 "hardIds": [
  "S03",
  "S05",
  "S10",
  "S14",
  "S15",
  "S18",
  "S20",
  "S21",
  "S29"
 ],
 "schemes": [
  {
   "id": "S01",
   "dir": "S01-red-wedge-broadsheet",
   "plain": "没裁齐的报纸感，红斜块压住版面",
   "scenes": [
    "内容媒体",
    "文化机构"
   ],
   "minItems": 3,
   "minPics": 4,
   "hard": false,
   "dna": {
    "palette": "#EFE7D7（paper）、#C1121F（red）、#1A1614（ink）、#6E6A5E（lead）",
    "fonts": [
     "Noto Sans SC",
     "Martian Mono",
     "Archivo"
    ],
    "radius": "全直角 0",
    "shadow": "无阴影",
    "lineWidths": "1 / 3 px",
    "h1Size": "var(--fs-h1)",
    "mechanism": "一块实色多边形以 11° 切入 4 栏版心，24px 实体隔条撑开栏沟，红块越界压住 3 行正文——阅读顺序由角度与越界量决定，与它叫什么名字无关。"
   }
  },
  {
   "id": "S02",
   "dir": "S02-gilded-symmetry-salon",
   "plain": "金色中缝对切，左右镜像，很贵",
   "scenes": [
    "高定品牌",
    "拍卖行"
   ],
   "minItems": 3,
   "minPics": 5,
   "hard": false,
   "dna": {
    "palette": "#0B0B0F（card）、#B8860B（gold）、#EFE6D0（ivory）、#3A2E1A（dirty）、#111111（ink）",
    "fonts": [
     "Noto Serif SC",
     "Bodoni Moda",
     "IBM Plex Mono"
    ],
    "radius": "全直角 0",
    "shadow": "只用 inset（凹槽，无外投影）",
    "lineWidths": "1 / 2 px",
    "h1Size": "clamp(60px, 7.4vw, 108px)",
    "mechanism": "同一张位图以一条 2px 中轴做 180° 相位取样，两侧各 7 级与 9 级、级差 56px，文字全部贴轴对齐——对称只存在于图样，文字始终不对称。"
   }
  },
  {
   "id": "S03",
   "dir": "S03-long-exposure-observatory",
   "plain": "纵向年代轴，像观测记录仪",
   "scenes": [
    "科研机构",
    "气象看板"
   ],
   "minItems": 8,
   "minPics": 3,
   "hard": true,
   "dna": {
    "palette": "#101A1C（void）、#13928E（aurora）、#C9D6CF（paper）、#B9A98C（tape）、#162226（panel）",
    "fonts": [
     "IBM Plex Sans",
     "IBM Plex Mono",
     "Space Grotesk"
    ],
    "radius": "全直角 0",
    "shadow": "无阴影",
    "lineWidths": "1 / 2 px",
    "h1Size": "",
    "mechanism": "一条 264px 宽的纵向刻度轴随滚动固定，右侧 9 栏的高度按 30 秒曝光折成 28px 一档，四角遮罩压掉 32%，游标随焦距比移动——层级由高度与固定位置承担，不由名字承担。"
   }
  },
  {
   "id": "S04",
   "dir": "S04-mango-collage-wall",
   "plain": "手贴满的展览墙，色块互相压边",
   "scenes": [
    "展览导览",
    "艺术家主页"
   ],
   "minItems": 6,
   "minPics": 9,
   "hard": false,
   "dna": {
    "palette": "#96550F（orange）、#2F7D4F（green）、#14100C（ink）、#F0E2C8（paper）",
    "fonts": [
     "Unbounded",
     "Redaction 20",
     "Martian Mono"
    ],
    "radius": "未声明",
    "shadow": "无阴影",
    "lineWidths": "1 / 3 px",
    "h1Size": "72px",
    "mechanism": "12 列隐网格上，纸块跨 2 至 6 栏、色版偏移取 3 至 7px 五档、旋转限 ±1.2°，页面上没有一条对称边——阅读入口由层叠高低与错位量给出。"
   }
  },
  {
   "id": "S05",
   "dir": "S05-pixel-cold-storage-console",
   "plain": "冷库铁皮控制面板，八块分区",
   "scenes": [
    "工业监控",
    "硬件产品"
   ],
   "minItems": 8,
   "minPics": 3,
   "hard": true,
   "dna": {
    "palette": "#0E100D（plate）、#4FA83D（paint）、#BFB9A6（panel）、#8C2F1F（alarm）、#111111（on-paint）",
    "fonts": [
     "Glow Sans SC",
     "Barlow",
     "Departure Mono"
    ],
    "radius": "0 / 50%",
    "shadow": "只用 inset（凹槽，无外投影）",
    "lineWidths": "1 / 2 px",
    "h1Size": "clamp(46px, 6vw, 88px)",
    "mechanism": "8px 为一个单元，8 块分区按 5:2:1 再加一个双高块分配面积，凹槽 6px 单向受光，读数按 5×7 网格排点——优先级由面积与单元数直接表达。"
   }
  },
  {
   "id": "S06",
   "dir": "S06-showa-kissaten-ledger",
   "plain": "咖啡泡过的纸，卡片沿斜轨漂",
   "scenes": [
    "咖啡馆",
    "播客",
    "手作品牌"
   ],
   "minItems": 4,
   "minPics": 5,
   "hard": false,
   "dna": {
    "palette": "#ECDEC6（paper）、#85572A（brown）、#241A12（ink）、#C9A87C（stain）、#E6D8BC（card）",
    "fonts": [
     "Literata",
     "EB Garamond",
     "Martian Mono"
    ],
    "radius": "全直角 0",
    "shadow": "无阴影",
    "lineWidths": "1 / 2 px",
    "h1Size": "clamp(46px, 5.6vw, 84px)",
    "mechanism": "卡片沿 3° 斜轨排布，轨道间距 96px、相邻偏移按 0.62 递减，漂移速度为滚动量的 0.6 倍且各卡系数在 0.92 至 1.08 之间不等——顺序由速度差与斜角给出。"
   }
  },
  {
   "id": "S07",
   "dir": "S07-slate-ink-contents",
   "plain": "老报纸目录跨页，左窄右宽",
   "scenes": [
    "期刊目录",
    "档案机构"
   ],
   "minItems": 5,
   "minPics": 4,
   "hard": false,
   "dna": {
    "palette": "#E7E7E0（paper）、#33505C（slate）、#1C1A16（ink）、#9A9384（deckle）",
    "fonts": [
     "Libre Franklin",
     "Newsreader",
     "IBM Plex Mono\" /* taste-skill-ignore: 字段4 辅助数字，只用于页码/辑号/归档号 */"
    ],
    "radius": "未声明",
    "shadow": "无阴影",
    "lineWidths": "1 / 2 px",
    "h1Size": "",
    "mechanism": "同一段文字在纸背以 8% 至 14% 不透明度做镜像并整体偏移 1px，正面 5 栏对背面 7 栏、栏线 0.5px，页码竖排 28px 行高——正反两面同时进入同一张版心。"
   }
  },
  {
   "id": "S08",
   "dir": "S08-amber-overprint-lightbox",
   "plain": "琥珀亚克力板叠起来，有厚度",
   "scenes": [
    "设计工作室",
    "香氛烈酒"
   ],
   "minItems": 3,
   "minPics": 6,
   "hard": false,
   "dna": {
    "palette": "#120C08（room）、#C46A1F（amber）、#E8DCC8（ivory）、#6B4A22（wall）、#3A2712（wall-deep）",
    "fonts": [
     "Source Serif 4",
     "Overprint Numerals",
     "Gloock"
    ],
    "radius": "未声明",
    "shadow": "无阴影",
    "lineWidths": "2 / 3 / 4 px",
    "h1Size": "clamp(44px, 5.4vw, 78px)",
    "mechanism": "六块板按层号各偏移 (24px, 12px)，轮廓侧向拉出 6 至 10px、上缘 2px 高光、滚动 200px 走 6px——深度由层号位移与侧壁宽度两件事同时说明。"
   }
  },
  {
   "id": "S09",
   "dir": "S09-batik-price-board",
   "plain": "亮黄手写价目板，小店摆摊那种热闹",
   "scenes": [
    "修鞋理发",
    "小吃店",
    "市集"
   ],
   "minItems": 5,
   "minPics": 4,
   "hard": false,
   "dna": {
    "palette": "#F5C842（yellow）、#1F4E79（blue）、#151310（ink）、#8A4B24（rust）",
    "fonts": [
     "LXGW Marker Gothic",
     "JetBrains Mono",
     "Syne"
    ],
    "radius": "全直角 0",
    "shadow": "只用 drop-shadow（硬边厚度，无模糊投影）",
    "lineWidths": "2 / 3 px",
    "h1Size": "var(--fs-h1)",
    "mechanism": "价目行以 1.5° 整体倾斜，行高 56px、左端起点错开 4 至 12px，描边外线 3.5px 与内线 2px 且留 5% 至 10% 缺口——可读性交给等宽数字，手绘只做外圈。"
   }
  },
  {
   "id": "S10",
   "dir": "S10-grid-versus-sheet",
   "plain": "五栏不等宽对撞，红版压过黑栏",
   "scenes": [
    "B端采购",
    "工程规格"
   ],
   "minItems": 5,
   "minPics": 3,
   "hard": true,
   "dna": {
    "palette": "#F2EFE8（paper）、#17171A（ink）、#D32029（red）、#6E7076（grey）、#B6B4AE（grey-soft）",
    "fonts": [
     "IBM Plex Sans",
     "Jost",
     "IBM Plex Mono"
    ],
    "radius": "全直角 0",
    "shadow": "无阴影",
    "lineWidths": "1.5 / 2 px",
    "h1Size": "clamp(32px, 5.55vw, 80px)",
    "mechanism": "五栏按 6:7:9:8:5 分宽，红版相对黑版固定右下错 1px、进视口时先错 3px 再收到 1.5px，标题基线上移 6px——对比强度由栏宽比与错位像素共同给出。"
   }
  },
  {
   "id": "S11",
   "dir": "S11-samizdat-typewriter",
   "plain": "七层复写纸打的检修手册",
   "scenes": [
    "档案项目",
    "文档工具"
   ],
   "minItems": 8,
   "minPics": 3,
   "hard": false,
   "dna": {
    "palette": "#DCDDD2（paper）、#221E19（ink）、#1B4A4A（copy）、#6E7A64（note）",
    "fonts": [
     "LXGW WenKai TC",
     "EB Garamond",
     "Martian Mono"
    ],
    "radius": "全直角 0",
    "shadow": "只用 inset（凹槽，无外投影）",
    "lineWidths": "1 / 2 / 3 px",
    "h1Size": "clamp(46px, 7.4vw, 106px)",
    "mechanism": ""
   }
  },
  {
   "id": "S12",
   "dir": "S12-lime-knockout-wall",
   "plain": "青柠塑料墙挖七个洞，很吵",
   "scenes": [
    "游戏官网",
    "潮牌快闪"
   ],
   "minItems": 3,
   "minPics": 6,
   "hard": false,
   "dna": {
    "palette": "#1E2A2E（room）、#26353A（room-2）、#182226（room-3）、#B5D626（lime）、#E23E57（magenta）",
    "fonts": [
     "Glow Sans SC",
     "Bricolage Grotesque",
     "JetBrains Mono"
    ],
    "radius": "全直角 0",
    "shadow": "无阴影",
    "lineWidths": "1 / 2 / 8 px",
    "h1Size": "clamp(54px, 6.6vw, 104px)",
    "mechanism": ""
   }
  },
  {
   "id": "S13",
   "dir": "S13-blind-debossed-dispatch",
   "plain": "棉纸公函，条款标题压出凹痕",
   "scenes": [
    "合同审批",
    "公文发布"
   ],
   "minItems": 6,
   "minPics": 3,
   "hard": false,
   "dna": {
    "palette": "#F4E3BE（paper）、#241F17（ink）、#7B612C（gold）、#D6CDB9（shade）",
    "fonts": [
     "Noto Serif SC",
     "DM Mono",
     "EB Garamond"
    ],
    "radius": "全直角 0",
    "shadow": "无阴影",
    "lineWidths": "1 / 2 / 3 / 5.5 px",
    "h1Size": "",
    "mechanism": ""
   }
  },
  {
   "id": "S14",
   "dir": "S14-zero-g-launch-sequence",
   "plain": "舱壁铝箔标贴，十一枚绕一个心",
   "scenes": [
    "开发者工具",
    "基础设施"
   ],
   "minItems": 8,
   "minPics": 3,
   "hard": true,
   "dna": {
    "palette": "（该案未在 :root 声明色变量，需读 CSS 正文）",
    "fonts": [
     "Noto Serif SC",
     "Space Mono",
     "Oswald"
    ],
    "radius": "0 / 50%",
    "shadow": "无阴影",
    "lineWidths": "1 / 2 / 3 px",
    "h1Size": "clamp(44px, 5vw, 72px)",
    "mechanism": ""
   }
  },
  {
   "id": "S15",
   "dir": "S15-fishery-floor-ledger",
   "plain": "三层硫酸纸叠在同一张平面图上",
   "scenes": [
    "地图GIS",
    "专题数据库"
   ],
   "minItems": 9,
   "minPics": 3,
   "hard": true,
   "dna": {
    "palette": "#E7EBE9（paper）、#3A3F45（graphite）、#22282B（press）、#7A7466（pencil）",
    "fonts": [
     "Noto Serif SC",
     "Newsreader",
     "Reddit Mono"
    ],
    "radius": "全直角 0",
    "shadow": "无阴影",
    "lineWidths": "2 / 3 px",
    "h1Size": "clamp(46px, 6.4vw, 92px)",
    "mechanism": ""
   }
  },
  {
   "id": "S16",
   "dir": "S16-velocity-slant-manifesto",
   "plain": "九个词块沿斜线堆叠，速度感",
   "scenes": [
    "创意机构",
    "字体厂商"
   ],
   "minItems": 5,
   "minPics": 3,
   "hard": false,
   "dna": {
    "palette": "#F7EBCF（paper）、#C52C0F（red）、#1A1A1A（ink）、#8E2A18（pressed）、#5C5C55（ink-2）",
    "fonts": [
     "Noto Serif SC",
     "Fragment Mono",
     "LXGW Marker Gothic"
    ],
    "radius": "0 / 50%",
    "shadow": "只用 drop-shadow（硬边厚度，无模糊投影）",
    "lineWidths": "2 / 3 / 6 / 13 px",
    "h1Size": "clamp(46px, 6.2vw, 88px)",
    "mechanism": ""
   }
  },
  {
   "id": "S17",
   "dir": "S17-revenue-stamp-stub",
   "plain": "印花税票对账联，小数点对齐",
   "scenes": [
    "财务对账",
    "票据系统"
   ],
   "minItems": 6,
   "minPics": 3,
   "hard": false,
   "dna": {
    "palette": "#E1D6BD（paper）、#C9BFA6（stub）、#5A2A50（ink）、#3F1A38（ink-deep）、#7A2E2E（seal）",
    "fonts": [
     "文津宋体",
     "Literata",
     "Sometype Mono"
    ],
    "radius": "0 / 50%",
    "shadow": "无阴影",
    "lineWidths": "1 / 2 px",
    "h1Size": "clamp(46px, 6vw, 88px)",
    "mechanism": ""
   }
  },
  {
   "id": "S18",
   "dir": "S18-phosphor-service-deck",
   "plain": "机房墙上挂一条打印纸，磷光绿",
   "scenes": [
    "运维日志",
    "工单系统"
   ],
   "minItems": 10,
   "minPics": 2,
   "hard": true,
   "dna": {
    "palette": "#0A0D0A（bay）、#2FA84F（phos）、#278F43（phos-deep）、#C8C4AE（paper）、#6E6350（tag）",
    "fonts": [
     "Glow Sans SC",
     "Martian Mono",
     "VT323"
    ],
    "radius": "全直角 0",
    "shadow": "无阴影",
    "lineWidths": "1 / 2 / 4 px",
    "h1Size": "clamp(36px,5.3vw,76px)",
    "mechanism": ""
   }
  },
  {
   "id": "S19",
   "dir": "S19-copperplate-herbarium-cabinet",
   "plain": "暖米纸感+抽屉网格，像老书店选品柜",
   "scenes": [
    "咖啡馆",
    "书店",
    "选品店",
    "标本馆"
   ],
   "minItems": 4,
   "minPics": 6,
   "hard": false,
   "dna": {
    "palette": "#E4DECD（paper）、#D8CFB6（paper-deep）、#E9E3D2（paper-lit）、#2A241C（wood）、#3A3227（wood-lit）",
    "fonts": [
     "Noto Serif SC",
     "IBM Plex Mono",
     "Spectral"
    ],
    "radius": "全直角 0",
    "shadow": "只用 inset（凹槽，无外投影）",
    "lineWidths": "1 / 3 px",
    "h1Size": "clamp(46px, 5vw, 72px)",
    "mechanism": ""
   }
  },
  {
   "id": "S20",
   "dir": "S20-plotter-soundfield",
   "plain": "白图纸上针笔单线走位",
   "scenes": [
    "音频设备",
    "测量仪器"
   ],
   "minItems": 6,
   "minPics": 3,
   "hard": true,
   "dna": {
    "palette": "#FAF3E1（paper）、#26485C（blue）、#0F1418（ink）、#55606B（pencil）",
    "fonts": [
     "Noto Sans SC",
     "Martian Mono",
     "Space Grotesk"
    ],
    "radius": "全直角 0",
    "shadow": "无阴影",
    "lineWidths": "1 / 3 px",
    "h1Size": "clamp(40px, 5vw, 72px)",
    "mechanism": ""
   }
  },
  {
   "id": "S21",
   "dir": "S21-interlocking-release-book",
   "plain": "值班台上的联锁释放簿，左右两栏",
   "scenes": [
    "工序依赖",
    "调度排班"
   ],
   "minItems": 9,
   "minPics": 2,
   "hard": true,
   "dna": {
    "palette": "#E4DCC9（paper）、#3E3A34（ink）、#924307（amber）、#6E6A5E（fibre）、#FFFFFF（white）",
    "fonts": [
     "WenJin Mincho",
     "IBM Plex Mono",
     "Antonio"
    ],
    "radius": "未声明",
    "shadow": "只用 inset（凹槽，无外投影）",
    "lineWidths": "1 / 2 px",
    "h1Size": "",
    "mechanism": ""
   }
  },
  {
   "id": "S22",
   "dir": "S22-paper-screen-folded-sheet",
   "plain": "日式纸张对折，安静，适合长文",
   "scenes": [
    "长篇博客",
    "手作品牌",
    "书店"
   ],
   "minItems": 2,
   "minPics": 4,
   "hard": false,
   "dna": {
    "palette": "#DDDAD4（paper）、#2E2A24（ink）、#565B49（matcha）、#6B6558（crease-dark）",
    "fonts": [
     "Zhuque Fangsong",
     "IBM Plex Mono",
     "Petrona"
    ],
    "radius": "全直角 0",
    "shadow": "只用 inset（凹槽，无外投影）",
    "lineWidths": "1 / 3 px",
    "h1Size": "clamp(46px, 5.6vw, 84px)",
    "mechanism": ""
   }
  },
  {
   "id": "S23",
   "dir": "S23-exposed-plaster-chronology-wall",
   "plain": "同一面墙铲开九处，露出不同年份",
   "scenes": [
    "城市更新",
    "口述史"
   ],
   "minItems": 6,
   "minPics": 8,
   "hard": false,
   "dna": {
    "palette": "#DCDCC8（plaster）、#A8206B（carmine）、#241C16（oxide）、#7A6A55（mortar）、#E9E9D7（lime）",
    "fonts": [
     "Noto Serif SC",
     "JetBrains Mono",
     "Alfa Slab One"
    ],
    "radius": "全直角 0",
    "shadow": "无阴影",
    "lineWidths": "1 / 6 px",
    "h1Size": "clamp(56px, 7.2vw, 96px)",
    "mechanism": ""
   }
  },
  {
   "id": "S24",
   "dir": "S24-cyanotype-rainforest-path",
   "plain": "蓝晒法印的雨林叶脉，蓝得发沉",
   "scenes": [
    "科普站点",
    "自然教育"
   ],
   "minItems": 6,
   "minPics": 5,
   "hard": false,
   "dna": {
    "palette": "#E6EDF2（paper）、#F3F8FB（paper-2）、#DCE7EF（paper-3）、#C9D8E4（paper-4）、#0A1116（ink）",
    "fonts": [
     "LXGW WenKai",
     "Spectral",
     "IBM Plex Mono"
    ],
    "radius": "全直角 0",
    "shadow": "无阴影",
    "lineWidths": "1 / 2 px",
    "h1Size": "clamp(36px,5.3vw,76px)",
    "mechanism": ""
   }
  },
  {
   "id": "S25",
   "dir": "S25-spotcolor-contents-zine",
   "plain": "手工装订刊物目录，两专色叠第三色",
   "scenes": [
    "独立杂志",
    "出版书系"
   ],
   "minItems": 5,
   "minPics": 5,
   "hard": false,
   "dna": {
    "palette": "#E8E4DE（paper）、#DFDAD2（paper-deep）、#1E1A16（ink）、#914A27（spot-a）、#2E6B5E（spot-b）",
    "fonts": [
     "Noto Serif SC",
     "Besley"
    ],
    "radius": "50%",
    "shadow": "无阴影",
    "lineWidths": "3 px",
    "h1Size": "68px",
    "mechanism": ""
   }
  },
  {
   "id": "S26",
   "dir": "S26-geometric-collision-columns",
   "plain": "三块硬边色版在斜线上对撞",
   "scenes": [
    "数据看板",
    "方案对比"
   ],
   "minItems": 5,
   "minPics": 3,
   "hard": false,
   "dna": {
    "palette": "#D3D1CA（paper）、#485270（blue）、#121212（ink）、#C8341F（red）、#FFFFFF（white）",
    "fonts": [
     "Noto Sans SC",
     "Syne",
     "IBM Plex Mono"
    ],
    "radius": "全直角 0",
    "shadow": "只用 drop-shadow（硬边厚度，无模糊投影）",
    "lineWidths": "2 / 8 px",
    "h1Size": "clamp(44px,5.6vw,80px)",
    "mechanism": ""
   }
  },
  {
   "id": "S27",
   "dir": "S27-hand-painted-bill-dispatch",
   "plain": "手绘海报当公文用，墨绿与炭黑错位",
   "scenes": [
    "戏剧演出",
    "影展",
    "文化节"
   ],
   "minItems": 5,
   "minPics": 6,
   "hard": false,
   "dna": {
    "palette": "#E8D7B5（paper）、#0E6258（green）、#221C10（ink）、#1A150C（ink2）、#C9BFA6（paper2）",
    "fonts": [
     "LXGW WenKai",
     "Chivo",
     "Martian Mono"
    ],
    "radius": "全直角 0",
    "shadow": "只用 drop-shadow（硬边厚度，无模糊投影）",
    "lineWidths": "未声明",
    "h1Size": "clamp(40px, 6vw, 86px)",
    "mechanism": ""
   }
  },
  {
   "id": "S28",
   "dir": "S28-jazz-intaglio-wall",
   "plain": "唱片封套裁开重拼，暗紫配黑",
   "scenes": [
    "音频设备",
    "音乐产品",
    "限量售卖"
   ],
   "minItems": 8,
   "minPics": 10,
   "hard": false,
   "dna": {
    "palette": "#0B0D12（ink）、#07080C（ink2）、#AF74BE（plum）、#D8D4C6（paper）",
    "fonts": [
     "Noto Serif SC",
     "Instrument Serif",
     "JetBrains Mono"
    ],
    "radius": "全直角 0",
    "shadow": "只用 drop-shadow（硬边厚度，无模糊投影）",
    "lineWidths": "2 / 8 px",
    "h1Size": "clamp(40px, 6.4vw, 92px)",
    "mechanism": ""
   }
  },
  {
   "id": "S29",
   "dir": "S29-wire-bound-safety-manual",
   "plain": "钢丝圈装订的工业规程册",
   "scenes": [
    "工业设备",
    "说明书",
    "售后支持"
   ],
   "minItems": 12,
   "minPics": 3,
   "hard": true,
   "dna": {
    "palette": "#D9D3C4（paper）、#1A1A17（ink）、#644F02（amber）、#5A6068（gray）、#E4B400（bright）",
    "fonts": [
     "Noto Sans SC",
     "Saira Condensed",
     "Martian Mono"
    ],
    "radius": "全直角 0",
    "shadow": "无阴影",
    "lineWidths": "1 / 2 / 3 / 6 px",
    "h1Size": "clamp(40px,5.2vw,75px)",
    "mechanism": ""
   }
  },
  {
   "id": "S30",
   "dir": "S30-skate-sticker-split",
   "plain": "荧光绿贴纸撕成两半，潮流有劲",
   "scenes": [
    "游戏周边",
    "潮牌",
    "快闪活动"
   ],
   "minItems": 4,
   "minPics": 6,
   "hard": false,
   "dna": {
    "palette": "#EDEDED（paper）、#E6E6E6（paper-low）、#007B3F（green）、#00E676（deco）、#141414（ink）",
    "fonts": [
     "Zhuque Fangsong",
     "IBM Plex Mono",
     "Anton"
    ],
    "radius": "全直角 0",
    "shadow": "只用 drop-shadow（硬边厚度，无模糊投影）",
    "lineWidths": "1 / 3 / 6 / 8 px",
    "h1Size": "76px",
    "mechanism": ""
   }
  }
 ]
};
