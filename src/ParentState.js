const { cpus } = require("os");

const { FileGraphNode } = require("./FileGraphNode");
const { createProcess } = require("./parent-utils");

/**
 * @typedef {Object} FileInfo
 * @property {Object} ast
 * @property {string[]} moduleSources - List of module sources imported by file.
 * @property {string} path - Absolute file path.
 * @property {string} sourceCode
 */

class ParentState {
  /**
   * @param {string} graphEntry - An absolute file path.
   */
  constructor(graphEntry) {
    const graphEntryNode = new FileGraphNode(graphEntry);

    this.availableProcesses = cpus().map(() => createProcess(this));
    this.memoryFS = { [graphEntry]: graphEntryNode };
    this.resolvedNodesToProcess = [graphEntryNode];
    this.occupiedProcesses = {};
  }

  /**
   * @param {FileInfo} data 
   */
  fileDependenciesExtracted(data) {
    const filePath = data.path;
    const fileGraphNode = this.memoryFS[filePath];

    this._releaseProcess(filePath);
    fileGraphNode.processFileInfo(data, this);
  }

  /**
   * @param {{type: string, data: FileInfo}} message 
   */
  handleChildProcessMessage(message) {
    const { type, data } = message;

    if (type === "dependencies-extracted") {
      this.fileDependenciesExtracted(data);
    }
  }

  handleOutstandingWork() {
    let processesAvailable = this.availableProcesses.length > 0;
    let nodesToProcess = this.resolvedNodesToProcess.length > 0;

    while (nodesToProcess && processesAvailable) {
      this._extractFileDependencies();

      processesAvailable = this.availableProcesses.length > 0;
      nodesToProcess = this.resolvedNodesToProcess.length > 0;
    }
  }

  /**
   * @param {string} path - An absolute file path.
   */
  queueFileToParse(path) {
    if (this.memoryFS[path] === undefined) {
      this.memoryFS[path] = new FileGraphNode(path);
      this.resolvedNodesToProcess.push(this.memoryFS[path]);
    }
  }

  _extractFileDependencies() {
    const childProcess = this.availableProcesses.pop();
    const fileToProcess = this.resolvedNodesToProcess.pop();

    if (fileToProcess && childProcess) {
      this.occupiedProcesses[fileToProcess.path] = childProcess;
      childProcess.send({
        type: "extract-dependencies",
        data: { path: fileToProcess.path }
      });
    } else {
      console.warn(
        `_extractFileDependencies: ${fileToProcess}, ${childProcess}.`
      );
    }
  }

  /**
   * @param {string} path 
   */
  _releaseProcess(path) {
    const childProcess = this.occupiedProcesses[path];

    this.availableProcesses.push(childProcess);
    delete this.occupiedProcesses[path];
  }
}

module.exports.ParentState = ParentState;
