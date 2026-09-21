import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const compat = new FlatCompat({ baseDirectory: dirname(fileURLToPath(import.meta.url)) });

const config = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  { ignores: [".next/**", "node_modules/**", "next-env.d.ts", "prisma/dev.db", "qa-report.md"] },
  {
    rules: {
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      "react/no-unescaped-entities": "off",
      // app 라우터의 layout.tsx 에서 <link> 폰트는 전역이다 (pages 라우터용 규칙)
      "@next/next/no-page-custom-font": "off",
    },
  },
];

export default config;
