# R2 · 开发 Dev

## 改动清单

| 文件 | 体积 | 内容 |
|---|---|---|
| `build/index.html` | 0.9 KB | 单根 `#app`，7 个外置 `<script src>` 按依赖顺序加载，无内联脚本 |
| `build/css/style.css` | 28.3 KB | 全套设计令牌 + 19 个组件区块，严格对齐美术规范 §2–§7 |
| `build/js/ui.js` | 26.6 KB | 六屏渲染 + 事件绑定（唯一碰 DOM 的层） |
| `build/js/main.js` | 2.2 KB | 启动引导 + 致命错误兜底页 |
| `tools/test-ui.js` | — | UI 冒烟测试（自写最小 DOM shim，20 项断言） |
| `build/js/logic.js` | — | `currentStep(state, index)` 支持按下标取步骤 |
| `build/js/content.js` | — | `resourceMeta` 改为 4 列 |
| `build/js/util.js` | — | `el()` 补 `style` 支持 |

## 关键设计决策

**1. 六屏路由，无框架**
开始 / 决策 / 回声 / 结局 / 档案 / 档案柜 / 成绩卡，直接 `clear(app)` + 重建。
理由：屏幕少、状态简单，引入路由库违反"零依赖"铁律。

**2. 回声不弹窗，就地展开（策划案 §3.3）**
选中选项后：卡片变反白选中态 → 下方就地展开回声块 + 「继续」按钮。
不弹窗、不打断节奏，玩家可以自己决定什么时候继续。

**3. 结算后停留本题（重要 bug 修复）**
`Logic.chooseOption` 会立刻把 `state.step +1`。若直接用新 step 重绘，
会出现**「下一题的问题」配着「上一题的回声」**的错位。
修法：`currentStep(state, index)` 支持按下标取步骤，UI 在 `pendingResult` 时用 `step-1` 重绘本题。

**4. 结局档案解锁做幂等保险**
原本只在「继续」按钮里解锁档案。但最后一步若 `currentStep` 返回 null，
`renderGame` 会直接跳 `renderEnding`，**绕过解锁** —— 真机上表现为档案永远解不开。
修法：`renderEnding` 开头无条件调用一次 `Logic.unlockArchive(ending.archive)`（内部已去重，幂等安全）。

**5. 原生 API 全部可降级**
`saveImageToPhotosAlbum` 缺失时，弹出「当前环境不支持保存，请长按图片或截图」，
而不是静默失败或崩掉。

**6. 视觉落地要点**
- 纸张噪点 `body::before`，`opacity .045` + `multiply`（避坑 §7.2）
- 反白块只有资源面板一处（顶栏 + 主按钮 + 事件条合计远低于屏高 30%）
- 决策卡：上 3px 粗线 + 下 1px 细线 + `3px 3px 0` 硬阴影 + 左侧等宽字母方块
- 号外条：accent 底 + 上下双线 + `translateY(-100%)→0` 砸下
- 结局卡：112px 网点头像位（放姓名首字）+ 套红错位小色块 + 40×2px 红线
- 档案时间轴：方块节点 + 2px 主轴 + 未解锁涂黑条
- 全量包 `prefers-reduced-motion` 降级

## 未做（留给 R3 / R4）

- 档案页的「未解锁涂黑态」只在档案柜做了提示，档案页内部尚未展示涂黑条目
- 四视口真机核对尚未做（CSS 已写媒体查询，需人工看）
- zip 打包
