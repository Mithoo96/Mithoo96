import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // Approved prototype UI predates ESLint. These React-compiler rules are
    // warnings there until the frontend pass (see HANDOFF.md → Known issues).
    // Backend code (core/, server/, integrations/, app/api/) keeps them as errors.
    files: ["components/**/*.{ts,tsx}", "app/**/*.tsx"],
    rules: {
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/purity": "warn",
      "react/no-unescaped-entities": "warn",
    },
  },
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts", "supabase/**"]),
]);
