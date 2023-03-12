const path = require("path");


class RunPlugns {
  apply(compiler) {
    compiler.hook.run.tap('RunPlugns', () => {
      console.log('RunPlugns')
    })
  }
}

class DownPlugns {
  apply(compiler) {
    compiler.hook.run.tap('DownPlugns', () => {
      console.log('DownPlugns')
    })
  }
}

const loader1 = (source) => {
  return source + "//给你的代码加点注释：loader1";
};

const loader2 = (source) => {
  return source + "//给你的代码加点注释：loader2";
};

module.exports = {
  mode: "development", //防止代码被压缩
  entry: "./src/index.js", //入口文件
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "[name].js",
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        use: [loader1, loader2]
      }
    ]
  },
  plugins: [new RunPlugns(), new DownPlugns()],
  devtool: "source-map", //防止干扰源文件
}
