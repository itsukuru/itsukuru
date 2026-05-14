import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

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
    // ブラウザ SW 用スクリプト（no-restricted-globals の対象外にする）
    "public/sw.js",
  ]),
  {
    rules: {
      /**
       * localStorage 読み込みやルート変更時の UI 同期など、useEffect 内の setState は
       * このプロジェクトで一般的。React Compiler 系の厳格ルールはオフにする。
       */
      "react-hooks/set-state-in-effect": "off",
    },
  },
]);

export default eslintConfig;
