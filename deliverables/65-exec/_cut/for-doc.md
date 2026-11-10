## 素材 ①：S13 的 audit 改前 / 改后全文

### 改前（780 字，含污染）

```text
第一，反 C-2.11「24px 圆角加柔和投影的卡片浮起」：全站圆角为 0，所有容器都是直角铅字块，页面没有任何柔和投影，唯一阴影来自单向硬光源；跳脱之处在于层级是纸被压塌形成的凹槽，不是元素被抬起。第二，反 C-1.4 与 C-2.14「Emoji 图标与三等量图标网格」：图标全部是凹凸符号，只有形变没有颜色，且条款条目数量为 7 条与 4 条两段而非 3 / 6 / 9。第三，反 C-1.6「白 / 灰交替分区」：全站只用 #F4E3BE 一种底，分区靠函号与压痕线。第四，反 C-4 与 R-28：本方案不写「极简」这类形容，立体感一律给成 0.4mm 压深、3% 亮度差、14% 边缘对比度三个数。 反套路改造三指标（对齐 02 号文件 8.3 节，供 V-11 / R-40 逐条打勾） - 必须存在 X：单向硬光源方位角常驻 135°（误差 ±10°）；压印深度 0.4mm 等效；纸纤维起伏由程序化噪声生成、亮度幅度 ±2 级、纤维方向偏 12°；阴影只出现在凹槽一侧并带接触阴影。四条缺一即不成立。 - 必须不存在 Y：全站不得出现圆角胶囊按钮（border-radius ≥ 100px 或等价写法）；不得用「内外阴影切换」做按压反馈；不得用两枚对称阴影（如 8px 8px #d1d1d1 配 -8px -8px #ffffff）伪造凸起；全程无墨、无色差、无色彩插值。 - 必须可测量 Z：按下时光源方位角反转量 ≥ 90°（由 135° 翻到 315°），切换时长 120ms（落在 80–200ms 内）；按压下沉 0.8px（落在 0.5–1.5px 内）；压印边缘对比度 14%（≤ 18%）；盲压区与背景亮度差 3%（≤ 6%，该值按纸色 #F4E3BE 与背光侧 #D6CDB9 在凹槽带内 55:45 面积加权算出）。
```

切点：`audit.indexOf('反套路改造三指标') === 307`

### 改后（306 字）

```text
第一，反 C-2.11「24px 圆角加柔和投影的卡片浮起」：全站圆角为 0，所有容器都是直角铅字块，页面没有任何柔和投影，唯一阴影来自单向硬光源；跳脱之处在于层级是纸被压塌形成的凹槽，不是元素被抬起。第二，反 C-1.4 与 C-2.14「Emoji 图标与三等量图标网格」：图标全部是凹凸符号，只有形变没有颜色，且条款条目数量为 7 条与 4 条两段而非 3 / 6 / 9。第三，反 C-1.6「白 / 灰交替分区」：全站只用 #F4E3BE 一种底，分区靠函号与压痕线。第四，反 C-4 与 R-28：本方案不写「极简」这类形容，立体感一律给成 0.4mm 压深、3% 亮度差、14% 边缘对比度三个数。
```

### 被切掉的 474 字符（780 − 306）

```text
" 反套路改造三指标（对齐 02 号文件 8.3 节，供 V-11 / R-40 逐条打勾） - 必须存在 X：单向硬光源方位角常驻 135°（误差 ±10°）；压印深度 0.4mm 等效；纸纤维起伏由程序化噪声生成、亮度幅度 ±2 级、纤维方向偏 12°；阴影只出现在凹槽一侧并带接触阴影。四条缺一即不成立。 - 必须不存在 Y：全站不得出现圆角胶囊按钮（border-radius ≥ 100px 或等价写法）；不得用「内外阴影切换」做按压反馈；不得用两枚对称阴影（如 8px 8px #d1d1d1 配 -8px -8px #ffffff）伪造凸起；全程无墨、无色差、无色彩插值。 - 必须可测量 Z：按下时光源方位角反转量 ≥ 90°（由 135° 翻到 315°），切换时长 120ms（落在 80–200ms 内）；按压下沉 0.8px（落在 0.5–1.5px 内）；压印边缘对比度 14%（≤ 18%）；盲压区与背景亮度差 3%（≤ 6%，该值按纸色 #F4E3BE 与背光侧 #D6CDB9 在凹槽带内 55:45 面积加权算出）。"
```

改后的 306 字是否恰好 = 改前的 slice(0, 307).trimEnd()：**true**
改前 slice(0,307) 的末 3 字符："数。 "（末位是分隔空格）


## 素材 ②：30 案 audit 的 sha256 对照表（全 64 位）

