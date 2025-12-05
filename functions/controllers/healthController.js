/**
 * 健康检查控制器
 * 处理健康检查相关业务逻辑
 */

/**
 * 健康检查
 * @param {Object} c - Hono 上下文对象
 * @returns {Response} 健康状态响应
 */
export function healthCheck(c) {
	return c.json({ status: 'ok' });
}

