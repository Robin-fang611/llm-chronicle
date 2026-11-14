# 自主开发提示词 · 《大模型编年史 · 创业模拟器》5 轮强化循环

> 本文件是**自包含**的无人值守开发指令。执行者（自主智能体）必须**严格按本文件**推进，全程不向人类提问、不等待、不中断。目标：在约 2 小时内，通过 5 轮「审核→开发→回测→讨论」连续循环，产出一个**完整、无 bug、可流畅运行**的离线 H5 游戏。

---

## 0. 角色与总目标

你是《大模型编年史 · 创业模拟器》的**唯一开发者**。这是一款挂载在小红书笔记里的**纯离线 H5 小工具**（单页、移动端竖屏优先）。

总目标：交付一个玩家从 2017 年白手起家、做决策、管资源、一路经营到 2026 年、最终拿到"你成为了 XXX"结局卡，并能生成成绩卡分享的完整游戏。**必须完整、无 bug、流畅**。

你**不能**假设玩家有任何 AI 知识，所有文案必须翻译成"人话"。

---

## 1. 设计依据与对齐（必读，解决两份文档的概念冲突）

执行本任务前，**先读取**以下源文件获取完整上下文（它们与你同工作区）：
- `/Users/onebilion/WorkBuddy/模型编年史/策划案-v2.md` ← **内容权威源**（完整 12 决策树 + 六条人物路径真实历史档案 + 结局库 + 事件库 + JSON 数据结构）
- `/Users/onebilion/WorkBuddy/模型编年史/美术设计规范-v1.md` ← **视觉权威源**（Newsprint Dossier 旧报纸 × 机密档案风）

> `策划案-v1.md` **已废弃**（其"答题攒卡 + 合成"玩法已被用户明确否决，原话"这个很烂"）。
> 仅在 v2 未覆盖时，参考 v1 的「小白友好三铁律」作为文案原则。
> **任何时候都不要实现 v1 的答题/合成/图鉴玩法。**

### 1.1 两份文档的冲突与最终对齐（关键决策，按此执行）

两份文档描述的是**两种不同玩法**：
- 策划案 → 答题攒卡 + 合成模型 + 图鉴（知识收集类）。
- 美术规范 → 决策卡 + 资源经营（资金/算力/团队/声誉）+ 结局 + 档案时间轴（创业模拟类）。

**最终对齐方案（已替用户决策，用户回来可改）：**
- **玩法方向**：以美术规范的「创业模拟器」为权威——核心循环 = 决策卡消耗算力/资金 → 推进时代 → 资源管理 → 随机事件（号外）→ 结局判定 → 档案解锁 → 成绩卡分享。
- **内容素材**：**以 `策划案-v2.md` 为准，直接用，不要另起炉灶**。v2 已给出全部可落地内容：
  - **§4 完整决策树**：12 个决策节点，分三幕（立业 4 / 押注 5 / 决胜 3），每个节点 2-4 个选项，含 effects 与 path 倾向分
  - **§5 六条人物路径**：Altman·OpenAI / Dario·Anthropic / 杨植麟·月之暗面 / 梁文锋·DeepSeek / LeCun·Meta开源 / Hassabis·DeepMind，每份含 10–20 条**已核实**的真实时间线（含具体金额、参数、日期）
  - **§6 失败与平庸结局** 4 个，每个附"反事实历史"文案
  - **§3.4 随机事件库**：ChatGPT 爆火 / Llama 泄露 / 董事会政变 / FTX 暴雷 / DeepSeek 降价 / 芯片管制 / 万亿参数军备
  - **§3.1 五资源**（资金/算力/团队/声誉/模型代际）+ §8 数值量级与难度调节
  - **§11 JSON 数据结构**：starts / nodes / events / endings / archives，直接照此建 `js/content.js`
  - **§3.3 回声机制 echo**：每个选项附一句真实历史对照（如"2019 年的 OpenAI 也站在这里"），务必实现——这是本作的灵魂
- 小白文案原则（沿用 v1 三铁律）：不考数字、不考术语、每个专业词首次出现必须给一句人话解释。
- **视觉**：100% 遵循美术规范的 Newsprint Dossier（旧报纸 × 机密档案）风格、色板、组件、动效、避坑清单。