| 案号 | 改前长度 | 改后长度 | 改前 sha256 | 改后 sha256 | 字节不变 |
|---|---:|---:|---|---|---|
| S01 | 292 | 292 | `10b3ca8fa0b9e527f2350b8425ec2812f118c7cab4158c61bd5455ea77ec731e` | `10b3ca8fa0b9e527f2350b8425ec2812f118c7cab4158c61bd5455ea77ec731e` | ✓ 相同 |
| S02 | 337 | 337 | `71d2239cfd89e42bd5604f434d9806f6e7e2cfeb33ec5c58017e2b74015ebe3c` | `71d2239cfd89e42bd5604f434d9806f6e7e2cfeb33ec5c58017e2b74015ebe3c` | ✓ 相同 |
| S03 | 294 | 294 | `5b5121cc7716a2f015d7766e841b3a4cfc1f566439b6df71a6bb9c0c466444eb` | `5b5121cc7716a2f015d7766e841b3a4cfc1f566439b6df71a6bb9c0c466444eb` | ✓ 相同 |
| S04 | 282 | 282 | `5e2b464c837492fb3d2962e4be17a9f92e49c15c30044913ce5240dabcba77fd` | `5e2b464c837492fb3d2962e4be17a9f92e49c15c30044913ce5240dabcba77fd` | ✓ 相同 |
| S05 | 286 | 286 | `4b20cda7f4e8512d77e0d7a0f97a7c2cb46405f9ea87cc52e95af1cfe681d2e1` | `4b20cda7f4e8512d77e0d7a0f97a7c2cb46405f9ea87cc52e95af1cfe681d2e1` | ✓ 相同 |
| S06 | 290 | 290 | `763f768e842c87922524fce00dad56426fd51296f98e3b869257df54e9864a0d` | `763f768e842c87922524fce00dad56426fd51296f98e3b869257df54e9864a0d` | ✓ 相同 |
| S07 | 311 | 311 | `27cb7af267c814a8dca3c635f19f66e07eef31e7d31bb8cb3e568cdf4760bb1c` | `27cb7af267c814a8dca3c635f19f66e07eef31e7d31bb8cb3e568cdf4760bb1c` | ✓ 相同 |
| S08 | 286 | 286 | `e9f76fcfd50a2da14cdb2978f10f2793abf0e2cc5756b51e6bf6ddef4b4bd722` | `e9f76fcfd50a2da14cdb2978f10f2793abf0e2cc5756b51e6bf6ddef4b4bd722` | ✓ 相同 |
| S09 | 293 | 293 | `8a0666a0732b3f38659d1819c615be9f245dced4068db77144ac2be90446d380` | `8a0666a0732b3f38659d1819c615be9f245dced4068db77144ac2be90446d380` | ✓ 相同 |
| S10 | 276 | 276 | `be4b5810ccc7abfc19b78a3574c5e6f08364b2a6cb26ea3c2756571e444c94db` | `be4b5810ccc7abfc19b78a3574c5e6f08364b2a6cb26ea3c2756571e444c94db` | ✓ 相同 |
| S11 | 376 | 376 | `422f675f04234bc2318d94f4deb53705fd9ccb03b9ab462d66338c1793b985be` | `422f675f04234bc2318d94f4deb53705fd9ccb03b9ab462d66338c1793b985be` | ✓ 相同 |
| S12 | 293 | 293 | `43fd072a62a49be391874901cbe37ff577aa1af2bd851a5139ef41d4015292ff` | `43fd072a62a49be391874901cbe37ff577aa1af2bd851a5139ef41d4015292ff` | ✓ 相同 |
| S13 | 780 | 306 | `d9fa07d22af9a7af062ee9903a76349543fcf5482f5a56694ca98a9e2ce75665` | `3fb5ce2daa24387f5947068335090bc5f7a5ce40dbe4a324e4007ce5731ebfd5` | ✗ **变了** |
| S14 | 342 | 342 | `1621fccc055768ac764670c10fbbd6bea67e9ed2f430c12baf22263b58613734` | `1621fccc055768ac764670c10fbbd6bea67e9ed2f430c12baf22263b58613734` | ✓ 相同 |
| S15 | 314 | 314 | `8e999dd89c6efbc002389780d95ca29b87471493ff5f2bab3bfadda6935b2aef` | `8e999dd89c6efbc002389780d95ca29b87471493ff5f2bab3bfadda6935b2aef` | ✓ 相同 |
| S16 | 317 | 317 | `39595df88a4c8bb77c5f0b532dc40dcd37d395af0d0ef580fb252e6adcc4f569` | `39595df88a4c8bb77c5f0b532dc40dcd37d395af0d0ef580fb252e6adcc4f569` | ✓ 相同 |
| S17 | 304 | 304 | `b20828958f05de9771f57121858cb03cb9a0bed3bf04d5379408d5cfa1ba0072` | `b20828958f05de9771f57121858cb03cb9a0bed3bf04d5379408d5cfa1ba0072` | ✓ 相同 |
| S18 | 367 | 367 | `36b7e6c3b1e6689cb186ba534adeec4585e1fa143bfc46a88f16eb24660247a4` | `36b7e6c3b1e6689cb186ba534adeec4585e1fa143bfc46a88f16eb24660247a4` | ✓ 相同 |
| S19 | 324 | 324 | `385371202a34b2a1f4037619e081efeae6fc4df1ace746f922c783e8f29c5d5b` | `385371202a34b2a1f4037619e081efeae6fc4df1ace746f922c783e8f29c5d5b` | ✓ 相同 |
| S20 | 349 | 349 | `85b24f3d5041a70cde54a82820654ee85dbf5864002533f60bed4d2c0ad7acdf` | `85b24f3d5041a70cde54a82820654ee85dbf5864002533f60bed4d2c0ad7acdf` | ✓ 相同 |
| S21 | 327 | 327 | `2d08d72696052393e4617538db1f92efb567a4099adc8efc20628645db4ef824` | `2d08d72696052393e4617538db1f92efb567a4099adc8efc20628645db4ef824` | ✓ 相同 |
| S22 | 371 | 371 | `b484a7facf973b3300961a7543365ba7f2bfa1e41d690b77a9616cb5e6218b68` | `b484a7facf973b3300961a7543365ba7f2bfa1e41d690b77a9616cb5e6218b68` | ✓ 相同 |
| S23 | 299 | 299 | `c1c3f0820e941f7332889d7c88c09f935191e68fb840495caf7a800ccc10a54b` | `c1c3f0820e941f7332889d7c88c09f935191e68fb840495caf7a800ccc10a54b` | ✓ 相同 |
| S24 | 417 | 417 | `2447d5a98964751da7d93fd4a5d663a57aaef5973d95d5a8d15076f944837490` | `2447d5a98964751da7d93fd4a5d663a57aaef5973d95d5a8d15076f944837490` | ✓ 相同 |
| S25 | 363 | 363 | `e41aba9016e367e0476f0901f3a763435197930723161894befbde054e2da0a8` | `e41aba9016e367e0476f0901f3a763435197930723161894befbde054e2da0a8` | ✓ 相同 |
| S26 | 391 | 391 | `26d44d9429756137ae5c92f68ae1c88ad2132a4217ce6f6f1b4ccce642052a5a` | `26d44d9429756137ae5c92f68ae1c88ad2132a4217ce6f6f1b4ccce642052a5a` | ✓ 相同 |
| S27 | 396 | 396 | `f49b26aa18b181f5f5164a3e59897288dd55a5fb8d9456daa782d7e1622244de` | `f49b26aa18b181f5f5164a3e59897288dd55a5fb8d9456daa782d7e1622244de` | ✓ 相同 |
| S28 | 401 | 401 | `142bd0a439b23e031e4ac86bc36d79179b0efc5b0b17e11a64e77f6a6565d1d3` | `142bd0a439b23e031e4ac86bc36d79179b0efc5b0b17e11a64e77f6a6565d1d3` | ✓ 相同 |
| S29 | 417 | 417 | `4fadfe7eee90feed7bc7c54bf69bd1da223cd360e6eac60baed54e1480f53f1c` | `4fadfe7eee90feed7bc7c54bf69bd1da223cd360e6eac60baed54e1480f53f1c` | ✓ 相同 |
| S30 | 444 | 444 | `9ec02fef8cc8cf1edb46e61e0b92652f1ff5f3da872e889ceb9f5a64f896772d` | `9ec02fef8cc8cf1edb46e61e0b92652f1ff5f3da872e889ceb9f5a64f896772d` | ✓ 相同 |

