const tapable = require("tapable")
const parser = require("@babel/parser")

const fs = require("fs");
const traverse = require("@babel/traverse").default

const path = require("path");
const generator = require("@babel/generator").default;

function getSource(chunk) {
  return `
      (() => {
       var modules = {
         ${chunk.modules.map(
    (module) => `
           "${module.id}": (module) => {
             ${module._source}
           }
         `
  )}  
       };
       var cache = {};
       function require(moduleId) {
         var cachedModule = cache[moduleId];
         if (cachedModule !== undefined) {
           return cachedModule.exports;
         }
         var module = (cache[moduleId] = {
           exports: {},
         });
         modules[moduleId](module, module.exports, require);
         return module.exports;
       }
       var exports ={};
       ${chunk.entryModule._source}
     })();
      `;
}

//获取文件路径
function tryExtensions(modulePath, extensions) {
  if (fs.existsSync(modulePath)) {
    return modulePath;
  }
  for (let i = 0; i < extensions?.length; i) {
    let filePath = modulePath + extensions[i];
    if (fs.existsSync(filePath)) {
      return filePath;
    }
  }
  throw new Error(`无法找到${modulePath}`);
}

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

  buildModule(name, path) {

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

    let ast = parser.parse(moduleCode, { sourceType: 'module' })

    traverse(ast, {
      CallExpression: (nodePath) => {
        const { node } = nodePath;
        if (node.callee.name === 'require') {
          let depModuleName = node.arguments[0].value; //获取依赖的模块
          let dirname = path.posix.dirname(modulePath); //获取当前正在编译的模所在的目录
          let depModulePath = path.posix.join(dirname, depModuleName); //获取依赖模块的绝对路径
          let extensions = this.options.resolve?.extensions || [".js"]; //获取配置中的extensions
          depModulePath = tryExtensions(depModulePath, extensions); //尝试添加后缀，找到一个真实在硬盘上存在的文件
          //7.3：将依赖模块的绝对路径 push 到 `this.fileDependencies` 中
          this.fileDependencies.push(depModulePath);
          //7.4：生成依赖模块的`模块 id`
          let depModuleId = "./" + path.posix.relative(baseDir, depModulePath);
          //7.5：修改语法结构，把依赖的模块改为依赖`模块 id` require("./name")=>require("./src/name.js")
          node.arguments = [types.stringLiteral(depModuleId)];
          //7.6：将依赖模块的信息 push 到该模块的 `dependencies` 属性中
          module.dependencies.push({ depModuleId, depModulePath });
        }
      }
    })

    // 获取编译后的代码
    let { code } = generator(ast)

    // 保存到_source属性上
    module._source = code

    // 遍历依赖文件，执行编译操作
    module.dependcies.forEach(({ depModuleId, depModulePath }) => {
      let exitModule = this.modules.find(module => module.id === depModuleId)

      if (exitModule) {
        exitModule.names.push(name)
      } else {
        let depModule = this.buildModule(name, depModulePath)
        this.modules.push(depModule)
      }
    })

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

      this.modules.push(entryModule)

      // 获取module
      let entryModule = this.buildModule(entryName, entryFilePath)

      let chunk = {
        name: entryName,
        entryModule,
        modules: this.modules.filter(module => module.names.includes(entryName))
      }

      this.chunks.push(chunk)

      this.chunks.forEach(chunk => {
        let filename = this.option.output.filename.replace('[name]', chunk.name)
        this.assets[filename] = getSource(chunk)
      })

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