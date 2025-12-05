/**
 * 缓存中间件
 * 为 GET 请求提供缓存功能
 */

/**
 * 缓存中间件（仅 GET 请求）
 * @param {Object} c - Hono 上下文对象
 * @param {Function} next - 下一个中间件
 */
export async function cacheMiddleware(c, next) {
	if (c.req.method === 'GET') {
		const cacheKey = new Request(c.req.url, c.req.raw);
		const cache = caches.default;
		const cachedResponse = await cache.match(cacheKey);
		if (cachedResponse) {
			return cachedResponse;
		}
		
		await next();
		
		// 缓存响应（使用 Cloudflare 的 execution context）
		if (c.res.status === 200 && c.executionCtx) {
			c.executionCtx.waitUntil(cache.put(cacheKey, c.res.clone()));
		}
	} else {
		await next();
	}
}

