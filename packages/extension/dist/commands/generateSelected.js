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
exports.generateSelectedComment = generateSelectedComment;
const vscode = __importStar(require("vscode"));
const config_1 = require("../config/config");
const openai_1 = require("../api/openai");
const qwen_1 = require("../api/qwen");
const baidu_1 = require("../api/baidu");
const error_1 = require("../api/error");
const types_1 = require("../api/types");
function generateSelectedComment() {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showErrorMessage('AI Comment: 未激活任何编辑器窗口！');
        return;
    }
    const selection = editor.selection;
    if (selection.isEmpty) {
        vscode.window.showErrorMessage('AI Comment: 请先选中代码片段！');
        return;
    }
    const selectedCode = editor.document.getText(selection);
    if (!selectedCode.trim()) {
        vscode.window.showErrorMessage('AI Comment: 选中的代码为空！');
        return;
    }
    vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: 'AI Comment: 正在生成注释...',
        cancellable: false
    }, async () => {
        try {
            const isValid = await (0, config_1.validateConfig)();
            if (!isValid)
                return;
            const config = await (0, config_1.getExtensionConfig)();
            const language = config.targetLanguage === 'auto'
                ? editor.document.languageId
                : config.targetLanguage;
            const params = {
                code: selectedCode,
                language,
                commentStyle: config.commentStyle,
                isWholeFile: false
            };
            if (config.commentMode === 'detailed') {
                await streamToEditor(editor, selection, config, params);
            }
            else {
                // 简洁模式：普通请求，在选中内容上方插入一行注释
                const fn = getGenerateFn(config.aiProvider);
                const result = await fn(params);
                await editor.edit(editBuilder => {
                    const pos = new vscode.Position(selection.start.line, 0);
                    editBuilder.insert(pos, result.comment + '\n');
                });
            }
            vscode.window.showInformationMessage('AI Comment: 注释生成成功！');
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
async function streamToEditor(editor, selection, config, params) {
    // 详细模式：AI 返回「带注释的完整代码」替换选中内容
    // 策略：先收集所有流式内容，再一次性替换选中区域
    // 原因：流式边写边改会导致 selection 范围持续变化，位置计算错乱
    let fullText = '';
    const onChunk = (chunk) => {
        fullText += chunk;
    };
    const fn = getGenerateFn(config.aiProvider);
    await fn(params, onChunk);
    if (!fullText.trim()) {
        throw new error_1.AIError('生成的注释为空，请重试！');
    }
    // 全部收完后一次性替换选中内容（不会有重复问题）
    await editor.edit(editBuilder => {
        editBuilder.replace(selection, fullText);
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
