# R1 · 开发 Dev

## 改动清单

| 文件 | 体积 | 内容 |
|---|---|---|
| `tools/lint.js` | — | 静态禁用项扫描：22 条 FAIL 规则 + 2 条 WARN 规则 + HTML 结构检查 |
| `tools/test-logic.js` | — | 逻辑回归：DOM/localStorage shim + 28 项断言 |
| `build/js/util.js` | 8.2 KB | 数值安全、可复现 PRNG(mulberry32)、安全存储、DOM 助手、格式化 |
| `build/js/archives.js` | 21.0 KB | 6 份人物档案 + 4 份反事实档案 + 1 份隐藏《编年史总表》 |
| `build/js/content.js` | 33.6 KB | 3 起点 / 12 决策节点 / 7 事件 / 10 结局 / 常量 |
| `build/js/state.js` | 6.7 KB | 状态机：创建、结算、路径分、flags、counters、序列化 |
| `build/js/logic.js` | 15.3 KB | 流程生成、决策结算、结局判定、存档、档案解锁、成绩卡文案 |

## 关键设计决策

**1. 流程预生成（`Logic.buildFlow`）**
开局即用 seed 生成完整的 `flow` 数组（12 决策 + 最多 3 事件），而非运行时临时决定。
原因：进度条需要准确总数；同 seed 必须完全可复现；测试可稳定断言。

**2. 随机数状态存进 state（`state.rngState`）**
不存闭包，存当前种子值，随取随更新。保证 `toJSON → fromJSON` 后随机序列继续一致。

**3. 结局判定用规则表（`NUM_RULES`）**
12 条数值规则 + flags + counters + path 四类门槛，按 `order` 升序取第一个全满足者。
`cash/compute/team` 类「规模量」乘起点 `gateScale`；`tech/reputation/independence` 是 0-100 比率量，**不缩放**（乘了会越界）。

**4. 回声机制（echo）**
每个选项都带一句真实历史对照，已写进 `content.js` 全部 43 个选项（含事件选项）。这是策划案 §3.3 指定的灵魂设计。

**5. 反白/深色块、emoji、外链**
本轮仅逻辑层，视觉在 R4 统一落地；内容层已自检无 emoji。

## 数值平衡调整（依据测试结果迭代）

- 起点缩放：2017 `resourceScale 1.6 / gateScale 0.7`；2020 `1.0 / 1.0`；2023 `1.2 / 1.2`
- `hassabis` 研究门槛 4 → 3（原组合过窄，随机命中仅 0.1%）
- `yang` To C 投放门槛 2 → 3、团队上限 500 → 400（原 21.6% 过高）
- `liang` 技术门槛 60 → 50（独立度 100 已极难，再卡技术会不可达）
- `moat_gone` 增加 `techMax 59` 与 `cashMax 15`，避免抢走 `yang`
- 大额负向现金流下调：D5_a -18→-14、D7_c -22→-16、D12_a -30→-22、D10_c -8→-5
- `D2_b`、`D9_b` 补 `inc`，让 safety / research 计数有多条达成路径
