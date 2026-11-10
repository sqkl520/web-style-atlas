/* 自动生成，勿手改。生成器：prototypes/_prompts/build-prompts.mjs
 * 数据来源：各案 style.css 实测抽取（色值/字体/圆角/阴影/线宽），见 dna-clean.json。
 * 人话版 plain 与场景 scenes 是人工裁定，集中维护在生成器里。
 *
 * 2026-10-26 数据形状变更（读端需知）：
 *   dna.fonts 由数组改成 {display, body, mono} —— 标题字体不再按数组顺序猜，
 *     由 clean-dna 从各案 h1 规则（展开 var()）解析，30/30 与实测一致；
 *   dna.palette 由最多 5 色放宽到最多 7 色，主强调色排在最前（S19/S24 的主色曾被截掉）；
 *   dna.radius 一律是可执行的一句话，不再出现「未声明」「0 / 50%」这类抽取记号；
 *   dna.lineWidths 形如「1px、3px」，不再出现「未声明」。
 */

window.STYLE_PROMPTS = {
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
   "minItems": 6,
   "minPics": 6,
   "hard": false,
   "capacity": {
    "id": "S01",
    "minItems": 6,
    "degrades": "no",
    "minPics": 6
   },
   "dna": {
    "palette": "#EFE7D7（paper）、#C1121F（red）、#1A1614（ink）、#6E6A5E（lead）",
    "fonts": {
     "display": "Noto Sans SC",
     "body": "Noto Sans SC",
     "mono": "Martian Mono"
    },
    "radius": "全直角 0",
    "radiusBare": true,
    "shadow": "无阴影",
    "lineWidths": "1px、3px",
    "h1Size": "var(--fs-h1)",
    "mechanism": "一块实色多边形以 11° 切入 4 栏版心，24px 实体隔条撑开栏沟，红块越界压住 3 行正文——阅读顺序由角度与越界量决定，与它叫什么名字无关。",
    "degrades": false
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
   "minItems": 16,
   "minPics": 5,
   "hard": false,
   "capacity": {
    "id": "S02",
    "minItems": 16,
    "degrades": "yes",
    "minPics": 5
   },
   "dna": {
    "palette": "#B8860B（gold）、#0B0B0F（card）、#EFE6D0（ivory）、#3A2E1A（dirty）、#111111（ink）、#B9B09A（ivory-2）、#14100A（band）",
    "fonts": {
     "display": "Bodoni Moda",
     "body": "Noto Serif SC",
     "mono": "IBM Plex Mono"
    },
    "radius": "全直角 0",
    "radiusBare": true,
    "shadow": "只用 inset（凹槽，无外投影）",
    "lineWidths": "1px、2px",
    "h1Size": "clamp(60px, 7.4vw, 108px)",
    "mechanism": "同一张位图以一条 2px 中轴做 180° 相位取样，两侧各 7 级与 9 级、级差 56px，文字全部贴轴对齐——对称只存在于图样，文字始终不对称。",
    "degrades": true
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
   "minPics": 8,
   "hard": true,
   "capacity": {
    "id": "S03",
    "minItems": 8,
    "degrades": "no",
    "minPics": 8
   },
   "dna": {
    "palette": "#13928E（aurora）、#101A1C（void）、#C9D6CF（paper）、#B9A98C（tape）、#162226（panel）、#0C1417（panel-2）、#2A3639（rule）",
    "fonts": {
     "display": "IBM Plex Mono",
     "body": "IBM Plex Sans",
     "mono": "IBM Plex Mono"
    },
    "radius": "全直角 0",
    "radiusBare": true,
    "shadow": "无阴影",
    "lineWidths": "1px、2px",
    "h1Size": "",
    "mechanism": "一条 264px 宽的纵向刻度轴随滚动固定，右侧 9 栏的高度按 30 秒曝光折成 28px 一档，四角遮罩压掉 32%，游标随焦距比移动——层级由高度与固定位置承担，不由名字承担。",
    "degrades": false
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
   "minItems": 9,
   "minPics": 9,
   "hard": false,
   "capacity": {
    "id": "S04",
    "minItems": 9,
    "degrades": "yes",
    "minPics": 9
   },
   "dna": {
    "palette": "#2F7D4F（green）、#96550F（orange）、#14100C（ink）、#F0E2C8（paper）",
    "fonts": {
     "display": "LXGW WenKai",
     "body": "Redaction 20",
     "mono": "Martian Mono"
    },
    "radius": "全直角 0",
    "radiusBare": true,
    "shadow": "无阴影",
    "lineWidths": "1px、3px",
    "h1Size": "72px",
    "mechanism": "12 列隐网格上，纸块跨 2 至 6 栏、色版偏移取 3 至 7px 五档、旋转限 ±1.2°，页面上没有一条对称边——阅读入口由层叠高低与错位量给出。",
    "degrades": true
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
   "minPics": 6,
   "hard": true,
   "capacity": {
    "id": "S05",
    "minItems": 8,
    "degrades": "yes",
    "minPics": 6
   },
   "dna": {
    "palette": "#4FA83D（paint）、#0E100D（plate）、#BFB9A6（panel）、#8C2F1F（alarm）、#111111（on-paint）、#2A2E28（groove-hi）、#050605（groove-lo）",
    "fonts": {
     "display": "Barlow",
     "body": "Glow Sans SC",
     "mono": "Departure Mono"
    },
    "radius": "全站方角，仅圆形徽标/圆点为 50%",
    "radiusBare": false,
    "shadow": "只用 inset（凹槽，无外投影）",
    "lineWidths": "1px、2px",
    "h1Size": "clamp(46px, 6vw, 88px)",
    "mechanism": "8px 为一个单元，8 块分区按 5:2:1 再加一个双高块分配面积，凹槽 6px 单向受光，读数按 5×7 网格排点——优先级由面积与单元数直接表达。",
    "degrades": true
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
   "minItems": 13,
   "minPics": 7,
   "hard": false,
   "capacity": {
    "id": "S06",
    "minItems": 13,
    "degrades": "no",
    "minPics": 7
   },
   "dna": {
    "palette": "#85572A（brown）、#ECDEC6（paper）、#241A12（ink）、#C9A87C（stain）、#E6D8BC（card）、#E0D0B0（card-2）、#E4D5B8（pale）",
    "fonts": {
     "display": "EB Garamond",
     "body": "Literata",
     "mono": "Martian Mono"
    },
    "radius": "全直角 0",
    "radiusBare": true,
    "shadow": "无阴影",
    "lineWidths": "1px、2px",
    "h1Size": "clamp(46px, 5.6vw, 84px)",
    "mechanism": "卡片沿 3° 斜轨排布，轨道间距 96px、相邻偏移按 0.62 递减，漂移速度为滚动量的 0.6 倍且各卡系数在 0.92 至 1.08 之间不等——顺序由速度差与斜角给出。",
    "degrades": false
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
   "minItems": 46,
   "minPics": 7,
   "hard": false,
   "capacity": {
    "id": "S07",
    "minItems": 46,
    "degrades": "no",
    "minPics": 7
   },
   "dna": {
    "palette": "#33505C（slate）、#E7E7E0（paper）、#1C1A16（ink）、#9A9384（deckle）",
    "fonts": {
     "display": "Libre Franklin",
     "body": "Newsreader",
     "mono": "IBM Plex Mono"
    },
    "radius": "全直角 0",
    "radiusBare": true,
    "shadow": "无阴影",
    "lineWidths": "1px、2px",
    "h1Size": "",
    "mechanism": "同一段文字在纸背以 8% 至 14% 不透明度做镜像并整体偏移 1px，正面 5 栏对背面 7 栏、栏线 0.5px，页码竖排 28px 行高——正反两面同时进入同一张版心。",
    "degrades": false
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
   "minItems": 6,
   "minPics": 4,
   "hard": false,
   "capacity": {
    "id": "S08",
    "minItems": 6,
    "degrades": "yes",
    "minPics": 4
   },
   "dna": {
    "palette": "#120C08（room）、#C46A1F（amber）、#E8DCC8（ivory）、#6B4A22（wall）、#3A2712（wall-deep）、#111111（on-amber）",
    "fonts": {
     "display": "Gloock",
     "body": "Source Serif 4",
     "mono": "Overprint Numerals"
    },
    "radius": "全直角 0",
    "radiusBare": true,
    "shadow": "无阴影",
    "lineWidths": "2px、3px、4px",
    "h1Size": "clamp(44px, 5.4vw, 78px)",
    "mechanism": "六块板按层号各偏移 (24px, 12px)，轮廓侧向拉出 6 至 10px、上缘 2px 高光、滚动 200px 走 6px——深度由层号位移与侧壁宽度两件事同时说明。",
    "degrades": true
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
   "minItems": 10,
   "minPics": 6,
   "hard": false,
   "capacity": {
    "id": "S09",
    "minItems": 10,
    "degrades": "no",
    "minPics": 6
   },
   "dna": {
    "palette": "#1F4E79（blue）、#F5C842（yellow）、#151310（ink）、#8A4B24（rust）",
    "fonts": {
     "display": "LXGW Marker Gothic",
     "body": "LXGW Marker Gothic",
     "mono": "JetBrains Mono"
    },
    "radius": "全直角 0",
    "radiusBare": true,
    "shadow": "只用 drop-shadow（硬边厚度，无模糊投影）",
    "lineWidths": "2px、3px、3.5px",
    "h1Size": "var(--fs-h1)",
    "mechanism": "价目行以 1.5° 整体倾斜，行高 56px、左端起点错开 4 至 12px，描边外线 3.5px 与内线 2px 且留 5% 至 10% 缺口——可读性交给等宽数字，手绘只做外圈。",
    "degrades": false
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
   "minItems": 12,
   "minPics": 6,
   "hard": true,
   "capacity": {
    "id": "S10",
    "minItems": 12,
    "degrades": "no",
    "minPics": 6
   },
   "dna": {
    "palette": "#D32029（red）、#F2EFE8（paper）、#17171A（ink）、#6E7076（grey）、#B6B4AE（grey-soft）",
    "fonts": {
     "display": "Jost",
     "body": "IBM Plex Sans",
     "mono": "IBM Plex Mono"
    },
    "radius": "全直角 0",
    "radiusBare": true,
    "shadow": "无阴影",
    "lineWidths": "1.25px、2px",
    "h1Size": "clamp(32px, 5.55vw, 80px)",
    "mechanism": "五栏按 6:7:9:8:5 分宽，红版相对黑版固定右下错 1px、进视口时先错 3px 再收到 1.5px，标题基线上移 6px——对比强度由栏宽比与错位像素共同给出。",
    "degrades": false
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
   "minItems": 12,
   "minPics": 8,
   "hard": false,
   "capacity": {
    "id": "S11",
    "minItems": 12,
    "degrades": "no",
    "minPics": 8
   },
   "dna": {
    "palette": "#1B4A4A（copy）、#DCDDD2（paper）、#221E19（ink）、#6E7A64（note）",
    "fonts": {
     "display": "EB Garamond",
     "body": "LXGW WenKai TC",
     "mono": "Martian Mono"
    },
    "radius": "全直角 0",
    "radiusBare": true,
    "shadow": "只用 inset（凹槽，无外投影）",
    "lineWidths": "1px、2px、3px",
    "h1Size": "clamp(46px, 7.4vw, 106px)",
    "mechanism": "章号悬挂在版心外 56px、正文压到 34 字行长，标题叠三层重影，横向错位 0.5 / 1.5 / 3px、第三层 12% 不透明——层级由错位量承担，位置交给悬挂编号。",
    "degrades": false
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
   "minItems": 7,
   "minPics": 6,
   "hard": false,
   "capacity": {
    "id": "S12",
    "minItems": 7,
    "degrades": "yes",
    "minPics": 6
   },
   "dna": {
    "palette": "#B5D626（lime）、#1E2A2E（room）、#26353A（room-2）、#182226（room-3）、#E23E57（magenta）、#F2E9D8（face）、#111111（btn-ink）",
    "fonts": {
     "display": "Bricolage Grotesque",
     "body": "Glow Sans SC",
     "mono": "JetBrains Mono"
    },
    "radius": "全直角 0",
    "radiusBare": true,
    "shadow": "无阴影",
    "lineWidths": "1px、2px、8px",
    "h1Size": "clamp(54px, 6.6vw, 104px)",
    "mechanism": "七个挖空块按 3/2/1/1 递减错位落位，斜边只走 45° 与 135°、切角 30px，间隙取 12/28/44px 三级，内侧压 0.5px 翻边——分区靠硬边挖空，不靠投影。",
    "degrades": true
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
   "minItems": 7,
   "minPics": 4,
   "hard": false,
   "capacity": {
    "id": "S13",
    "minItems": 7,
    "degrades": "no",
    "minPics": 4
   },
   "dna": {
    "palette": "#F4E3BE（paper）、#241F17（ink）、#7B612C（gold）、#D6CDB9（shade）",
    "fonts": {
     "display": "EB Garamond",
     "body": "Noto Serif SC",
     "mono": "DM Mono"
    },
    "radius": "全直角 0",
    "radiusBare": true,
    "shadow": "inset 与外投影混用",
    "lineWidths": "1px、2px、3px、5.5px、7px、9px、14.5px",
    "h1Size": "",
    "mechanism": "光源常驻 135° 一侧，凹槽压深 0.4mm、槽带亮度差 3%、边缘对比度 14%，按下时方位角翻到 315° 并下沉 0.8px——层级由同一光源下的深浅给出，不靠颜色。",
    "degrades": false
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
   "minItems": 11,
   "minPics": 10,
   "hard": true,
   "capacity": {
    "id": "S14",
    "minItems": 11,
    "degrades": "yes",
    "minPics": 10
   },
   "dna": {
    "palette": "#C9C4B8、#D8D2C4、#12181D、#E4572E、#8A3320、#111111",
    "fonts": {
     "display": "Oswald",
     "body": "Noto Serif SC",
     "mono": "Space Mono"
    },
    "radius": "全站方角，仅圆形徽标/圆点为 50%",
    "radiusBare": false,
    "shadow": "无阴影",
    "lineWidths": "1px、2px、3px",
    "h1Size": "clamp(44px, 5vw, 72px)",
    "mechanism": "十一个版面块按距质心 24/40/72/120px 分四档、方位角间隔 26° 至 61° 不等，整组沿 48px 半径绕 44% 横位的质心平漂——顺序由半径档位与角度间隔读出。",
    "degrades": true
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
   "minItems": 14,
   "minPics": 6,
   "hard": true,
   "capacity": {
    "id": "S15",
    "minItems": 14,
    "degrades": "yes",
    "minPics": 6
   },
   "dna": {
    "palette": "#3A3F45（graphite）、#E7EBE9（paper）、#22282B（press）、#7A7466（pencil）",
    "fonts": {
     "display": "Newsreader",
     "body": "Noto Serif SC",
     "mono": "Reddit Mono"
    },
    "radius": "全直角 0",
    "radiusBare": true,
    "shadow": "无阴影",
    "lineWidths": "0.5px、0.8px、1px、1.7px、3px",
    "h1Size": "clamp(46px, 6.4vw, 92px)",
    "mechanism": "平面图占 1 至 8 栏并左出血 40px，图例挂 9 至 12 栏、高度只到图幅 62%；同一图叠三层，错位 0/3/7px，第三层 56% 不透明——版本差异靠错位与透明度读出。",
    "degrades": true
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
   "minItems": 9,
   "minPics": 6,
   "hard": false,
   "capacity": {
    "id": "S16",
    "minItems": 9,
    "degrades": "no",
    "minPics": 6
   },
   "dna": {
    "palette": "#C52C0F（red）、#F7EBCF（paper）、#1A1A1A（ink）、#8E2A18（pressed）、#5C5C55（ink-2）",
    "fonts": {
     "display": "LXGW Marker Gothic",
     "body": "Noto Serif SC",
     "mono": "Fragment Mono"
    },
    "radius": "全站方角，仅圆形徽标/圆点为 50%",
    "radiusBare": false,
    "shadow": "只用 drop-shadow（硬边厚度，无模糊投影）",
    "lineWidths": "2px、3px、6px、13px",
    "h1Size": "clamp(46px, 6.2vw, 88px)",
    "mechanism": "所有词块左端对齐同一条 12° 斜线，每块再沿斜线递增 24px，块宽只取 4/6/7/9 栏四档，行高压到 0.95 倍、字距 0.02em——斜线给顺序，块宽与行距给层级。",
    "degrades": false
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
   "minItems": 27,
   "minPics": 5,
   "hard": false,
   "capacity": {
    "id": "S17",
    "minItems": 27,
    "degrades": "no",
    "minPics": 5
   },
   "dna": {
    "palette": "#E1D6BD（paper）、#C9BFA6（stub）、#5A2A50（ink）、#3F1A38（ink-deep）、#7A2E2E（seal）、#B9A98C（rule）、#DFD6BF（tone-hover）",
    "fonts": {
     "display": "Literata",
     "body": "文津宋体",
     "mono": "Sometype Mono"
    },
    "radius": "全站方角，仅圆形徽标/圆点为 50%",
    "radiusBare": false,
    "shadow": "无阴影",
    "lineWidths": "1px、2px",
    "h1Size": "clamp(46px, 6vw, 88px)",
    "mechanism": "两联按 3fr、16px、9fr 分栏，中缝是孔径 1.2px、孔距 6px 的孔列，行高 24px、金额列 96px 右对齐，印面偏中缝 2mm——撕口位置与小数点对齐即读出归属。",
    "degrades": false
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
   "minItems": 20,
   "minPics": 6,
   "hard": true,
   "capacity": {
    "id": "S18",
    "minItems": 20,
    "degrades": "no",
    "minPics": 6
   },
   "dna": {
    "palette": "#0A0D0A（bay）、#2FA84F（phos）、#278F43（phos-deep）、#C8C4AE（paper）、#6E6350（tag）、#111111（ink）",
    "fonts": {
     "display": "Glow Sans SC",
     "body": "Glow Sans SC",
     "mono": "VT323"
    },
    "radius": "全直角 0",
    "radiusBare": true,
    "shadow": "无阴影",
    "lineWidths": "0.8px、1px、2px、4px",
    "h1Size": "clamp(36px,5.3vw,76px)",
    "mechanism": "单列左起 12%、右侧空 34%，24px 行高落在 8px 基线上，两侧 8px 边条按 12px 孔距打 3px 孔，行尾 8×14px 块 530ms 方波——读序由走向给出。",
    "degrades": false
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
   "minItems": 20,
   "minPics": 6,
   "hard": false,
   "capacity": {
    "id": "S19",
    "minItems": 20,
    "degrades": "yes",
    "minPics": 6
   },
   "dna": {
    "palette": "#4A5C3A（green）、#E4DECD（paper）、#D8CFB6（paper-deep）、#E9E3D2（paper-lit）、#2A241C（wood）、#3A3227（wood-lit）、#7C7460（faded）",
    "fonts": {
     "display": "Noto Serif SC",
     "body": "Noto Serif SC",
     "mono": "IBM Plex Mono"
    },
    "radius": "全直角 0",
    "radiusBare": true,
    "shadow": "只用 inset（凹槽，无外投影）",
    "lineWidths": "0.4px、0.8px、1px、3px",
    "h1Size": "clamp(46px, 5vw, 72px)",
    "mechanism": "20 块面板分 5 行，宽取 2/3/4 栏三档，面板高 24px、下移 24px，开口 144px 比内层矮 24px，线宽只 0.4 与 0.8px——层级由下移量与线宽差给出。",
    "degrades": true
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
   "minPics": 6,
   "hard": true,
   "capacity": {
    "id": "S20",
    "minItems": 6,
    "degrades": "yes",
    "minPics": 6
   },
   "dna": {
    "palette": "#FAF3E1（paper）、#26485C（blue）、#0F1418（ink）、#55606B（pencil）",
    "fonts": {
     "display": "Space Grotesk",
     "body": "Noto Sans SC",
     "mono": "Martian Mono"
    },
    "radius": "全直角 0",
    "radiusBare": true,
    "shadow": "无阴影",
    "lineWidths": "0.35px、0.5px、1px、3px",
    "h1Size": "clamp(40px, 5vw, 72px)",
    "mechanism": "画布 1:1、边长取视口高减 96px，留 24px 安全区，坐标格 0.2px 间距 8px，走线 0.35px 按 0.6/1.2/2.4px 三级分档——量级由线距读出。",
    "degrades": true
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
   "minItems": 14,
   "minPics": 6,
   "hard": true,
   "capacity": {
    "id": "S21",
    "minItems": 14,
    "degrades": "no",
    "minPics": 6
   },
   "dna": {
    "palette": "#3E3A34（ink）、#E4DCC9（paper）、#924307（amber）、#6E6A5E（fibre）、#FFFFFF（white）",
    "fonts": {
     "display": "Antonio",
     "body": "WenJin Mincho",
     "mono": "IBM Plex Mono"
    },
    "radius": "全直角 0",
    "radiusBare": true,
    "shadow": "只用 inset（凹槽，无外投影）",
    "lineWidths": "1px、2px",
    "h1Size": "",
    "mechanism": "10 栏中 1–4 与 7–10 栏给两张表，5–6 栏留给 14 枚 24×96px 横条首尾相扣，条间留 1px 纸色缝，右端按 30/45/60° 斜切——先后由切口角度读出。",
    "degrades": false
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
   "minItems": 6,
   "minPics": 6,
   "hard": false,
   "capacity": {
    "id": "S22",
    "minItems": 6,
    "degrades": "yes",
    "minPics": 6
   },
   "dna": {
    "palette": "#565B49（matcha）、#DDDAD4（paper）、#2E2A24（ink）、#6B6558（crease-dark）",
    "fonts": {
     "display": "Petrona",
     "body": "Zhuque Fangsong",
     "mono": "IBM Plex Mono"
    },
    "radius": "全直角 0",
    "radiusBare": true,
    "shadow": "只用 inset（凹槽，无外投影）",
    "lineWidths": "1px、3px",
    "h1Size": "clamp(46px, 5.6vw, 84px)",
    "mechanism": "两半各 6 栏、栏距 22px、外距 56px，中缝 88px 宽于外距，下半页右移 8px、字号 17 与 16.5px，折痕 3px、两端 4px 起毛——分区只靠透光与折痕。",
    "degrades": true
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
   "minItems": 9,
   "minPics": 10,
   "hard": false,
   "capacity": {
    "id": "S23",
    "minItems": 9,
    "degrades": "yes",
    "minPics": 10
   },
   "dna": {
    "palette": "#A8206B（carmine）、#241C16（oxide）、#DCDCC8（plaster）、#7A6A55（mortar）、#E9E9D7（lime）、#5F5240（mortar-ink）、#B7A78C（mortar-lit）",
    "fonts": {
     "display": "Noto Serif SC",
     "body": "Noto Serif SC",
     "mono": "JetBrains Mono"
    },
    "radius": "全直角 0",
    "radiusBare": true,
    "shadow": "无阴影",
    "lineWidths": "1px、6px",
    "h1Size": "clamp(56px, 7.2vw, 96px)",
    "mechanism": "9 处开口按 3/2/2/1/1 递减，断口露 2 至 4 层、层间夹 1px 亮线，62° 斜痕宽 2px、距 6px，右缘 96px 索引条对齐首行——层序由层数与索引高度读出。",
    "degrades": true
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
   "minPics": 6,
   "hard": false,
   "capacity": {
    "id": "S24",
    "minItems": 6,
    "degrades": "no",
    "minPics": 6
   },
   "dna": {
    "palette": "#5D43AD（grape）、#E6EDF2（paper）、#F3F8FB（paper-2）、#DCE7EF（paper-3）、#C9D8E4（paper-4）、#0A1116（ink）、#3A4652（ink-2）",
    "fonts": {
     "display": "Spectral",
     "body": "LXGW WenKai",
     "mono": "IBM Plex Mono"
    },
    "radius": "全直角 0",
    "radiusBare": true,
    "shadow": "无阴影",
    "lineWidths": "0.4px、0.6px、0.8px、1px、2px、2.5px",
    "h1Size": "clamp(36px,5.3vw,76px)",
    "mechanism": "8 栏加中轴，每层各伸 2 栏、最多 4 层，宽比 5:3 且窄侧下沉 24px，支线由 2.5px 递减到 1、0.6、0.4px 并留 2px 缺口——深度由层数与线宽读出。",
    "degrades": false
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
   "minItems": 8,
   "minPics": 5,
   "hard": false,
   "capacity": {
    "id": "S25",
    "minItems": 8,
    "degrades": "no",
    "minPics": 5
   },
   "dna": {
    "palette": "#E8E4DE（paper）、#DFDAD2（paper-deep）、#1E1A16（ink）、#914A27（spot-a）、#2E6B5E（spot-b）、#FFFFFF（paper-white）",
    "fonts": {
     "display": "Besley",
     "body": "Noto Serif SC",
     "mono": ""
    },
    "radius": "全站方角 0；唯一直径 50% 的地方是 1–2px 的打孔圆点，不是圆角卡片",
    "radiusBare": true,
    "shadow": "无阴影",
    "lineWidths": "3px",
    "h1Size": "68px",
    "mechanism": "左 3 右 7 栏、中缝 56px，装订线落中缝右 12px，两版错开 0.8 至 1.6px、相压处相乘出深色，行首按 0/12/24px 缩进——层级由缩进量与版次差给出。",
    "degrades": false
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
   "minItems": 8,
   "minPics": 6,
   "hard": false,
   "capacity": {
    "id": "S26",
    "minItems": 8,
    "degrades": "no",
    "minPics": 6
   },
   "dna": {
    "palette": "#D3D1CA（paper）、#485270（blue）、#121212（ink）、#C8341F（red）、#FFFFFF（white）、#C3C1B9（tint）、#38110E（mul-br）",
    "fonts": {
     "display": "Syne",
     "body": "Noto Sans SC",
     "mono": "IBM Plex Mono"
    },
    "radius": "全直角 0",
    "radiusBare": true,
    "shadow": "只用 drop-shadow（硬边厚度，无模糊投影）",
    "lineWidths": "2px、8px",
    "h1Size": "clamp(44px,5.6vw,80px)",
    "mechanism": "12 栏栏线整体倾 11°，三块色版按 5:3:4 分宽、高 100%/64%/80%，最窄一块再沉 16px，压叠 1.5px 与 1.2px 同向右下——次序由斜角与压叠量给出。",
    "degrades": false
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
   "minItems": 7,
   "minPics": 6,
   "hard": false,
   "capacity": {
    "id": "S27",
    "minItems": 7,
    "degrades": "no",
    "minPics": 6
   },
   "dna": {
    "palette": "#0E6258（green）、#221C10（ink）、#E8D7B5（paper）、#1A150C（ink2）、#C9BFA6（paper2）、#FFFFFF（white）",
    "fonts": {
     "display": "Chivo",
     "body": "LXGW WenKai",
     "mono": "Martian Mono"
    },
    "radius": "全直角 0",
    "radiusBare": true,
    "shadow": "只用 drop-shadow（硬边厚度，无模糊投影）",
    "lineWidths": "1.2px、2.4px、3px",
    "h1Size": "clamp(40px, 6vw, 86px)",
    "mechanism": "9 栏、栏距 20px、基线 7px，正文占 5 栏、签发栏 3 栏、末栏只留边距，两版固定错开 1.8px 向右上，描边共用这一位移——先后由栏宽比与错位方向给出。",
    "degrades": false
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
   "minItems": 12,
   "minPics": 6,
   "hard": false,
   "capacity": {
    "id": "S28",
    "minItems": 12,
    "degrades": "no",
    "minPics": 6
   },
   "dna": {
    "palette": "#AF74BE（plum）、#D8D4C6（paper）、#0B0D12（ink）、#07080C（ink2）",
    "fonts": {
     "display": "Instrument Serif",
     "body": "Noto Serif SC",
     "mono": "JetBrains Mono"
    },
    "radius": "全直角 0",
    "radiusBare": true,
    "shadow": "只用 drop-shadow（硬边厚度，无模糊投影）",
    "lineWidths": "2px、8px",
    "h1Size": "clamp(40px, 6.4vw, 92px)",
    "mechanism": "16 栏、栏距 0、外距 64px，12 块面积不等、最大 7 栏最小 2 栏，裁切边按 4 至 14px 写死值错开并外出血 24px，凸起只在左上——边界由错位与出血量区分。",
    "degrades": false
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
   "minItems": 23,
   "minPics": 6,
   "hard": true,
   "capacity": {
    "id": "S29",
    "minItems": 23,
    "degrades": "yes",
    "minPics": 6
   },
   "dna": {
    "palette": "#644F02（amber）、#D9D3C4（paper）、#1A1A17（ink）、#5A6068（gray）、#E4B400（bright）、#E0DACB（row）",
    "fonts": {
     "display": "Saira Condensed",
     "body": "Noto Sans SC",
     "mono": "Martian Mono"
    },
    "radius": "全直角 0",
    "radiusBare": true,
    "shadow": "无阴影",
    "lineWidths": "0.4px、0.6px、1px、2px、3px、6px",
    "h1Size": "clamp(40px,5.2vw,75px)",
    "mechanism": "左缘 72px 内 3px 穿孔按 18px 间距排一列、1.2px 环线穿过，章节号挂栏外占 48px 宽，规格表下沉 18px 并右出血 96px——归属由编号位与出血方向给出。",
    "degrades": true
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
   "minItems": 10,
   "minPics": 6,
   "hard": false,
   "capacity": {
    "id": "S30",
    "minItems": 10,
    "degrades": "yes",
    "minPics": 6
   },
   "dna": {
    "palette": "#007B3F（green）、#EDEDED（paper）、#E6E6E6（paper-low）、#00E676（deco）、#141414（ink）、#FFFFFF（white）",
    "fonts": {
     "display": "Anton",
     "body": "Zhuque Fangsong",
     "mono": "IBM Plex Mono"
    },
    "radius": "全直角 0",
    "radiusBare": true,
    "shadow": "只用 drop-shadow（硬边厚度，无模糊投影）",
    "lineWidths": "1px、3px、6px、8px",
    "h1Size": "76px",
    "mechanism": "版面沿 −32° 对切成两半，斜切带高 96px、下半错开 9px，缺口宽 6 至 28px、深 2 至 9px，1.5px 白带 55% 至 70%——先后由错位量与深度给出。",
    "degrades": true
   }
  }
 ]
};
