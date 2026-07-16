// eslint.config.js

import js from "@eslint/js";

export default [
  {
    files: ["**/*.js"],
    languageOptions: {
      sourceType: "module"
    }
  },

  js.configs.recommended,

  {
    files: ["**/*.js"],

    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",

      globals: {
        window: "readonly",
        document: "readonly",
        console: "readonly",
        localStorage: "readonly",
        navigator: "readonly",
        FileReader: "readonly",
        fetch: "readonly",
        URL: "readonly",
        Blob: "readonly",
        HTMLElement: "readonly",
        Node: "readonly",
        Event: "readonly",
        IntersectionObserver: "readonly"
      }
    },

    rules: {
      "no-unused-vars": "warn",
      "no-undef": "error",
      "no-redeclare": "error",
      "no-unreachable": "error",
      "eqeqeq": "error"
    }
  }
];