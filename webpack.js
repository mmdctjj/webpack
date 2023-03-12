const tapable = require("tapable")

const fs = require("fs")

//将\替换成/
function toUnixPath(filePath) {
  return filePath.replace(/\\/g, "/");
}

const baseDir = toUnixPath(process.cwd()); //获取工作目录，在哪里执行命令就获取哪里的目录，这里获取的也是跟操作系统有关系，要替换成/

class Compiler {
  constructor(option = {}) {
    this.option = option
    this.hook = {
      run: new tapable.SyncHook(),
      down: new tapable.SyncHook()
    }
  }

  compile(callback) {

    let compilation = new Compilation(this.option)

    compilation.build(callback)
  }

  run(callback) {
    this.hook.run.call()

    const compiled = () => {
      this.hook.down.call()
    }

    this.compile(compiled)
  }

}

class Compilation {
  constructor(option) {
    this.option = option
    this.assets = {}
    this.chunks = []
    this.modules = []
    this.fileDependcies = []
  }

  buildModule (name, path) {

    // 获取源代码
    const moduleCode = fs.readFileSync(path, "utf-8")

    let moduleId = ''
  
    // 生成mnodule
    const module = {
      id: moduleId,
      names: [name],
      dependcies: [],
      _source: ""
    }

    // loader处理
    const loaders = []

    const { rules = [] } = this.option

    rules.forEach(rule => {
      const { test, use } = rule
      if (path.match(test)) {
        loaders.push(...use)
      }
    })

    moduleCode = loaders.reduceRight((code, loader) => loader(code), moduleCode)

    return module
  }

  build(callback) {

    // 找到入口
    let entry

    if (typeof this.option.entry === 'string') {
      entry = {
        main: this.option.entry
      }
    } else {
      entry = this.option.entry
    }


    for (const entryName in entry) {
      console.log(entry[entryName])
      const entryFilePath = path.posix.join(baseDir, entry[entryName])
      // 缓存文件路径
      this.fileDependcies.push(entryFilePath)
      // 获取module
      this.modules.push(this.buildModule(entryName, entryFilePath))
    }

    callback()
  }
}

function webpack(option) {

  const compiler = new Compiler(option)

  const { plugns } = option

  for (const plugn in plugns) {
    plugn.apply(compiler)
  }

  return compiler
}

module.exports = {
  webpack
}