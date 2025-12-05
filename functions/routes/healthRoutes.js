/**
 * 健康检查路由
 * 定义健康检查相关的路由
 */

import { Hono } from 'hono';
import { healthCheck } from '../controllers/healthController.js';

/**
 * 创建健康检查路由
 * @returns {Hono} 健康检查路由实例
 */
export function createHealthRoutes() {
	const router = new Hono();
	
	/**
	 * 健康检查路由
	 * GET /, GET /health
	 */
	router.get('/', healthCheck);
	router.get('/health', healthCheck);
	
	return router;
}

