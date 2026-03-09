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
const openConfig_1 = require("./commands/openConfig");
const config_1 = require("./config/config"); // 新增导入
function activate(context) {
    console.log('AI Comment Generator activated!');
    // 初始化 context，让 config.ts 可以访问 SecretStorage
    (0, config_1.initContext)(context);
    // 注册「选中代码注释」命令
    context.subscriptions.push(vscode.commands.registerCommand('ai-comment.generateSelected', () => (0, generateSelected_1.generateSelectedComment)()));
    // 注册「全文件注释」命令
    context.subscriptions.push(vscode.commands.registerCommand('ai-comment.generateWholeFile', () => (0, generateWholeFile_1.generateWholeFileComment)()));
    // 注册「打开设置面板」命令
    context.subscriptions.push(vscode.commands.registerCommand('ai-comment.openConfig', () => (0, openConfig_1.openConfigPanel)(context)));
    // 监听配置变更
    vscode.workspace.onDidChangeConfiguration((e) => {
        if (e.affectsConfiguration('aiComment')) {
            // 可以在这里做一些自动刷新的逻辑
        }
    });
}
function deactivate() {
    console.log('AI Comment Generator deactivated!');
}
