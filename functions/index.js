import { decodeImage, encodeImage, resizeImage, detectImageFormat } from './utils/jsquash.js';

/**
 * 图片转换服务 用于将图片转换为指定格式 并设定压缩格式的
 * @param {Request} request - 请求对象
 * @param {Object} env - 环境变量
 * @param {Object} ctx - 上下文对象
 * @returns {Promise<Response>} - 响应对象
 */
// 常量定义（避免重复创建）
const SUPPORTED_FORMATS = new Set(['webp', 'jpeg', 'jpg', 'png', 'avif']);
const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
const DEFAULT_QUALITY = 85;
const CACHE_MAX_AGE = 31536000; // 1 year
const JSON_HEADERS = { 'Content-Type': 'application/json' };
const IMAGE_PREFIX = '/image/to_';

// 创建错误响应的辅助函数（减少重复代码）
const errorResponse = (error, status) => 
	new Response(JSON.stringify({ error }), { status, headers: JSON_HEADERS });

// 处理图片格式转换
async function handleImageConversion(request, imageFormat, url, env, ctx) {
	try {
		// 解析查询参数（优化：直接使用 URLSearchParams，避免重复解析）
		const queryParams = url.searchParams;
		const quality = queryParams.get('quality');
		const size = queryParams.get('size');
		const imageUrl = queryParams.get('url');
		
		// 验证质量参数（优化：提前返回）
		let qualityValue = DEFAULT_QUALITY;
		if (quality) {
			qualityValue = parseInt(quality, 10);
			if (isNaN(qualityValue) || qualityValue < 1 || qualityValue > 100) {
				return errorResponse('Quality must be between 1 and 100', 400);
			}
		}
		
		// 验证尺寸参数（优化：提前返回）
		let sizeOptions = null;
		if (size) {
			const xIndex = size.indexOf('x');
			if (xIndex === -1 || xIndex === 0 || xIndex === size.length - 1) {
				return errorResponse('Size must be in format WIDTHxHEIGHT', 400);
			}
			const width = parseInt(size.substring(0, xIndex), 10);
			const height = parseInt(size.substring(xIndex + 1), 10);
			if (isNaN(width) || isNaN(height) || width <= 0 || height <= 0 || width > 10000 || height > 10000) {
				return errorResponse('Invalid size parameter', 400);
			}
			sizeOptions = { width, height, fitMethod: 'contain' };
		}
		
		// 获取图片数据
		let imageData;
		if (request.method === 'GET') {
			// GET 请求：从查询参数获取图片 URL
			if (!imageUrl) {
				return errorResponse("Missing 'url' parameter for GET request", 400);
			}
			
			try {
				const response = await fetch(imageUrl, {
					cf: { cacheTtl: 3600, cacheEverything: false }
				});
				
				if (response.status !== 200) {
					return errorResponse(`Failed to fetch image: HTTP ${response.status}`, 400);
				}
				
				const contentType = response.headers.get('Content-Type');
				if (!contentType || !contentType.startsWith('image/')) {
					return errorResponse('URL does not point to an image', 400);
				}
				
				imageData = await response.arrayBuffer();
			} catch (e) {
				return errorResponse(`Failed to fetch image: ${e.message}`, 400);
			}
		} else { // POST
			// POST 请求：从请求体获取 file/blob 数据
			const contentType = request.headers.get('Content-Type') || '';
			
			// 支持 multipart/form-data 格式
			if (contentType.includes('multipart/form-data')) {
				try {
					const formData = await request.formData();
					const file = formData.get('file') || formData.get('image') || formData.get('blob');
					
					if (!file || !(file instanceof File)) {
						return errorResponse('Missing file in form data. Use field name: file, image, or blob', 400);
					}
					
					// 验证文件类型
					if (!file.type.startsWith('image/')) {
						return errorResponse('Uploaded file must be an image', 400);
					}
					
					imageData = await file.arrayBuffer();
				} catch (e) {
					return errorResponse(`Failed to parse form data: ${e.message}`, 400);
				}
			} else {
				// 支持直接发送二进制数据（blob/file）
				// Content-Type 可以是 image/* 或 application/octet-stream
				if (contentType && !contentType.startsWith('image/') && !contentType.includes('octet-stream')) {
					return errorResponse('Content-Type must be an image type or application/octet-stream', 400);
				}
				
				imageData = await request.arrayBuffer();
				if (!imageData || imageData.byteLength === 0) {
					return errorResponse('Missing image data in request body', 400);
				}
			}
		}
		
		// 限制图片大小（优化：使用常量）
		if (imageData.byteLength > MAX_IMAGE_SIZE) {
			return errorResponse(`Image too large. Maximum size: ${MAX_IMAGE_SIZE / 1024 / 1024}MB`, 400);
		}
		
		// 检测原始图片格式（优化：提前返回）
		const originalFormat = detectImageFormat(imageData);
		if (originalFormat === 'unknown') {
			return errorResponse('Unsupported image format', 400);
		}
		
		// 如果格式相同且无需调整，直接返回（优化：避免不必要的处理）
		if (originalFormat === imageFormat && !sizeOptions && qualityValue === DEFAULT_QUALITY) {
			return new Response(imageData, {
				headers: {
					'Content-Type': `image/${imageFormat}`,
					'Cache-Control': `public, max-age=${CACHE_MAX_AGE}, immutable`
				}
			});
		}
		
		// 解码图片
		let decodedImageData;
		try {
			decodedImageData = await decodeImage(imageData, originalFormat);
		} catch (e) {
			return errorResponse(`Failed to decode image: ${e.message}`, 400);
		}
		
		// 调整尺寸（如果需要）
		if (sizeOptions) {
			try {
				decodedImageData = await resizeImage(decodedImageData, sizeOptions);
			} catch (e) {
				return errorResponse(`Failed to resize image: ${e.message}`, 500);
			}
		}
		
		// 编码为目标格式
		let convertedImage;
		try {
			convertedImage = await encodeImage(decodedImageData, imageFormat, qualityValue);
		} catch (e) {
			return errorResponse(`Failed to encode image: ${e.message}`, 500);
		}
		
		// 构建响应头（优化：减少对象创建）
		const imageFormatLower = imageFormat.toLowerCase();
		const headers = new Headers({
			'Content-Type': `image/${imageFormatLower}`,
			'Cache-Control': `public, max-age=${CACHE_MAX_AGE}, immutable`,
			'X-Original-Size': imageData.byteLength.toString(),
			'X-Converted-Size': convertedImage.byteLength.toString()
		});
		
		// 返回转换后的图片
		return new Response(convertedImage, { headers });
		
	} catch (e) {
		return errorResponse(`Failed to convert image: ${e.message}`, 500);
	}
}

