"""
图片处理控制器
处理图片格式转换相关业务逻辑
"""

from flask import request, jsonify, send_file
from PIL import Image
import pillow_avif
import requests
from io import BytesIO

# 支持的图片格式
SUPPORTED_FORMATS = {'webp', 'jpeg', 'jpg', 'png', 'avif'}

# 最大图片大小（10MB）
MAX_IMAGE_SIZE = 10 * 1024 * 1024

# 默认图片质量
DEFAULT_QUALITY = 85

# 缓存最大有效期（1年）
CACHE_MAX_AGE = 31536000

# 图片转换最大尺寸
IMAGE_MAX_SIZE = 10000


def get_image_data():
	"""
	获取图片数据（从 URL 或请求体）
	:return: 图片数据（bytes）
	:raises: ValueError 当无法获取图片数据时
	"""
	if request.method == 'GET':
		# GET 请求：从查询参数获取图片 URL
		image_url = request.args.get('url')
		if not image_url:
			raise ValueError("Missing 'url' parameter for GET request")
		
		try:
			response = requests.get(image_url, timeout=30)
			response.raise_for_status()
			
			content_type = response.headers.get('Content-Type', '')
			if not content_type.startswith('image/'):
				raise ValueError('URL does not point to an image')
			
			return response.content
		except requests.RequestException as e:
			raise ValueError(f"Failed to fetch image: {str(e)}")
	else:
		# POST 请求：从请求体获取文件数据
		if not request.data:
			raise ValueError('Missing image data in request body')
		
		# 支持 multipart/form-data 格式
		if request.content_type and 'multipart/form-data' in request.content_type:
			if 'file' not in request.files:
				raise ValueError('Missing file in form data. Use field name: file')
			
			file = request.files['file']
			if not file or file.filename == '':
				raise ValueError('No file selected')
			
			# 验证文件类型
			if not file.content_type or not file.content_type.startswith('image/'):
				raise ValueError('Uploaded file must be an image')
			
			return file.read()
		else:
			# 支持直接发送二进制数据
			image_data = request.data
			if not image_data or len(image_data) == 0:
				raise ValueError('Missing image data in request body')
			return image_data


def validate_quality(quality):
	"""
	验证并解析质量参数
	:param quality: 质量参数
	:return: 质量值
	"""
	if not quality:
		return DEFAULT_QUALITY
	
	try:
		quality_value = int(quality)
		if quality_value < 1 or quality_value > 100:
			raise ValueError('Quality must be between 1 and 100')
		return quality_value
	except (ValueError, TypeError):
		raise ValueError('Quality must be between 1 and 100')


def validate_size(size):
	"""
	验证并解析尺寸参数
	:param size: 尺寸参数（格式：WIDTHxHEIGHT）
	:return: 尺寸选项字典或 None
	"""
	if not size:
		return None
	
	try:
		x_index = size.index('x')
		if x_index == 0 or x_index == len(size) - 1:
			raise ValueError('Size must be in format WIDTHxHEIGHT')
		
		width = int(size[:x_index])
		height = int(size[x_index + 1:])
		
		if width <= 0 or height <= 0 or width > IMAGE_MAX_SIZE or height > IMAGE_MAX_SIZE:
			raise ValueError('Invalid size parameter')
		
		return {'width': width, 'height': height, 'fit_method': 'contain'}
	except (ValueError, TypeError):
		raise ValueError('Size must be in format WIDTHxHEIGHT')


def convert_image(image_format):
	"""
	处理图片格式转换
	:param image_format: 目标图片格式
	:return: Flask Response 对象
	"""
	try:
		# 验证格式
		image_format_lower = image_format.lower()
		if image_format_lower not in SUPPORTED_FORMATS:
			return jsonify({'error': f'Unsupported format: {image_format}'}), 400
		
		# 解析查询参数
		quality = request.args.get('quality')
		size = request.args.get('size')
		
		# 验证参数
		try:
			quality_value = validate_quality(quality)
			size_options = validate_size(size)
		except ValueError as e:
			return jsonify({'error': str(e)}), 400
		
		# 获取图片数据
		try:
			image_data = get_image_data()
		except ValueError as e:
			return jsonify({'error': str(e)}), 400
		
		# 限制图片大小
		if len(image_data) > MAX_IMAGE_SIZE:
			return jsonify({
				'error': f'Image too large. Maximum size: {MAX_IMAGE_SIZE / 1024 / 1024}MB'
			}), 400
		
		# 打开图片
		try:
			image = Image.open(BytesIO(image_data))
			original_format = image.format.lower() if image.format else 'unknown'
		except Exception as e:
			return jsonify({'error': f'Failed to open image: {str(e)}'}), 400
		
		# 如果格式相同且无需调整，直接返回
		if original_format == image_format_lower and not size_options and quality_value == DEFAULT_QUALITY:
			output = BytesIO()
			image.save(output, format=image_format.upper())
			output.seek(0)
			return send_file(
				output,
				mimetype=f'image/{image_format_lower}',
				headers={'Cache-Control': f'public, max-age={CACHE_MAX_AGE}, immutable'}
			)
		
		# 调整尺寸（如果需要）
		if size_options:
			original_width, original_height = image.size
			target_width = size_options['width']
			target_height = size_options['height']
			fit_method = size_options['fit_method']
			
			if fit_method == 'contain':
				# 保持宽高比，完整显示
				ratio = min(target_width / original_width, target_height / original_height)
				new_width = int(original_width * ratio)
				new_height = int(original_height * ratio)
				image = image.resize((new_width, new_height), Image.Resampling.LANCZOS)
			elif fit_method == 'cover':
				# 保持宽高比，填满目标尺寸
				ratio = max(target_width / original_width, target_height / original_height)
				new_width = int(original_width * ratio)
				new_height = int(original_height * ratio)
				image = image.resize((new_width, new_height), Image.Resampling.LANCZOS)
				# 居中裁剪
				left = (new_width - target_width) // 2
				top = (new_height - target_height) // 2
				image = image.crop((left, top, left + target_width, top + target_height))
		
		# 转换图片格式并保存
		output = BytesIO()
		save_kwargs = {'format': image_format.upper()}
		if quality_value:
			save_kwargs['quality'] = quality_value
		
		image.save(output, **save_kwargs)
		output.seek(0)
		
		# 返回转换后的图片
		response = send_file(
			output,
			mimetype=f'image/{image_format_lower}',
			headers={
				'Cache-Control': f'public, max-age={CACHE_MAX_AGE}, immutable',
				'X-Original-Size': str(len(image_data)),
				'X-Converted-Size': str(output.tell())
			}
		)
		return response
		
	except Exception as e:
		return jsonify({'error': f'Failed to convert image: {str(e)}'}), 500

