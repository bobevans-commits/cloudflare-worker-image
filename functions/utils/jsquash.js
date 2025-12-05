/**
 * 图片处理工具模块
 * 使用 @jsquash 库进行图片解码、编码和调整大小
 * 支持格式：JPEG, PNG, WebP, AVIF
 */

import decodeAVIF, { init as initAvifDecWasm } from '@jsquash/avif/decode';
import encodeAVIF, { init as initAvifEncWasm } from '@jsquash/avif/encode';
import decodeJpeg, { init as initJpegDecWasm } from '@jsquash/jpeg/decode';
import encodeJpeg, { init as initJpegEncWasm } from '@jsquash/jpeg/encode';
import decodePng, { init as initPngDecWasm } from '@jsquash/png/decode';
import encodePng, { init as initPngEncWasm } from '@jsquash/png/encode';
import decodeWebp, { init as initWebpDecWasm } from '@jsquash/webp/decode';
import encodeWebp, { init as initWebpEncWasm } from '@jsquash/webp/encode';
import resize, { initResize } from '@jsquash/resize';

/**
 * 手动导入 WASM 二进制文件
 * 注意：Cloudflare Workers 不支持动态导入，因此需要静态导入 WASM 文件
 */
import RESIZE_WASM from '../../node_modules/@jsquash/resize/lib/resize/pkg/squoosh_resize_bg.wasm';
// decode
import JPEG_DEC_WASM from '../../node_modules/@jsquash/jpeg/codec/dec/mozjpeg_dec.wasm';
import PNG_DEC_WASM from '../../node_modules/@jsquash/png/codec/pkg/squoosh_png_bg.wasm';
import AVIF_DEC_WASM from '../../node_modules/@jsquash/avif/codec/dec/avif_dec.wasm';
import WEBP_DEC_WASM from '../../node_modules/@jsquash/webp/codec/dec/webp_dec.wasm';
// encode
import JPEG_ENC_WASM from '../../node_modules/@jsquash/jpeg/codec/enc/mozjpeg_enc.wasm';
import PNG_ENC_WASM from '../../node_modules/@jsquash/png/codec/pkg/squoosh_png_bg.wasm';
import AVIF_ENC_WASM from '../../node_modules/@jsquash/avif/codec/enc/avif_enc.wasm';
import WEBP_ENC_WASM from '../../node_modules/@jsquash/webp/codec/enc/webp_enc_simd.wasm';

/**
 * WASM 模块初始化状态缓存
 * 避免每次请求都重新初始化 WASM 模块，提升性能
 */
const initState = {
	jpegDec: false,
	jpegEnc: false,
	pngDec: false,
	pngEnc: false,
	avifDec: false,
	avifEnc: false,
	webpDec: false,
	webpEnc: false,
	resize: false
};

/**
 * 检测图片格式
 * 通过读取文件头部的魔数（magic number）来识别图片格式
 * 使用 DataView 进行高效字节读取
 * 
 * @param {ArrayBuffer} buffer - 图片文件的二进制数据
 * @returns {string} 图片格式（'jpeg', 'png', 'webp', 'avif', 'unknown'）
 */
export const detectImageFormat = (buffer) => {
	if (buffer.byteLength < 12) return 'unknown';
	
	const view = new DataView(buffer);
	const firstByte = view.getUint8(0);
	
	// PNG: 89 50 4E 47 (最快检测)
	if (firstByte === 0x89 && view.getUint8(1) === 0x50 && view.getUint8(2) === 0x4E && view.getUint8(3) === 0x47) {
		return 'png';
	}
	
	// JPEG: FF D8 FF
	if (firstByte === 0xFF && view.getUint8(1) === 0xD8 && view.getUint8(2) === 0xFF) {
		return 'jpeg';
	}
	
	// WebP: RIFF...WEBP
	if (firstByte === 0x52 && view.getUint8(1) === 0x49 && view.getUint8(2) === 0x46 && view.getUint8(3) === 0x46) {
		if (view.getUint8(8) === 0x57 && view.getUint8(9) === 0x45 && view.getUint8(10) === 0x42 && view.getUint8(11) === 0x50) {
			return 'webp';
		}
	}
	
	// AVIF: ftyp...avif
	if (view.getUint8(4) === 0x66 && view.getUint8(5) === 0x74 && view.getUint8(6) === 0x79 && view.getUint8(7) === 0x70) {
		// 优化：直接检查字节而不是转换为字符串
		const bytes = new Uint8Array(buffer, 8, 4);
		if (bytes[0] === 0x61 && bytes[1] === 0x76 && bytes[2] === 0x69 && bytes[3] === 0x66) {
			return 'avif';
		}
	}
	
	return 'unknown';
};

