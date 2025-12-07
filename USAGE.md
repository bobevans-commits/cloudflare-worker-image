# 图片处理服务使用文档

## 部署平台

本项目支持部署到多个平台：
- **Vercel** - 使用 `api/index.py` 作为入口
- **Netlify** - 使用 `netlify/functions/` 作为入口
- **Railway** - 使用 `main.py` 作为入口
- **Cloudflare Workers** - 使用 `functions/index.js` 作为入口

## 环境变量配置

### Python 版本（Vercel/Netlify/Railway）

```bash
# 是否启用认证（可选，默认为 true）
AUTH_ENABLED=true

# API Key（必需，如果启用认证，支持多个值用逗号分隔）
API_KEY=your-api-key-here

# API Key 请求头名称（可选，默认为 'X-API-KEY'）
API_KEY_HEADER=X-API-KEY
```

### Netlify 版本

在 Netlify 项目设置中配置环境变量，或在 `netlify.toml` 中配置：

```toml
[build.environment]
  AUTH_ENABLED = "true"
  API_KEY = "your-api-key-here"
  API_KEY_HEADER = "X-API-KEY"
```

### Cloudflare Workers 版本

在 `wrangler.jsonc` 中配置：

```jsonc
{
  "vars": {
    "AUTH_ENABLED": "true",
    "API_KEY": "your-api-key-here",
    "API_KEY_HEADER": "X-API-KEY"
  }
}
```

或使用 secrets：

```bash
wrangler secret put API_KEY
```

## API 接口

### 1. 图片格式转换

**接口地址：** `GET/POST /image/to/<format>`

**支持的格式：** `webp`, `jpeg`, `jpg`, `png`, `avif`

**参数说明：**
- `url` (GET 必需): 图片 URL
- `quality` (可选): 图片质量，默认 85，范围 1-100
- `size` (可选): 图片尺寸，格式：`WIDTHxHEIGHT`，如 `800x600`

**请求示例：**

```bash
# GET 请求 - 从 URL 转换图片
curl -X GET "https://your-domain.com/image/to/webp?url=https://example.com/image.jpg&quality=90&size=800x600" \
  -H "X-API-KEY: your-api-key-here"

# POST 请求 - 上传文件转换
curl -X POST "https://your-domain.com/image/to/webp?quality=90" \
  -H "X-API-KEY: your-api-key-here" \
  -F "file=@/path/to/image.jpg"
```

**JavaScript 示例：**

```javascript
// GET 请求
const response = await fetch(
  'https://your-domain.com/image/to/webp?url=https://example.com/image.jpg&quality=90',
  {
    headers: {
      'X-API-KEY': 'your-api-key-here'
    }
  }
);
const blob = await response.blob();

// POST 请求 - 上传文件
const formData = new FormData();
formData.append('file', fileInput.files[0]);

const response = await fetch(
  'https://your-domain.com/image/to/webp?quality=90',
  {
    method: 'POST',
    headers: {
      'X-API-KEY': 'your-api-key-here'
    },
    body: formData
  }
);
const blob = await response.blob();
```

**Python 示例：**

```python
import requests

# GET 请求
url = 'https://your-domain.com/image/to/webp'
params = {
    'url': 'https://example.com/image.jpg',
    'quality': 90,
    'size': '800x600'
}
headers = {
    'X-API-KEY': 'your-api-key-here'
}
response = requests.get(url, params=params, headers=headers)
with open('output.webp', 'wb') as f:
    f.write(response.content)

# POST 请求
with open('input.jpg', 'rb') as f:
    files = {'file': f}
    response = requests.post(
        url,
        files=files,
        params={'quality': 90},
        headers=headers
    )
    with open('output.webp', 'wb') as out:
        out.write(response.content)
```

### 2. 缩略图生成

**接口地址：** `GET/POST /image/thumb`

**参数说明（所有参数都是可选的，有默认值）：**
- `url` (GET 必需): 图片 URL
- `width` 或 `w` (可选): 宽度，默认 200，支持自适应
- `height` 或 `h` (可选): 高度，默认 200，支持自适应
- `fit` (可选): 裁剪模式，默认 `cover`，可选值：`cover`, `contain`
- `quality` 或 `q` (可选): 质量，默认 85，范围 1-100

**注意：** 输出格式固定为 `webp`

**裁剪模式说明：**
- `cover`: 保持宽高比，填满目标尺寸，可能裁剪（默认）
- `contain`: 保持宽高比，完整显示，可能留白

