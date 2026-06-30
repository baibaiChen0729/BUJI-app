# 步集 BUJI — 轻量社交打卡 App 原型

> 用波点相机记录每一次出行，在专属地图上留下足迹。

## 页面目录

| 文件 | 说明 |
|------|------|
| `buji.html` | **双屏容器**：发现页 ↕ 相册地图，上下滑动切换 |
| `discover-page.html` | **发现页**：任务卡轮播、去记录入口 |
| `live-template-camera.html` | **波点相机**：实时预览 + 波点遮罩合成 |
| `album-map.html` | **相册地图**：6点位横向环形轮播 |
| `album-page.html` | **相册页**：波点风格照片墙 |
| `步集-后端PRD-API设计.md` | 后端接口设计文档 |

## 快速预览

```bash
# 本地启动静态服务
python3 -m http.server 8765
# 访问 http://localhost:8765/buji.html
```

## 技术亮点

- **波点合成器**：Canvas 离屏渲染 + 圆洞遮罩，实时相机流叠加波点
- **6点位环形轮播**：`wrapS` 算法无限循环，内容动态推入
- **双屏垂直滑动**：postMessage 跨 iframe 通信，CSS transform 平滑过渡
- **纯前端原型**：无需构建工具，单文件即可运行
