const path = require("path");
const CopyPlugin = require("copy-webpack-plugin");

module.exports = {
  entry: "./src/main.ts",
  module: {
    rules: [
      {
        test: /\.ts/,
        use: 'ts-loader',
        exclude: /node_modules|resources|assets|media|dist/,
      }
    ]
  },
  optimization: {
    minimize: false 
  },
  resolve: {
    extensions: ['.ts', '.js'],
  },
  output: {
    filename: "main.js",
    path: path.resolve(__dirname, "dist"),
  },
  plugins: [
    new CopyPlugin({
      patterns: [
        { from: "*.html", to: "." },
        { from: "assets", to: "assets" }
      ],
    }),
  ],
};
