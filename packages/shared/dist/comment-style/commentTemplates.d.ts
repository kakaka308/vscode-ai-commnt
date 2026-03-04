export declare const commentTemplates: {
    concise: {
        prefix: string;
        suffix: string;
        linePrefix: string;
        summary: string;
        fileHeader: string;
    };
    javadoc: {
        prefix: string;
        suffix: string;
        linePrefix: string;
        param: string;
        return: string;
    };
    godoc: {
        prefix: string;
        suffix: string;
        linePrefix: string;
        param: string;
        return: string;
    };
    jsdoc: {
        prefix: string;
        suffix: string;
        linePrefix: string;
        param: string;
        returns: string;
    };
    doxygen: {
        prefix: string;
        suffix: string;
        linePrefix: string;
        param: string;
        return: string;
    };
    docstring: {
        prefix: string;
        suffix: string;
        linePrefix: string;
        param: string;
        return: string;
    };
    default: {
        prefix: string;
        suffix: string;
        linePrefix: string;
        param: string;
        return: string;
    };
};
export declare function getDefaultStyleByLanguage(language: string): string;
export declare function generateConciseComment(summary: string, isWholeFile?: boolean, language?: string): string;
export declare function generateDetailedComment(content: string): string;
//# sourceMappingURL=commentTemplates.d.ts.map