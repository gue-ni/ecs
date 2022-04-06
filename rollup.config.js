import dts from "rollup-plugin-dts"
import { terser } from "rollup-plugin-terser"

export default [
  {
    input: "lib/index.js",
    output: {
      file: "dist/ecs.js",
      format: "es",
    },
  },
  {
    input: "lib/index.js",
    output: {
      file: "dist/ecs.min.js",
      format: "es",
    },
    plugins: [terser()],
  },
  {
    input: "lib/index.d.ts",
    output: {
      file: "dist/ecs.d.ts",
      format: "es",
    },
    plugins: [dts()],
  },
]