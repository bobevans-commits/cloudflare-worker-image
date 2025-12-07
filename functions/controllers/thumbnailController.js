/**
 * 缩略图控制器
 * 处理缩略图生成相关业务逻辑
 */

import { decodeImage, encodeImage, resizeImage, detectImageFormat } from '../utils/jsquash.js';
import { 
	MAX_IMAGE_SIZE, 
	DEFAULT_QUALITY, 
	CACHE_MAX_AGE, 
	SUPPORTED_FORMATS,
	THUMBNAIL_MAX_SIZE,
	VALID_FIT_METHODS,
	DEFAULT_THUMBNAIL_WIDTH,
	DEFAULT_THUMBNAIL_HEIGHT,
	DEFAULT_THUMBNAIL_FIT
} from '../constants.js';
import { getImageData } from './imageController.js';

/**
 * 验证并解析宽度和高度参数
 * 支持自适应：只提供 width 时高度按比例计算，只提供 height 时宽度按比例计算
 * 默认值：width=200, height=200
 * @param {string} width - 宽度参数
 * @param {string} height - 高度参数
 * @param {number} originalWidth - 原图宽度
 * @param {number} originalHeight - 原图高度
 * @returns {Object} 宽度和高度值
 */
function validateDimensions(width, height, originalWidth, originalHeight) {
	const hasWidth = width && width.trim() !== '';
	const hasHeight = height && height.trim() !== '';
	
	let widthValue, heightValue;
	
	if (hasWidth && hasHeight) {
		// 两者都提供，使用指定值
		widthValue = parseInt(width, 10);
		heightValue = parseInt(height, 10);
	} else if (hasWidth) {
		// 只提供宽度，高度按比例自适应
		widthValue = parseInt(width, 10);
		if (originalWidth > 0 && originalHeight > 0) {
			heightValue = Math.round((widthValue * originalHeight) / originalWidth);
		} else {
			heightValue = DEFAULT_THUMBNAIL_HEIGHT;
		}
	} else if (hasHeight) {
		// 只提供高度，宽度按比例自适应
		heightValue = parseInt(height, 10);
		if (originalWidth > 0 && originalHeight > 0) {
			widthValue = Math.round((heightValue * originalWidth) / originalHeight);
		} else {
			widthValue = DEFAULT_THUMBNAIL_WIDTH;
		}
	} else {
		// 两者都未提供，使用默认值
		widthValue = DEFAULT_THUMBNAIL_WIDTH;
		heightValue = DEFAULT_THUMBNAIL_HEIGHT;
	}
	
	// 验证数值有效性
	if (isNaN(widthValue) || isNaN(heightValue) || widthValue <= 0 || heightValue <= 0 || 
		widthValue > THUMBNAIL_MAX_SIZE || heightValue > THUMBNAIL_MAX_SIZE) {
		throw new Error(`Width and height must be between 1 and ${THUMBNAIL_MAX_SIZE}`);
	}
	
	return { widthValue, heightValue };
}

/**
 * 验证裁剪模式
 * 默认值：cover（等比例缩放，填满目标尺寸，禁止变形）
 * @param {string} fitMethod - 裁剪模式
 * @returns {string} 验证后的裁剪模式
 */
function validateFitMethod(fitMethod) {
	// 如果未提供参数，使用默认值
	if (!fitMethod) {
		return DEFAULT_THUMBNAIL_FIT;
	}
	
	const fitMethodValue = fitMethod.toLowerCase();
	if (!VALID_FIT_METHODS.includes(fitMethodValue)) {
		throw new Error(`Invalid fit method. Use one of: ${VALID_FIT_METHODS.join(', ')}`);
	}
	return fitMethodValue;
}

/**
 * 验证输出格式
 * @param {string} format - 输出格式
 * @returns {string} 验证后的格式
 */
function validateFormat(format) {
	const formatLower = format.toLowerCase();
	if (!SUPPORTED_FORMATS.has(formatLower)) {
		throw new Error(`Unsupported format: ${format}. Supported: ${Array.from(SUPPORTED_FORMATS).join(', ')}`);
	}
	return formatLower;
}

/**
 * 验证质量参数
 * 默认值：85
 * @param {string} quality - 质量参数
 * @returns {number} 质量值
 */
function validateQuality(quality) {
	// 如果未提供参数，使用默认值
	if (!quality) return DEFAULT_QUALITY;
	
	const qualityValue = parseInt(quality, 10);
	if (isNaN(qualityValue) || qualityValue < 1 || qualityValue > 100) {
		throw new Error('Quality must be between 1 and 100');
	}
	
	return qualityValue;
}

/**
 * 处理缩略图生成
 * 注意：缩略图统一使用 webp 格式输出
 * @param {Object} c - Hono 上下文对象
 * @returns {Promise<Response>} 缩略图响应
 */
export async function generateThumbnail(c) {
	try {
		// 解析查询参数
		const width = c.req.query('width') || c.req.query('w');
		const height = c.req.query('height') || c.req.query('h');
		const fitMethod = c.req.query('fit');
		const quality = c.req.query('quality') || c.req.query('q');
		// 缩略图统一使用 webp 格式，忽略用户传入的 format 参数
		const formatValue = 'webp';
		
		// 验证基础参数
		let fitMethodValue, qualityValue;
		try {
			fitMethodValue = validateFitMethod(fitMethod);
			qualityValue = validateQuality(quality);
		} catch (e) {
			return c.json({ error: e.message }, 400);
		}
		
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
		
		// 解码图片
		let decodedImageData;
		try {
			decodedImageData = await decodeImage(imageData, originalFormat);
		} catch (e) {
			return c.json({ error: `Failed to decode image: ${e.message}` }, 400);
		}
		
		// 获取原图尺寸，用于计算自适应尺寸
		const originalWidth = decodedImageData.width;
		const originalHeight = decodedImageData.height;
		
		// 验证并计算目标尺寸（支持自适应）
		let widthValue, heightValue;
		try {
			({ widthValue, heightValue } = validateDimensions(width, height, originalWidth, originalHeight));
		} catch (e) {
			return c.json({ error: e.message }, 400);
		}
		
		// 生成缩略图（调整尺寸）
		let thumbnailData;
		try {
			thumbnailData = await resizeImage(decodedImageData, {
				width: widthValue,
				height: heightValue,
				fitMethod: fitMethodValue
			});
		} catch (e) {
			return c.json({ error: `Failed to resize image: ${e.message}` }, 500);
		}
		
		// 编码为目标格式
		let thumbnailImage;
		try {
			thumbnailImage = await encodeImage(thumbnailData, formatValue, qualityValue);
		} catch (e) {
			return c.json({ error: `Failed to encode image: ${e.message}` }, 500);
		}
		
		// 返回缩略图（统一使用 webp 格式）
		return c.body(thumbnailImage, 200, {
			'Content-Type': 'image/webp',
			'Cache-Control': `public, max-age=${CACHE_MAX_AGE}, immutable`,
			'X-Thumbnail-Size': `${widthValue}x${heightValue}`,
			'X-Original-Size': imageData.byteLength.toString(),
			'X-Thumbnail-Size-Bytes': thumbnailImage.byteLength.toString(),
			'X-Format': 'webp' // 标识输出格式
		});
		
	} catch (e) {
		return c.json({ error: `Failed to generate thumbnail: ${e.message}` }, 500);
	}
}

