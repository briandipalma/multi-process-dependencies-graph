const { readFileSync } = require("fs");
const { join } = require("path");

const acorn = require("acorn");
const injectAcornJsx = require("acorn-jsx/inject");
const injectAcornObjectRestSpread = require("acorn-object-rest-spread/inject");
const { traverse } = require("estraverse-fb");

import { transformText } from "./child-utils";
import { FileInfo } from "../parent/ParentState";
import { resolveDependencyPaths } from "../utils/resolve";

injectAcornJsx(acorn);
injectAcornObjectRestSpread(acorn);

interface ASTNode {
  type: string;
  // CallExpression
  arguments: { value: string }[];
  callee: { name: string; type: string };
  // ImportDeclaration
  source: { value: string };
}

function isAPackageImport(node: ASTNode) {
  return node.callee.name === "require" && node.callee.type === "Identifier";
}

/**
 * @param {function(string)} moduleSourceHandler
 */
function createImportsVisitor(moduleSourceHandler: (x: string) => void) {
  return {
    enter(node: ASTNode) {
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
function moduleSourcesFilter(moduleSources: string[], path: string) {
  return (moduleSource: string) => {
    if (
      path.endsWith(join("fell", "converted_library.js")) ||
      path.endsWith(join("momentjs", "converted_library.js")) ||
      path.endsWith(join("bignumberjs", "converted_library.js")) ||
      path.endsWith(join("npm-modules", "converted_library.js")) ||
      path.endsWith(join("topiarist", "converted_library.js")) ||
      path.endsWith(join("emitr", "converted_library.js"))
    ) {
      return;
    }

    if (
      moduleSource.startsWith("alias!") ||
      moduleSource.startsWith("service!") ||
      moduleSource.endsWith(".less") ||
      moduleSource.endsWith(".css") ||
      moduleSource.endsWith(".properties")
    ) {
      return;
    }

    moduleSources.push(moduleSource);
  };
}

function safeParse(sourceCode: string, path: string) {
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

function safeReadFile(path: string) {
  try {
    return readFileSync(path, "utf8");
  } catch (e) {
    console.log(`\nFile ${path} could not be read from file system.`);

    throw e;
  }
}

function sendExtractedDependencies(data: FileInfo) {
  if (process.send) {
    process.send({ type: "dependencies-extracted", data });
  } else {
    console.warn("process.send function does not exist.");
  }
}

function parseCode(sourceCode: string, path: string) {
  const ast = safeParse(sourceCode, path);
  const moduleSources: string[] = [];
  const moduleSourceHandler = moduleSourcesFilter(moduleSources, path);
  const importsVisitor = createImportsVisitor(moduleSourceHandler);

  traverse(ast, importsVisitor);

  const moduleSourcesToPath = resolveDependencyPaths(path, moduleSources);

  return {
    moduleSources,
    moduleSourcesToPath,
    path,
    sourceCode
  };
}

export function extractDependencies(path: string) {
  const fileText = safeReadFile(path);
  const sourceCode = transformText(fileText, path);
  const fileInfo = parseCode(sourceCode, path);

  sendExtractedDependencies(fileInfo);
}
