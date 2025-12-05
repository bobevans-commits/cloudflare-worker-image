/**
 * 方法验证中间件
 * 只允许 GET 和 POST 方法
 */

/**
 * HTTP 方法验证中间件
 * @param {Object} c - Hono 上下文对象
 * @param {Function} next - 下一个中间件
 */
export async function methodMiddleware(c, next) {
	const method = c.req.method;
	if (method !== 'GET' && method !== 'POST') {
		return c.json({ error: 'Method not allowed' }, 405, {
			'Allow': 'GET, POST'
		});
	}
	
	await next();
}

