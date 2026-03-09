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
        cancellable: false
    }, async () => {
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
                // 详细模式：流式写入，替换整个文件内容
                await streamWholeFile(editor, document, fullCode, config, params);
            }
            else {
                // 简洁模式：普通请求，在文件第一行插入一句话总结
                const fn = getGenerateFn(config.aiProvider);
                const result = await fn(params);
                await editor.edit(editBuilder => {
                    editBuilder.insert(new vscode.Position(0, 0), result.comment + '\n\n');
                });
            }
            vscode.window.showInformationMessage('AI Comment: 全文件注释生成成功！');
        }
        catch (error) {
            if (error instanceof error_1.AIError) {
                vscode.window.showErrorMessage(`AI Comment: ${error.message}`);
            }
            else {
                vscode.window.showErrorMessage(`AI Comment: 生成失败 → ${error.message}`);
            }
        }
    });
}
async function streamWholeFile(editor, document, originalCode, config, params) {
    // 详细模式全文件流式策略：
    // 先清空文件内容，然后流式追加 AI 返回的内容
    // 等全部收完后一次性替换，避免中间状态用户看到乱码
    // 这里选择「收集完再替换」而不是「边收边写」
    // 原因：全文件替换时流式边写边改会导致行号错乱
    let fullText = '';
    const onChunk = (chunk) => {
        fullText += chunk;
        // 可选：实时更新状态栏显示已生成字数
        // vscode.window.setStatusBarMessage(`AI Comment: 已生成 ${fullText.length} 字...`);
    };
    const fn = getStreamFn(config.aiProvider);
    await fn(params, onChunk);
    if (!fullText.trim()) {
        throw new error_1.AIError('生成的注释为空，请重试！');
    }
    // 全部收完后一次性替换整个文件
    const fullRange = new vscode.Range(document.positionAt(0), document.positionAt(originalCode.length));
    await editor.edit(editBuilder => {
        editBuilder.replace(fullRange, fullText);
    });
}
function getGenerateFn(provider) {
    switch (provider) {
        case types_1.AIServiceProvider.OpenAI: return openai_1.generateCommentWithOpenAI;
        case types_1.AIServiceProvider.Qwen: return qwen_1.generateCommentWithQwen;
        case types_1.AIServiceProvider.Baidu: return baidu_1.generateCommentWithBaidu;
        default: throw new error_1.AIError(`不支持的 AI 服务商：${provider}`);
    }
}
function getStreamFn(provider) {
    // 流式和普通共用同一个函数，通过 onChunk 参数区分
    return getGenerateFn(provider);
}
