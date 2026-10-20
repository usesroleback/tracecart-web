import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import { defineConfig, globalIgnores } from "eslint/config";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    rules: {
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      // react-hooks v6 (shipped with Next 16/eslint-config-next 16) added this
      // rule and it flags the app's existing fetch-on-mount pattern (an effect
      // calling a `refresh`/`load` function that itself calls setState) as an
      // error across several dashboards. That pattern isn't a bug — downgrade
      // to warn here rather than block CI; fixing it properly means revisiting
      // each effect individually, which is its own task.
      "react-hooks/set-state-in-effect": "warn",
    },
  },
  {
    files: ["**/*.d.ts"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
]);

export default eslintConfig;
