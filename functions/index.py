from workers import WorkerEntrypoint, Response, Request, fetch
from urllib.parse import urlparse, parse_qs
import json
import sys
import os

# 添加 utils 目录到路径
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'utils'))
from image_processor import convert_image

class Default(WorkerEntrypoint):
    def __init__(self):
        super().__init__()
        self.api_key = None
    
    async def fetch(self, request, env, ctx):
        """处理请求的主函数 - 对应 server/__init__.py 的 Flask app"""
        # 从环境变量获取 API_KEY（对应 server/__init__.py 的配置）
        if self.api_key is None:
            self.api_key = env.get('API_KEY', '123456')
        
        try:
            url = urlparse(request.url)
            pathname = url.path
            
            # API Key 验证（对应 server/__init__.py 的 handler_before_request）
            api_key = request.headers.get('X-API-KEY')
            if api_key != self.api_key:
                return Response.json(
                    {"error": "Unauthorized"},
                    status=401
                )
            
            # 处理图片路由（对应 server/routes/image.py 的路由）
            if pathname.startswith('/image/to_'):
                # 提取格式，如 /image/to_webp -> webp
                format_part = pathname.replace('/image/to_', '')
                image_format = format_part.split('?')[0] if '?' in format_part else format_part
                
                return await self.handle_image_conversion(request, image_format, url, env)
            
            return Response.new('Not found', status=404)
        
        except Exception as e:
            return Response.new(f'Error: {str(e)}', status=500)
    
    async def handle_image_conversion(self, request, image_format, url, env):
        """处理图片格式转换 - 对应 server/routes/image.py 的 convert_to_format"""
        try:
            # 获取查询参数
            query_params = parse_qs(url.query)
            quality = query_params.get('quality', [None])[0]
            size = query_params.get('size', [None])[0]
            image_url = query_params.get('url', [None])[0]
            
            # 获取图片数据（对应 server/routes/image.py 的逻辑）
            if request.method == 'GET':
                if not image_url:
                    return Response.new("Missing 'url' parameter", status=400)
                try:
                    response = await fetch(image_url)
                    if response.status != 200:
                        return Response.new(f"Failed to fetch image: {response.status}", status=400)
                    image_data = await response.bytes()
                except Exception as e:
                    return Response.new(f"Failed to fetch image: {str(e)}", status=400)
            else:  # POST
                image_data = await request.bytes()
                if not image_data:
                    return Response.new("Missing image data", status=400)
            
            # 调用图片处理函数（对应 server/routes/image.py 的 convert_image）
            js_worker = env.get('JS_WORKER')  # 可选的 JS Worker service binding
            converted_image = await convert_image(
                image_data, 
                image_format.upper(), 
                quality=quality, 
                size=size,
                js_worker=js_worker
            )
            
            return Response.new(
                converted_image,
                headers={
                    'Content-Type': f'image/{image_format.lower()}',
                    'Cache-Control': 'public, max-age=31536000'
                }
            )
            
        except Exception as e:
            return Response.new(f"Failed to convert image: {str(e)}", status=500)