### 1.2 产物形态（硬性）

- 最终产物是一个 `.zip`，**`index.html` 必须在 zip 根目录**（压缩目录内容，不能多套一层）。
- 纯离线：禁止 fetch / CDN / 外链图片 / 外链字体；所有资源打进包。
- 脚本 CSP：禁止内联 `<script>`、`onclick=`、`eval`、`new Function`、`type="module"`、`import/export`（**允许**在游戏 JS 末尾用 `if (typeof module!=='undefined' && module.exports) module.exports = X` 以便 node 测试）。
- 脚本写法：JS 全部外置 `.js`，用 `addEventListener` 绑事件；多文件按顺序 `<script src>` 加载，挂到 `window` 命名空间。
- 样式：`<style>` 内联可用；图形只用纯 CSS + 内联 SVG（含 `feTurbulence` 噪点 data-uri），**禁止任何位图 PNG/JPG**。
- 存储：localStorage 可用（读写必须 try/catch）。
- 原生 API：仅 `postNote` / `saveImageToPhotosAlbum` / `openRedPage` / `writeTempFile` 四个，且必须可安全降级（缺失时不崩）。
- 禁用：Worker、Service Worker、WebSocket、geolocation、clipboard、`window.open`、iframe、WASM。
- 体积：上限 10MB，**目标 ≤ 2MB**（纯 CSS+SVG 预期 < 500KB）。
- 跨端：移动竖屏 375–430px 优先；PC 模拟器兜底；安全区用 `env(safe-area-inset-*, 0px)`。

### 1.3 视觉规范速查（完整版见美术规范，执行时务必对照）

- 底色纸黄 `#EAE3D2`（主背景），纸张 4 档 `--paper-0..3`；墨色 `#1A1815`；套红 `#B23A2E`（主强调/失败）；success `#3F6B45`；info `#33566E`；gold `#A8801F`；warn `#C77B22`。
- 字体栈：正文 sans、展示体宋体（`Songti SC` 降级 serif）、数字等宽；**禁止 @font-face / woff**。
- 全局基线：圆角 0–2px、零模糊硬阴影、边框 ≥1px 实线；反白块（顶栏+主按钮+事件条）合计 ≤ 屏高 30%。
- 组件：决策卡（序号方块+上下双线+硬阴影+选中反白）、资源面板（sticky 反白报头，资金/算力/团队/声誉 4 列）、结局卡（人物专访版式+星级印章）、档案时间轴（方块节点+涂黑条解锁）、进度指示（报纸页眉+方块条）、按钮/弹窗（硬阴影+顶部红条）、号外事件条（一局 ≤ 3 次）。
- 动效只许 `transform`/`opacity`/`clip-path`；包 `prefers-reduced-motion` 降级。
- **绝对禁止 emoji**（图标一律内联 SVG 或 CSS 几何）。
- 验收清单见美术规范 §8（断网可玩、0 报错、0 外链、对比度、4 视口、减弱动效可通关、zip ≤ 2MB）。

---

## 2. 交付物结构

在 `/Users/onebilion/WorkBuddy/模型编年史/` 下建立：

```
build/                      # 游戏本体，index.html 在根
  index.html
  css/style.css
  js/util.js                # 工具：校验、DOM 助手、安全存储
  js/content.js             # AI 史实数据（5 时代/模型/人物/技术/决策/结局）挂 window.Content
  js/state.js               # 游戏状态机（纯逻辑，node 可测）挂 window.State
  js/logic.js               # 核心规则：决策结算/资源/时代推进/结局/存档 挂 window.Logic
  js/ui.js                  # DOM 渲染 + 事件绑定（仅此层碰 DOM）
  js/main.js                # 启动引导
progress/                   # 每轮审计日志（给用户看）
  round1-review.md ... round5-retro.md
  FINAL.md
tools/
  lint.js                  # 静态禁用项扫描（node 跑）
  test-logic.js            # 逻辑回归测试（node 跑，带 DOM/localStorage shim）
大模型编年史.zip            # 最终产物（build/ 内容打进根）
```

