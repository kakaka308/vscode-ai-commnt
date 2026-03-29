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
exports.generateWholeFileComment = generateWholeFileComment;
const vscode = __importStar(require("vscode"));
const config_1 = require("../config/config");
const openai_1 = require("../api/openai");
const qwen_1 = require("../api/qwen");
const baidu_1 = require("../api/baidu");
const error_1 = require("../api/error");
const types_1 = require("../api/types");
function generateWholeFileComment() {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showErrorMessage('AI Comment: 未激活任何编辑器窗口！');
        return;
    }
    const document = editor.document;
    const fullCode = document.getText();
    if (!fullCode.trim()) {
        vscode.window.showErrorMessage('AI Comment: 当前文件内容为空！');
        return;
    }
    vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: 'AI Comment: 正在为全文件生成注释...',
        cancellable: true
    }, async (progress, token) => {
        const abortController = new AbortController();
        token.onCancellationRequested(() => abortController.abort());
        try {
            const isValid = await (0, config_1.validateConfig)();
            if (!isValid)
                return;
            const config = await (0, config_1.getExtensionConfig)();
            const language = config.targetLanguage === 'auto'
                ? document.languageId
                : config.targetLanguage;
            const params = {
                code: fullCode,
                language,
                commentStyle: config.commentStyle,
                isWholeFile: true
            };
            if (config.commentMode === 'detailed') {
                await streamWholeFile(editor, document, fullCode, config, params, abortController.signal);
            }
            else {
                const fn = getGenerateFn(config.aiProvider);
                const result = await fn(params, undefined, abortController.signal);
                await editor.edit(editBuilder => {
                    // 简洁模式：直接在顶部插入
                    editBuilder.insert(new vscode.Position(0, 0), result.comment + '\n\n');
                });
            }
            if (!abortController.signal.aborted) {
                vscode.window.showInformationMessage('AI Comment: 全文件注释生成成功！');
            }
        }
        catch (error) {
            if (abortController.signal.aborted)
                return;
            if (error instanceof error_1.AIError) {
                vscode.window.showErrorMessage(`AI Comment: ${error.message}`);
            }
            else {
                vscode.window.showErrorMessage(`AI Comment: 生成失败 → ${error.message}`);
            }
        }
    });
}
async function streamWholeFile(editor, document, originalCode, config, params, signal) {
    let initialized = false;
    // 【新增】编辑队列：确保流式片段按顺序写入，互不干扰
    let editQueue = Promise.resolve();
    const onChunk = async (chunk) => {
        if (signal.aborted)
            return;
        // 将编辑操作排队执行
        editQueue = editQueue.then(async () => {
            await editor.edit(editBuilder => {
                if (!initialized) {
                    // 第一次：用第一块内容替换整个文件的原始代码
                    const fullRange = new vscode.Range(document.positionAt(0), document.positionAt(document.getText().length));
                    editBuilder.replace(fullRange, chunk);
                    initialized = true;
                }
                else {
                    // 后续：动态获取当前文档的最末尾位置并插入
                    const lastLine = document.lineCount - 1;
                    const lastChar = document.lineAt(lastLine).text.length;
                    const endPos = new vscode.Position(lastLine, lastChar);
                    editBuilder.insert(endPos, chunk);
                }
            }, { undoStopBefore: false, undoStopAfter: false });
        });
        // 必须等待队列处理完该 chunk，再接收下一个
        await editQueue;
    };
    const fn = getGenerateFn(config.aiProvider);
    await fn(params, onChunk, signal);
    // 用户中途取消：恢复原始内容
    if (signal.aborted && initialized) {
        const currentRange = new vscode.Range(document.positionAt(0), document.positionAt(document.getText().length));
        await editor.edit(editBuilder => {
            editBuilder.replace(currentRange, originalCode);
        });
    }
}
function getGenerateFn(provider) {
    switch (provider) {
        case types_1.AIServiceProvider.OpenAI: return openai_1.generateCommentWithOpenAI;
        case types_1.AIServiceProvider.Qwen: return qwen_1.generateCommentWithQwen;
        case types_1.AIServiceProvider.Baidu: return baidu_1.generateCommentWithBaidu;
        default: throw new error_1.AIError(`不支持的 AI 服务商：${provider}`);
    }
}
