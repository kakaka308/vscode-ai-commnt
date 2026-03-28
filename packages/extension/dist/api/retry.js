"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.isRetryable = isRetryable;
exports.getRetryDelay = getRetryDelay;
exports.withRetry = withRetry;
const axios_1 = require("axios");
const vscode = __importStar(require("vscode"));
const error_1 = require("./error");
// 这些状态码值得重试：网络超时、频率限制、服务端异常
const RETRYABLE_STATUS = new Set([408, 429, 500, 502, 503, 504]);
/**
 * 判断这个错误是否值得重试
 * 401/403/400 这类是配置问题，重试没有意义
 */
function isRetryable(error) {
    if (error instanceof axios_1.AxiosError) {
        const status = error.response?.status ?? 0;
        // 有状态码：看是否在可重试列表里
        if (status > 0)
            return RETRYABLE_STATUS.has(status);
        // 没有状态码：网络层错误也可以重试
        return (error.code === 'ECONNABORTED' || // 连接超时
            error.code === 'ECONNRESET' || // 连接被重置
            error.code === 'ENOTFOUND' // DNS 解析失败
        );
    }
    return false;
}
/**
 * 计算重试等待时间
 * 429 优先读 Retry-After 响应头
 * 其他错误用指数退避 + 随机 Jitter
 */
function getRetryDelay(attempt, error) {
    // 429 优先读服务端告诉我们等多久
    if (error instanceof axios_1.AxiosError && error.response?.status === 429) {
        const retryAfter = error.response.headers['retry-after'];
        if (retryAfter) {
            const seconds = parseInt(retryAfter);
            if (!isNaN(seconds))
                return seconds * 1000;
        }
    }
    // 指数退避：1s, 2s, 4s
    const base = 1000 * Math.pow(2, attempt);
    // 随机 Jitter：0~500ms，避免多个用户同时重试打崩服务端
    const jitter = Math.random() * 500;
    return base + jitter;
}
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
/**
 * 带指数退避重试的包装函数
 *
 * 使用方式：
 * const response = await withRetry(
 *   () => axios.post(endpoint, body, config),
 *   { maxRetries: 2, signal: abortController.signal }
 * )
 */
async function withRetry(fn, options = {}) {
    const { maxRetries = 2, signal } = options;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            return await fn();
        }
        catch (error) {
            // 用户主动取消，立刻停止，不再重试
            if (signal?.aborted)
                throw error;
            // 不可重试的错误（401 Key 错误、400 参数错误等），直接抛出
            if (!isRetryable(error))
                throw error;
            // 已达最大重试次数，抛出最后一次的错误
            if (attempt === maxRetries)
                throw error;
            const delay = getRetryDelay(attempt, error);
            const status = (error instanceof axios_1.AxiosError) ? error.response?.status : undefined;
            const delaySeconds = Math.round(delay / 1000);
            // 状态栏告知用户正在重试
            vscode.window.setStatusBarMessage(`AI Comment: ${status === 429 ? '请求频繁，' : '网络异常，'}${delaySeconds}s 后重试（${attempt + 1}/${maxRetries}）...`, delay);
            await sleep(delay);
            // sleep 期间用户可能取消了
            if (signal?.aborted)
                throw error;
        }
    }
    // 理论上不会到这里，TypeScript 要求有返回值
    throw new error_1.AIError('重试次数耗尽');
}
