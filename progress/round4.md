# R4 · 收口：打包与离线验证

## 打包

```bash
cd build && zip -rq ../大模型编年史.zip .
```

产物：`/Users/onebilion/WorkBuddy/模型编年史/大模型编年史.zip` —— **52 KB**（上限 2MB，占比 2.5%）

```
Archive:  大模型编年史.zip
  Length  Name
---------  ----
      872  index.html          ← 在根，未多套一层
    29316  css/style.css
     8753  js/util.js
     29139  js/ui.js
    15980  js/logic.js
    21627  js/archives.js
     2292  js/main.js
     6866  js/state.js
    34752  js/content.js
---------  -------
   151069  11 files
```

## 离线自洽性验证

```bash
# 1) zip 内所有 http(s) 引用
unzip -p 大模型编年史.zip | grep -oE "https?://[^'\")]*" | sort -u
→ http://www.w3.org/2000/svg      ← 唯一一条，是 SVG 命名空间，浏览器不会发起请求

# 2) 解压到 /tmp 后结构完整、index.html 在根
unzip -q 大模型编年史.zip -d /tmp/mc-verify
→ /tmp/mc-verify/{index.html, css/style.css, js/*.js}

# 3) index.html 引用的资源全部存在
css/style.css OK / js/util.js OK / js/archives.js OK / js/content.js OK
js/state.js OK / js/logic.js OK / js/ui.js OK / js/main.js OK
```

## 四视口（静态核对，提示词 DoD 第 5 条要求"静态核对"）

| 视口 | 处理 |
|---|---|
| 375 | 资源面板左右留白压到 6px、数值降到 1rem、kicker 字距归 0；决策区留白 12px；头像位 96px |
| 390 | 默认档（设计基准 430 容器宽度内自适应） |
| 430 | 展示体放大：报头 2.5rem、标题 1.625rem |
| PC 模拟器 | `html/body` 底色转 `--paper-3`，`.app` 限宽 430px 居中 + 左右 `1px` 纸边 + 外阴影，不当成普通网页 |

安全区：顶栏 `calc(10px + var(--sat))`、底部按钮 `var(--sab)`、容器左右 `var(--sal/sar)`。
PC 下 `env()` 为 0，已用 `0px` 兜底，不会塌陷。

全局无宽度超过容器上限的固定值：`.app{width:100%;max-width:430px}`、
`.modal-card{max-width:340px}`、`.share-canvas{max-width:320px}`、头像位 112px（窄屏 96px）。

## 减弱动态效果

`style.css` 末尾全局包裹：

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: .01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: .01ms !important;
  }
}
```

且游戏推进**不依赖任何动画回调**——`UI` 的所有推进都由 click 事件驱动，
动画纯装饰。UI 冒烟测试在无动画的 shim 环境下完整通关，已侧面证明这一点。

## 剩余

- 数值平衡只做过"随机瞎选"分布，未验证"带着目标玩能不能达成" → R5