---

## 3. 完成定义（Definition of Done）—— 必须**全部**满足才算完成

1. `node tools/lint.js` 全绿：无 fetch/http(s) 外链、无 @font-face/woff、无 inline script/onclick/eval/new Function/type=module/import/export、无 Worker/SW/WebSocket/geolocation/clipboard/window.open/iframe/WASM、无 emoji、无 `#fff`/`white` 区块（accent 底按钮文字除外）。
2. `node --check` 每个 `.js` 通过；`node tools/test-logic.js` 全绿。
3. 逻辑测试覆盖：初始化→5 个时代全部可达→决策结算数值正确（资源不为负、不 NaN）→随机事件触发且不崩→结局唯一判定→档案解锁→存档写读一致→成绩卡 Canvas 生成函数不抛错。
4. 断网可玩：任何交互不产生控制台报错、不发起网络请求。
5. 四视口（375/390/430/PC 模拟器）布局不塌陷（静态核对 CSS 与安全区）。
6. 开启「减弱动态效果」仍可完整通关（逻辑不依赖动画）。
7. `大模型编年史.zip` 存在且 `index.html` 在根，包体 ≤ 2MB。
8. 文案全部"人话化"，零 AI 前置知识可上手。

**未满足任一条，不得宣布完成。** 若 5 轮结束仍有未解项，在 `FINAL.md` 明确列"未解决项 + 建议"，**不得谎称完成**。

---

## 4. 五轮循环方法论（核心，严格执行）

总时间预算约 2 小时，5 轮；**每轮都要花真功夫，不得抢跑或草草收尾**。每轮结构：

### (a) 审核 Review
- 读取当前 `build/` 全部代码与上一轮日志。
- 运行 `node tools/lint.js` 与 `node tools/test-logic.js`，记录所有缺陷/风险。
- 列出本轮要修/要做的清单，写入 `progress/roundN-review.md`。

### (b) 开发 Dev
- 修复缺陷 + 实现本轮切片（见 §5 切片规划），**最小代码、匹配现有风格**。
- **严禁范围蔓延**：不引入后端/账号/真排行/多人/任何依赖。
- 进度写入 `progress/roundN-dev.md`。

### (c) 回测 Regression / Test
- 重跑 lint + logic 测试；**必须全绿才允许进入讨论**。
- 若失败：在本轮内回到 Dev，最多重试 3 次；3 次仍失败则在 `roundN-test.md` 明确卡点与根因，带问题进入下一轮继续攻。
- 记录 `progress/roundN-test.md`。

### (d) 讨论 Discussion / Retro
- 简短自评：本轮改善了什么、剩余风险、下轮重点。
- 判定"游戏是否已完整且流畅"——**只有第 5 轮且 DoD 全过，才允许结束**；否则带着明确目标进入下一轮。
- 记录 `progress/roundN-retro.md`。

**节奏**：每轮约 20–25 分钟等效深度工作量；宁可慢、不可漏。绝不提前宣布 done。

---

## 5. 五轮切片规划（建议，可据实际调整但不得砍掉 DoD）

- **R1 地基**：建目录/脚手架；写 `content.js`（5 时代+模型/人物/技术数据，先覆盖主线）、`state.js`、`logic.js` 核心状态机；`util.js` 安全存储与校验；`lint.js`/`test-logic.js` 先就位并跑通空壳。
- **R2 核心循环**：决策卡渲染+结算（资金/算力/团队/声誉）、时代推进、资源面板、进度指示；逻辑测试补"一局通关"路径。
- **R3 内容与事件**：填满 5 时代决策场景文案（小白友好）、号外随机事件（≤3/局）、结局判定（多类 titan 结局）、档案时间轴解锁。
- **R4 表现层打磨**：严格落地美术规范（色板/组件/硬阴影/字体/噪点/安全区/无 emoji）；结局卡+成绩卡 Canvas 分享；动效仅 transform/opacity + reduced-motion 兜底。
- **R5 收口与精修**：四视口核对、`zip` 打包（index.html 在根）、断网验证、DoD 全量复检、性能/异常兜底、写 `FINAL.md`。

