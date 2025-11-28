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
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const generateSelected_1 = require("./commands/generateSelected");
const generateWholeFile_1 = require("./commands/generateWholeFile");
// 插件激活时执行（VSCode启动/触发命令时）
function activate(context) {
    console.log('AI Comment Generator activated!');
    // 1. 注册「选中代码注释」命令
    const generateSelectedDisposable = vscode.commands.registerCommand('ai-comment.generateSelected', () => (0, generateSelected_1.generateSelectedComment)());
    // 2. 注册「全文件注释」命令
    const generateWholeFileDisposable = vscode.commands.registerCommand('ai-comment.generateWholeFile', () => (0, generateWholeFile_1.generateWholeFileComment)());
    // 3. 订阅配置变更（可选）
    vscode.workspace.onDidChangeConfiguration((e) => {
        if (e.affectsConfiguration('aiComment')) {
            vscode.window.showInformationMessage('AI Comment config updated!');
        }
    });
    // 4. 将命令加入上下文（确保插件销毁时释放）
    context.subscriptions.push(generateSelectedDisposable, generateWholeFileDisposable);
}
// 插件销毁时执行
function deactivate() {
    console.log('AI Comment Generator deactivated!');
}
