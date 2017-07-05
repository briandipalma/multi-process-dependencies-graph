import { FileInfo, ParentState } from "../parent/ParentState";

export class FileGraphNode {
  ast: {};
  path: string;
  moduleSources: string[];
  moduleSourcesToPath: { [x: string]: string };
  sourceCode: string;

  /**
   * @param {string} path - Absolute path.
   */
  constructor(path: string) {
    this.path = path;
  }

  processFileInfo(data: FileInfo, parentState: ParentState) {
    this.ast = data.ast;
    this.sourceCode = data.sourceCode;
    this.moduleSources = data.moduleSources;
    this.moduleSourcesToPath = data.moduleSourcesToPath;

    parentState.queueFilesToParse(data.moduleSourcesToPath);
  }
}
