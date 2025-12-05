# 服务绑定使用说明

## 配置服务绑定

在另一个 Worker 项目的 `wrangler.jsonc` 中配置：

```jsonc
{
	"services": [
		{
			"binding": "IMG_THUMB",
			"service": "cloudflare-worker-image" // 你的图片处理 Worker 名称
		}
	]
}
```

## 使用示例

### 1. 生成缩略图（GET 请求）

**注意：缩略图统一使用 webp 格式输出，format 参数将被忽略**

```javascript
// 在另一个 Worker 中
export default {
	async fetch(request, env, ctx) {
		// 构建请求 URL
		const url = new URL('https://example.com/thumb'); // 使用任意域名，服务绑定会忽略域名
		url.searchParams.set('url', 'https://example.com/image.jpg');
		url.searchParams.set('width', '200');
		url.searchParams.set('height', '200');
		url.searchParams.set('fit', 'cover');
		// format 参数将被忽略，缩略图统一使用 webp 格式
		url.searchParams.set('quality', '85');

		// 创建请求
		const thumbRequest = new Request(url.toString(), {
			method: 'GET',
			headers: {
				'X-API-KEY': env.API_KEY || 'your-api-key', // 如果启用了认证
			},
		});

		// 通过服务绑定调用
		const response = await env.IMG_THUMB.fetch(thumbRequest);

		// 返回缩略图
		return response;
	},
};
```

### 2. 生成缩略图（POST 请求 - 上传文件）

**注意：缩略图统一使用 webp 格式输出，format 参数将被忽略**

```javascript
export default {
	async fetch(request, env, ctx) {
		// 获取上传的文件
		const formData = await request.formData();
		const file = formData.get('image');

		// 构建请求 URL
		const url = new URL('https://example.com/thumb');
		url.searchParams.set('width', '200');
		url.searchParams.set('height', '200');
		url.searchParams.set('fit', 'cover');
		// format 参数将被忽略，缩略图统一使用 webp 格式
		url.searchParams.set('quality', '85');

		// 创建新的 FormData
		const newFormData = new FormData();
		newFormData.append('file', file);

		// 创建请求
		const thumbRequest = new Request(url.toString(), {
			method: 'POST',
			headers: {
				'X-API-KEY': env.API_KEY || 'your-api-key',
			},
			body: newFormData,
		});

		// 通过服务绑定调用
		const response = await env.IMG_THUMB.fetch(thumbRequest);

		return response;
	},
};
```

### 3. 图片格式转换（GET 请求）

```javascript
export default {
	async fetch(request, env, ctx) {
		const url = new URL('https://example.com/image/to/webp');
		url.searchParams.set('url', 'https://example.com/image.jpg');
		url.searchParams.set('quality', '90');
		url.searchParams.set('size', '800x600');

		const convertRequest = new Request(url.toString(), {
			method: 'GET',
			headers: {
				'X-API-KEY': env.API_KEY || 'your-api-key',
			},
		});

		const response = await env.IMG_THUMB.fetch(convertRequest);
		return response;
	},
};
```

### 4. 图片格式转换（POST 请求）

```javascript
export default {
	async fetch(request, env, ctx) {
		// 获取原始图片数据
		const imageData = await request.arrayBuffer();

		const url = new URL('https://example.com/image/to/webp');
		url.searchParams.set('quality', '90');
		url.searchParams.set('size', '800x600');

		const convertRequest = new Request(url.toString(), {
			method: 'POST',
			headers: {
				'X-API-KEY': env.API_KEY || 'your-api-key',
				'Content-Type': 'image/jpeg', // 原始图片类型
			},
			body: imageData,
		});

		const response = await env.IMG_THUMB.fetch(convertRequest);
		return response;
	},
};
```

## 完整示例

```javascript
import { Hono } from 'hono';

const app = new Hono();

// 生成缩略图的辅助函数
// 注意：缩略图统一使用 webp 格式输出，format 参数将被忽略
async function generateThumbnail(env, imageUrl, width = 200, height = 200) {
	const url = new URL('https://example.com/thumb');
	url.searchParams.set('url', imageUrl);
	url.searchParams.set('width', width.toString());
	url.searchParams.set('height', height.toString());

	const request = new Request(url.toString(), {
		method: 'GET',
		headers: {
			'X-API-KEY': env.API_KEY || '',
		},
	});

	return await env.IMG_THUMB.fetch(request);
}

// 转换图片格式的辅助函数
async function convertImage(env, imageUrl, targetFormat = 'webp', quality = 85) {
	const url = new URL(`https://example.com/image/to/${targetFormat}`);
	url.searchParams.set('url', imageUrl);
	url.searchParams.set('quality', quality.toString());

	const request = new Request(url.toString(), {
		method: 'GET',
		headers: {
			'X-API-KEY': env.API_KEY || '',
		},
	});

	return await env.IMG_THUMB.fetch(request);
}

// 使用示例路由
app.get('/api/thumbnail', async (c) => {
	const imageUrl = c.req.query('url');
	const width = parseInt(c.req.query('width') || '200');
	const height = parseInt(c.req.query('height') || '200');

	if (!imageUrl) {
		return c.json({ error: 'Missing url parameter' }, 400);
	}

	const response = await generateThumbnail(c.env, imageUrl, width, height);
	return response;
});

app.get('/api/convert', async (c) => {
	const imageUrl = c.req.query('url');
	const format = c.req.query('format') || 'webp';
	const quality = parseInt(c.req.query('quality') || '85');

	if (!imageUrl) {
		return c.json({ error: 'Missing url parameter' }, 400);
	}

	const response = await convertImage(c.env, imageUrl, format, quality);
	return response;
});

export default app;
```

## 注意事项

1. **API Key**：如果图片处理 Worker 启用了认证，需要在请求头中传递 `X-API-KEY`
2. **域名**：服务绑定会忽略请求 URL 中的域名，可以使用任意域名
3. **性能**：服务绑定是本地调用，无需网络请求，性能更好
4. **错误处理**：记得处理服务绑定返回的错误响应
5. **缩略图格式**：缩略图统一使用 webp 格式输出，`format` 参数将被忽略
