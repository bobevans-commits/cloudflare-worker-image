# 部署指南

本项目支持部署到多个平台：Vercel、Railway、Netlify。

## 环境变量配置

所有平台都需要配置以下环境变量：

```bash
# 是否启用认证（可选，默认为 true）
AUTH_ENABLED=true

# API Key（必需，如果启用认证，支持多个值用逗号分隔）
API_KEY=your-api-key-here

# API Key 请求头名称（可选，默认为 'X-API-KEY'）
API_KEY_HEADER=X-API-KEY
```

## Vercel 部署

### 1. 安装 Vercel CLI（可选）

```bash
npm i -g vercel
```

### 2. 部署

```bash
vercel --prod
```

### 3. 配置环境变量

在 Vercel 项目设置中配置环境变量：
- 进入项目 → Settings → Environment Variables
- 添加 `AUTH_ENABLED`、`API_KEY`、`API_KEY_HEADER`

### 4. 文件说明

- `api/index.py` - Vercel serverless function 入口
- `vercel.json` - Vercel 配置文件

### 5. 注意事项

- Vercel 会自动检测 Python 项目
- 确保 `requirements.txt` 包含所有依赖
- 函数超时时间：Hobby 计划 10 秒，Pro 计划 60 秒

## Railway 部署

### 1. 安装 Railway CLI（可选）

```bash
npm i -g @railway/cli
```

### 2. 部署

```bash
railway login
railway init
railway up
```

### 3. 配置环境变量

在 Railway 项目设置中配置环境变量：
- 进入项目 → Variables
- 添加 `AUTH_ENABLED`、`API_KEY`、`API_KEY_HEADER`

### 4. 文件说明

- `main.py` - Railway 应用入口
- `railway.json` - Railway 配置文件
- `runtime.txt` - Python 版本指定（可选）

### 5. 注意事项

- Railway 使用 Nixpacks 自动构建
- 启动命令：`gunicorn main:app`
- 确保 `requirements.txt` 包含 `gunicorn`

## Netlify 部署

### 1. 安装 Netlify CLI（可选）

```bash
npm i -g netlify-cli
```

### 2. 部署

```bash
netlify login
netlify init
netlify deploy --prod
```

### 3. 配置环境变量

在 Netlify 项目设置中配置环境变量：
- 进入项目 → Site settings → Environment variables
- 添加 `AUTH_ENABLED`、`API_KEY`、`API_KEY_HEADER`

或在 `netlify.toml` 中配置：

```toml
[build.environment]
  AUTH_ENABLED = "true"
  API_KEY = "your-api-key-here"
  API_KEY_HEADER = "X-API-KEY"
```

### 4. 文件说明

- `netlify/functions/` - Netlify serverless functions
  - `health.py` - 健康检查
  - `image.py` - 图片格式转换
  - `thumb.py` - 缩略图生成
- `netlify.toml` - Netlify 配置文件

### 5. 注意事项

- Netlify Functions 有 10 秒超时限制（Pro 计划 26 秒）
- 确保 Python 版本兼容（推荐 3.11）
- 大文件处理可能受限于函数超时

## 平台对比

| 特性 | Vercel | Railway | Netlify |
|------|--------|---------|---------|
| 免费计划 | ✅ | ✅ | ✅ |
| 函数超时 | 10s (Hobby) | 无限制 | 10s (Free) |
| 自动部署 | ✅ | ✅ | ✅ |
| Python 支持 | ✅ | ✅ | ✅ |
| 环境变量 | ✅ | ✅ | ✅ |
| 日志 | ✅ | ✅ | ✅ |

## 测试部署

部署后，测试以下端点：

1. **健康检查**
   ```bash
   curl https://your-domain.com/
   curl https://your-domain.com/health
   ```

2. **图片格式转换**
   ```bash
   curl "https://your-domain.com/image/to/webp?url=https://example.com/image.jpg" \
     -H "X-API-KEY: your-api-key"
   ```

3. **缩略图生成**
   ```bash
   curl "https://your-domain.com/image/thumb?url=https://example.com/image.jpg&width=300" \
     -H "X-API-KEY: your-api-key"
   ```

4. **POST 文件上传**
   ```bash
   curl -X POST "https://your-domain.com/image/thumb?width=300" \
     -H "X-API-KEY: your-api-key" \
     -F "file=@image.jpg"
   ```

## 故障排查

### 问题：部署失败

- 检查 `requirements.txt` 是否包含所有依赖
- 检查 Python 版本是否兼容
- 查看平台日志获取详细错误信息

### 问题：函数超时

- 减少图片处理大小
- 优化图片处理参数
- 考虑升级到付费计划（增加超时时间）

### 问题：环境变量未生效

- 确保在平台设置中正确配置
- 重新部署应用
- 检查环境变量名称是否正确

### 问题：POST 请求失败

- 检查 Content-Type 是否正确
- 确保使用 multipart/form-data
- 检查文件大小限制

## 本地开发

```bash
# 安装依赖
pip install -r requirements.txt

# 设置环境变量
export AUTH_ENABLED=false
export API_KEY=test-key

# 运行应用
python main.py

# 或使用 gunicorn
gunicorn main:app
```

## 支持

如有问题，请查看：
- [USAGE.md](./USAGE.md) - API 使用文档
- 平台官方文档
- 项目 Issues

