"""
图片路由
定义图片处理相关的路由（格式转换和缩略图生成）
"""

from flask import Blueprint
from ..controllers.image_controller import convert_image
from ..controllers.thumbnail_controller import generate_thumbnail

image_blue = Blueprint('image_blue', __name__)


@image_blue.route('/image/to/<format>', methods=['GET', 'POST'])
def convert_to_format(format):
	"""
	图片格式转换路由
	GET/POST /image/to/<format>
	
	参数说明：
	- format: 目标图片格式（webp, jpeg, png, avif）
	- url: 图片 URL（GET 请求必需）
	- quality: 图片质量（可选，默认 85，范围 1-100）
	- size: 图片尺寸（可选，格式：WIDTHxHEIGHT）
	"""
	return convert_image(format)


@image_blue.route('/image/thumb', methods=['GET', 'POST'])
def thumbnail():
	"""
	缩略图生成路由
	GET/POST /image/thumb
	
	参数说明（所有参数都是可选的，有默认值）：
	- url: 图片 URL（GET 请求必需）或通过 POST 上传文件
	- width: 宽度（可选，默认 200，支持自适应）
	- height: 高度（可选，默认 200，支持自适应）
	- fit: 裁剪模式（可选，默认 cover，可选值：cover, contain）
	- quality: 质量（可选，默认 85，范围 1-100）
	
	注意：输出格式固定为 webp
	"""
	return generate_thumbnail()


__all__ = ['image_blue']
