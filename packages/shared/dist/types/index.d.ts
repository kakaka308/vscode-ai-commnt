export type CommentMode = 'concise' | 'detailed';
export type CommentStyle = 'default' | 'javadoc' | 'godoc' | 'jsdoc' | 'doxygen';
export type AIProvider = 'openai' | 'xunfei' | 'baidu' | 'qwen';
export interface Config {
    commentStyle: CommentStyle;
    commentMode: CommentMode;
    targetLanguage: string;
    aiProvider: AIProvider;
    openaiApiKey: string;
    openaiModel: string;
    openaiEndpoint: string;
    qwenApiKey: string;
    qwenModel: string;
    qwenEndpoint: string;
    baiduApiKey: string;
    baiduSecretKey: string;
    baiduModel: string;
    xunfeiAppId: string;
    xunfeiApiKey: string;
    xunfeiApiSecret: string;
}
export type Language = 'java' | 'javascript' | 'typescript' | 'go' | 'python' | 'cpp' | 'csharp' | 'rust' | 'php' | 'swift' | 'kotlin' | 'dart' | 'scala' | 'ruby' | 'auto';
export interface CommentTemplate {
    style: CommentStyle;
    language: Language;
    template: string;
    placeholders: {
        description: string;
        params?: Array<{
            name: string;
            type: string;
            description: string;
        }>;
        returns?: {
            type: string;
            description: string;
        };
        throws?: Array<{
            type: string;
            description: string;
        }>;
    };
}
//# sourceMappingURL=index.d.ts.map