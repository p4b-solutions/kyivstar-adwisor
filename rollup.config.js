import typescript from "@rollup/plugin-typescript";

export default {
  input: "./src/index.ts",
  output: [
    {
      file: "dist/index.cjs.js",
      format: "cjs",
      exports: "default",
    },
    {
      file: "dist/index.esm.js",
      format: "es",
    },
  ],
  external: [],
  plugins: [typescript({ tsconfig: "./tsconfig.json", sourceMap: false, declaration: true, outDir: "dist", exclude: ["**/*.test.ts"] })],
};
