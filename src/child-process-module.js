const { readFileSync } = require("fs");

// @ts-ignore
const acorn = require("acorn");
const injectAcornJsx = require("acorn-jsx/inject");
const injectAcornObjectRestSpread = require("acorn-object-rest-spread/inject");
// @ts-ignore
const { traverse } = require("estraverse-fb");

injectAcornJsx(acorn);
injectAcornObjectRestSpread(acorn);

/**
 * @typedef {Object} CallExpressionNode
 * @property {Object[]} arguments
 * @property {{name: string, type: string}} callee
 */

/**
 * @param {CallExpressionNode} node
 */
function isAPackageImport(node) {
  return node.callee.name === "require" && node.callee.type === "Identifier";
}

/**
 * @param {function(string)} moduleSourceHandler
 */
function createImportsVisitor(moduleSourceHandler) {
  return {
    /**
     * @param {*} node 
     */
    enter(node) {
      if (node.type === "CallExpression") {
        if (isAPackageImport(node) && node.arguments[0].value) {
          moduleSourceHandler(node.arguments[0].value);
        }
      } else if (node.type === "ImportDeclaration") {
        moduleSourceHandler(node.source.value);
      }
    }
  };
}

/**
 * @param {string[]} moduleSources 
 * @param {string} path 
 * @return {function(string)}
 */
function moduleSourcesFilter(moduleSources, path) {
  return (/** @type {string} */ moduleSource) => {
    if (
      path.endsWith("fell/converted_library.js") ||
      path.endsWith("momentjs/converted_library.js") ||
      path.endsWith("bignumberjs/converted_library.js") ||
      path.endsWith("npm-modules/converted_library.js")
    ) {
      return;
    }

    if (
      moduleSource.startsWith("alias!") ||
      moduleSource.startsWith("service!") ||
      moduleSource.endsWith(".less") ||
      moduleSource.endsWith(".css") ||
      moduleSource.endsWith(".properties") ||
      moduleSource.endsWith(".html")
    ) {
      return;
    }

    moduleSources.push(moduleSource);
  };
}

/**
 * @param {string} sourceCode
 * @param {string} path 
 */
function safeParse(sourceCode, path) {
  try {
    return acorn.parse(sourceCode, {
      plugins: { jsx: true, objectRestSpread: true },
      sourceType: "module"
    });
  } catch (e) {
    console.log(`\nFile ${path} caused parsing error.`);

    throw e;
  }
}

/**
 * @param {string} sourceCode
 * @param {string} path 
 */
function safeReadFile(path) {
  try {
    return readFileSync(path, "utf8");
  } catch (e) {
    console.log(`\nFile ${path} could not be read from file system.`);

    throw e;
  }
}

/**
 * @param {{type: string, data: {path: string}}} message 
 */
function handleParentMessage(message) {
  const { type, data: { path } } = message;

  if (type === "extract-dependencies") {
    const sourceCode = safeReadFile(path);
    const ast = safeParse(sourceCode, path);
    /** @type {string[]} */
    const moduleSources = [];
    const moduleSourceHandler = moduleSourcesFilter(moduleSources, path);
    const importsVisitor = createImportsVisitor(moduleSourceHandler);

    traverse(ast, importsVisitor);

    if (process.send) {
      process.send({
        type: "dependencies-extracted",
        data: {
          ast,
          moduleSources,
          path,
          sourceCode
        }
      });
    } else {
      console.warn("process.send function does not exist.");
    }
  } else {
    console.log(`Received unknown message ${JSON.stringify(type)}`);
  }
}

process.on("message", handleParentMessage);
