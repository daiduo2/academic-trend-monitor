<!-- docs/geb/frontend/README.md -->
@geb-node #frontend
@mirror ./frontend/src/
@loop #architecture
@invariant "Component tree matches actual code"
@invariant "Props interfaces documented"
@emerge "update on component change"

# 前端架构

## 技术栈

| 技术 | 用途 | 版本 |
|------|------|------|
| React | UI 框架 | 18.x |
| Vite | 构建工具 | 4.x |
| D3.js | 可视化 | 7.x |
| React Router | 路由 | 6.x |

## 目录结构

```
frontend/
├── src/
│   ├── components/     # React 组件
│   │   ├── TopicTree/  # 主题树可视化
│   │   ├── TrendChart/ # 趋势图表
│   │   └── Heatmap/    # 热力图
│   ├── hooks/          # 自定义 Hooks
│   ├── utils/          # 工具函数
│   ├── types/          # TypeScript 类型
│   └── App.tsx         # 入口组件
├── public/             # 静态资源
└── package.json
```

## 构建流程

```bash
cd frontend
npm install
npm run dev      # 开发服务器
npm run build    # 生产构建
```

## 数据加载

前端通过 HTTP 加载静态 JSON 文件：

```typescript
const data = await fetch('/data/final_topics.json')
  .then(r => r.json());
```

## 子节点

- @geb-leaf #visualization - D3.js 可视化详解
- @geb-leaf #components - React 组件详解
