"""
健康检查路由
定义健康检查相关的路由
"""

from flask import Blueprint, jsonify

health_blue = Blueprint('health_blue', __name__)


@health_blue.route('/', methods=['GET'])
@health_blue.route('/health', methods=['GET'])
def health_check():
	"""
	健康检查路由
	GET /, GET /health
	"""
	return jsonify({
		'status': 'ok',
		'service': 'image-processing-service',
		'endpoints': {
			'image_conversion': '/image/to/<format>',
			'thumbnail': '/image/thumb'
		}
	})


__all__ = ['health_blue']

