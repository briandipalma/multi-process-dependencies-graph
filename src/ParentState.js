const { cpus } = require("os");

const { createProcess } = require("./parent-utils");
const { resolveDependencies } = require("./resolve");

/**
 * @typedef {Object} FileInfo
 * @property {string} ast
 * @property {string[]} dependencies - List of module sources imported by file.
 * @property {string} path - Absolute file path.
 * @property {string} sourceCode
 */

class ParentState {
  /**
   * @param {string} graphEntry - An absolute file path.
   */
  constructor(graphEntry) {
    this.availableProcesses = cpus().map(() => createProcess(this));
    this.memoryFS = { [graphEntry]: {} };
    this.resolvedFilesToProcess = [graphEntry];
  }

  /**
   * @param {FileInfo} data 
   */
  fileDependenciesExtracted(data) {
    const filePath = data.path;
    const fileInfo = this.memoryFS[filePath];

    fileInfo.ast = data.ast;
    fileInfo.sourceCode = data.sourceCode;

    this.availableProcesses.push(fileInfo.childProcess);
    delete this.memoryFS[filePath].childProcess;

    resolveDependencies(data.dependencies, filePath, this);
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
    let filesToProcess = this.resolvedFilesToProcess.length > 0;

    while (filesToProcess && processesAvailable) {
      this._extractFileDependencies();

      processesAvailable = this.availableProcesses.length > 0;
      filesToProcess = this.resolvedFilesToProcess.length > 0;
    }
  }

  /**
   * @param {string} path - An absolute file path.
   */
  queueFileToParse(path) {
    if (this.memoryFS[path] === undefined) {
      this.memoryFS[path] = { path };
      this.resolvedFilesToProcess.push(path);
    }
  }

  _extractFileDependencies() {
    const childProcess = this.availableProcesses.pop();
    const fileToProcess = this.resolvedFilesToProcess.pop();

    if (fileToProcess && childProcess) {
      this.memoryFS[fileToProcess].childProcess = childProcess;
      childProcess.send({
        type: "extract-dependencies",
        data: { path: fileToProcess }
      });
    } else {
      console.warn(
        `_extractFileDependencies: ${fileToProcess}, ${childProcess}.`
      );
    }
  }
}

module.exports.ParentState = ParentState;
