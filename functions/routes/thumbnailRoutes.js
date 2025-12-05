/**
 * 缩略图路由
 * 定义缩略图生成相关的路由
 * 
 * 注意：缩略图统一使用 webp 格式输出，忽略 format 参数
 */

import { Hono } from 'hono';
import { generateThumbnail } from '../controllers/thumbnailController.js';

/**
 * 创建缩略图路由
 * @returns {Hono} 缩略图路由实例
 */
export function createThumbnailRoutes() {
	const router = new Hono();
	
	/**
	 * 缩略图生成路由
	 * GET/POST /thumb?url=...&width=...&height=...&fit=...&quality=...
	 * 注意：输出格式固定为 webp，format 参数将被忽略
	 */
	router.all('/thumb', generateThumbnail);
	
	return router;
}

