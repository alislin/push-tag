# vtag

CLI 工具，用于自动版本号递增、Git 分支合并和 Tag 创建。

## 安装

```bash
npm install -g push-tag
```

或在项目中使用：

```bash
npm install --save-dev push-tag
```

## 使用

### 基本命令

```bash
vtag                    # 不更新版本号，执行流程（合并推送）
vtag -p                 # 升级 patch 版本 (1.0.0 → 1.0.1) + 执行流程
vtag -m                 # 升级 minor 版本 (1.0.0 → 1.1.0) + 执行流程
vtag -M                 # 升级 major 版本 (1.0.0 → 2.0.0) + 执行流程
vtag 1.2.3              # 指定版本号 + 执行流程
```

### 创建 Tag

```bash
vtag -t                 # 不更新版本号，创建并推送 tag
vtag -p -t              # 升级 patch 版本 + 创建并推送 tag
vtag -m -t              # 升级 minor 版本 + 创建并推送 tag
vtag -M -t              # 升级 major 版本 + 创建并推送 tag
vtag 1.2.3 -t           # 指定版本号 + 创建并推送 tag
```

### 不推送（仅本地操作）

```bash
vtag -n                 # 不更新版本号，不推送（仅本地操作）
vtag -p -n              # 仅更新版本号，不推送
vtag -p -t -n           # 更新版本号 + 创建本地 tag，不推送
vtag --no-push          # 同 -n（长参数形式）
```

### 其他选项

```bash
vtag -d                 # 预览执行步骤（dry-run）
vtag --dry-run          # 同上
vtag --dev-branch develop    # 自定义开发分支名
vtag --main-branch master    # 自定义主分支名
```

## 选项说明

| 参数 | 长参数 | 说明 | 默认值 |
|------|--------|------|--------|
| `-p` | --patch | 升级 patch 版本 | 无 |
| `-m` | --minor | 升级 minor 版本 | 无 |
| `-M` | --major | 升级 major 版本 | 无 |
| `<version>` | - | 指定版本号 | 无 |
| `-t` | --push-tag | 创建并推送 tag | false |
| `-n` | --no-push | 禁用推送（分支和 tag） | false |
| `-d` | --dry-run | 预览模式 | false |
| | --dev-branch | 开发分支名 | 自动检测 |
| | --main-branch | 主分支名 | 自动检测 |

## 执行流程

```
Step 1: 版本号处理（如果有版本参数）
        ├─ 更新 package.json
        ├─ git add package.json
        └─ git commit

Step 2: 检查 tag 是否冲突（如果 -t）

Step 3: 验证分支合法性
        ├─ 必须是 dev/main 分支
        └─ 工作区必须干净

Step 4: 推送当前分支（如果 dev && !-n）

Step 5: 切换到 main + pull

Step 6: 合并 dev 到 main（如果当前是 dev）

Step 7: 推送 main（如果 !-n）

Step 8: 创建 tag（如果 -t）
        └─ 推送 tag（如果 !-n）

Step 9: 切换回 dev（如果之前是 dev）
```

## 分支自动检测

工具会自动检测以下分支：

- **开发分支**：`dev`、`develop`、`development`
- **主分支**：`main`、`master`

## 配置文件

在项目根目录创建 `.vttagrc.json` 或在 `package.json` 中添加 `vtag` 字段：

`.vttagrc.json`:
```json
{
  "devBranch": "develop",
  "mainBranch": "master"
}
```

`package.json`:
```json
{
  "name": "your-package",
  "vtag": {
    "devBranch": "develop",
    "mainBranch": "master"
  }
}
```

## GitHub Actions CI

当推送 tag 后，可配合 GitHub Actions 自动发布到 npm：

`.github/workflows/release.yml`:
```yaml
name: Publish to npm

on:
  push:
    tags:
      - 'v*.*.*'
  workflow_dispatch:

permissions:
  id-token: write
  contents: read

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npm test

  publish-npm:
    needs: build
    runs-on: ubuntu-latest
    environment: npm-publish
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          registry-url: https://registry.npmjs.org/
          provenance: true
      - run: npm ci
      - run: npm publish --provenance
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

需要在 GitHub 仓库配置：
- Settings → Secrets → Actions → 添加 `NPM_TOKEN`
- Settings → Environments → 创建 `npm-publish` 环境（可选）

## 示例

```bash
# 仅更新版本号
vtag -p

# 发布新版本并推送 tag（触发 CI）
vtag -p -t

# 预览发布流程
vtag -p -t --dry-run

# 仅在本地创建 tag
vtag -t -n

# 使用自定义分支
vtag -p -t --dev-branch develop --main-branch master
```

## License

MIT