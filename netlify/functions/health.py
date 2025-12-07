"""
Netlify Function - 健康检查
处理 / 和 /health 路由
"""

import os
import sys
import json

# 添加 server 目录到路径
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../../'))

from server import create_app

app = create_app()


def handler(event, context):
	"""
	Netlify Function 处理函数
	"""
	try:
		# 从 event 中提取路径和方法
		path = event.get('path', '')
		method = event.get('httpMethod', 'GET')
		query_string = event.get('queryStringParameters') or {}
		headers = event.get('headers') or {}
		
		# 创建 Flask 测试客户端环境
		with app.test_request_context(
			path=path if path else '/',
			method=method,
			query_string=query_string,
			headers=headers
		):
			# 处理请求
			response = app.full_dispatch_request()
			
			# 构建响应
			response_data = response.get_data()
			response_headers = {}
			
			# 转换响应头格式
			for key, value in response.headers:
				response_headers[key] = value
			
			# 处理响应数据
			if isinstance(response_data, bytes):
				response_body = response_data.decode('utf-8')
			else:
				response_body = str(response_data)
			
			return {
				'statusCode': response.status_code,
				'headers': response_headers,
				'body': response_body,
				'isBase64Encoded': False
			}
	except Exception as e:
		return {
			'statusCode': 500,
			'headers': {'Content-Type': 'application/json'},
			'body': json.dumps({'error': f'Internal server error: {str(e)}'}),
			'isBase64Encoded': False
		}