/**
 * 解码图片
 * 将压缩的图片格式（JPEG, PNG, WebP, AVIF）解码为原始图像数据
 * 
 * @param {ArrayBuffer} buffer - 压缩图片的二进制数据
 * @param {string} format - 图片格式（'jpeg', 'png', 'webp', 'avif'）
 * @returns {Promise<ImageData>} 解码后的图像数据对象
 * @throws {Error} 当格式不支持时抛出错误
 */
export const decodeImage = async (buffer, format) => {
	const formatLower = format.toLowerCase();
	
	if (formatLower === 'jpeg' || formatLower === 'jpg') {
		if (!initState.jpegDec) {
			await initJpegDecWasm(JPEG_DEC_WASM);
			initState.jpegDec = true;
		}
		return decodeJpeg(buffer);
	} else if (formatLower === 'png') {
		if (!initState.pngDec) {
			await initPngDecWasm(PNG_DEC_WASM);
			initState.pngDec = true;
		}
		return decodePng(buffer);
	} else if (formatLower === 'avif') {
		if (!initState.avifDec) {
			await initAvifDecWasm(AVIF_DEC_WASM);
			initState.avifDec = true;
		}
		return decodeAVIF(buffer);
	} else if (formatLower === 'webp') {
		if (!initState.webpDec) {
			await initWebpDecWasm(WEBP_DEC_WASM);
			initState.webpDec = true;
		}
		return decodeWebp(buffer);
	}
	throw new Error(`Unsupported decode format: ${format}`);
};

/**
 * 编码图片
 * 将原始图像数据编码为指定格式的压缩图片
 * 
 * @param {ImageData} imageData - 原始图像数据对象
 * @param {string} format - 目标图片格式（'WEBP', 'JPEG', 'PNG', 'AVIF'）
 * @param {number} quality - 图片质量（1-100），仅对 JPEG、WebP、AVIF 有效，PNG 忽略此参数
 * @returns {Promise<Uint8Array>} 编码后的图片二进制数据
 * @throws {Error} 当格式不支持时抛出错误
 */
export const encodeImage = async (imageData, format, quality = 85) => {
	const formatUpper = format.toUpperCase();
	const qualityValue = quality ? Math.max(1, Math.min(100, quality)) : 85;
	
	if (formatUpper === 'WEBP') {
		if (!initState.webpEnc) {
			await initWebpEncWasm(WEBP_ENC_WASM);
			initState.webpEnc = true;
		}
		return await encodeWebp(imageData, { quality: qualityValue });
	} else if (formatUpper === 'JPEG' || formatUpper === 'JPG') {
		if (!initState.jpegEnc) {
			await initJpegEncWasm(JPEG_ENC_WASM);
			initState.jpegEnc = true;
		}
		return await encodeJpeg(imageData, { quality: qualityValue });
	} else if (formatUpper === 'PNG') {
		if (!initState.pngEnc) {
			await initPngEncWasm(PNG_ENC_WASM);
			initState.pngEnc = true;
		}
		return await encodePng(imageData);
	} else if (formatUpper === 'AVIF') {
		if (!initState.avifEnc) {
			await initAvifEncWasm(AVIF_ENC_WASM);
			initState.avifEnc = true;
		}
		return await encodeAVIF(imageData, { quality: qualityValue });
	}
	throw new Error(`Unsupported encode format: ${format}`);
};

/**
 * 调整图片大小
 * 将图片调整到指定尺寸，支持多种适配模式
 * 
 * @param {ImageData} imageData - 原始图像数据对象
 * @param {Object} options - 调整选项
 * @param {number} options.width - 目标宽度（像素）
 * @param {number} options.height - 目标高度（像素）
 * @param {string} options.fitMethod - 适配模式：'contain'（保持宽高比，完整显示）、'cover'（保持宽高比，填充）、'fill'（拉伸填充）
 * @returns {Promise<ImageData>} 调整后的图像数据对象
 */
export const resizeImage = async (imageData, options = { width: 1280, height: 720, fitMethod: 'contain' }) => {
	if (!initState.resize) {
		await initResize(RESIZE_WASM);
		initState.resize = true;
	}
	return await resize(imageData, options);
};
