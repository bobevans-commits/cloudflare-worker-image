from workers import WorkerEntrypoint, Response, fetch
from urllib.parse import urlparse, parse_qs
import sys
import os

# 添加 utils 目录到路径
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'utils'))
from image_processor import convert_image


class Default(WorkerEntrypoint):
    """Cloudflare Worker 入口点，处理图片格式转换请求"""
    
    # 支持的图片格式
    SUPPORTED_FORMATS = {'webp', 'jpeg', 'jpg', 'png', 'avif', 'gif'}
    
    async def fetch(self, request, env, ctx):
        """处理请求的主函数"""
        # 从环境变量获取 API_KEY（优先使用 secrets，然后 vars，最后默认值）
        api_key = getattr(env, 'API_KEY', None) or '123456'
        
        # API Key 验证
        request_api_key = request.headers.get('X-API-KEY')
        if request_api_key != api_key:
            return Response.json(
                {"error": "Unauthorized"},
                status=401
            )
        
        # 只允许 GET 和 POST 方法
        if request.method not in ('GET', 'POST'):
            return Response.json(
                {"error": "Method not allowed"},
                status=405,
                headers={"Allow": "GET, POST"}
            )
        
        try:
            url = urlparse(request.url)
            pathname = url.path.rstrip('/')
            
            # 处理图片路由: /image/to_{format}
            if pathname.startswith('/image/to_'):
                format_part = pathname.replace('/image/to_', '')
                image_format = format_part.split('/')[0].split('?')[0].lower()
                
                # 验证格式
                if image_format not in self.SUPPORTED_FORMATS:
                    return Response.json(
                        {"error": f"Unsupported format: {image_format}"},
                        status=400
                    )
                
                return await self.handle_image_conversion(request, image_format, url, env)
            
            # 健康检查端点
            if pathname == '' or pathname == '/' or pathname == '/health':
                return Response.json({"status": "ok"})
            
            return Response.json(
                {"error": "Not found"},
                status=404
            )
        
        except Exception as e:
            return Response.json(
                {"error": "Internal server error", "message": str(e)},
                status=500
            )
    
    async def handle_image_conversion(self, request, image_format, url, env):
        """处理图片格式转换"""
        try:
            # 解析查询参数
            query_params = parse_qs(url.query)
            quality = query_params.get('quality', [None])[0]
            size = query_params.get('size', [None])[0]
            image_url = query_params.get('url', [None])[0]
            
            # 验证质量参数
            if quality:
                try:
                    quality = int(quality)
                    if not (1 <= quality <= 100):
                        return Response.json(
                            {"error": "Quality must be between 1 and 100"},
                            status=400
                        )
                except ValueError:
                    return Response.json(
                        {"error": "Invalid quality parameter"},
                        status=400
                    )
            
            # 验证尺寸参数
            if size:
                try:
                    width, height = map(int, size.split('x'))
                    if width <= 0 or height <= 0 or width > 10000 or height > 10000:
                        return Response.json(
                            {"error": "Invalid size parameter"},
                            status=400
                        )
                except (ValueError, AttributeError):
                    return Response.json(
                        {"error": "Size must be in format WIDTHxHEIGHT"},
                        status=400
                    )
            
            # 获取图片数据
            if request.method == 'GET':
                if not image_url:
                    return Response.json(
                        {"error": "Missing 'url' parameter"},
                        status=400
                    )
                
                try:
                    response = await fetch(image_url)
                    if response.status != 200:
                        return Response.json(
                            {"error": f"Failed to fetch image: HTTP {response.status}"},
                            status=400
                        )
                    
                    content_type = response.headers.get('Content-Type', '')
                    if not content_type.startswith('image/'):
                        return Response.json(
                            {"error": "URL does not point to an image"},
                            status=400
                        )
                    
                    image_data = await response.bytes()
                except Exception as e:
                    return Response.json(
                        {"error": f"Failed to fetch image: {str(e)}"},
                        status=400
                    )
            else:  # POST
                content_type = request.headers.get('Content-Type', '')
                if not content_type.startswith('image/'):
                    return Response.json(
                        {"error": "Content-Type must be an image type"},
                        status=400
                    )
                
                image_data = await request.bytes()
                if not image_data:
                    return Response.json(
                        {"error": "Missing image data"},
                        status=400
                    )
            
            # 限制图片大小（例如 10MB）
            max_size = 10 * 1024 * 1024
            if len(image_data) > max_size:
                return Response.json(
                    {"error": f"Image too large. Maximum size: {max_size // 1024 // 1024}MB"},
                    status=400
                )
            
            # 获取可选的 JS Worker service binding
            js_worker = getattr(env, 'JS_WORKER', None) or env.get('JS_WORKER')
            
            # 转换图片
            converted_image = await convert_image(
                image_data,
                image_format.upper(),
                quality=quality,
                size=size,
                js_worker=js_worker
            )
            
            # 返回转换后的图片
            return Response.new(
                converted_image,
                headers={
                    'Content-Type': f'image/{image_format.lower()}',
                    'Cache-Control': 'public, max-age=31536000, immutable',
                    'X-Original-Size': str(len(image_data)),
                    'X-Converted-Size': str(len(converted_image))
                }
            )
        
        except ValueError as e:
            return Response.json(
                {"error": f"Invalid parameter: {str(e)}"},
                status=400
            )
        except Exception as e:
            return Response.json(
                {"error": "Failed to convert image", "message": str(e)},
                status=500
            )

