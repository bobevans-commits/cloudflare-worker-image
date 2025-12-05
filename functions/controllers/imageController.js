/**
 * 图片处理控制器
 * 处理图片格式转换相关业务逻辑
 */

import { decodeImage, encodeImage, resizeImage, detectImageFormat } from '../utils/jsquash.js';
import { 
	MAX_IMAGE_SIZE, 
	DEFAULT_QUALITY, 
	CACHE_MAX_AGE, 
	SUPPORTED_FORMATS 
} from '../constants.js';

/**
 * 获取图片数据（从 URL 或请求体）
 * @param {Object} c - Hono 上下文对象
 * @returns {Promise<ArrayBuffer>} 图片数据
 */
export async function getImageData(c) {
	const request = c.req.raw;
	const imageUrl = c.req.query('url');
	
	if (request.method === 'GET') {
		// GET 请求：从查询参数获取图片 URL
		if (!imageUrl) {
			throw new Error("Missing 'url' parameter for GET request");
		}
		
		const response = await fetch(imageUrl, {
			cf: { cacheTtl: 3600, cacheEverything: false }
		});
		
		if (response.status !== 200) {
			throw new Error(`Failed to fetch image: HTTP ${response.status}`);
		}
		
		const contentType = response.headers.get('Content-Type');
		if (!contentType || !contentType.startsWith('image/')) {
			throw new Error('URL does not point to an image');
		}
		
		return await response.arrayBuffer();
	} else {
		// POST 请求：从请求体获取 file/blob 数据
		const contentType = request.headers.get('Content-Type') || '';
		
		// 支持 multipart/form-data 格式
		if (contentType.includes('multipart/form-data')) {
			const formData = await request.formData();
			const file = formData.get('file') || formData.get('image') || formData.get('blob');
			
			if (!file || !(file instanceof File)) {
				throw new Error('Missing file in form data. Use field name: file, image, or blob');
			}
			
			// 验证文件类型
			if (!file.type.startsWith('image/')) {
				throw new Error('Uploaded file must be an image');
			}
			
			return await file.arrayBuffer();
		} else {
			// 支持直接发送二进制数据（blob/file）
			const imageData = await request.arrayBuffer();
			if (!imageData || imageData.byteLength === 0) {
				throw new Error('Missing image data in request body');
			}
			return imageData;
		}
	}
}

/**
 * 验证并解析质量参数
 * @param {string} quality - 质量参数
 * @returns {number} 质量值
 */
function validateQuality(quality) {
	if (!quality) return DEFAULT_QUALITY;
	
	const qualityValue = parseInt(quality, 10);
	if (isNaN(qualityValue) || qualityValue < 1 || qualityValue > 100) {
		throw new Error('Quality must be between 1 and 100');
	}
	
	return qualityValue;
}

/**
 * 验证并解析尺寸参数
 * @param {string} size - 尺寸参数（格式：WIDTHxHEIGHT）
 * @returns {Object|null} 尺寸选项或 null
 */
function validateSize(size) {
	if (!size) return null;
	
	const xIndex = size.indexOf('x');
	if (xIndex === -1 || xIndex === 0 || xIndex === size.length - 1) {
		throw new Error('Size must be in format WIDTHxHEIGHT');
	}
	
	const width = parseInt(size.substring(0, xIndex), 10);
	const height = parseInt(size.substring(xIndex + 1), 10);
	
	if (isNaN(width) || isNaN(height) || width <= 0 || height <= 0 || width > 10000 || height > 10000) {
		throw new Error('Invalid size parameter');
	}
	
	return { width, height, fitMethod: 'contain' };
}

/**
 * 处理图片格式转换
 * @param {Object} c - Hono 上下文对象
 * @param {string} imageFormat - 目标图片格式
 * @returns {Promise<Response>} 转换后的图片响应
 */
export async function convertImage(c, imageFormat) {
	try {
		// 解析查询参数
		const quality = c.req.query('quality');
		const size = c.req.query('size');
		
		// 验证参数
		const qualityValue = validateQuality(quality);
		const sizeOptions = validateSize(size);
		
		// 获取图片数据
		let imageData;
		try {
			imageData = await getImageData(c);
		} catch (e) {
			return c.json({ error: e.message }, 400);
		}
		
		// 限制图片大小
		if (imageData.byteLength > MAX_IMAGE_SIZE) {
			return c.json({ error: `Image too large. Maximum size: ${MAX_IMAGE_SIZE / 1024 / 1024}MB` }, 400);
		}
		
		// 检测原始图片格式
		const originalFormat = detectImageFormat(imageData);
		if (originalFormat === 'unknown') {
			return c.json({ error: 'Unsupported image format' }, 400);
		}
		
		// 如果格式相同且无需调整，直接返回
		if (originalFormat === imageFormat && !sizeOptions && qualityValue === DEFAULT_QUALITY) {
			return c.body(imageData, 200, {
				'Content-Type': `image/${imageFormat}`,
				'Cache-Control': `public, max-age=${CACHE_MAX_AGE}, immutable`
			});
		}
		
		// 解码图片
		let decodedImageData;
		try {
			decodedImageData = await decodeImage(imageData, originalFormat);
		} catch (e) {
			return c.json({ error: `Failed to decode image: ${e.message}` }, 400);
		}
		
		// 调整尺寸（如果需要）
		if (sizeOptions) {
			try {
				decodedImageData = await resizeImage(decodedImageData, sizeOptions);
			} catch (e) {
				return c.json({ error: `Failed to resize image: ${e.message}` }, 500);
			}
		}
		
		// 编码为目标格式
		let convertedImage;
		try {
			convertedImage = await encodeImage(decodedImageData, imageFormat, qualityValue);
		} catch (e) {
			return c.json({ error: `Failed to encode image: ${e.message}` }, 500);
		}
		
		// 返回转换后的图片
		return c.body(convertedImage, 200, {
			'Content-Type': `image/${imageFormat.toLowerCase()}`,
			'Cache-Control': `public, max-age=${CACHE_MAX_AGE}, immutable`,
			'X-Original-Size': imageData.byteLength.toString(),
			'X-Converted-Size': convertedImage.byteLength.toString()
		});
		
	} catch (e) {
		return c.json({ error: `Failed to convert image: ${e.message}` }, 500);
	}
}