// 主请求处理函数（优化：提前验证和缓存）
async function handleRequest(request, env, ctx) {
	// 从环境变量获取 API_KEY（优化：缓存读取）
	const apiKey = env.API_KEY || env.vars?.API_KEY || '123456';
	
	// API Key 验证（优化：提前返回）
	const requestApiKey = request.headers.get('X-API-KEY');
	if (requestApiKey !== apiKey) {
		return errorResponse('Unauthorized', 401);
	}
	
	// 只允许 GET 和 POST 方法（优化：提前返回）
	const method = request.method;
	if (method !== 'GET' && method !== 'POST') {
		return new Response(
			JSON.stringify({ error: 'Method not allowed' }),
			{
				status: 405,
				headers: { ...JSON_HEADERS, 'Allow': 'GET, POST' }
			}
		);
	}
	
	try {
		const url = new URL(request.url);
		let pathname = url.pathname;
		
		// 优化：移除尾部斜杠（更高效的方式）
		if (pathname.length > 1 && pathname.endsWith('/')) {
			pathname = pathname.slice(0, -1);
		}
		
		// 处理图片路由: /image/to_{format}（优化：使用常量）
		if (pathname.startsWith(IMAGE_PREFIX)) {
			// 优化：直接提取格式，避免多次字符串操作
			const formatStart = IMAGE_PREFIX.length;
			let formatEnd = pathname.indexOf('/', formatStart);
			if (formatEnd === -1) formatEnd = pathname.length;
			const imageFormat = pathname.substring(formatStart, formatEnd).toLowerCase();
			
			// 验证格式（优化：提前返回）
			if (!SUPPORTED_FORMATS.has(imageFormat)) {
				return errorResponse(`Unsupported format: ${imageFormat}`, 400);
			}
			
			// 尝试从缓存获取（优化：使用 Cloudflare Cache API）
			if (method === 'GET') {
				const cacheKey = new Request(url.toString(), request);
				const cache = caches.default;
				const cachedResponse = await cache.match(cacheKey);
				if (cachedResponse) {
					return cachedResponse;
				}
				
				// 处理并缓存响应
				const response = await handleImageConversion(request, imageFormat, url, env, ctx);
				if (response.status === 200) {
					ctx.waitUntil(cache.put(cacheKey, response.clone()));
				}
				return response;
			}
			
			return await handleImageConversion(request, imageFormat, url, env, ctx);
		}
		
		// 健康检查端点（优化：快速路径）
		if (pathname === '' || pathname === '/' || pathname === '/health') {
			return new Response(
				JSON.stringify({ status: 'ok' }),
				{ headers: JSON_HEADERS }
			);
		}
		
		return errorResponse('Not found', 404);
		
	} catch (e) {
		return errorResponse(`Internal server error: ${e.message}`, 500);
	}
}

// 导出 Worker 入口
export default {
	fetch: handleRequest
};
