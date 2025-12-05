/**
 * 常量定义
 * 集中管理所有常量配置
 */

/**
 * 支持的图片格式
 */
export const SUPPORTED_FORMATS = new Set(['webp', 'jpeg', 'jpg', 'png', 'avif']);

/**
 * 最大图片大小（10MB）
 */
export const MAX_IMAGE_SIZE = 10 * 1024 * 1024;

/**
 * 默认图片质量
 */
export const DEFAULT_QUALITY = 85;

/**
 * 缓存最大有效期（1年）
 */
export const CACHE_MAX_AGE = 31536000;

/**
 * JSON 响应头
 */
export const JSON_HEADERS = { 'Content-Type': 'application/json' };

/**
 * 缩略图最大尺寸
 */
export const THUMBNAIL_MAX_SIZE = 5000;

/**
 * 图片转换最大尺寸
 */
export const IMAGE_MAX_SIZE = 10000;

/**
 * 有效的裁剪模式
 */
export const VALID_FIT_METHODS = ['cover', 'contain', 'fill'];

