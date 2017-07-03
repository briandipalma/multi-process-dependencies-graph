const { readFileSync } = require("fs");

const { parse } = require("acorn");
const { simple } = require("acorn/dist/walk");

function isAPackageImport(node) {
  return node.callee.name === "require" && node.callee.type === "Identifier";
}

function createImportsVisitor(dependencies) {
  return {
    CallExpression(node) {
      if (isAPackageImport(node) && node.arguments[0].value) {
        dependencies.push(node.arguments[0].value);
      }
    },

    ImportDeclaration(node) {
      dependencies.push(node.source.value);
    }
  };
}

function handleParentMessage({ type, data }) {
  if (type === "extract-dependencies") {
    const sourceCode = readFileSync(data.path);
    const ast = parse(sourceCode, { sourceType: "module" });
    const dependencies = [];

    simple(ast, createImportsVisitor(dependencies));

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
    console.log(`Received unknown message ${JSON.stringify(type)}`);
  }
}

process.on("message", handleParentMessage);
