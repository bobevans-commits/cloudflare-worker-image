/**
 * 缩略图路由
 * 定义缩略图生成相关的路由
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
	 * GET/POST /thumb
	 */
	router.all('/thumb', generateThumbnail);
	
	return router;
}

