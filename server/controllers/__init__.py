"""
控制器模块
统一导出所有控制器
"""

from .image_controller import convert_image, get_image_data
from .thumbnail_controller import generate_thumbnail

__all__ = ['convert_image', 'get_image_data', 'generate_thumbnail']

