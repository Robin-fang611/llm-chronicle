# R2 · 回测 Regression / Test

## 验证命令

```bash
cd /Users/onebilion/WorkBuddy/模型编年史
node --check build/js/*.js tools/*.js   # 9 个文件全部通过
node tools/lint.js                      # FAIL 0
node tools/test-logic.js                # 28 项通过
node tools/test-ui.js                   # 20 项通过
```

## 结果

| 检查 | 结果 |
|---|---|
| `node --check`（9 js） | ✅ |
| `tools/lint.js`（9 文件：html/css/js） | ✅ FAIL 0 项；WARN 2 项（均为规范允许的 accent 底白字，见下） |
| `tools/test-logic.js` | ✅ 28 / 28 |
| `tools/test-ui.js` | ✅ 20 / 20 |

### WARN 2 项（已人工核对，允许）

```
style.css:415  .btn-danger      { background: var(--accent); color: #FFFFFF; }
style.css:504  .breaking-title  { color: #FFFFFF; }
```
美术规范 §7.8 明确：「禁止任何 `#FFFFFF` 区块（仅 `--accent` 底上的按钮文字例外）」。
两处都是套红底上的文字，符合例外条款，保留。

## 新增：UI 冒烟测试（tools/test-ui.js）

自写最小 DOM shim（不引入任何依赖，符合铁律 §6.5），覆盖全链路：

- 启动与开始页：三张起点卡渲染、CSS 星级方块 5 个、按钮绑定
- 游戏主循环：资源面板 4 列、进度方块 ≥12、选项卡带 `data-option` 且绑了 click
- **选项选定后锁定**（重复点击不推进步骤）
- **自动打完整局**：循环推进直至进入结局页（防死循环 guard 40）
- 结局页：人名 / 判词 / 3 星 / 3 条关键选择回顾 / 三个按钮均已绑定
- 档案页：时间轴条目 ≥4，每条含日期与正文
- 档案柜：11 份档案，未解锁点击弹提示而非崩溃
- 成绩卡：Canvas 绘制不抛错；无原生 API 时保存按钮安全降级
- 规范检查：渲染文本无 emoji、按钮均为 `<button type="button">`、渲染树无内联 `on*` 属性、序号为 A–D

## 失败记录与根因（3 个真 bug）

| # | 现象 | 根因 | 修复 |
|---|---|---|---|
| 1 | 「选中态卡片数 0」 | `chooseOption` 立刻推进 step，导致选中后重绘的是**下一题**，本题的选中态根本没渲染 | `currentStep` 支持 index 参数，UI 用 `step-1` 重绘本题 |
| 2 | 「结局对应档案未解锁」 | 最后一步 `currentStep` 返回 null → `renderGame` 直接跳 `renderEnding`，**绕过 `unlockArchive`**。真机上会导致档案永远解不开 | `renderEnding` 开头幂等解锁一次 |
| 3 | 资源面板 5 列 | `resourceMeta` 给了 5 个，违反美术规范 §4.2 | 改为 4 列，模型代际移到进度条行 |

另有 2 项是**测试脚手架自身缺陷**，非产品 bug：
- shim 的 `matches()` 不支持复合类选择器，`.opt-card.is-selected` 永远查不到 → 已支持 `.a.b`
- lint 的 white 正则误伤 `white-space` → 收紧为只匹配颜色值用法

## 结论

三套测试全绿，允许进入 R3。
