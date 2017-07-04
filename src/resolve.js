const { dirname } = require("path");

const { sync } = require("resolve");

/**
 * @param {*} fileGraphNode
 * @param {*} parentState 
 */
function resolveDependencies(fileGraphNode, parentState) {
  const moduleSourceToPath = {};
  const importerDir = dirname(fileGraphNode.path);

  for (const moduleSource of fileGraphNode.moduleSources) {
    const resolvedFile = sync(moduleSource, { basedir: importerDir });

    moduleSourceToPath[moduleSource] = resolvedFile;
    parentState.queueFileToParse(resolvedFile);
  }

  parentState.handleOutstandingWork();

  return moduleSourceToPath;
}

module.exports.resolveDependencies = resolveDependencies;
