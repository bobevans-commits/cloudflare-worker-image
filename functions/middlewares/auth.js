/**
 * 认证中间件
 * 验证 API Key
 * 
 * 环境变量配置：
 * - API_KEY: API Key（必需，如果启用认证）
 * - AUTH_ENABLED: 是否启用认证（可选，默认为 true）
 * - API_KEY_HEADER: API Key 请求头名称（可选，默认为 'X-API-KEY'）
 */

/**
 * API Key 验证中间件
 * @param {Object} c - Hono 上下文对象
 * @param {Function} next - 下一个中间件
 */
export async function authMiddleware(c, next) {
	// 从环境变量读取配置
	const authEnabled = c.env?.AUTH_ENABLED !== 'false' && c.env?.AUTH_ENABLED !== false;
	const apiKeyHeader = c.env?.API_KEY_HEADER || 'X-API-KEY';
	
	// 如果未启用认证，直接通过
	if (!authEnabled) {
		await next();
		return;
	}
	
	// 从环境变量获取 API Key（支持 secrets 和 vars）
	const apiKey = c.env?.API_KEY || c.env?.vars?.API_KEY;
	
	// 如果未配置 API Key，返回错误
	if (!apiKey) {
		return c.json({ 
			error: 'API Key not configured. Please set API_KEY in environment variables or secrets.' 
		}, 500);
	}
	
	// 获取请求中的 API Key
	const requestApiKey = c.req.header(apiKeyHeader);
	
	// 验证 API Key
	if (!requestApiKey || requestApiKey !== apiKey) {
		return c.json({ error: 'Unauthorized' }, 401);
	}
	
	await next();
}

