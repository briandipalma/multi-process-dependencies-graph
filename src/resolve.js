const { dirname, resolve } = require("path");

/**
 * @param {string} moduleSource 
 */
function isRelative(moduleSource) {
  return moduleSource[0] === ".";
}

/**
 * @param {string[]} dependencies - Module sources found in a file.
 * @param {string} importerPath - Absolute path of file with module sources.
 * @param {*} parentState 
 */
function resolveDependencies(dependencies, importerPath, parentState) {
  for (const dependency of dependencies) {
    if (isRelative(dependency)) {
      const resolvedFile = resolve(dirname(importerPath), dependency);

      parentState.queueFileToParse(resolvedFile);
    }
  }

  parentState.handleOutstandingWork();
}

module.exports.resolveDependencies = resolveDependencies;
