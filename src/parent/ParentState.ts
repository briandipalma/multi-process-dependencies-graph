const physicalCPUCount = require("physical-cpu-count");

import { FileGraphNode } from "../graph/FileGraphNode";
import { createProcess } from "./parent-utils";

const CORES = Array.from({ length: physicalCPUCount });

export interface FileInfo {
  moduleSources: string[];
  moduleSourcesToPath: { [x: string]: string };
  path: string;
  sourceCode: string;
}

export class ParentState {
  availableProcesses: NodeJS.Process[];
  memoryFS: { [x: string]: FileGraphNode };
  occupiedProcesses: { [x: string]: NodeJS.Process };
  resolvedNodesToProcess: FileGraphNode[];
  startTime: Date;

  /**
   * @param {string} graphEntry - An absolute file path.
   */
  constructor(graphEntry: string) {
    this.startTime = new Date();
    const graphEntryNode = new FileGraphNode(graphEntry);

    this.availableProcesses = CORES.map(() => createProcess(this));
    this.memoryFS = { [graphEntry]: graphEntryNode };
    this.resolvedNodesToProcess = [graphEntryNode];
    this.occupiedProcesses = {};
  }

  fileDependenciesExtracted(data: FileInfo) {
    const filePath = data.path;
    const fileGraphNode = this.memoryFS[filePath];

    this._releaseProcess(filePath);
    fileGraphNode.processFileInfo(data, this);
  }

  handleChildProcessMessage(message: { type: string; data: FileInfo }) {
    const { type, data } = message;

    if (type === "dependencies-extracted") {
      this.fileDependenciesExtracted(data);
    }

    if (
      this.resolvedNodesToProcess.length === 0 &&
      this.availableProcesses.length === CORES.length
    ) {
      console.log(
        "Finished building graph.",
        new Date().valueOf() - this.startTime.valueOf()
      );
      console.log(Object.keys(this.memoryFS).length);

      process.exit(0);
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

  queueFilesToParse(moduleSourcesToPath: { [x: string]: string }) {
    for (const path of Object.values(moduleSourcesToPath)) {
      if (this.memoryFS[path] === undefined) {
        this.memoryFS[path] = new FileGraphNode(path);
        this.resolvedNodesToProcess.push(this.memoryFS[path]);
      }
    }

    this.handleOutstandingWork();
  }

  _extractFileDependencies() {
    const childProcess = this.availableProcesses.pop();
    const fileToProcess = this.resolvedNodesToProcess.pop();

    if (fileToProcess && childProcess && childProcess.send) {
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

  _releaseProcess(path: string) {
    const childProcess = this.occupiedProcesses[path];

    this.availableProcesses.push(childProcess);
    delete this.occupiedProcesses[path];
  }
}
