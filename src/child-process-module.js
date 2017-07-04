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
 * @param {string[]} dependencies - Module sources in AST.
 */
function createImportsVisitor(dependencies) {
  return {
    /**
     * @param {CallExpressionNode} node 
     */
    CallExpression(node) {
      if (isAPackageImport(node) && node.arguments[0].value) {
        dependencies.push(node.arguments[0].value);
      }
    },

    /**
     * @param {ImportDeclarationNode} node 
     */
    ImportDeclaration(node) {
      dependencies.push(node.source.value);
    }
  };
}

/**
 * @param {{type: string, data: {path: string}}} message 
 */
function handleParentMessage(message) {
  const { type, data } = message;

  if (type === "extract-dependencies") {
    const sourceCode = readFileSync(data.path, "utf8");
    const ast = parse(sourceCode, { sourceType: "module" });
    /** @type {string[]} */
    const dependencies = [];

    simple(ast, createImportsVisitor(dependencies));

    if (process.send) {
      process.send({
        type: "dependencies-extracted",
        data: {
          ast,
          dependencies,
          path: data.path,
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
