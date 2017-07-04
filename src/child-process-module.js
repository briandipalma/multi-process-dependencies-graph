const { readFileSync } = require("fs");

// @ts-ignore
const { parse } = require("acorn-jsx");
// @ts-ignore
const { traverse } = require("estraverse-fb");

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
      path.endsWith("momentjs/converted_library.js")
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
    return parse(sourceCode, { plugins: { jsx: true }, sourceType: "module" });
  } catch (e) {
    console.log(`\nFile ${path} caused parsing error.`);

    throw e;
  }
}

/**
 * @param {{type: string, data: {path: string}}} message 
 */
function handleParentMessage(message) {
  const { type, data: { path } } = message;

  if (type === "extract-dependencies") {
    const sourceCode = readFileSync(path, "utf8");
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