**自适应说明：**
- 只提供 `width` 时，高度按原图宽高比自动计算
- 只提供 `height` 时，宽度按原图宽高比自动计算
- 两者都提供时，使用指定尺寸
- 两者都不提供时，使用默认值 200x200

**请求示例：**

```bash
# 固定宽度，高度自适应
curl -X GET "https://your-domain.com/image/thumb?url=https://example.com/image.jpg&width=300" \
  -H "X-API-KEY: your-api-key-here" \
  -o thumbnail.webp

# 固定高度，宽度自适应
curl -X GET "https://your-domain.com/image/thumb?url=https://example.com/image.jpg&height=200" \
  -H "X-API-KEY: your-api-key-here" \
  -o thumbnail.webp

# 指定尺寸和裁剪模式
curl -X GET "https://your-domain.com/image/thumb?url=https://example.com/image.jpg&width=300&height=200&fit=contain&quality=90" \
  -H "X-API-KEY: your-api-key-here" \
  -o thumbnail.webp

# POST 请求 - 上传文件
curl -X POST "https://your-domain.com/image/thumb?width=300&height=200&fit=cover" \
  -H "X-API-KEY: your-api-key-here" \
  -F "file=@/path/to/image.jpg" \
  -o thumbnail.webp
```

**JavaScript 示例：**

```javascript
// 固定宽度，高度自适应
const response = await fetch(
  'https://your-domain.com/image/thumb?url=https://example.com/image.jpg&width=300',
  {
    headers: {
      'X-API-KEY': 'your-api-key-here'
    }
  }
);
const blob = await response.blob();

// 指定尺寸和裁剪模式
const response = await fetch(
  'https://your-domain.com/image/thumb?url=https://example.com/image.jpg&width=300&height=200&fit=contain&quality=90',
  {
    headers: {
      'X-API-KEY': 'your-api-key-here'
    }
  }
);
const blob = await response.blob();

// POST 请求 - 上传文件
const formData = new FormData();
formData.append('file', fileInput.files[0]);

const response = await fetch(
  'https://your-domain.com/image/thumb?width=300&height=200&fit=cover',
  {
    method: 'POST',
    headers: {
      'X-API-KEY': 'your-api-key-here'
    },
    body: formData
  }
);
const blob = await response.blob();
```

**Python 示例：**

```python
import requests

# 固定宽度，高度自适应
url = 'https://your-domain.com/image/thumb'
params = {
    'url': 'https://example.com/image.jpg',
    'width': 300
}
headers = {
    'X-API-KEY': 'your-api-key-here'
}
response = requests.get(url, params=params, headers=headers)
with open('thumbnail.webp', 'wb') as f:
    f.write(response.content)

# 指定尺寸和裁剪模式
params = {
    'url': 'https://example.com/image.jpg',
    'width': 300,
    'height': 200,
    'fit': 'contain',
    'quality': 90
}
response = requests.get(url, params=params, headers=headers)
with open('thumbnail.webp', 'wb') as f:
    f.write(response.content)

# POST 请求 - 上传文件
with open('input.jpg', 'rb') as f:
    files = {'file': f}
    params = {
        'width': 300,
        'height': 200,
        'fit': 'cover'
    }
    response = requests.post(
        url,
        files=files,
        params=params,
        headers=headers
    )
    with open('thumbnail.webp', 'wb') as out:
        out.write(response.content)
```

## 响应头说明

### 图片格式转换响应头

- `Content-Type`: `image/<format>`
- `Cache-Control`: `public, max-age=31536000, immutable`
- `X-Original-Size`: 原始图片大小（字节）
- `X-Converted-Size`: 转换后图片大小（字节）

### 缩略图响应头

- `Content-Type`: `image/webp`
- `Cache-Control`: `public, max-age=31536000, immutable`
- `X-Thumbnail-Size`: 缩略图尺寸，格式：`WIDTHxHEIGHT`
- `X-Original-Size`: 原始图片大小（字节）
- `X-Thumbnail-Size-Bytes`: 缩略图大小（字节）
- `X-Format`: `webp`

## 错误响应

所有错误响应都返回 JSON 格式：

```json
{
  "error": "错误信息"
}
```

**常见错误码：**
- `400`: 请求参数错误
- `401`: 未授权（API Key 无效）
- `500`: 服务器内部错误

## 限制说明

- 最大图片大小：10MB
- 图片转换最大尺寸：10000x10000
- 缩略图最大尺寸：5000x5000
- 支持的格式：webp, jpeg, jpg, png, avif

