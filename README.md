# 📚 闪卡

基于 Anki `.apkg` 数据的纯前端闪卡应用，移动端优先，GitHub Pages 部署。

## 功能

- **学习模式** — 按标签分组学习新卡片，4 级评分（Again / Hard / Good / Easy）
- **复习模式** — 基于 SM-2 记忆曲线，自动筛选到期卡片
- **浏览模式** — 不评分，自由翻看全部卡片
- **多主题支持** — 切换主题重新加载，SRS 数据按主题隔离
- **数据存本地** — localStorage 存储记忆曲线，不上传任何数据

## 项目结构

```
flashcards/
├── src/                    # TypeScript 源码
│   ├── main.ts             # 入口 + 路由 + 模式分发
│   ├── types.ts            # 类型定义
│   ├── srs.ts              # SM-2 间隔重复算法
│   ├── storage.ts          # localStorage 封装
│   ├── topic.ts            # 主题加载 + 标签分组
│   ├── renderer.ts         # DOM 渲染（卡片翻转、按钮、进度）
│   └── style.css           # 移动端优先样式
├── public/data/            # 主题 JSON（构建时复制到 dist/）
├── media/                  # 图片文件（通过 GitHub raw URL 引用）
├── scripts/
│   └── extract_apkg.py     # .apkg → JSON 转换脚本
├── .github/workflows/
│   └── deploy.yml          # GitHub Pages 自动部署
├── index.html              # Vite 入口
├── vite.config.ts
├── tsconfig.json
└── package.json
```

## 使用方法

### 本地开发

```bash
cd flashcards
npm install
npm run dev     # 启动开发服务器
```

### 构建

```bash
npm run build   # 输出到 dist/
npm run preview # 预览产物
```

### 从 .apkg 添加新主题

```bash
python3 scripts/extract_apkg.py path/to/deck.apkg \
  --out public/data \
  --media media
```

然后：
1. 把 `media/` 下的图片上传到 GitHub 仓库
2. 在 `src/main.ts` 的 `TOPICS` 数组中注册新主题：

```ts
const TOPICS: TopicEntry[] = [
  { id: "ultimate-geography", name: "Ultimate Geography", file: "./data/ultimate-geography.json" },
  { id: "my-new-topic",       name: "My New Topic",       file: "./data/my-new-topic.json" },
];
```

3. 提交并推送，GitHub Actions 自动部署

### 部署到 GitHub Pages

1. 在仓库 Settings → Pages → Source 选择 `gh-pages` 分支的 `/ (root)`
2. 推送 `main` 分支，Action 自动构建并部署

## 数据格式

每个主题 JSON 结构：

```jsonc
{
  "meta": {
    "id": "ultimate-geography",
    "name": "Ultimate Geography",
    "fields": ["Country", "Capital", "Flag", "Map", ...],
    "cardTypes": [
      { "id": "flag-country", "front": ["Flag"], "back": ["Country", "Country info"] },
      ...
    ]
  },
  "cards": [
    {
      "id": 1,
      "tags": ["UG::Europe"],
      "fields": {
        "Country": "England",
        "Capital": "London",
        "Flag": "<img src=\"media/.../ug-flag-england.svg\" />",
        ...
      }
    }
  ]
}
```

前端读取 `meta.cardTypes` 动态决定题型和前后字段，完全不硬编码。

## SRS 算法

简化版 SM-2，per-card-type 独立追踪：

| 评分 | Interval | Ease 调整 |
|------|----------|-----------|
| Again | → 1 天 | −0.20 |
| Hard | × 1.2 | −0.15 |
| Good | × Ease | 不变 |
| Easy | × Ease × 1.3 | +0.15 |

记录存储于 `localStorage`，key 格式：`fc/{topic-id}/{card-id}/{card-type-id}`
