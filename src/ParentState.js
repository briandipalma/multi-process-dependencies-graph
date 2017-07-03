const { cpus } = require("os");

const { createProcess } = require("./parent-utils");
const { resolveDependencies } = require("./resolve");

class ParentState {
  constructor(graphEntry) {
    this.availableProcesses = cpus().map(() => createProcess(this));
    this.memoryFS = { [graphEntry]: {} };
    this.resolvedFilesToProcess = [graphEntry];
  }

  fileDependenciesExtracted(data) {
    const filePath = data.path;
    const fileInfo = this.memoryFS[filePath];

    fileInfo.ast = data.ast;
    fileInfo.sourceCode = data.sourceCode;

    this.availableProcesses.push(fileInfo.childProcess);
    delete this.memoryFS[filePath].childProcess;

    resolveDependencies(data.dependencies, filePath, this);
  }

  handleChildProcessMessage({ type, data }) {
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

  queueFileToParse(path) {
    if (this.memoryFS[path] === undefined) {
      this.memoryFS[path] = { path };
      this.resolvedFilesToProcess.push(path);
    }
  }

  _extractFileDependencies() {
    const childProcess = this.availableProcesses.pop();
    const fileToProcess = this.resolvedFilesToProcess.pop();

    this.memoryFS[fileToProcess].childProcess = childProcess;
    childProcess.send({
      type: "extract-dependencies",
      data: { path: fileToProcess }
    });
  }
}

module.exports.ParentState = ParentState;
