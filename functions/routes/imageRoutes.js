/**
 * 图片路由
 * 定义图片处理相关的路由（格式转换和缩略图生成）
 */

import { Hono } from 'hono';
import { convertImage } from '../controllers/imageController.js';
import { generateThumbnail } from '../controllers/thumbnailController.js';
import { SUPPORTED_FORMATS } from '../constants.js';

/**
 * 创建图片路由
 * @returns {Hono} 图片路由实例
 */
export function createImageRoutes() {
	const router = new Hono();
	
	/**
	 * 图片格式转换路由
	 * GET/POST /image/to/:format
	 */
	router.all('/image/to/:format', async (c) => {
		const imageFormat = c.req.param('format').toLowerCase();
		
		// 验证格式
		if (!SUPPORTED_FORMATS.has(imageFormat)) {
			return c.json({ error: `Unsupported format: ${imageFormat}` }, 400);
		}
		
		return convertImage(c, imageFormat);
	});
	
	/**
	 * 缩略图生成路由
	 * GET/POST /image/thumb?url=...&width=...&height=...&fit=...&quality=...
	 * 
	 * 参数说明（所有参数都是可选的，有默认值）：
	 * - url: 图片 URL（必需，GET 请求）或通过 POST 上传文件
	 * - width: 宽度（可选，默认 200）
	 * - height: 高度（可选，默认 200）
	 * - fit: 裁剪模式（可选，默认 cover，可选值：cover, contain, fill）
	 * - quality: 质量（可选，默认 85，范围 1-100）
	 * 
	 * 注意：输出格式固定为 webp，format 参数将被忽略
	 */
	router.all('/image/thumb', generateThumbnail);
	
	return router;
}

