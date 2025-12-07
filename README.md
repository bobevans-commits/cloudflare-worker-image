# 图片处理服务

支持多平台部署的图片处理服务，提供图片格式转换和缩略图生成功能。

---

![Python](https://img.shields.io/badge/Python-3.11+-blue)
![Flask](https://img.shields.io/badge/Flask-3.1.0-green)
![License](https://img.shields.io/badge/license-MIT-blue)

## 支持平台

- ✅ **Vercel** - Serverless Functions
- ✅ **Railway** - Container Deployment
- ✅ **Netlify** - Serverless Functions
- ✅ **Cloudflare Workers** - Edge Computing

## 主要特性

1. **图片格式转换** - 支持 webp, jpeg, png, avif 格式转换
2. **缩略图生成** - 支持等比例缩放，禁止变形
3. **自适应尺寸** - 支持固定宽度或高度，自动计算另一个维度
4. **POST 文件上传** - 支持 multipart/form-data 文件上传
5. **API 认证** - 支持 API Key 认证（可选）
6. **多平台部署** - 一套代码，多平台部署

## 快速开始

### 本地开发

```bash
# 安装依赖
pip install -r requirements.txt

# 设置环境变量（可选）
export AUTH_ENABLED=false
export API_KEY=test-key

# 运行应用
python main.py
```

### 部署

详细部署说明请查看 [DEPLOYMENT.md](./DEPLOYMENT.md)

**快速部署：**

- **Vercel**: `vercel --prod`
- **Railway**: `railway up`
- **Netlify**: `netlify deploy --prod`

## API 接口

### 1. 图片格式转换

```
GET/POST /image/to/<format>?url=...&quality=...&size=...
```

支持的格式：`webp`, `jpeg`, `jpg`, `png`, `avif`

### 2. 缩略图生成

```
GET/POST /image/thumb?url=...&width=...&height=...&fit=...&quality=...
```

参数说明：
- `url` (GET 必需): 图片 URL
- `width` / `w` (可选): 宽度，默认 200，支持自适应
- `height` / `h` (可选): 高度，默认 200，支持自适应
- `fit` (可选): 裁剪模式，`cover`（默认）或 `contain`
- `quality` / `q` (可选): 质量 1-100，默认 85

**注意**：缩略图统一输出 webp 格式

### 3. 健康检查

```
GET / 或 GET /health
```

## 使用示例

详细使用说明请查看 [USAGE.md](./USAGE.md)

**基本示例：**

```bash
# 健康检查
curl https://your-domain.com/

# 图片格式转换
curl "https://your-domain.com/image/to/webp?url=https://example.com/image.jpg" \
  -H "X-API-KEY: your-api-key"

# 缩略图生成（固定宽度，高度自适应）
curl "https://your-domain.com/image/thumb?url=https://example.com/image.jpg&width=300" \
  -H "X-API-KEY: your-api-key"

# POST 文件上传
curl -X POST "https://your-domain.com/image/thumb?width=300" \
  -H "X-API-KEY: your-api-key" \
  -F "file=@image.jpg"
```

## 文档

- [USAGE.md](./USAGE.md) - API 使用文档
- [DEPLOYMENT.md](./DEPLOYMENT.md) - 部署指南

## 技术栈

- **Python 3.11+**
- **Flask 3.1.0** - Web 框架
- **Pillow** - 图片处理
- **jSquash** (Cloudflare Workers) - 图片编解码

## 许可证

MIT License
