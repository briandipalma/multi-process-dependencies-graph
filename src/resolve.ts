const { dirname } = require("path");
const { sync } = require("resolve");

import { FileGraphNode } from "./FileGraphNode";
import { ParentState } from "./ParentState";

export function resolveDependencies(
  fileGraphNode: FileGraphNode,
  parentState: ParentState
) {
  const moduleSourceToPath: { [x: string]: string } = {};
  const importerDir = dirname(fileGraphNode.path);

  for (const moduleSource of fileGraphNode.moduleSources) {
    const resolvedFile = sync(moduleSource, { basedir: importerDir });

    moduleSourceToPath[moduleSource] = resolvedFile;
    parentState.queueFileToParse(resolvedFile);
  }

  parentState.handleOutstandingWork();

  return moduleSourceToPath;
}
