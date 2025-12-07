"""
Netlify Function - 图片格式转换
处理 /image/to/<format> 路由
"""

import os
import sys
import json
import base64

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
		body = event.get('body', '')
		is_base64_encoded = event.get('isBase64Encoded', False)
		
		# 解析路径参数（格式：/image/to/webp 或 /.netlify/functions/image）
		path_parts = [p for p in path.strip('/').split('/') if p and p != '.netlify' and p != 'functions']
		
		# 从路径中提取格式参数
		format_param = None
		
		# 方法1: 从路径中提取（/image/to/webp）
		if 'image' in path_parts and 'to' in path_parts:
			format_index = path_parts.index('to') + 1
			if format_index < len(path_parts):
				format_param = path_parts[format_index]
		
		# 方法2: 从查询参数获取（redirects 可能将格式作为查询参数）
		if not format_param:
			format_param = query_string.get('format') or query_string.get('_format')
		
		# 方法3: 从路径最后一部分获取（排除已知的路径部分）
		if not format_param and path_parts:
			# 排除 'image' 和 'to'，取最后一个作为格式
			filtered_parts = [p for p in path_parts if p not in ['image', 'to', 'thumb']]
			if filtered_parts:
				format_param = filtered_parts[-1]
		
		# 默认值
		if not format_param:
			format_param = 'webp'
		
		# 处理请求体
		request_data = None
		if body:
			if is_base64_encoded:
				request_data = base64.b64decode(body)
			else:
				request_data = body.encode('utf-8') if isinstance(body, str) else body
		
		# 转换 headers 格式（Netlify 可能使用小写键）
		flask_headers = {}
		for key, value in headers.items():
			# Flask 需要标准的 HTTP 头格式
			header_name = '-'.join([w.capitalize() for w in key.replace('_', '-').split('-')])
			flask_headers[header_name] = value
		
		# 创建 Flask 测试客户端环境
		with app.test_request_context(
			path=f'/image/to/{format_param}',
			method=method,
			query_string=query_string,
			headers=flask_headers,
			data=request_data
		):
			# 处理请求
			response = app.full_dispatch_request()
			
			# 构建响应
			response_data = response.get_data()
			response_headers = {}
			
			# 转换响应头格式
			for key, value in response.headers:
				response_headers[key] = value
			
			# 处理二进制数据
			if isinstance(response_data, bytes):
				response_body = base64.b64encode(response_data).decode('utf-8')
				response_is_base64 = True
			else:
				response_body = response_data.decode('utf-8') if isinstance(response_data, bytes) else str(response_data)
				response_is_base64 = False
			
			return {
				'statusCode': response.status_code,
				'headers': response_headers,
				'body': response_body,
				'isBase64Encoded': response_is_base64
			}
	except Exception as e:
		return {
			'statusCode': 500,
			'headers': {'Content-Type': 'application/json'},
			'body': json.dumps({'error': f'Internal server error: {str(e)}'}),
			'isBase64Encoded': False
		}

