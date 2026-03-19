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
                const result = await fn(params);
                await editor.edit(editBuilder => {
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
    const onChunk = async (chunk) => {
        if (signal.aborted)
            return;
        if (!initialized) {
            const fullRange = new vscode.Range(document.positionAt(0), document.positionAt(originalCode.length));
            await editor.edit(editBuilder => {
                editBuilder.replace(fullRange, chunk);
            });
            initialized = true;
        }
        else {
            // 全文件场景直接读文档末尾，比追踪 currentPos 更可靠
            const lastLine = document.lineCount - 1;
            const lastChar = document.lineAt(lastLine).text.length;
            const endPos = new vscode.Position(lastLine, lastChar);
            await editor.edit(editBuilder => {
                editBuilder.insert(endPos, chunk);
            });
        }
    };
    const fn = getGenerateFn(config.aiProvider);
    await fn(params, onChunk);
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
