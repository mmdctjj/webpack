(() => {
 	var __webpack_modules__ = ({

    "./src/age.js": ((module) => {
      module.exports = "99";
    }),

    "./src/name.js": ((module) => {
      module.exports = "不要秃头啊";
    })

  });
  // The module cache
  var __webpack_module_cache__ = {};
  
  // The require function
  function __webpack_require__(moduleId) {
    // Check if module is in cache
    var cachedModule = __webpack_module_cache__[moduleId];
    if (cachedModule !== undefined) {
      return cachedModule.exports;
    }
		// Create a new module (and put it into the cache)
		var module = __webpack_module_cache__[moduleId] = {
			// no module.id needed
			// no module.loaded needed
			exports: {}
      
    };
    console.log(module)
		// Execute the module function
		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
    console.log(module)
		// Return the exports of the module
		return module.exports;
    
  }
  
  /************************************************************************/
  var __webpack_exports__ = {};
  (() => {
    const name = __webpack_require__(/*! ./name */ "./src/name.js");
    const age = __webpack_require__(/*! ./age */ "./src/age.js");
    console.log("entry文件打印作者信息", name, age);
  })();
  
})();