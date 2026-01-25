# iTravelMap - 智能旅游路线规划小程序

一款基于微信小程序开发的智能旅游路线规划应用，帮助用户轻松规划最佳旅游路线。

## 项目简介

iTravelMap 提供以下功能：
- 🗺️ 景点路线智能规划
- 🚶 多种路线方案选择（推荐路线、最短距离、轻松游玩）
- 📍 实时地图导航
- 🏞️ 景点详情查看
- 📱 腾讯地图 API 集成

## 技术栈

- 前端框架：微信小程序原生框架
- 地图服务：腾讯地图 API
- 地理编码：腾讯地图地理编码服务
- 步行导航：腾讯地图方向 API

## 开发环境

- 微信开发者工具
- Node.js
- npm/yarn

## 安装步骤

1. 克隆项目
```bash
git clone <repository-url>
cd iTravelMap
```

2. 安装依赖
```bash
npm install
# 或
yarn install
```

3. 构建 npm 包
   - 在微信开发者工具中打开项目
   - 点击菜单栏「工具」->「构建 npm」

## 项目结构

```
iTravelMap/
├── app.js              # 小程序入口文件
├── app.json            # 小程序全局配置
├── app.wxss            # 全局样式
├── pages/              # 页面目录
│   ├── index/          # 首页
│   └── route/          # 路线相关页面
│       ├── route-plan.js      # 路线规划
│       ├── route-map.js       # 地图展示
│       ├── route-detail.js    # 路线详情
│       └── scenic-detail.js   # 景点详情
├── components/         # 自定义组件
├── services/           # 业务逻辑层
├── common/             # 公共工具
├── config/             # 配置文件
├── images/             # 图片资源
└── miniprogram_npm/    # npm 构建产物
```

## 主要功能模块

### 1. 路线规划 (route-plan)
- 支持多种路线方案生成
- 智能排序算法（就近原则、最短距离）
- API 限流保护
- 距离和时间计算

### 2. 地图展示 (route-map)
- 路线可视化
- 标记点展示
- 步行路径绘制
- 地图交互控制

### 3. 数据兼容性
- 支持多种坐标数据结构
- 自动降级方案
- 错误处理机制

## 配置说明

### 腾讯地图 API Key

需要在项目中配置腾讯地图 API Key，可在 `services/` 目录下配置：

```javascript
const key = wx.getStorageSync('tencentMapKey') || 'YOUR_API_KEY';
```

## 使用说明

1. 在微信开发者工具中导入项目
2. 配置合法域名（在微信公众平台设置）
3. 安装依赖并构建 npm
4. 配置腾讯地图 API Key
5. 运行项目

## 贡献指南

欢迎提交 Issue 和 Pull Request！

## 许可证

MIT License

