# 步集 BUJI · 城市漫游 App 原型

> 一步一天，拾起生活，用步数兑换任务，在城市相册地图上积累一张张记录。

## 目录结构

```
BUJI-app/
├── buji.html                    ← 🚀 主入口（双屏轨道 + overlay 容器）
├── discover-page.html           ← 发现页（任务卡片 + 去记录）
├── live-template-camera.html    ← 实时模板相机（波点合成效果）
├── publish-page.html            ← 发布页（草稿图 + 好啦提交）
├── album-map.html               ← 相册地图（步集打卡记录地图）
├── album-map-v2.html            ← 相册地图 v2（对比/备用版）
├── album-page.html              ← 相册列表页
├── 步集-后端PRD-API设计.md       ← 后端模块规划文档
└── assets/
    ├── fonts/momozhuanji.ttf    ← 自定义字体（磨墨篆几）
    ├── album/p1~p8.png          ← 相册地图照片素材
    ├── discover/                ← 发现页图片素材
    └── publish/                 ← 发布页照片素材
```

## 快速启动（本地运行）

```bash
# 克隆仓库
git clone https://github.com/baibaiChen0729/BUJI-app.git
cd BUJI-app

# 启动本地服务器（必须用 HTTP，否则字体/摄像头无法加载）
python3 -m http.server 8765

# 浏览器打开主入口
# http://localhost:8765/buji.html
```

> **不要直接双击打开 HTML**（file:// 协议下字体和相机权限会被浏览器拦截）

## 完整交互链路

```
发现页（任务卡片轮播）
  ↓ 点「去记录」
相机页（实时波点合成效果）
  ↓ 快门 → 「去发布」
发布页（草稿图预览 + 文案输入）
  ↓ 「好啦」
相册地图（打卡记录地图）
  ↓ 下滑
发现页（loop）
```

- **发现页 ↔ 相册地图**：双屏轨道 translateY 滑动动效
- **相机 / 发布**：overlay 覆盖层从底部滑入
- **草稿传图**：localStorage 临时存储，发布完成后清除

## 架构说明

| 文件 | 职责 |
|------|------|
| `buji.html` | 容器：双屏 track iframe + overlay iframe，统一 postMessage 消息路由 |
| `discover-page.html` | 任务卡片轮播（`go(dir)`）+ 路由（`route(msg)`，避免命名冲突）|
| `live-template-camera.html` | Canvas 实时合成 · 取景区波点遮挡 + 遮罩区圆洞露图 |
| `publish-page.html` | 读取 `buji_draft` 草稿图，铺满照片卡 |
| `album-map.html` | 地图打卡页，下滑 postMessage `goDiscover` |

## 核心技术

- **相机合成**：Canvas `drawImage` + clip 路径（circle / teardrop / star / 喵字）
- **固定预览容器**：`430×572` flex 居中，占比滑块不影响下方控件位置
- **无后端依赖**：纯 HTML + JS + CSS，`git clone` 后直接本地跑
