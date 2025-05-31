import typescript from "@rollup/plugin-typescript";

export default {
  input: "./test/index.test.ts",
  output: [
    {
      file: "build/index.js",
      format: "cjs",
      sourcemap: true,
    },
  ],
  plugins: [typescript({ tsconfig: "./tsconfig.json", sourceMap: false, declaration: false, outDir: "build" })],
};
