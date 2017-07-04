const { resolveDependencies } = require("./resolve");

/**
 * @typedef {Object} FileInfo
 * @property {Object} ast
 * @property {string[]} moduleSources - List of module sources imported by file.
 * @property {string} path - Absolute file path.
 * @property {string} sourceCode
 */

class FileGraphNode {
  /**
   * @param {string} path - Absolute path.
   */
  constructor(path) {
    this.path = path;
  }

  /**
   * @param {FileInfo} data 
   * @param {*} parentState 
   */
  processFileInfo(data, parentState) {
    this.ast = data.ast;
    this.sourceCode = data.sourceCode;
    this.moduleSources = data.moduleSources;
    this.moduleSourceToPath = resolveDependencies(this, parentState);
  }
}

module.exports.FileGraphNode = FileGraphNode;
