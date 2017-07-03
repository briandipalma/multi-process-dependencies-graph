const { dirname, resolve } = require("path");

function isRelative(moduleSource) {
  return moduleSource[0] === ".";
}

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
