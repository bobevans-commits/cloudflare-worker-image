# 导入Flask类
import os

from flask import Flask, request, jsonify
# 导入蓝图
from .routes.image import image_blue

# 实例化，可视为固定格式
app = Flask(__name__)

# 从环境变量读取配置
AUTH_ENABLED = os.environ.get('AUTH_ENABLED', 'true').lower() != 'false'
API_KEY_HEADER = os.environ.get('API_KEY_HEADER', 'X-API-KEY')
API_KEY = os.environ.get('API_KEY', '')

# 支持多个 API Key（用逗号分隔）
if API_KEY:
	VALID_API_KEYS = [key.strip() for key in API_KEY.split(',') if key.strip()]
else:
	VALID_API_KEYS = []


# request 拦截器
# 如果 handler_before_request 返回 None，Flask 会继续处理请求，调用相应的视图函数
@app.before_request
def handler_before_request():
	# 记录请求信息（用于调试）
	import logging
	logger = logging.getLogger(__name__)
	logger.setLevel(logging.INFO)
	
	# 打印请求信息到控制台（Vercel 会捕获这些日志）
	print(f"[REQUEST] Method: {request.method}, Path: {request.path}, Headers: {dict(request.headers)}")
	
	# 处理 OPTIONS 请求（CORS 预检）
	if request.method == 'OPTIONS':
		response = jsonify({})
		response.headers['Access-Control-Allow-Origin'] = '*'
		response.headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS'
		response.headers['Access-Control-Allow-Headers'] = 'Content-Type, X-API-KEY'
		return response
	
	# 如果未启用认证，直接通过
	if not AUTH_ENABLED:
		print("[AUTH] Authentication disabled, allowing request")
		return None
	
	# 如果未配置 API Key，返回错误
	if not VALID_API_KEYS:
		print("[AUTH] No API keys configured")
		return jsonify({
			"error": "API Key not configured. Please set API_KEY in environment variables."
		}), 500
	
	# 检查请求头中是否包含 API Key
	# 支持多种可能的请求头格式（Vercel 可能会转换请求头）
	request_api_key = (
		request.headers.get(API_KEY_HEADER) or
		request.headers.get(API_KEY_HEADER.lower()) or
		request.headers.get(API_KEY_HEADER.upper()) or
		request.headers.get('x-api-key') or
		request.headers.get('X-API-KEY')
	)
	
	print(f"[AUTH] API Key header: {API_KEY_HEADER}, Received: {bool(request_api_key)}")
	
	# 验证 API Key（检查是否在有效列表中）
	if not request_api_key or request_api_key not in VALID_API_KEYS:
		print(f"[AUTH] Unauthorized - Invalid or missing API Key")
		return jsonify({
			"error": "Unauthorized",
			"message": "Invalid or missing API Key",
			"header_name": API_KEY_HEADER
		}), 401
	
	print("[AUTH] API Key validated successfully")
	# 如果 API Key 有效，继续处理请求
	return None


# response 拦截器
@app.after_request
def handler_after_request(response):
	# 记录响应信息（用于调试）
	print(f"[RESPONSE] Status: {response.status_code}, Path: {request.path}")
	
	# 添加 CORS 头（如果需要）
	response.headers['Access-Control-Allow-Origin'] = '*'
	response.headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS'
	response.headers['Access-Control-Allow-Headers'] = 'Content-Type, X-API-KEY'
	return response


# 创建app
def create_app():
	# 注册蓝图
	app.register_blueprint(blueprint=image_blue)
	return app


#
if __name__ == "__main__":
	# 创建app
	app = create_app()
	# 启动服务
	app.run(debug=True, port=os.getenv("PORT", default=5000))

# 在模块中定义 __all__ 变量，可以控制 from module import * 时哪些变量会被导出
__all__ = ["create_app"]
