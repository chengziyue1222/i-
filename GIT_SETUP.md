# Git 版本控制设置指南

## 快速开始

### 1. 初始化 Git 仓库

在项目根目录下执行以下命令：

```bash
cd d:/Git/weixin_mp/iTravelMap
git init
```

### 2. 添加所有文件到暂存区

```bash
git add .
```

### 3. 创建首次提交

```bash
git commit -m "feat: 初始化项目，添加路线规划功能"
```

### 4. 关联远程仓库（可选）

如果你有远程 Git 仓库（GitHub、GitLab 等），执行：

```bash
git remote add origin <你的远程仓库地址>
```

### 5. 推送到远程仓库（可选）

```bash
git branch -M main
git push -u origin main
```

## Git 工作流程

### 日常开发流程

1. **查看状态**
```bash
git status
```

2. **添加修改的文件**
```bash
# 添加所有修改
git add .

# 或添加特定文件
git add pages/route/route-plan.js
```

3. **提交修改**
```bash
git commit -m "描述你的修改内容"
```

4. **推送到远程仓库**
```bash
git push
```

### 分支管理

1. **创建新分支**
```bash
git checkout -b feature/your-feature-name
```

2. **切换分支**
```bash
git checkout main
# 或
git switch main
```

3. **查看所有分支**
```bash
git branch -a
```

4. **合并分支**
```bash
git checkout main
git merge feature/your-feature-name
```

### 常用命令

#### 查看提交历史
```bash
git log
# 查看简洁历史
git log --oneline
# 查看图形化历史
git log --graph --oneline
```

#### 查看文件修改差异
```bash
# 查看工作区修改
git diff

# 查看已暂存的修改
git diff --staged

# 查看特定文件的修改
git diff pages/route/route-plan.js
```

#### 撤销修改
```bash
# 撤销工作区的修改（未暂存）
git checkout -- pages/route/route-plan.js
# 或
git restore pages/route/route-plan.js

# 撤销暂存区的修改
git reset HEAD pages/route/route-plan.js

# 撤销最近的提交（保留修改）
git reset --soft HEAD~1

# 撤销最近的提交（不保留修改）
git reset --hard HEAD~1
```

#### 查看远程仓库
```bash
git remote -v
```

#### 拉取最新代码
```bash
git pull
```

## 提交信息规范

建议使用以下格式：

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Type 类型
- `feat`: 新功能
- `fix`: 修复 bug
- `docs`: 文档更新
- `style`: 代码格式（不影响功能）
- `refactor`: 重构
- `perf`: 性能优化
- `test`: 测试相关
- `chore`: 构建过程或辅助工具的变动

### 示例
```
feat(route): 添加路线规划功能

- 实现多种路线方案生成
- 集成腾讯地图 API
- 添加地图展示页面

Closes #1
```

## 项目 .gitignore 说明

已配置忽略以下文件：
- `node_modules/` - 依赖包
- `miniprogram_npm/` - 小程序 npm 构建产物
- `project.private.config.json` - 私有配置（包含敏感信息）
- `.miniprogram-cache/` - 微信开发者工具缓存
- 编辑器配置文件（.vscode/, .idea/）
- 日志文件和临时文件

## 注意事项

1. **不要提交敏感信息**
   - 不要提交 API Key
   - 不要提交个人配置文件
   - 检查 `.gitignore` 是否正确配置

2. **提交前检查**
   ```bash
   git status
   git diff
   ```
   确认只提交需要的文件

3. **定期提交**
   - 完成一个功能就提交一次
   - 提交信息要清晰明了

4. **使用分支开发**
   - 新功能在新分支开发
   - 开发完成后再合并到主分支

## 常见问题

### Q: 如何撤销已推送的提交？
A:
```bash
# 软撤销（修改会保留）
git revert <commit-hash>

# 强制推送（谨慎使用）
git push -f
```

### Q: 如何修改最后一次提交信息？
A:
```bash
git commit --amend
```

### Q: 如何查看远程仓库的最新提交？
A:
```bash
git fetch origin
git log origin/main
```

### Q: 如何解决合并冲突？
A:
1. 打开冲突文件，手动解决冲突
2. 标记冲突已解决：`git add <file>`
3. 完成合并：`git commit`

## 下一步

1. 执行初始化命令
2. 创建首次提交
3. （可选）关联远程仓库
4. 开始开发，定期提交代码

祝开发顺利！🎉
