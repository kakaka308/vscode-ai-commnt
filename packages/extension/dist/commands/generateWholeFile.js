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
const aiService_1 = require("../api/aiService");
const error_1 = require("../api/error");
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
    }, async (progress) => {
        try {
            // validateConfig 和 getExtensionConfig 都改为 async
            const isValid = await (0, config_1.validateConfig)();
            if (!isValid)
                return;
            const config = await (0, config_1.getExtensionConfig)();
            const targetLanguage = config.targetLanguage === 'auto'
                ? document.languageId
                : config.targetLanguage;
            const aiParams = {
                code: fullCode,
                language: targetLanguage,
                commentStyle: config.commentStyle,
                isWholeFile: true
            };
            progress.report({ increment: 50 });
            const aiResponse = await (0, aiService_1.generateComment)(aiParams);
            if (!aiResponse.success || !aiResponse.comment.trim()) {
                throw new error_1.AIError('生成的注释为空，请重试！');
            }
            await editor.edit((editBuilder) => {
                if (config.commentMode === 'concise') {
                    const insertPosition = new vscode.Position(0, 0);
                    editBuilder.insert(insertPosition, aiResponse.comment + '\n\n');
                }
                else {
                    const fullRange = new vscode.Range(document.positionAt(0), document.positionAt(fullCode.length));
                    editBuilder.replace(fullRange, aiResponse.comment);
                }
            });
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
