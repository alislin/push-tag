# vtag

CLI 工具，用于自动版本号递增、Git Tag 创建和 NPM 发布。

## 安装

```bash
npm install -g push-tag
```

或在项目中使用：

```bash
npm install --save-dev push-tag
```

## 使用

```bash
vtag                  # 使用当前版本发布
vtag -p               # patch 版本 (1.0.0 → 1.0.1)
vtag -m               # minor 版本 (1.0.0 → 1.1.0)
vtag -M               # major 版本 (1.0.0 → 2.0.0)
vtag 2.0.0            # 指定版本号
```

### 选项

| 选项 | 说明 |
|------|------|
| `-p, --patch` | 递增 patch 版本 |
| `-m, --minor` | 递增 minor 版本 |
| `-M, --major` | 递增 major 版本 |
| `-t, --push-tag` | 推送 tag 到远端（默认不推送） |
| `-P, --no-publish` | 跳过 npm 发布（默认发布） |
| `-d, --dry-run` | 预览执行步骤，不实际执行 |
| `--dev-branch <name>` | 指定开发分支名 |
| `--main-branch <name>` | 指定主分支名 |

### 配置文件

在项目根目录创建 `.vttagrc.json` 或在 `package.json` 中添加 `vtag` 字段：

`.vttagrc.json`:
```json
{
  "devBranch": "develop",
  "mainBranch": "master",
  "pushTag": false,
  "publish": true
}
```

`package.json`:
```json
{
  "name": "your-package",
  "vtag": {
    "devBranch": "develop",
    "mainBranch": "master",
    "pushTag": true
  }
}
```

### 执行流程

1. 解析配置（CLI 参数 > 配置文件 > 智能检测）
2. 检查 Git 状态（有无未提交更改）
3. 检查 Tag 是否已存在
4. 更新 `package.json` 版本号
5. 切换到主分支并拉取最新代码
6. 合并开发分支到主分支
7. 推送主分支到远端
8. 创建 Tag
9. 如果配置 `pushTag: true`，推送 Tag 到远端
10. 如果配置 `publish: true`，发布到 NPM
11. 切换回开发分支

### 分支自动检测

工具会自动检测以下分支：

- **开发分支**：`dev`、`develop`、`development`
- **主分支**：`main`、`master`

## 示例

```bash
# 发布 patch 版本
vtag -p

# 发布 minor 版本并推送 tag
vtag -m -t

# 发布 major 版本，但不发布到 npm
vtag -M -P

# 预览发布流程
vtag -p --dry-run

# 使用自定义分支
vtag -p --dev-branch feature --main-branch production
```

## License

MIT