合计：**29/30 相同**；唯一变化的是 S13（预期内）。
audit 总字数：**10539 → 10065**


## 素材 ③：键序变化前后

| 项 | 改前 | 改后 |
|---|---|---|
| `audit` 在 `Object.keys()` 的 index | 14 | 14 |
| `risk` 在 `Object.keys()` 的 index | 15 | 15 |
| 相对顺序 | audit 在 risk 之后？ **false** | audit 在 risk 之后？ **false** |
| 记录里键的总数 | 33 | 33 |
| 键集合是否一致 | — | **true** |

改前 30 案的键序（S01 代表，30 案完全同构）：

```text
id, dir, cn, en, fr, structure, threshold, tone, def, family, fonts, layout, visuals, motion, audit, risk, landing, scenes, quirk, copy, copyParts, bg, primary, buttonText, errorCode, errorCodeSource, palette, built, gate, shots, axes, scenesYes, scenesNo
```

改后 30 案的键序：

```text
id, dir, cn, en, fr, structure, threshold, tone, def, family, fonts, layout, visuals, motion, audit, risk, landing, scenes, quirk, copy, copyParts, bg, primary, buttonText, errorCode, errorCodeSource, palette, built, gate, shots, axes, scenesYes, scenesNo
```

**注意：改前就已经是 audit 在 risk 之前**（idx 14 < 15）。数据层的键序本轮**没有变化**——因为生成器里 `audit:` 那一行本来就写在 `risk:` 上面。本轮在这处只补了注释把两个「位置」说清楚，并把切断接上去。裁决文档 §3.2 说的「audit 在 risk 之后」指的是 **app.js 的渲染串（idx 9 vs 8）**，不是 data.js 的键序。详见交付文档 §「偏离 2」那一节。
