/* eslint-env node */
module.exports = {
  root: true,
  env: { browser: true, es2023: true },
  parserOptions: { ecmaVersion: "latest", sourceType: "module", ecmaFeatures: { jsx: true } },
  settings: { react: { version: "detect" } },
  plugins: ["react", "react-hooks", "jsx-a11y", "import"],
  extends: [
    "eslint:recommended",
    "plugin:react/recommended",
    "plugin:react-hooks/recommended",
    "plugin:jsx-a11y/recommended",
    "plugin:import/recommended",
    "prettier", // must be last to disable conflicting rules
  ],
  rules: {
    "react/react-in-jsx-scope": "off", // Vite/React 17+ not needed
    "import/order": [
      "warn",
      { "newlines-between": "always", alphabetize: { order: "asc", caseInsensitive: true } },
    ],
  },
  ignorePatterns: ["dist/"],
};
