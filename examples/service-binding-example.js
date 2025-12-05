/**
 * 服务绑定使用示例
 * 在另一个 Worker 项目中使用 IMG_THUMB 服务绑定
 * 
 * 配置步骤：
 * 1. 在另一个 Worker 的 wrangler.jsonc 中添加服务绑定：
 *    {
 *      "services": [
 *        {
 *          "binding": "IMG_THUMB",
 *          "service": "cloudflare-worker-image"  // 你的图片处理 Worker 名称
 *        }
 *      ]
 *    }
 * 
 * 2. 确保两个 Worker 在同一个账户下
 */

/**
 * 生成缩略图（GET 请求）
 * 注意：缩略图统一使用 webp 格式输出，format 参数将被忽略
 * @param {Object} env - 环境变量对象（包含 IMG_THUMB 绑定）
 * @param {string} imageUrl - 图片 URL
 * @param {Object} options - 选项
 * @param {number} options.width - 宽度
 * @param {number} options.height - 高度
 * @param {string} options.fit - 裁剪模式（cover, contain, fill）
 * @param {number} options.quality - 质量（1-100）
 * @param {string} options.apiKey - API Key（如果启用认证）
 * @returns {Promise<Response>} 缩略图响应（webp 格式）
 */
export async function generateThumbnail(env, imageUrl, options = {}) {
	const {
		width = 200,
		height = 200,
		fit = 'cover',
		quality = 85,
		apiKey = ''
	} = options;
	
	// 构建请求 URL（域名可以是任意值，服务绑定会忽略）
	// 注意：format 参数将被忽略，缩略图统一使用 webp 格式
	const url = new URL('https://example.com/image/thumb');
	url.searchParams.set('url', imageUrl);
	url.searchParams.set('width', width.toString());
	url.searchParams.set('height', height.toString());
	url.searchParams.set('fit', fit);
	url.searchParams.set('quality', quality.toString());
	
	// 创建请求
	const headers = {};
	if (apiKey) {
		headers['X-API-KEY'] = apiKey;
	}
	
	const request = new Request(url.toString(), {
		method: 'GET',
		headers
	});
	
	// 通过服务绑定调用
	return await env.IMG_THUMB.fetch(request);
}

/**
 * 生成缩略图（POST 请求 - 上传文件）
 * 注意：缩略图统一使用 webp 格式输出，format 参数将被忽略
 * @param {Object} env - 环境变量对象
 * @param {File|Blob|ArrayBuffer} imageData - 图片数据
 * @param {Object} options - 选项
 * @param {number} options.width - 宽度
 * @param {number} options.height - 高度
 * @param {string} options.fit - 裁剪模式
 * @param {number} options.quality - 质量
 * @param {string} options.apiKey - API Key
 * @param {string} options.contentType - 图片内容类型
 * @returns {Promise<Response>} 缩略图响应（webp 格式）
 */
export async function generateThumbnailFromFile(env, imageData, options = {}) {
	const {
		width = 200,
		height = 200,
		fit = 'cover',
		quality = 85,
		apiKey = '',
		contentType = 'image/jpeg'
	} = options;
	
	// 构建请求 URL
	// 注意：format 参数将被忽略，缩略图统一使用 webp 格式
	const url = new URL('https://example.com/image/thumb');
	url.searchParams.set('width', width.toString());
	url.searchParams.set('height', height.toString());
	url.searchParams.set('fit', fit);
	url.searchParams.set('quality', quality.toString());
	
	// 创建请求
	const headers = {
		'Content-Type': contentType
	};
	if (apiKey) {
		headers['X-API-KEY'] = apiKey;
	}
	
	const request = new Request(url.toString(), {
		method: 'POST',
		headers,
		body: imageData
	});
	
	// 通过服务绑定调用
	return await env.IMG_THUMB.fetch(request);
}

/**
 * 转换图片格式（GET 请求）
 * @param {Object} env - 环境变量对象
 * @param {string} imageUrl - 图片 URL
 * @param {Object} options - 选项
 * @param {string} options.format - 目标格式（webp, jpeg, png, avif）
 * @param {number} options.quality - 质量（1-100）
 * @param {string} options.size - 尺寸（格式：WIDTHxHEIGHT）
 * @param {string} options.apiKey - API Key
 * @returns {Promise<Response>} 转换后的图片响应
 */
export async function convertImage(env, imageUrl, options = {}) {
	const {
		format = 'webp',
		quality = 85,
		size = null,
		apiKey = ''
	} = options;
	
	// 构建请求 URL
	const url = new URL(`https://example.com/image/to/${format}`);
	url.searchParams.set('url', imageUrl);
	url.searchParams.set('quality', quality.toString());
	if (size) {
		url.searchParams.set('size', size);
	}
	
	// 创建请求
	const headers = {};
	if (apiKey) {
		headers['X-API-KEY'] = apiKey;
	}
	
	const request = new Request(url.toString(), {
		method: 'GET',
		headers
	});
	
	// 通过服务绑定调用
	return await env.IMG_THUMB.fetch(request);
}

/**
 * 转换图片格式（POST 请求）
 * @param {Object} env - 环境变量对象
 * @param {File|Blob|ArrayBuffer} imageData - 图片数据
 * @param {Object} options - 选项
 * @param {string} options.format - 目标格式
 * @param {number} options.quality - 质量
 * @param {string} options.size - 尺寸
 * @param {string} options.apiKey - API Key
 * @param {string} options.contentType - 图片内容类型
 * @returns {Promise<Response>} 转换后的图片响应
 */
export async function convertImageFromFile(env, imageData, options = {}) {
	const {
		format = 'webp',
		quality = 85,
		size = null,
		apiKey = '',
		contentType = 'image/jpeg'
	} = options;
	
	// 构建请求 URL
	const url = new URL(`https://example.com/image/to/${format}`);
	url.searchParams.set('quality', quality.toString());
	if (size) {
		url.searchParams.set('size', size);
	}
	
	// 创建请求
	const headers = {
		'Content-Type': contentType
	};
	if (apiKey) {
		headers['X-API-KEY'] = apiKey;
	}
	
	const request = new Request(url.toString(), {
		method: 'POST',
		headers,
		body: imageData
	});
	
	// 通过服务绑定调用
	return await env.IMG_THUMB.fetch(request);
}

/**
 * 使用示例（在另一个 Worker 中）
 */
/*
import { Hono } from 'hono';
import { generateThumbnail, convertImage } from './service-binding-example.js';

const app = new Hono();

// 生成缩略图路由
app.get('/thumbnail', async (c) => {
  const imageUrl = c.req.query('url');
  const width = parseInt(c.req.query('width') || '200');
  const height = parseInt(c.req.query('height') || '200');
  
  if (!imageUrl) {
    return c.json({ error: 'Missing url parameter' }, 400);
  }
  
  const response = await generateThumbnail(c.env, imageUrl, {
    width,
    height,
    format: 'webp',
    quality: 85,
    apiKey: c.env.API_KEY || ''  // 从环境变量获取 API Key
  });
  
  return response;
});

// 转换图片格式路由
app.get('/convert', async (c) => {
  const imageUrl = c.req.query('url');
  const format = c.req.query('format') || 'webp';
  const quality = parseInt(c.req.query('quality') || '85');
  
  if (!imageUrl) {
    return c.json({ error: 'Missing url parameter' }, 400);
  }
  
  const response = await convertImage(c.env, imageUrl, {
    format,
    quality,
    apiKey: c.env.API_KEY || ''
  });
  
  return response;
});

export default app;
*/

