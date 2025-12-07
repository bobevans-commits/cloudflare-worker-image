"""
缩略图控制器
处理缩略图生成相关业务逻辑
"""

from flask import request, jsonify, send_file
from PIL import Image
import pillow_avif
from io import BytesIO
from .image_controller import get_image_data, MAX_IMAGE_SIZE, DEFAULT_QUALITY, CACHE_MAX_AGE

# 缩略图最大尺寸
THUMBNAIL_MAX_SIZE = 5000

# 缩略图默认宽度
DEFAULT_THUMBNAIL_WIDTH = 200

# 缩略图默认高度
DEFAULT_THUMBNAIL_HEIGHT = 200

# 缩略图默认裁剪模式
DEFAULT_THUMBNAIL_FIT = 'cover'

# 有效的裁剪模式
VALID_FIT_METHODS = ['cover', 'contain']


def validate_dimensions(width, height, original_width, original_height):
	"""
	验证并解析宽度和高度参数
	支持自适应：只提供 width 时高度按比例计算，只提供 height 时宽度按比例计算
	:param width: 宽度参数
	:param height: 高度参数
	:param original_width: 原图宽度
	:param original_height: 原图高度
	:return: 宽度和高度值
	"""
	has_width = width and width.strip() != ''
	has_height = height and height.strip() != ''
	
	if has_width and has_height:
		# 两者都提供，使用指定值
		width_value = int(width)
		height_value = int(height)
	elif has_width:
		# 只提供宽度，高度按比例自适应
		width_value = int(width)
		if original_width > 0 and original_height > 0:
			height_value = round((width_value * original_height) / original_width)
		else:
			height_value = DEFAULT_THUMBNAIL_HEIGHT
	elif has_height:
		# 只提供高度，宽度按比例自适应
		height_value = int(height)
		if original_width > 0 and original_height > 0:
			width_value = round((height_value * original_width) / original_height)
		else:
			width_value = DEFAULT_THUMBNAIL_WIDTH
	else:
		# 两者都未提供，使用默认值
		width_value = DEFAULT_THUMBNAIL_WIDTH
		height_value = DEFAULT_THUMBNAIL_HEIGHT
	
	# 验证数值有效性
	if width_value <= 0 or height_value <= 0 or \
		width_value > THUMBNAIL_MAX_SIZE or height_value > THUMBNAIL_MAX_SIZE:
		raise ValueError(f'Width and height must be between 1 and {THUMBNAIL_MAX_SIZE}')
	
	return width_value, height_value


def validate_fit_method(fit_method):
	"""
	验证裁剪模式
	:param fit_method: 裁剪模式
	:return: 验证后的裁剪模式
	"""
	if not fit_method:
		return DEFAULT_THUMBNAIL_FIT
	
	fit_method_value = fit_method.lower()
	if fit_method_value not in VALID_FIT_METHODS:
		raise ValueError(f'Invalid fit method. Use one of: {", ".join(VALID_FIT_METHODS)}')
	
	return fit_method_value


def validate_quality(quality):
	"""
	验证质量参数
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


def generate_thumbnail():
	"""
	处理缩略图生成
	注意：缩略图统一使用 webp 格式输出
	:return: Flask Response 对象
	"""
	try:
		# 解析查询参数
		width = request.args.get('width') or request.args.get('w')
		height = request.args.get('height') or request.args.get('h')
		fit_method = request.args.get('fit')
		quality = request.args.get('quality') or request.args.get('q')
		
		# 缩略图统一使用 webp 格式
		format_value = 'webp'
		
		# 验证基础参数
		try:
			fit_method_value = validate_fit_method(fit_method)
			quality_value = validate_quality(quality)
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
			original_width, original_height = image.size
		except Exception as e:
			return jsonify({'error': f'Failed to open image: {str(e)}'}), 400
		
		# 验证并计算目标尺寸（支持自适应）
		try:
			width_value, height_value = validate_dimensions(
				width, height, original_width, original_height
			)
		except ValueError as e:
			return jsonify({'error': str(e)}), 400
		
		# 生成缩略图（调整尺寸）
		try:
			if fit_method_value == 'contain':
				# 保持宽高比，完整显示
				ratio = min(width_value / original_width, height_value / original_height)
				new_width = int(original_width * ratio)
				new_height = int(original_height * ratio)
				image = image.resize((new_width, new_height), Image.Resampling.LANCZOS)
			elif fit_method_value == 'cover':
				# 保持宽高比，填满目标尺寸
				ratio = max(width_value / original_width, height_value / original_height)
				new_width = int(original_width * ratio)
				new_height = int(original_height * ratio)
				image = image.resize((new_width, new_height), Image.Resampling.LANCZOS)
				# 居中裁剪
				left = (new_width - width_value) // 2
				top = (new_height - height_value) // 2
				image = image.crop((left, top, left + width_value, top + height_value))
		except Exception as e:
			return jsonify({'error': f'Failed to resize image: {str(e)}'}), 500
		
		# 编码为目标格式（webp）
		output = BytesIO()
		image.save(output, format='WEBP', quality=quality_value)
		output.seek(0)
		
		# 返回缩略图
		response = send_file(
			output,
			mimetype='image/webp',
			headers={
				'Cache-Control': f'public, max-age={CACHE_MAX_AGE}, immutable',
				'X-Thumbnail-Size': f'{width_value}x{height_value}',
				'X-Original-Size': str(len(image_data)),
				'X-Thumbnail-Size-Bytes': str(output.tell()),
				'X-Format': 'webp'
			}
		)
		return response
		
	except Exception as e:
		return jsonify({'error': f'Failed to generate thumbnail: {str(e)}'}), 500

