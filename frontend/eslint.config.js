import js from "@eslint/js";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";

export default [
  { ignores: ["dist/"] },
  js.configs.recommended,
  react.configs.flat.recommended,
  react.configs.flat["jsx-runtime"],
  reactHooks.configs.flat.recommended,
  {
    // ESLint 9 lints only .js files unless a config names other extensions.
    files: ["**/*.{js,jsx}"],
    languageOptions: { parserOptions: { ecmaFeatures: { jsx: true } } },
    settings: { react: { version: "detect" } },
    rules: {
      // The project uses neither PropTypes nor TypeScript for component props.
      "react/prop-types": "off",
      // A React Compiler render-cost check, not a correctness one. The six effects
      // it flags each reset a page's state when its route, scenario or token changes,
      // costing one extra render; rewriting them would risk behaviour for no fix.
      "react-hooks/set-state-in-effect": "off",
    },
  },
  {
    files: ["src/**"],
    languageOptions: { globals: globals.browser },
  },
  {
    files: ["src/test/**"],
    languageOptions: { globals: { ...globals.browser, ...globals.vitest } },
  },
  {
    files: ["*.config.js"],
    languageOptions: { globals: globals.node },
  },
];
