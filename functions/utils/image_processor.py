"""
图片处理工具模块
适配 server/routes/image.py 的 convert_image 函数
由于 Pillow 在 Cloudflare Workers 中可能不可用，这里提供两种方案：
1. 如果 Pillow 可用，直接使用
2. 如果不可用，调用 JavaScript Worker 处理
"""
from workers import fetch, Request, Response
from io import BytesIO

async def convert_image(image_data, image_format, quality=None, size=None, js_worker=None):
    """
    将图片转换为指定格式，并根据条件压缩
    对应 server/routes/image.py 的 convert_image 函数
    
    Args:
        image_data: bytes - 图片数据
        image_format: str - 目标格式（如 'WEBP', 'JPEG'）
        quality: int - 图片质量（0-100）
        size: str - 图片尺寸（如 "800x600"）
        js_worker: 可选的 JavaScript Worker service binding
    
    Returns:
        bytes - 转换后的图片数据
    """
    try:
        # 尝试使用 Pillow（如果可用）
        try:
            from PIL import Image
            import pillow_avif
            
            image = Image.open(BytesIO(image_data))
            
            # 调整图片尺寸（如果指定了 size）
            if size:
                target_width, target_height = map(int, size.split('x'))
                original_width, original_height = image.size
                
                # 计算保持宽高比的尺寸
                ratio = min(target_width / original_width, target_height / original_height)
                new_width = int(original_width * ratio)
                new_height = int(original_height * ratio)
                
                # 调整图片尺寸
                image = image.resize((new_width, new_height), Image.Resampling.LANCZOS)
            
            # 转换图片格式并保存
            output = BytesIO()
            save_kwargs = {'format': image_format}
            if quality:
                save_kwargs['quality'] = int(quality)
            
            image.save(output, **save_kwargs)
            output.seek(0)
            return output.read()
        
        except ImportError:
            # Pillow 不可用，使用 JavaScript Worker
            if js_worker:
                # 构建请求参数
                params = {'format': image_format.lower()}
                if quality:
                    params['quality'] = quality
                if size:
                    params['size'] = size
                
                query_string = '&'.join([f"{k}={v}" for k, v in params.items()])
                js_request = Request.new(
                    f"/convert?{query_string}",
                    method='POST',
                    body=image_data,
                    headers={'Content-Type': 'application/octet-stream'}
                )
                response = await js_worker.fetch(js_request)
                return await response.bytes()
            else:
                # 如果没有 JS Worker，返回原始数据
                # 实际应用中应该抛出错误或使用其他方案
                raise Exception("Pillow not available and no JS Worker provided")
    
    except Exception as e:
        raise Exception(f"Failed to convert image: {str(e)}")

