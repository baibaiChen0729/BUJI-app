# AlbumMapCarousel · API 参考

零依赖 UMD 库。`<script src>` 后挂载到全局 `AlbumMapCarousel`；CommonJS 下 `require()` 返回构造函数。

---

## 构造函数

```js
new AlbumMapCarousel(options)
```

### options

| 字段 | 类型 | 必填 | 默认 | 说明 |
|---|---|---|---|---|
| `container` | `HTMLElement` | ✅ | — | 舞台容器。必须 `overflow:hidden` 且有明确尺寸（库靠 `clientWidth/clientHeight` 计算居中） |
| `items` | `Array<Item>` | ✅ | — | 照片序列，至少 1 张 |
| `onFocus` | `(item, index) => void` | — | `noop` | 焦点切换回调（中列第一排的图变化时触发） |
| `cardWidth` | `number` | — | `270` | 列宽（卡片宽） |
| `gap` | `number` | — | `18` | 列间距 / 排间距 |
| `baseTop` | `number` | — | `37` | 第一排距容器顶（恒定不变，焦点永远在此高度） |
| `colStart` | `number[]` | — | `[0,87,87,142]` | 各列错落起始 y（长度应 = `numCols`） |
| `numCols` | `number` | — | `4` | 列数（≥3）。可见 3 列，多出的在视口外做轮转缓冲 |
| `panYMax` | `number` | — | `52` | 垂直橡皮筋最大临时位移 |
| `cardRadius` | `number` | — | `20` | 卡片圆角 px |
| `cardShadow` | `string` | — | `'0 0 0 1px #fff, 0 4px 16px rgba(0,0,0,.06)'` | 卡片 box-shadow |

### Item

```ts
interface Item {
  src: string;     // 图片地址（http / 相对路径 / dataURI / blobURL 均可）
  h: number;       // 在 cardWidth 列宽下的显示高度（决定卡片高与错落；图用 object-fit:cover 填充）
  meta?: any;      // 任意业务数据（如 { date, caption }），在 onFocus 里读取
}
```

---

## 实例方法

| 方法 | 返回 | 说明 |
|---|---|---|
| `getFocus()` | `Item` | 当前焦点照片 |
| `getFocusIndex()` | `number` | 当前焦点在 `items` 中的下标 |
| `relayout()` | `void` | 重新布局（容器尺寸变化后调用，如 window resize） |
| `destroy()` | `void` | 解绑所有事件、移除全部卡片 DOM |

### 内部方法（一般无需调用）

| 方法 | 说明 |
|---|---|
| `place(anim)` | 重新摆放所有卡片；`anim=true` 带过渡。含**内容推送**逻辑 |
| `wrapS(s)` | 把列下标 wrap 到 `[-numCols/2, numCols/2)` |
| `colExtra(s)` | 按 `colStart` 线性插值得到该列错落 y |

---

## 交互行为

| 手势 | 行为 |
|---|---|
| **水平拖拽** | 列轮转（连续跟手）；松手 → 惯性滑行 + 吸附到整列 |
| **垂直拖拽** | 橡皮筋（`tanh` 限幅 `panYMax`）；松手必回弹 0，第一排距顶始终 = `baseTop` |
| **列轮出视口外** | 触发**内容推送**：该列换成 `items` 里的下一张（循环），用户看不到突变 |
| **焦点变化** | 中列第一排的图改变 → 回调 `onFocus(item, index)` |

---

## 数学模型（便于二次开发 / 移植）

```
视觉列槽   s   = wrapS(col - centerCol - rotation)        // 居中、循环
卡片 x         = stage.clientWidth/2 - cardWidth/2 + s*COL_STEP
卡片 y         = baseTop + colExtra(s) + rowYOffset + panY
rowYOffset     = row===0 ? 0 : (同列第一排图高 + gap)        // 第二排错落叠加
焦点 item      = argmin( |s|*2 + row )                      // s≈0 且 row0
内容推送       = 当 |s - 上一帧s| > 1.5（即刚 wrap）→ 换 items[nextC++ % N]
```

- **COL_STEP** = `cardWidth + gap`
- **centerCol** = `floor((numCols-1)/2)`
- 垂直锁定：`panY = panYMax * tanh(dy/160)`，松手 `panY += (0-panY)*0.2`

---

## 完整示例

见 [`../assets/demo-minimal.html`](../assets/demo-minimal.html)（内置 SVG 占位图，双击即可在浏览器跑）。

```js
const carousel = new AlbumMapCarousel({
  container: document.getElementById('stage'),
  items: photos.map(p => ({ src: p.url, h: 360, meta: p })),
  onFocus: (item) => {
    dateEl.textContent = item.meta.date;
    captionEl.textContent = item.meta.caption;
  },
  numCols: 4,
  cardWidth: 270,
});

window.addEventListener('resize', () => carousel.relayout());
// 页面卸载：carousel.destroy();
```

---

## 注意事项

1. 容器**必须** `overflow:hidden`，否则轮转出去的卡片会溢出可视区。
2. `items[].h` 决定错落，建议按真实照片比例设置（如 270 宽常配 330~405 高）。
3. 照片再少也能无限滑：展示位 = `numCols×2`，轮出时按 `items` 顺序循环推送。
4. 移植到小程序 / RN / 原生：复用上方「数学模型」，事件层换成对应平台手势 API。
