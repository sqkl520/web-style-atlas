# 22 — Lead 核实：Chrome 无头截图的 `--window-size` 在窄档不可信

> 来源：两个独立模板作者（M01、M02）各自报出同一条坑，我用探针页亲自复核，**确认成立**。
> 这条**推翻了我此前所有基于 `--window-size=390,844` 的 390 档验收**，也影响我派出去的三个视觉审查 agent。

## 一、事实与复现

```powershell
# 探针页只做一件事：把 innerWidth 写进 DOM
& 'C:\Program Files\Google\Chrome\Application\chrome.exe' --headless=new --disable-gpu --no-sandbox `
  --hide-scrollbars --force-device-scale-factor=1 `
  "--screenshot=w390.png" --window-size=390,844 "file:///D:/Web/style/_vw-probe.html"
```

**实测结果（我读的截图原文）：**

```
innerWidth=500   innerHeight=844   screenW=800   dpr=1
mq500=true       mq390=false
```

PNG 文件本身是 **390×844**，但它**不是 390px 布局的截图**——它是 **500px 布局的左侧 390px 裁切**。
`matchMedia('(max-width:500px)')` 为 true，`(max-width:390px)` 为 false，**说明 CSS 断点走的是 500px 那一档**。

**为什么：** Windows 上 Chrome 有**最小窗口宽度约 500px**的限制，`--headless=new` 与 `--headless=old` 都一样。窗口被顶到 500，而 `--screenshot` 仍按你给的 390 宽输出，于是右边 110px 被切掉。

**附带一条（M01 实测）**：`--window-size=768,1024` 也会丢约 16px 边框，实际 `innerWidth=752`。

## 二、这条错误会制造什么"假故障"

用这条命令看 390 档，你会看到**不存在的缺陷**：

| 看到的 | 真相 |
| --- | --- |
| 主按钮文字被截断 | 500px 布局的按钮宽于 390，被裁切了 |
| 汉堡菜单不见了 | 菜单在 500px 断点下还没折叠，它在画面右侧之外 |
| 某元素"横向溢出" | 是裁切造成的视觉假象，`scrollWidth == clientWidth` |
| 字号看起来太大／太小 | 断点走的是 500 那一档，不是 390 那一档 |

**识别判据（不用探针页也能判断）：** 量截图里的内边距。若 `4vw` 算出 20px（＝500 宽）而不是 16px（＝390 宽），就是被最小窗宽顶住了。

## 三、正确做法

**用 CDP 的 `Emulation.setDeviceMetricsOverride`**，它精确设置视口而不受窗口尺寸限制。
工作区里**已经有零依赖的实现**：`tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs`（用 Node 22+ 自带的 WebSocket，不需要 puppeteer）。
两条独立佐证：M01 的 `_m01-test/probe-m01.mjs` 与 M02 的 `_m02-test/probe.mjs` 都改用 CDP 后，`innerWidth` 精确等于 390/768/1440。

**已知可靠的替代路径**：`prototypes/_build/render-scheme.mjs`（走 `inspect.mjs`，而 `inspect.mjs` 用的就是 CDP Emulation）——**所以 30 个原型那批渲染截图在 390 档是可信的**，受影响的只有我手工用 CLI 截的那些。

## 四、受影响的范围（必须更正）

| 事项 | 是否受影响 |
| --- | --- |
| 30 个原型的 `.inspect/` 截图与 `report.json` | **不受影响**——走的是 CDP Emulation |
| 我手工用 CLI 给三个模板做的 390 档验证 | **受影响，结论作废**，须用 CDP 重做 |
| 我派出去的视觉审查批次 1（S01–S10） | **受影响**——我明确让它用 `--window-size=390,844`，它的 390 档发现要打折看 |
| 视觉审查批次 2、3（尚未派出） | 提示词须改成 CDP |
| 三个模板作者各自的 390 实测 | M01/M02 **已自行改用 CDP**，可信；M03 待查 |

## 五、给后续所有人的三条硬要求

1. **窄档（≤768）验收一律用 CDP Emulation，不要用 `--window-size`。** 1440 档用 CLI 没问题（1440 > 最小窗宽），但 768 与 390 都会失真。
2. **看到"390 档横向溢出"，先用 CDP 复量 `scrollWidth == clientWidth` 再下结论**，否则会把裁切当成缺陷。
3. **SVG 里用 CSS 的 px 字号是 viewBox 用户单位，会随容器缩放。** 同一张 `viewBox="0 0 1200 …"` 的图，在 1440 桌面是 20px 字，到 390 手机只剩约 6px——那不是"小一号"，是**不可读**。内联 SVG 图表要么给窄屏另设字号并允许容器内横向滚动，要么换一套窄屏专用图形。（这条也是 M01 报的，我未独立复核，但与 SVG 规范一致。）
