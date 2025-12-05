"""
图片处理工具模块
Cloudflare Workers Python 环境不支持外部依赖（如 Pillow），
因此直接使用 JavaScript Worker 或返回原始数据
"""
from workers import Request


async def convert_image(image_data, image_format, quality=None, size=None, js_worker=None):
    """
    将图片转换为指定格式，并根据条件压缩
    
    Args:
        image_data: bytes - 图片数据
        image_format: str - 目标格式（如 'WEBP', 'JPEG'）
        quality: int - 图片质量（0-100）
        size: str - 图片尺寸（如 "800x600"）
        js_worker: 可选的 JavaScript Worker service binding
    
    Returns:
        bytes - 转换后的图片数据
    """
    # Cloudflare Workers Python 不支持外部依赖，使用 JavaScript Worker 处理
    if js_worker:
        # 构建请求参数
        params = {'format': image_format.lower()}
        if quality:
            params['quality'] = str(quality)
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
        if response.status != 200:
            raise Exception(f"JS Worker returned status {response.status}")
        return await response.bytes()
    else:
        # 如果没有 JS Worker，返回原始数据
        # 在 Cloudflare Workers 环境中，建议配置 JS Worker service binding
        raise Exception("JS Worker binding is required for image conversion in Cloudflare Workers")

