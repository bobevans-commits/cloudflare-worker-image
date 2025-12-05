/**
 * 图片路由
 * 定义图片处理相关的路由
 */

import { Hono } from 'hono';
import { convertImage } from '../controllers/imageController.js';
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
	
	return router;
}

