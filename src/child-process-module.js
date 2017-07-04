const { readFileSync } = require("fs");

const { parse } = require("acorn");
// @ts-ignore
const { simple } = require("acorn/dist/walk");

/**
 * @typedef {Object} ImportDeclarationNode
 * @property {{value: string}} source
 */

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
 * @param {string[]} moduleSources - Module sources in AST.
 */
function createImportsVisitor(moduleSources) {
  return {
    /**
     * @param {CallExpressionNode} node 
     */
    CallExpression(node) {
      if (isAPackageImport(node) && node.arguments[0].value) {
        moduleSources.push(node.arguments[0].value);
      }
    },

    /**
     * @param {ImportDeclarationNode} node 
     */
    ImportDeclaration(node) {
      moduleSources.push(node.source.value);
    }
  };
}

/**
 * @param {{type: string, data: {path: string}}} message 
 */
function handleParentMessage(message) {
  const { type, data: { path } } = message;

  if (type === "extract-dependencies") {
    const sourceCode = readFileSync(path, "utf8");
    const ast = parse(sourceCode, { sourceType: "module" });
    /** @type {string[]} */
    const moduleSources = [];

    simple(ast, createImportsVisitor(moduleSources));

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