---

## 6. 严格限制 / 铁律（不可违反，违反即回退）

1. 零外部资源：无 fetch/CDN/外链图/字体/woff；所有资源本地生成。
2. 脚本禁令（游戏文件内）：无 inline `<script>`、`onclick=`、`eval`、`new Function`、`type="module"`、`import/export`。node 测试用的 `module.exports` 守卫除外。
3. 禁用 Worker/SW/WebSocket/geolocation/clipboard/`window.open`/iframe/WASM。
4. 原生 API 仅 4 个且可降级；不调用未声明 API。
5. 不引入任何 npm/CDN 依赖；纯原生 JS+CSS+内联 SVG。
6. 不联网下载任何东西。
7. 不扩大范围到后端/账号/真排行/多人/社交后端。
8. **不得为"通过"而吞异常或降级安全性**（如 `catch{}` 空吞、偷偷放宽校验）。错误必须显式处理或上报。
9. 全程**不向人类提问、不等待、不中断**；遇歧义按最合理方案推进并在日志注明。
10. 不修改/删除 `.workbuddy/` 目录与两份源文档；只在 `build/ progress/ tools/` 内新建/修改。
11. 每个文件最小必要代码，遵循美术规范风格（无既有风格时按其建立）。
12. 所有用户交互数据校验空值/类型/长度；localStorage 读写包 try/catch。
13. 全程使用当前已配置模型（混元3），不升档、不开其它模型口子。

---

## 7. 测试与回测方法（无浏览器也能 regression）

- `tools/lint.js`（node）：扫描 `build/` 下所有 html/js/css，按 §6 禁用清单正则匹配，输出 pass/fail 与命中行号。
- `tools/test-logic.js`（node）：用最小 DOM + localStorage shim（`global.window`、`global.document` 桩、内存版 localStorage）加载 `build/js/logic.js` 等，模拟一局完整通关：初始化 → 5 时代推进 → 随机事件 → 资源变化 → 结局判定 → 档案解锁 → 成绩卡生成。断言关键不变量：
  - 资源永不为负/NaN；
  - 5 个时代均可达且可通关；
  - 结局判定唯一且覆盖所有分支；
  - 存档写后再读状态一致；
  - 成绩卡生成函数不抛错。
- 每个 `.js` 跑 `node --check`；HTML 做基础结构检查（有 `<meta viewport>`、`<script src>` 顺序、单根 `#app` 容器等）。
- 每轮 (c) 回测步骤必须运行以上并全绿。

---

## 8. 内容数据（来自策划案，需落地为结构化 JSON 挂 window.Content）

- 5 个时代（2017–2026）及每时代主题/可走支线/算力预算（按策划案 §6）。
- 模型/人物/技术数据（按策划案 §5 卡片 JSON 结构：`id/type/name/plain/detail/year/branch/rarity`，`plain` 必有人话说明）。
- 决策场景文案需小白友好（参考策划案 §7 原则：不考数字/术语、带人话解析），把"选择题"改写为"经营决策 + 后果标签"。
- 结局卡（几类 titan 结局，参考美术规范 §4.3 人物专访版式）。
- 排行榜：离线用「虚拟同期群（100 名预设对手，正态分布）+ 本地最佳 + 成绩卡分享」三方案（策划案 §8），不接后端。

---

## 9. 收尾

5 轮结束且 DoD 全过 →
- 用 `cd build && zip -r ../大模型编年史.zip .` 生成 zip（确保 index.html 在根）。
- 写 `progress/FINAL.md`：产物路径、DoD 核对表（逐条 ✅/❌）、已知风险（无则写"未发现已知风险"）、本地验证步骤（断网双击 `build/index.html` 或解压 zip 后打开）。
- 若 5 轮后仍有关键缺陷：在 FINAL.md 明确"未解决项 + 根因 + 建议"，不得谎称完成。

---

## 10. 风格与日志

- 中文注释与日志，结论清晰；进度日志写"结果→改动→原因→验证→风险"。
- 每轮日志让用户回来可审计（他们偏好可自查证据）。
- 不寒暄、不解释无关内容，专注把游戏做完整、做稳、做精致。
