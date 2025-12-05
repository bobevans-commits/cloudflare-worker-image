/**
 * Cloudflare Worker 图片处理服务
 * 使用 Hono 框架提供图片格式转换和缩略图生成功能
 * 
 * 架构：
 * - controllers: 业务逻辑处理层
 * - middlewares: 中间件层（认证、方法验证、缓存等）
 * - routes: 路由定义层
 * 
 * 功能：
 * 1. 图片格式转换：/image/to/:format?url=...&quality=...&size=...
 * 2. 缩略图生成：/thumb?url=...&width=...&height=...&fit=...&format=...
 * 
 * 支持的格式：webp, jpeg, png, avif
 * 支持的请求方式：GET（通过 URL 参数）和 POST（通过文件上传）
 */

import { Hono } from 'hono';
import { authMiddleware, methodMiddleware, cacheMiddleware } from './middlewares/index.js';
import { createHealthRoutes, createThumbnailRoutes, createImageRoutes } from './routes/index.js';

// 创建 Hono 应用实例
const app = new Hono();

// 注册全局中间件
app.use('*', authMiddleware);
app.use('*', methodMiddleware);
app.use('*', cacheMiddleware);

// 注册路由
app.route('/', createHealthRoutes());
app.route('/', createThumbnailRoutes());
app.route('/', createImageRoutes());

/**
 * 404 处理
 */
app.notFound((c) => c.json({ error: 'Not found' }, 404));

/**
 * 错误处理
 */
app.onError((err, c) => {
	console.error(`${err}`);
	return c.json({ error: 'Internal server error', message: err.message }, 500);
});

/**
 * Cloudflare Worker 入口点
 * 导出 Hono 应用的 fetch 处理器
 */
export default app;
