import js from "@eslint/js";

export default [
    {
        files: ["**/*.js"],
        languageOptions: {
            ecmaVersion: "latest",
            sourceType: "module",
            globals: {
                console: "readonly",
                process: "readonly",
            },
        },
        rules: {
            ...js.configs.recommended.rules,
            indent: ["error", 4],
        },
    },
];