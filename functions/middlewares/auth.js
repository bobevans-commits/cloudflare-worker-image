/**
 * 认证中间件
 * 验证 API Key
 */

/**
 * API Key 验证中间件
 * @param {Object} c - Hono 上下文对象
 * @param {Function} next - 下一个中间件
 */
export async function authMiddleware(c, next) {
	const apiKey = c.env?.API_KEY || c.env?.vars?.API_KEY || '123456';
	const requestApiKey = c.req.header('X-API-KEY');
	
	if (requestApiKey !== apiKey) {
		return c.json({ error: 'Unauthorized' }, 401);
	}
	
	await next();
}

